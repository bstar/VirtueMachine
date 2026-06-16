import { spawn, spawnSync, type ChildProcessWithoutNullStreams } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { setTimeout as delay } from "node:timers/promises";

type CdpResponse = {
  error?: { message?: string };
  id?: number;
  result?: unknown;
};

type MovementProbe = {
  facing_dy?: number;
  facing_dx?: number;
  last_move_tick?: number;
  map_x?: number;
  map_y?: number;
  queue_depth?: number;
  queued_move_count?: number;
  session_started?: boolean;
  tick?: number;
  walk_anim_active?: boolean;
};

type MoveKey = {
  code: string;
  dx: number;
  dy: number;
  key: string;
};

type CdpTargetInfo = {
  webSocketDebuggerUrl?: string;
};

const APP_URL = process.env.VM_BROWSER_SMOKE_URL || "http://127.0.0.1:8080/modern/client-web/index.html";
const API_BASE = process.env.VM_BROWSER_SMOKE_API_BASE || "http://127.0.0.1:8081";
const STRICT = process.env.VM_BROWSER_SMOKE_STRICT === "on";
const SESSION_STRICT = process.env.VM_BROWSER_SMOKE_REQUIRE_SESSION === "on";
const TIMEOUT_MS = Math.max(1000, Number(process.env.VM_BROWSER_SMOKE_TIMEOUT_MS || "20000") || 20000);
const MOVE_KEYS: readonly MoveKey[] = [
  { key: "ArrowRight", code: "ArrowRight", dx: 1, dy: 0 },
  { key: "ArrowDown", code: "ArrowDown", dx: 0, dy: 1 },
  { key: "ArrowLeft", code: "ArrowLeft", dx: -1, dy: 0 },
  { key: "ArrowUp", code: "ArrowUp", dx: 0, dy: -1 }
];

function finishSkipped(reason: string): never {
  if (STRICT) {
    process.stderr.write(`browser_movement_probe_smoke: ${reason}\n`);
    process.exit(1);
  }
  process.stdout.write(`browser_movement_probe_smoke: skipped (${reason})\n`);
  process.exit(0);
}

function findBrowser(): string {
  if (process.env.BROWSER) {
    return process.env.BROWSER;
  }
  for (const candidate of ["google-chrome-stable", "google-chrome", "chromium", "chromium-browser", "chrome"]) {
    const out = spawnSync("sh", ["-lc", `command -v ${candidate}`], {
      encoding: "utf8"
    });
    if (out.status === 0 && out.stdout.trim()) {
      return out.stdout.trim();
    }
  }
  return "";
}

async function fetchJson(url: string, init?: RequestInit): Promise<unknown> {
  const res = await fetch(url, init);
  if (!res.ok) {
    throw new Error(`${res.status} ${res.statusText}`);
  }
  return res.json();
}

async function createPageTarget(baseUrl: string, url: string): Promise<CdpTargetInfo> {
  const encoded = encodeURIComponent(url);
  try {
    return await fetchJson(`${baseUrl}/json/new?${encoded}`, { method: "PUT" }) as CdpTargetInfo;
  } catch (_err) {
    return await fetchJson(`${baseUrl}/json/new?${encoded}`) as CdpTargetInfo;
  }
}

async function urlReachable(url: string): Promise<boolean> {
  try {
    const res = await fetch(url, { method: "GET" });
    return res.ok;
  } catch (_err) {
    return false;
  }
}

class CdpClient {
  private nextId = 1;
  private pending = new Map<number, {
    reject: (err: Error) => void;
    resolve: (value: unknown) => void;
  }>();

  constructor(private readonly ws: WebSocket) {
    ws.addEventListener("message", (event) => {
      const data = JSON.parse(String(event.data || "{}")) as CdpResponse;
      if (data.id == null) {
        return;
      }
      const pending = this.pending.get(data.id);
      if (!pending) {
        return;
      }
      this.pending.delete(data.id);
      if (data.error) {
        pending.reject(new Error(data.error.message || "CDP command failed"));
        return;
      }
      pending.resolve(data.result);
    });
  }

  send(method: string, params: Record<string, unknown> = {}): Promise<unknown> {
    const id = this.nextId++;
    const payload = JSON.stringify({ id, method, params });
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.ws.send(payload);
    });
  }
}

async function connectWebSocket(url: string): Promise<WebSocket> {
  const ws = new WebSocket(url);
  await new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error("CDP websocket open timed out")), 5000);
    ws.addEventListener("open", () => {
      clearTimeout(timeout);
      resolve();
    }, { once: true });
    ws.addEventListener("error", () => {
      clearTimeout(timeout);
      reject(new Error("CDP websocket failed"));
    }, { once: true });
  });
  return ws;
}

async function waitFor<T>(
  label: string,
  timeoutMs: number,
  fn: () => Promise<T | null>
): Promise<T> {
  const started = Date.now();
  let lastError = "";
  while ((Date.now() - started) < timeoutMs) {
    try {
      const value = await fn();
      if (value != null) {
        return value;
      }
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err);
    }
    await delay(100);
  }
  throw new Error(`${label} timed out${lastError ? `: ${lastError}` : ""}`);
}

function launchBrowser(browser: string, port: number, profileDir: string): ChildProcessWithoutNullStreams {
  fs.mkdirSync(profileDir, { recursive: true });
  return spawn(browser, [
    "--headless=new",
    "--disable-gpu",
    "--no-sandbox",
    "--no-first-run",
    "--autoplay-policy=no-user-gesture-required",
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${profileDir}`,
    "about:blank"
  ]);
}

async function runtimeEvaluate<T>(cdp: CdpClient, expression: string): Promise<T> {
  const result = await cdp.send("Runtime.evaluate", {
    expression,
    awaitPromise: true,
    returnByValue: true
  }) as {
    exceptionDetails?: unknown;
    result?: { value?: T };
  };
  if (result.exceptionDetails) {
    throw new Error(`Runtime.evaluate failed: ${JSON.stringify(result.exceptionDetails)}`);
  }
  return result.result?.value as T;
}

async function pressKey(cdp: CdpClient, key: string, code: string): Promise<void> {
  const virtualKeyByKey: Record<string, number> = {
    ArrowDown: 40,
    ArrowLeft: 37,
    ArrowRight: 39,
    ArrowUp: 38,
    Enter: 13
  };
  const virtualKeyCode = virtualKeyByKey[key] || 0;
  await runtimeEvaluate(cdp, "document.activeElement instanceof HTMLElement ? document.activeElement.blur() : undefined")
    .catch(() => undefined);
  await runtimeEvaluate(cdp, `(() => {
    const init = { key: ${JSON.stringify(key)}, code: ${JSON.stringify(code)}, bubbles: true, cancelable: true };
    window.dispatchEvent(new KeyboardEvent("keydown", init));
    window.dispatchEvent(new KeyboardEvent("keyup", init));
    return true;
  })()`);
  await cdp.send("Input.dispatchKeyEvent", {
    type: "keyDown",
    key,
    code,
    windowsVirtualKeyCode: virtualKeyCode,
    nativeVirtualKeyCode: virtualKeyCode
  });
  await cdp.send("Input.dispatchKeyEvent", {
    type: "keyUp",
    key,
    code,
    windowsVirtualKeyCode: virtualKeyCode,
    nativeVirtualKeyCode: virtualKeyCode
  });
}

async function readMovementProbe(cdp: CdpClient): Promise<MovementProbe> {
  return runtimeEvaluate<MovementProbe>(cdp, `(() => {
    const probe = window.__vmGetUiProbe();
    const movement = probe.canonical_runtime?.movement || {};
    const avatar = probe.canonical_ui?.avatar_panel?.avatar || {};
    return {
      ...movement,
      map_x: avatar.map_x,
      map_y: avatar.map_y,
      tick: probe.tick
    };
  })()`);
}

function movementDelta(from: MovementProbe, to: MovementProbe): { dx: number; dy: number } {
  return {
    dx: (Number(to.map_x) | 0) - (Number(from.map_x) | 0),
    dy: (Number(to.map_y) | 0) - (Number(from.map_y) | 0)
  };
}

function oppositeMove(move: MoveKey): MoveKey {
  const opposite = MOVE_KEYS.find((candidate) => candidate.dx === -move.dx && candidate.dy === -move.dy);
  if (!opposite) {
    throw new Error(`no opposite move for ${move.key}`);
  }
  return opposite;
}

function movementProbeQueued(args: {
  before: MovementProbe;
  move: MoveKey;
  probe: MovementProbe;
}): boolean {
  const movementAdvanced = Number(args.probe.last_move_tick) !== Number(args.before.last_move_tick)
    || Number(args.probe.queue_depth) !== Number(args.before.queue_depth)
    || Number(args.probe.queued_move_count) !== Number(args.before.queued_move_count);
  const facingExpected = Number(args.probe.facing_dx) === args.move.dx
    && Number(args.probe.facing_dy) === args.move.dy;
  return movementAdvanced && facingExpected && !!args.probe.walk_anim_active;
}

function movementProbeLanded(args: {
  before: MovementProbe;
  move: MoveKey;
  probe: MovementProbe;
}): boolean {
  const delta = movementDelta(args.before, args.probe);
  return delta.dx === args.move.dx
    && delta.dy === args.move.dy
    && Number(args.probe.last_move_tick) !== Number(args.before.last_move_tick);
}

async function waitForPageReady(cdp: CdpClient, expectedUrl: string): Promise<void> {
  await waitFor("page navigation", TIMEOUT_MS, async () => {
    const href = await runtimeEvaluate<string>(cdp, "location.href");
    return href === expectedUrl ? href : null;
  });
  await waitFor("document load", TIMEOUT_MS, async () => {
    const ready = await runtimeEvaluate<string>(cdp, "document.readyState");
    return ready === "complete" || ready === "interactive" ? ready : null;
  });
}

async function main(): Promise<void> {
  if (!(await urlReachable(APP_URL))) {
    finishSkipped(`web client unavailable at ${APP_URL}`);
  }
  const browser = findBrowser();
  if (!browser) {
    finishSkipped("Chrome/Chromium not found; set BROWSER=/path/to/chrome");
  }

  const port = Number(process.env.VM_BROWSER_SMOKE_CDP_PORT || (12000 + (process.pid % 10000)));
  const profileDir = process.env.VM_BROWSER_SMOKE_PROFILE_DIR
    || path.join(os.tmpdir(), `ultima6-browser-smoke-${process.pid}`);
  const proc = launchBrowser(browser, port, profileDir);
  let ws: WebSocket | null = null;
  try {
    const cdpHttpBase = `http://127.0.0.1:${port}`;
    await waitFor("CDP version endpoint", 5000, async () => {
      const version = await fetchJson(`${cdpHttpBase}/json/version`) as { Browser?: string };
      return version.Browser ? version : null;
    });
    const target = await createPageTarget(cdpHttpBase, APP_URL);
    const targets = target.webSocketDebuggerUrl
      ? [target]
      : await fetchJson(`${cdpHttpBase}/json/list`) as CdpTargetInfo[];
    const wsUrl = targets.find((entry) => entry.webSocketDebuggerUrl)?.webSocketDebuggerUrl || "";
    if (!wsUrl) {
      throw new Error("no debuggable page target");
    }
    ws = await connectWebSocket(wsUrl);
    const cdp = new CdpClient(ws);
    await cdp.send("Runtime.enable");
    await cdp.send("Page.enable");
    await waitForPageReady(cdp, APP_URL);

    await runtimeEvaluate(cdp, `(() => {
      localStorage.setItem("vm_net_api_base", ${JSON.stringify(API_BASE)});
      localStorage.setItem("vm_net_username", "browser_smoke");
      localStorage.setItem("vm_net_password", "quest123");
      localStorage.setItem("vm_net_character_name", "BrowserSmoke");
      localStorage.setItem("vm_net_auto_login", "on");
      localStorage.setItem("vm_movement_mode", "avatar");
      return true;
    })()`);
    await cdp.send("Page.reload", { ignoreCache: true });
    await waitForPageReady(cdp, APP_URL);
    await waitFor("movement probe hook", TIMEOUT_MS, async () => {
      const ok = await runtimeEvaluate<boolean>(cdp, "Boolean(window.__vmGetUiProbe?.().canonical_runtime?.movement)");
      return ok ? true : null;
    });

    const before = await waitFor("game session start", TIMEOUT_MS, async () => {
      await runtimeEvaluate(cdp, "window.__vmStartSessionFromTitle?.()");
      await delay(300);
      const probe = await readMovementProbe(cdp);
      return probe.session_started ? probe : null;
    }).catch(async (err) => {
      const probe = await readMovementProbe(cdp);
      if (SESSION_STRICT) {
        const pageText = await runtimeEvaluate<string>(
          cdp,
          "document.body ? document.body.innerText.slice(0, 1200) : ''"
        ).catch(() => "");
        throw new Error(`${err instanceof Error ? err.message : String(err)}; movement=${JSON.stringify(probe)}; page=${JSON.stringify(pageText)}`);
      }
      return probe;
    });
    if (!before.session_started) {
      if (SESSION_STRICT) {
        throw new Error("session did not start before movement assertion");
      }
      process.stdout.write("browser_movement_probe_smoke: probe ok; movement drive skipped (session not started)\n");
      return;
    }

    let firstMove: {
      landed: MovementProbe;
      move: MoveKey;
      queued: MovementProbe;
      start: MovementProbe;
    } | null = null;
    const attempts: Array<{
      error?: string;
      move: string;
      start: MovementProbe;
      latest?: MovementProbe;
    }> = [];
    let lastMoveError = "";
    for (const move of MOVE_KEYS) {
      const start = await readMovementProbe(cdp);
      await pressKey(cdp, move.key, move.code);
      try {
        const queued = await waitFor(`${move.key} movement queue`, 2000, async () => {
          const probe = await readMovementProbe(cdp);
          return movementProbeQueued({ before: start, move, probe }) ? probe : null;
        });
        const landed = await waitFor(`${move.key} movement landing`, 2500, async () => {
          const probe = await readMovementProbe(cdp);
          return movementProbeLanded({ before: start, move, probe }) ? probe : null;
        });
        firstMove = { landed, move, queued, start };
        break;
      } catch (err) {
        lastMoveError = err instanceof Error ? err.message : String(err);
        attempts.push({
          error: lastMoveError,
          move: move.key,
          start,
          latest: await readMovementProbe(cdp).catch(() => undefined)
        });
        await delay(150);
      }
    }
    if (!firstMove) {
      throw new Error(`no cardinal movement landed; last error: ${lastMoveError}; attempts=${JSON.stringify(attempts)}`);
    }

    const secondMove = oppositeMove(firstMove.move);
    await delay(160);
    await pressKey(cdp, secondMove.key, secondMove.code);
    const secondQueued = await waitFor(`${secondMove.key} repeated movement queue`, 2000, async () => {
      const probe = await readMovementProbe(cdp);
      return movementProbeQueued({ before: firstMove.landed, move: secondMove, probe }) ? probe : null;
    });
    const secondLanded = await waitFor(`${secondMove.key} repeated movement landing`, 2500, async () => {
      const probe = await readMovementProbe(cdp);
      return movementProbeLanded({ before: firstMove.landed, move: secondMove, probe }) ? probe : null;
    });

    process.stdout.write([
      "browser_movement_probe_smoke: ok",
      `before=${JSON.stringify(before)}`,
      `first_move=${firstMove.move.key}`,
      `first_queued=${JSON.stringify(firstMove.queued)}`,
      `first_landed=${JSON.stringify(firstMove.landed)}`,
      `second_move=${secondMove.key}`,
      `second_queued=${JSON.stringify(secondQueued)}`,
      `second_landed=${JSON.stringify(secondLanded)}`
    ].join("\n") + "\n");
  } finally {
    if (ws) {
      ws.close();
    }
    proc.kill("SIGTERM");
    fs.rmSync(profileDir, { force: true, recursive: true });
  }
}

main().catch((err) => {
  process.stderr.write(`browser_movement_probe_smoke: failed: ${err instanceof Error ? err.message : String(err)}\n`);
  process.exit(1);
});
