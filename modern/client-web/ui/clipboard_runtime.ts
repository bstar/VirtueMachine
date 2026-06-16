import { errorMessageRuntime } from "../error_runtime.ts";

export type ClipboardDocumentRuntime = Pick<Document, "body" | "createElement" | "execCommand" | "querySelectorAll">;
export type ClipboardNavigatorRuntime = {
  clipboard?: {
    writeText?: (text: string) => Promise<void>;
  };
};

export const DEFAULT_PANEL_COPY_VALUE_IDS_RUNTIME = new Set([
  "statPos",
  "statClock",
  "statDate",
  "statTile",
  "statRenderParity",
  "statSource",
  "statHash",
  "statLoopHealth",
  "statReplay",
  "statCenterTiles",
  "statNetSession"
]);

export function copyStatusTextRuntime(ok: unknown, detail = ""): string {
  return ok ? "ok" : (detail ? `failed (${detail})` : "failed");
}

export function copyPendingStatusTextRuntime(): "copying..." {
  return "copying...";
}

function setCopyErrorRuntime(target: HTMLElement | null | undefined, err: string): void {
  if (target) {
    target.dataset.copyError = err || "copy blocked";
  }
}

function copyViaTextareaRuntime(
  doc: ClipboardDocumentRuntime,
  text: string
): { ok: boolean; reason: string } {
  const ta = doc.createElement("textarea");
  ta.value = text;
  ta.style.position = "fixed";
  ta.style.left = "-9999px";
  ta.style.top = "0";
  doc.body.appendChild(ta);
  ta.focus();
  ta.select();
  ta.setSelectionRange(0, ta.value.length);
  const ok = doc.execCommand("copy");
  doc.body.removeChild(ta);
  return ok
    ? { ok: true, reason: "" }
    : { ok: false, reason: "execCommand(copy) returned false" };
}

export async function copyTextToClipboardRuntime(
  text: unknown,
  deps: {
    document: ClipboardDocumentRuntime;
    navigator?: ClipboardNavigatorRuntime | null;
    errorTarget?: HTMLElement | null;
  }
): Promise<boolean> {
  const value = String(text ?? "");
  let lastErr = "";
  try {
    const writeText = deps.navigator?.clipboard?.writeText;
    if (typeof writeText === "function") {
      await writeText(value);
      return true;
    }
  } catch (err) {
    lastErr = errorMessageRuntime(err);
  }
  try {
    const result = copyViaTextareaRuntime(deps.document, value);
    if (result.ok) {
      return true;
    }
    setCopyErrorRuntime(deps.errorTarget, lastErr || result.reason);
    return false;
  } catch (err) {
    if (!lastErr) {
      lastErr = errorMessageRuntime(err);
    }
    setCopyErrorRuntime(deps.errorTarget, lastErr || "copy blocked");
    return false;
  }
}

export function copyTextToClipboardSyncRuntime(
  text: unknown,
  deps: {
    document: ClipboardDocumentRuntime;
    errorTarget?: HTMLElement | null;
  }
): { ok: boolean; reason: string } {
  const value = String(text ?? "");
  let lastErr = "";
  try {
    const result = copyViaTextareaRuntime(deps.document, value);
    if (result.ok) {
      return { ok: true, reason: "" };
    }
    lastErr = result.reason;
  } catch (err) {
    lastErr = errorMessageRuntime(err);
  }
  setCopyErrorRuntime(deps.errorTarget, lastErr || "copy blocked");
  return { ok: false, reason: lastErr || "copy blocked" };
}

export function setCopyStatusRuntime(
  target: HTMLElement | null | undefined,
  ok: unknown,
  detail = ""
): void {
  if (target) {
    target.textContent = copyStatusTextRuntime(ok, detail);
  }
}

export function setCopyPendingStatusRuntime(target: HTMLElement | null | undefined): void {
  if (target) {
    target.textContent = copyPendingStatusTextRuntime();
  }
}

export function makeCopyButtonRuntime(args: {
  document: Pick<Document, "createElement">;
  copyText: (text: string) => Promise<boolean>;
  getText: () => string;
  setTimeoutFn?: (fn: () => void, timeoutMs: number) => ReturnType<typeof setTimeout> | number;
}): HTMLButtonElement {
  const btn = args.document.createElement("button");
  btn.type = "button";
  btn.className = "copy-icon-btn";
  btn.title = "Copy to clipboard";
  btn.textContent = "⧉";
  btn.addEventListener("click", async () => {
    const ok = await args.copyText(args.getText());
    const prev = btn.textContent;
    btn.textContent = ok ? "✓" : "!";
    const setTimeoutFn = args.setTimeoutFn ?? ((fn, timeoutMs) => window.setTimeout(fn, timeoutMs));
    setTimeoutFn(() => {
      btn.textContent = prev;
    }, 900);
  });
  return btn;
}

export function installPanelCopyButtonsRuntime(args: {
  diagBox?: HTMLElement | null;
  document: Document;
  makeCopyButton: (getText: () => string) => HTMLButtonElement;
  usefulValueIds: ReadonlySet<string>;
}): void {
  const rows = args.document.querySelectorAll(".stat-row");
  rows.forEach((row) => {
    const label = row.querySelector("span");
    const value = row.querySelector("strong");
    if (!label || !value) {
      return;
    }
    const valueId = value.id || "";
    const existingBtn = row.querySelector(".copy-icon-btn");
    if (!args.usefulValueIds.has(valueId)) {
      if (existingBtn) {
        existingBtn.remove();
      }
      return;
    }
    if (existingBtn) {
      return;
    }
    const btn = args.makeCopyButton(() => `${label.textContent || ""}: ${value.textContent || ""}`);
    row.appendChild(btn);
  });

  const diagBox = args.diagBox;
  if (diagBox && diagBox.parentElement && !diagBox.parentElement.querySelector(".diag-copy")) {
    const wrap = args.document.createElement("div");
    wrap.className = "mt-1 flex justify-end diag-copy";
    const btn = args.makeCopyButton(() => diagBox.textContent || "");
    wrap.appendChild(btn);
    diagBox.parentElement.insertBefore(wrap, diagBox.nextSibling);
  }
}
