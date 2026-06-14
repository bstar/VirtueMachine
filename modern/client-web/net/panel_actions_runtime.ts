export interface NetPanelActionOutput {
  [key: string]: NetPanelActionOutput;
}

export async function runNetPanelActionRuntime(args: {
  run: () => Promise<NetPanelActionOutput>;
  setStatus: (level: string, text: string) => void;
  setDiag: (kind: "ok" | "warn", text: string) => void;
  okText: string | ((out: NetPanelActionOutput) => string);
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
