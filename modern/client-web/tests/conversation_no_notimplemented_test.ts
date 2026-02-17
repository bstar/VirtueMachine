import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(new URL("../..", import.meta.url).pathname);

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full, out);
      continue;
    }
    if (!entry.isFile()) continue;
    if (!/\.(ts|tsx|js|mjs|cjs)$/i.test(entry.name)) continue;
    out.push(full);
  }
  return out;
}

function testNoNotImplementedConversationLeak() {
  const srcDir = path.join(ROOT, "client-web");
  const files = walk(srcDir);
  const offenders: string[] = [];
  for (const file of files) {
    const rel = path.relative(ROOT, file);
    if (rel.endsWith("client-web/tests/conversation_no_notimplemented_test.ts")) {
      continue;
    }
    const text = fs.readFileSync(file, "utf8");
    if (text.includes("Not implemented:")) {
      offenders.push(rel);
    }
  }
  assert.deepEqual(
    offenders,
    [],
    `user-facing 'Not implemented:' strings are forbidden in client-web conversation flow: ${offenders.join(", ")}`
  );
}

testNoNotImplementedConversationLeak();

console.log("conversation_no_notimplemented_test: ok");
