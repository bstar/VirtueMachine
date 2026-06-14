export function sanitizeHeaderValueRuntime(raw: unknown): string {
  return String(raw || "").replace(/[\r\n]+/g, " ").trim();
}

export function sanitizeEmailAddressRuntime(raw: unknown): string {
  return String(raw || "").replace(/[<>\r\n]/g, "").trim();
}

export function boolEnvOnRuntime(value: unknown, fallback = false): boolean {
  if (value == null) {
    return fallback;
  }
  const v = String(value).trim().toLowerCase();
  if (v === "1" || v === "true" || v === "on" || v === "yes") {
    return true;
  }
  if (v === "0" || v === "false" || v === "off" || v === "no") {
    return false;
  }
  return fallback;
}

export function smtpTextMessageRuntime(fromEmail: unknown, toEmail: unknown, subject: unknown, bodyText: unknown): string {
  const from = sanitizeEmailAddressRuntime(fromEmail);
  const to = sanitizeEmailAddressRuntime(toEmail);
  const subj = sanitizeHeaderValueRuntime(subject);
  const text = String(bodyText || "")
    .replace(/\r?\n/g, "\r\n")
    .split("\r\n")
    .map((line) => (line.startsWith(".") ? `.${line}` : line))
    .join("\r\n");
  return [
    `From: <${from}>`,
    `To: <${to}>`,
    `Subject: ${subj}`,
    "MIME-Version: 1.0",
    "Content-Type: text/plain; charset=utf-8",
    "Content-Transfer-Encoding: 8bit",
    "",
    text
  ].join("\r\n");
}

export function parseSmtpLineBufferRuntime(buffer: string, onResponse: (line: string) => void): string {
  let rest = buffer;
  for (;;) {
    const idx = rest.indexOf("\n");
    if (idx < 0) {
      break;
    }
    const line = rest.slice(0, idx).replace(/\r$/, "");
    rest = rest.slice(idx + 1);
    onResponse(line);
  }
  return rest;
}
