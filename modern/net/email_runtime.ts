export function sanitizeHeaderValueRuntime(raw: unknown): string {
  return String(raw || "").replace(/[\r\n]+/g, " ").trim();
}

export function normalizeEmailRuntime(raw: unknown): string {
  return String(raw || "").trim().toLowerCase();
}

export function isValidEmailRuntime(raw: unknown): boolean {
  const v = normalizeEmailRuntime(raw);
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
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

type SmtpResponseRuntime = {
  code?: number;
  lines?: string[];
  error?: Error;
};

export type EmailDeliveryLogRuntime = {
  at: string;
  body_text: string;
  error?: string;
  kind: "email_delivery";
  mode: string;
  provider_id?: string;
  status: "queued" | "sent" | "failed" | "logged";
  subject: string;
  template?: string;
  to: string;
  user_id?: string;
};

export type EmailDeliveryMetaRuntime = {
  template?: unknown;
  user_id?: unknown;
};

type SmtpTransportRuntime = {
  readonly destroyed?: boolean;
  destroy(err?: Error): void;
  end(): void;
  on(event: "close" | "data" | "error" | "timeout", listener: (arg?: unknown) => void): void;
  setEncoding(encoding: BufferEncoding): void;
  setTimeout(ms: number): void;
  write(data: string): void;
};

type SmtpDeliverRuntimeArgs = {
  bodyText: unknown;
  connect(options: { host: string; port: number }): SmtpTransportRuntime;
  fromEmail: unknown;
  helo: unknown;
  host: string;
  pass: string;
  port: number;
  rejectUnauthorized: unknown;
  secure: unknown;
  subject: unknown;
  timeoutMs: number;
  tlsConnect(options: { host: string; port: number; rejectUnauthorized: boolean; servername: string }): SmtpTransportRuntime;
  toEmail: unknown;
  user: string;
};

export async function smtpDeliverRuntime(args: SmtpDeliverRuntimeArgs): Promise<void> {
  const host = String(args.host || "").trim();
  if (!host) {
    throw new Error("smtp host not configured (set VM_EMAIL_SMTP_HOST)");
  }
  if (!isValidEmailRuntime(args.fromEmail)) {
    throw new Error("smtp from not configured (set VM_EMAIL_FROM to a valid address)");
  }
  const secure = boolEnvOnRuntime(args.secure, true);
  const port = Number.isFinite(args.port) && args.port > 0 ? args.port : (secure ? 465 : 25);
  const transport = secure
    ? args.tlsConnect({
      host,
      port,
      servername: host,
      rejectUnauthorized: boolEnvOnRuntime(args.rejectUnauthorized, true)
    })
    : args.connect({ host, port });

  transport.setEncoding("utf8");
  transport.setTimeout(Math.max(1000, Number(args.timeoutMs) || 10000));

  const responses: SmtpResponseRuntime[] = [];
  const waiters: Array<(response: SmtpResponseRuntime) => void> = [];
  let current: SmtpResponseRuntime | null = null;
  let buffered = "";
  let closed = false;

  const flushResponse = (resp: SmtpResponseRuntime | null) => {
    if (!resp) {
      return;
    }
    if (waiters.length) {
      const resolve = waiters.shift();
      if (resolve) {
        resolve(resp);
      }
      return;
    }
    responses.push(resp);
  };

  const onSmtpLine = (line: string) => {
    if (!/^\d{3}[ -]/.test(line)) {
      return;
    }
    const code = Number.parseInt(line.slice(0, 3), 10);
    const done = line[3] === " ";
    if (!current || current.code !== code) {
      current = { code, lines: [] };
    }
    current.lines?.push(line);
    if (done) {
      flushResponse(current);
      current = null;
    }
  };

  transport.on("data", (chunk) => {
    buffered = parseSmtpLineBufferRuntime(buffered + String(chunk || ""), onSmtpLine);
  });

  const failWaiters = (err: Error) => {
    closed = true;
    while (waiters.length) {
      const resolve = waiters.shift();
      if (resolve) {
        resolve({ error: err });
      }
    }
  };

  transport.on("timeout", () => {
    transport.destroy(new Error("smtp timeout"));
  });
  transport.on("error", (err) => {
    failWaiters(err instanceof Error ? err : new Error(String(err)));
  });
  transport.on("close", () => {
    if (!closed) {
      failWaiters(new Error("smtp connection closed"));
    }
  });

  const nextResponse = async () => {
    if (responses.length) {
      return responses.shift();
    }
    const resp = await new Promise<SmtpResponseRuntime>((resolve) => {
      waiters.push(resolve);
    });
    if (resp && resp.error) {
      throw resp.error;
    }
    return resp;
  };

  const expectCode = async (wanted: number[]) => {
    const resp = await nextResponse();
    if (!resp || !Array.isArray(resp.lines)) {
      throw new Error("smtp protocol error");
    }
    if (!wanted.includes(Number(resp.code))) {
      throw new Error(`smtp ${resp.code}: ${resp.lines.join(" | ")}`);
    }
    return resp;
  };

  const sendCmd = (line: string) => {
    if (transport.destroyed) {
      throw new Error("smtp socket not writable");
    }
    transport.write(`${line}\r\n`);
  };

  try {
    await expectCode([220]);
    sendCmd(`EHLO ${sanitizeHeaderValueRuntime(args.helo) || "localhost"}`);
    await expectCode([250]);
    if (args.user || args.pass) {
      sendCmd("AUTH LOGIN");
      await expectCode([334]);
      sendCmd(Buffer.from(args.user, "utf8").toString("base64"));
      await expectCode([334]);
      sendCmd(Buffer.from(args.pass, "utf8").toString("base64"));
      await expectCode([235]);
    }
    sendCmd(`MAIL FROM:<${sanitizeEmailAddressRuntime(args.fromEmail)}>`);
    await expectCode([250]);
    sendCmd(`RCPT TO:<${sanitizeEmailAddressRuntime(args.toEmail)}>`);
    await expectCode([250, 251]);
    sendCmd("DATA");
    await expectCode([354]);
    transport.write(`${smtpTextMessageRuntime(args.fromEmail, args.toEmail, args.subject, args.bodyText)}\r\n.\r\n`);
    await expectCode([250]);
    sendCmd("QUIT");
  } finally {
    transport.end();
  }
}

type FetchResponseRuntime = {
  ok: boolean;
  status: number;
  statusText: string;
  text(): Promise<string>;
};

type ResendDeliverRuntimeArgs = {
  apiKey: string;
  baseUrl: string;
  bodyText: unknown;
  fetchImpl?: (url: string, init: {
    body: string;
    headers: Record<string, string>;
    method: "POST";
  }) => Promise<FetchResponseRuntime>;
  fromEmail: unknown;
  subject: unknown;
  toEmail: unknown;
};

export async function resendDeliverRuntime(args: ResendDeliverRuntimeArgs): Promise<unknown> {
  const apiKey = String(args.apiKey || "").trim();
  if (!apiKey) {
    throw new Error("resend api key not configured (set VM_EMAIL_RESEND_API_KEY)");
  }
  if (!isValidEmailRuntime(args.fromEmail)) {
    throw new Error("resend from not configured (set VM_EMAIL_FROM to a valid address)");
  }
  const fetchImpl = args.fetchImpl || fetch;
  const response = await fetchImpl(String(args.baseUrl || "https://api.resend.com/emails").trim(), {
    method: "POST",
    headers: {
      authorization: `Bearer ${apiKey}`,
      "content-type": "application/json"
    },
    body: JSON.stringify({
      from: String(args.fromEmail || ""),
      to: [normalizeEmailRuntime(args.toEmail)],
      subject: String(args.subject || ""),
      text: String(args.bodyText || "")
    })
  });
  const text = await response.text();
  let parsed: unknown = null;
  try {
    parsed = text ? JSON.parse(text) : null;
  } catch (_err) {
    parsed = null;
  }
  if (!response.ok) {
    const apiMessage = parsed && typeof parsed === "object" && "message" in parsed
      ? String(parsed.message)
      : (text || response.statusText || "request failed");
    throw new Error(`resend ${response.status}: ${apiMessage}`);
  }
  return parsed;
}

export async function deliverEmailRuntime(args: {
  appendLog: (delivery: EmailDeliveryLogRuntime) => void;
  bodyText: unknown;
  connect: SmtpDeliverRuntimeArgs["connect"];
  errorMessage: (err: unknown) => string;
  fetchImpl?: ResendDeliverRuntimeArgs["fetchImpl"];
  fromEmail: unknown;
  meta?: EmailDeliveryMetaRuntime;
  mode: string;
  nowIso: () => string;
  resendApiKey: unknown;
  resendBaseUrl: unknown;
  smtpHelo: unknown;
  smtpHost: unknown;
  smtpPass: string;
  smtpPort: number;
  smtpRejectUnauthorized: unknown;
  smtpSecure: unknown;
  smtpTimeoutMs: number;
  smtpUser: string;
  subject: unknown;
  tlsConnect: SmtpDeliverRuntimeArgs["tlsConnect"];
  toEmail: unknown;
}): Promise<EmailDeliveryLogRuntime> {
  const meta = args.meta || {};
  const delivery: EmailDeliveryLogRuntime = {
    kind: "email_delivery",
    at: args.nowIso(),
    to: normalizeEmailRuntime(args.toEmail),
    subject: String(args.subject || ""),
    body_text: String(args.bodyText || ""),
    mode: String(args.mode || "log").trim().toLowerCase(),
    status: "queued",
    template: meta.template == null ? undefined : String(meta.template || ""),
    user_id: meta.user_id == null ? undefined : String(meta.user_id || "")
  };
  if (delivery.mode === "smtp") {
    try {
      await smtpDeliverRuntime({
        bodyText: delivery.body_text,
        connect: args.connect,
        fromEmail: args.fromEmail,
        helo: args.smtpHelo,
        host: String(args.smtpHost || ""),
        pass: args.smtpPass,
        port: args.smtpPort,
        rejectUnauthorized: args.smtpRejectUnauthorized,
        secure: args.smtpSecure,
        subject: delivery.subject,
        timeoutMs: args.smtpTimeoutMs,
        tlsConnect: args.tlsConnect,
        toEmail: delivery.to,
        user: args.smtpUser
      });
      delivery.status = "sent";
    } catch (err) {
      delivery.status = "failed";
      delivery.error = args.errorMessage(err);
      args.appendLog(delivery);
      throw new Error(`email delivery failed: ${delivery.error}`);
    }
  } else if (delivery.mode === "resend") {
    try {
      const out = await resendDeliverRuntime({
        apiKey: String(args.resendApiKey || ""),
        baseUrl: String(args.resendBaseUrl || "https://api.resend.com/emails"),
        bodyText: delivery.body_text,
        fetchImpl: args.fetchImpl,
        fromEmail: args.fromEmail,
        subject: delivery.subject,
        toEmail: delivery.to
      });
      delivery.status = "sent";
      if (out && typeof out === "object" && "id" in out) {
        delivery.provider_id = String(out.id);
      }
    } catch (err) {
      delivery.status = "failed";
      delivery.error = args.errorMessage(err);
      args.appendLog(delivery);
      throw new Error(`email delivery failed: ${delivery.error}`);
    }
  } else {
    delivery.status = "logged";
  }
  args.appendLog(delivery);
  return delivery;
}
