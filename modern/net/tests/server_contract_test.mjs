import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import assert from "node:assert/strict";

const ROOT = path.resolve(new URL("../../../..", import.meta.url).pathname);
const SERVER_JS = path.join(ROOT, "modern/net/server.js");

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForHealth(baseUrl, timeoutMs = 5000) {
  const start = Date.now();
  while ((Date.now() - start) < timeoutMs) {
    try {
      const res = await fetch(`${baseUrl}/health`);
      if (res.ok) {
        return;
      }
    } catch (_err) {
      // Keep polling until timeout.
    }
    await sleep(100);
  }
  throw new Error("net server did not become healthy in time");
}

async function jsonFetch(baseUrl, route, init = {}) {
  const res = await fetch(`${baseUrl}${route}`, init);
  const text = await res.text();
  let body = null;
  try {
    body = text.trim() ? JSON.parse(text) : null;
  } catch (_err) {
    throw new Error(`invalid JSON response for ${route}: ${text}`);
  }
  return { status: res.status, body };
}

async function main() {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "vm-net-test-"));
  const dataDir = path.join(tmp, "data");
  fs.mkdirSync(dataDir, { recursive: true });

  const host = "127.0.0.1";
  const port = 18081;
  const baseUrl = `http://${host}:${port}`;

  const child = spawn(process.execPath, [SERVER_JS], {
    env: {
      ...process.env,
      VM_NET_HOST: host,
      VM_NET_PORT: String(port),
      VM_NET_DATA_DIR: dataDir,
      VM_EMAIL_MODE: "log"
    },
    stdio: ["ignore", "pipe", "pipe"]
  });

  let stderr = "";
  child.stderr.on("data", (buf) => {
    stderr += String(buf);
  });

  try {
    await waitForHealth(baseUrl);

    const login = await jsonFetch(baseUrl, "/api/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ username: "avatar", password: "quest123" })
    });
    assert.equal(login.status, 200);
    assert.ok(login.body?.token);
    const token = login.body.token;
    const authHeaders = {
      "content-type": "application/json",
      authorization: `Bearer ${token}`
    };

    const badLogin = await jsonFetch(baseUrl, "/api/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ username: "avatar", password: "wrong" })
    });
    assert.equal(badLogin.status, 401);

    const recoveredUnverified = await jsonFetch(baseUrl, "/api/auth/recover-password?username=avatar&email=avatar@example.com", {
      method: "GET"
    });
    assert.equal(recoveredUnverified.status, 403);

    const setEmail = await jsonFetch(baseUrl, "/api/auth/set-email", {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify({
        email: "avatar@example.com"
      })
    });
    assert.equal(setEmail.status, 200);
    assert.equal(setEmail.body?.user?.email, "avatar@example.com");
    assert.equal(setEmail.body?.user?.email_verified, false);

    const sendVerify = await jsonFetch(baseUrl, "/api/auth/send-email-verification", {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify({})
    });
    assert.equal(sendVerify.status, 200);

    const outboxPath = path.join(dataDir, "email_outbox.log");
    const outboxLines = fs.readFileSync(outboxPath, "utf8")
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);
    assert.ok(outboxLines.length >= 1);
    const verifyMail = JSON.parse(outboxLines[outboxLines.length - 1]);
    const matchCode = String(verifyMail?.body_text || "").match(/(\d{6})/);
    assert.ok(matchCode && matchCode[1], "verification email must contain 6-digit code");
    const verifyCode = matchCode[1];

    const verifyEmail = await jsonFetch(baseUrl, "/api/auth/verify-email", {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify({ code: verifyCode })
    });
    assert.equal(verifyEmail.status, 200);
    assert.equal(verifyEmail.body?.user?.email_verified, true);

    const changePassword = await jsonFetch(baseUrl, "/api/auth/change-password", {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify({
        old_password: "quest123",
        new_password: "quest456"
      })
    });
    assert.equal(changePassword.status, 200);
    assert.equal(changePassword.body?.ok, true);

    const oldPasswordLogin = await jsonFetch(baseUrl, "/api/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ username: "avatar", password: "quest123" })
    });
    assert.equal(oldPasswordLogin.status, 401);

    const newPasswordLogin = await jsonFetch(baseUrl, "/api/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ username: "avatar", password: "quest456" })
    });
    assert.equal(newPasswordLogin.status, 200);

    const recovered = await jsonFetch(baseUrl, "/api/auth/recover-password?username=avatar&email=avatar@example.com", {
      method: "GET"
    });
    assert.equal(recovered.status, 200);
    assert.equal(recovered.body?.delivered, true);

    const createChar = await jsonFetch(baseUrl, "/api/characters", {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify({ name: "Avatar" })
    });
    assert.equal(createChar.status, 201);
    assert.ok(createChar.body?.character_id);
    const characterId = createChar.body.character_id;

    const saveSnapshot = await jsonFetch(baseUrl, `/api/characters/${characterId}/snapshot`, {
      method: "PUT",
      headers: authHeaders,
      body: JSON.stringify({
        schema_version: 1,
        sim_core_version: "test",
        saved_tick: 42,
        snapshot_base64: Buffer.from("vm-test-snapshot", "utf8").toString("base64")
      })
    });
    assert.equal(saveSnapshot.status, 200);
    assert.equal(saveSnapshot.body?.snapshot_meta?.saved_tick, 42);
    assert.ok(saveSnapshot.body?.snapshot_meta?.snapshot_hash);

    const loadSnapshot = await jsonFetch(baseUrl, `/api/characters/${characterId}/snapshot`, {
      method: "GET",
      headers: { authorization: `Bearer ${token}` }
    });
    assert.equal(loadSnapshot.status, 200);
    assert.ok(loadSnapshot.body?.snapshot_base64);

    const heartbeat = await jsonFetch(baseUrl, "/api/world/presence/heartbeat", {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify({
        session_id: "test-session-1",
        character_name: "Avatar",
        map_x: 307,
        map_y: 347,
        map_z: 0,
        facing_dx: 0,
        facing_dy: 1,
        tick: 42,
        mode: "avatar"
      })
    });
    assert.equal(heartbeat.status, 200);
    assert.equal(heartbeat.body?.ok, true);

    const presence = await jsonFetch(baseUrl, "/api/world/presence", {
      method: "GET",
      headers: { authorization: `Bearer ${token}` }
    });
    assert.equal(presence.status, 200);
    assert.ok(Array.isArray(presence.body?.players));
    assert.equal(presence.body.players.length, 1);
    assert.equal(presence.body.players[0]?.username, "avatar_renamed");
    assert.equal(presence.body.players[0]?.map_x, 307);

    const clock1 = await jsonFetch(baseUrl, "/api/world/clock", {
      method: "GET",
      headers: { authorization: `Bearer ${token}` }
    });
    assert.equal(clock1.status, 200);
    assert.ok(Number.isInteger(clock1.body?.tick));
    assert.ok(Number.isInteger(clock1.body?.time_h));
    assert.ok(Number.isInteger(clock1.body?.time_m));
    await sleep(220);
    const clock2 = await jsonFetch(baseUrl, "/api/world/clock", {
      method: "GET",
      headers: { authorization: `Bearer ${token}` }
    });
    assert.equal(clock2.status, 200);
    assert.ok(clock2.body.tick >= clock1.body.tick);

    const policy = await jsonFetch(baseUrl, "/api/world/critical-items/policy", {
      method: "GET",
      headers: { authorization: `Bearer ${token}` }
    });
    assert.equal(policy.status, 200);
    assert.ok(Array.isArray(policy.body?.critical_item_policy));

    const maintenance1 = await jsonFetch(baseUrl, "/api/world/critical-items/maintenance", {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify({
        tick: 1000,
        world_items: []
      })
    });
    assert.equal(maintenance1.status, 200);
    assert.ok(Array.isArray(maintenance1.body?.events));
    assert.equal(maintenance1.body.events.length, 1);

    const maintenance2 = await jsonFetch(baseUrl, "/api/world/critical-items/maintenance", {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify({
        tick: 1001,
        world_items: []
      })
    });
    assert.equal(maintenance2.status, 200);
    assert.ok(Array.isArray(maintenance2.body?.events));
    assert.equal(maintenance2.body.events.length, 0);
  } finally {
    child.kill("SIGTERM");
    await new Promise((resolve) => child.once("exit", resolve));
    fs.rmSync(tmp, { recursive: true, force: true });
  }

  if (stderr.trim()) {
    process.stdout.write(`net test server stderr:\n${stderr}\n`);
  }
  process.stdout.write("modern/net server contract test passed\n");
}

main().catch((err) => {
  process.stderr.write(`${err?.stack || err}\n`);
  process.exit(1);
});
