import assert from "node:assert/strict";
import {
  boolEnvOnRuntime,
  parseSmtpLineBufferRuntime,
  sanitizeEmailAddressRuntime,
  sanitizeHeaderValueRuntime,
  smtpTextMessageRuntime
} from "../email_runtime.ts";

assert.equal(sanitizeHeaderValueRuntime(" Hello\r\nInjected: bad "), "Hello Injected: bad");
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

console.log("email_runtime_test: ok");
