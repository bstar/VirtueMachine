import type { NetStatusSetter } from "./status_runtime.ts";

export type NetPanelActionDiagRuntime = {
  diagClass: "diag ok" | "diag warn";
  diagText: string;
};

export function netPanelActionDiagRuntime(kind: unknown, text: unknown): NetPanelActionDiagRuntime {
  return {
    diagClass: kind === "ok" ? "diag ok" : "diag warn",
    diagText: String(text || "")
  };
}

export async function runNetPanelActionRuntime<TOutput = unknown>(args: {
  run: () => Promise<TOutput>;
  setStatus: NetStatusSetter;
  setDiag: (kind: "ok" | "warn", text: string) => void;
  okText: string | ((out: TOutput) => string);
  errorStatusPrefix: string;
  errorDiagPrefix: string;
}): Promise<void> {
  try {
    const out = await args.run();
    const okText = typeof args.okText === "function" ? args.okText(out) : args.okText;
    args.setDiag("ok", String(okText || ""));
  } catch (err) {
    const msg = String(err && typeof err === "object" && "message" in err ? err.message : err);
    args.setStatus("error", `${args.errorStatusPrefix}: ${msg}`);
    args.setDiag("warn", `${args.errorDiagPrefix}: ${msg}`);
  }
}

export type NetPanelActionButtonRuntime = {
  addEventListener(type: "click", listener: () => void): void;
};

export function bindNetPanelActionButtonRuntime<TOutput = unknown>(args: {
  button?: NetPanelActionButtonRuntime | null;
  run: () => Promise<TOutput>;
  setStatus: NetStatusSetter;
  setDiag: (kind: "ok" | "warn", text: string) => void;
  okText: string | ((out: TOutput) => string);
  errorStatusPrefix: string;
  errorDiagPrefix: string;
}): boolean {
  if (!args.button) {
    return false;
  }
  args.button.addEventListener("click", () => {
    void runNetPanelActionRuntime({
      run: args.run,
      setStatus: args.setStatus,
      setDiag: args.setDiag,
      okText: args.okText,
      errorStatusPrefix: args.errorStatusPrefix,
      errorDiagPrefix: args.errorDiagPrefix
    });
  });
  return true;
}
