import assert from "node:assert/strict";
import {
  boolEnvOnRuntime,
  deliverEmailRuntime,
  type EmailDeliveryLogRuntime,
  isValidEmailRuntime,
  normalizeEmailRuntime,
  parseSmtpLineBufferRuntime,
  resendDeliverRuntime,
  sanitizeEmailAddressRuntime,
  sanitizeHeaderValueRuntime,
  smtpDeliverRuntime,
  smtpTextMessageRuntime
} from "../email_runtime.ts";

assert.equal(sanitizeHeaderValueRuntime(" Hello\r\nInjected: bad "), "Hello Injected: bad");
assert.equal(normalizeEmailRuntime(" Avatar@Example.COM "), "avatar@example.com");
assert.equal(isValidEmailRuntime("avatar@example.com"), true);
assert.equal(isValidEmailRuntime("avatar.example.com"), false);
assert.equal(sanitizeEmailAddressRuntime("<avatar@example.com>\r\nBcc: bad"), "avatar@example.comBcc: bad");

assert.equal(boolEnvOnRuntime(null, true), true);
assert.equal(boolEnvOnRuntime("yes", false), true);
assert.equal(boolEnvOnRuntime("OFF", true), false);
assert.equal(boolEnvOnRuntime("unexpected", true), true);

const msg = smtpTextMessageRuntime(
  "<from@example.com>",
  "to@example.com",
  "Hi\r\nBad",
  "line1\n.line2\r\nline3"
);
assert.equal(msg, [
  "From: <from@example.com>",
  "To: <to@example.com>",
  "Subject: Hi Bad",
  "MIME-Version: 1.0",
  "Content-Type: text/plain; charset=utf-8",
  "Content-Transfer-Encoding: 8bit",
  "",
  "line1",
  "..line2",
  "line3"
].join("\r\n"));

const lines: string[] = [];
const rest = parseSmtpLineBufferRuntime("250-hello\r\n250 ok\r\n354 go", (line) => lines.push(line));
assert.deepEqual(lines, ["250-hello", "250 ok"]);
assert.equal(rest, "354 go");

const smtpWrites: string[] = [];
let smtpEnded = false;
type SmtpListener = (arg?: unknown) => void;
const smtpListeners = new Map<string, SmtpListener[]>();
const emitSmtp = (event: string, arg?: unknown) => {
  for (const listener of smtpListeners.get(event) || []) {
    listener(arg);
  }
};
const smtpTransport = {
  destroyed: false,
  destroy(err?: Error) {
    this.destroyed = true;
    emitSmtp("error", err || new Error("destroyed"));
  },
  end() {
    smtpEnded = true;
  },
  on(event: "close" | "data" | "error" | "timeout", listener: SmtpListener) {
    const prior = smtpListeners.get(event) || [];
    prior.push(listener);
    smtpListeners.set(event, prior);
  },
  setEncoding(_encoding: BufferEncoding) {},
  setTimeout(_ms: number) {},
  write(data: string) {
    smtpWrites.push(data);
    const line = data.split("\r\n")[0];
    if (line.startsWith("EHLO ")) {
      queueMicrotask(() => emitSmtp("data", "250-local\r\n250 OK\r\n"));
    } else if (line.startsWith("MAIL FROM:")) {
      queueMicrotask(() => emitSmtp("data", "250 sender ok\r\n"));
    } else if (line.startsWith("RCPT TO:")) {
      queueMicrotask(() => emitSmtp("data", "251 recipient ok\r\n"));
    } else if (line === "DATA") {
      queueMicrotask(() => emitSmtp("data", "354 send data\r\n"));
    } else if (data.endsWith("\r\n.\r\n")) {
      queueMicrotask(() => emitSmtp("data", "250 queued\r\n"));
    }
  }
};
const smtpConnect = () => {
  queueMicrotask(() => emitSmtp("data", "220 ready\r\n"));
  return smtpTransport;
};

await smtpDeliverRuntime({
  bodyText: "hello",
  connect: smtpConnect,
  fromEmail: "from@example.com",
  helo: "unit.test",
  host: "127.0.0.1",
  pass: "",
  port: 25,
  rejectUnauthorized: true,
  secure: false,
  subject: "Subject",
  timeoutMs: 1000,
  tlsConnect: smtpConnect,
  toEmail: "to@example.com",
  user: ""
});
assert.equal(smtpEnded, true);
assert.deepEqual(smtpWrites.slice(0, 4), [
  "EHLO unit.test\r\n",
  "MAIL FROM:<from@example.com>\r\n",
  "RCPT TO:<to@example.com>\r\n",
  "DATA\r\n"
]);
assert.equal(smtpWrites.some((line) => line.includes("Subject: Subject")), true);
assert.equal(smtpWrites.at(-1), "QUIT\r\n");

const resendOut = await resendDeliverRuntime({
  apiKey: "key_123",
  baseUrl: "https://resend.example.test/emails",
  bodyText: "verify",
  fetchImpl: async (url, init) => {
    assert.equal(url, "https://resend.example.test/emails");
    assert.equal(init.method, "POST");
    assert.equal(init.headers.authorization, "Bearer key_123");
    assert.deepEqual(JSON.parse(init.body), {
      from: "from@example.com",
      to: ["to@example.com"],
      subject: "Verify",
      text: "verify"
    });
    return {
      ok: true,
      status: 200,
      statusText: "OK",
      text: async () => "{\"id\":\"email_123\"}"
    };
  },
  fromEmail: "from@example.com",
  subject: "Verify",
  toEmail: "TO@EXAMPLE.COM"
});
assert.deepEqual(resendOut, { id: "email_123" });

await assert.rejects(
  () => resendDeliverRuntime({
    apiKey: "",
    baseUrl: "https://resend.example.test/emails",
    bodyText: "",
    fromEmail: "from@example.com",
    subject: "",
    toEmail: "to@example.com"
  }),
  /resend api key not configured/
);

const unusedConnect = () => {
  throw new Error("unused transport");
};

{
  const logs: EmailDeliveryLogRuntime[] = [];
  const out = await deliverEmailRuntime({
    appendLog: (delivery) => logs.push({ ...delivery }),
    bodyText: "body",
    connect: unusedConnect,
    errorMessage: (err) => err instanceof Error ? err.message : String(err),
    fromEmail: "from@example.com",
    meta: { template: "verify", user_id: "u1" },
    mode: "log",
    nowIso: () => "2026-06-14T00:00:00.000Z",
    resendApiKey: "",
    resendBaseUrl: "https://resend.example.test/emails",
    smtpHelo: "unit.test",
    smtpHost: "",
    smtpPass: "",
    smtpPort: 25,
    smtpRejectUnauthorized: true,
    smtpSecure: false,
    smtpTimeoutMs: 1000,
    smtpUser: "",
    subject: "Subject",
    tlsConnect: unusedConnect,
    toEmail: "TO@EXAMPLE.COM"
  });
  assert.equal(out.status, "logged");
  assert.equal(out.to, "to@example.com");
  assert.equal(out.template, "verify");
  assert.deepEqual(logs, [out]);
}

{
  const logs: EmailDeliveryLogRuntime[] = [];
  const out = await deliverEmailRuntime({
    appendLog: (delivery) => logs.push({ ...delivery }),
    bodyText: "body",
    connect: unusedConnect,
    errorMessage: (err) => err instanceof Error ? err.message : String(err),
    fetchImpl: async () => ({
      ok: true,
      status: 200,
      statusText: "OK",
      text: async () => "{\"id\":\"email_456\"}"
    }),
    fromEmail: "from@example.com",
    mode: "resend",
    nowIso: () => "2026-06-14T00:00:00.000Z",
    resendApiKey: "key_456",
    resendBaseUrl: "https://resend.example.test/emails",
    smtpHelo: "unit.test",
    smtpHost: "",
    smtpPass: "",
    smtpPort: 25,
    smtpRejectUnauthorized: true,
    smtpSecure: false,
    smtpTimeoutMs: 1000,
    smtpUser: "",
    subject: "Subject",
    tlsConnect: unusedConnect,
    toEmail: "to@example.com"
  });
  assert.equal(out.status, "sent");
  assert.equal(out.provider_id, "email_456");
  assert.deepEqual(logs, [out]);
}

{
  const logs: EmailDeliveryLogRuntime[] = [];
  await assert.rejects(
    () => deliverEmailRuntime({
      appendLog: (delivery) => logs.push({ ...delivery }),
      bodyText: "body",
      connect: unusedConnect,
      errorMessage: (err) => err instanceof Error ? err.message : String(err),
      fetchImpl: async () => ({
        ok: false,
        status: 500,
        statusText: "Server Error",
        text: async () => "{\"message\":\"boom\"}"
      }),
      fromEmail: "from@example.com",
      mode: "resend",
      nowIso: () => "2026-06-14T00:00:00.000Z",
      resendApiKey: "key_789",
      resendBaseUrl: "https://resend.example.test/emails",
      smtpHelo: "unit.test",
      smtpHost: "",
      smtpPass: "",
      smtpPort: 25,
      smtpRejectUnauthorized: true,
      smtpSecure: false,
      smtpTimeoutMs: 1000,
      smtpUser: "",
      subject: "Subject",
      tlsConnect: unusedConnect,
      toEmail: "to@example.com"
    }),
    /email delivery failed: resend 500: boom/
  );
  assert.equal(logs.length, 1);
  assert.equal(logs[0].status, "failed");
  assert.equal(logs[0].error, "resend 500: boom");
}

console.log("email_runtime_test: ok");
