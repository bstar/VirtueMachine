export async function runNetPanelActionRuntime(args: {
  run: () => Promise<any>;
  setStatus: (level: string, text: string) => void;
  setDiag: (kind: "ok" | "warn", text: string) => void;
  okText: string | ((out: any) => string);
  errorStatusPrefix: string;
  errorDiagPrefix: string;
}): Promise<void> {
  try {
    const out = await args.run();
    const okText = typeof args.okText === "function" ? args.okText(out) : args.okText;
    args.setDiag("ok", String(okText || ""));
  } catch (err: any) {
    const msg = String(err?.message || err);
    args.setStatus("error", `${args.errorStatusPrefix}: ${msg}`);
    args.setDiag("warn", `${args.errorDiagPrefix}: ${msg}`);
  }
}
