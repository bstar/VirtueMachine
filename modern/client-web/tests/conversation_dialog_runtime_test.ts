import assert from "node:assert/strict";
import {
  conversationRunFromKeyCursor,
  legacyConversationReply
} from "../conversation/dialog_runtime.ts";

const OP = {
  ASKTOP: 0xf7,
  GET: 0xf8,
  KEY: 0xef,
  RES: 0xf6,
  ENDRES: 0xee,
  END: 0xff
} as const;

const SCRIPT = Uint8Array.from([
  OP.ASKTOP,
  OP.KEY, 0x6a, 0x6f, 0x62, OP.RES, 0x22, 0x48, 0x69, 0x22, OP.ENDRES,
  OP.END
]);

function keyMatchesInput(pattern: string, input: string) {
  const p = String(pattern || "").toLowerCase();
  const i = String(input || "").toLowerCase();
  return i.startsWith(p);
}

function testConversationRunFromKeyCursor() {
  const out = conversationRunFromKeyCursor({
    scriptBytes: SCRIPT,
    startPc: 0,
    typed: "job",
    vmContext: null,
    opcodes: OP,
    keyMatchesInput,
    renderMacros: (line: string) => line,
    decodeResponseOpcodeAware: () => ({
      lines: ["Hi"],
      stopOpcode: 0,
      stopPc: -1
    })
  });
  assert.equal(out.kind, "ok", "cursor reply should match job");
  assert.deepEqual(out.lines, ["Hi"], "cursor reply lines mismatch");
}

function testConversationRunFromKeyCursorNoMatch() {
  const out = conversationRunFromKeyCursor({
    scriptBytes: SCRIPT,
    startPc: 0,
    typed: "name",
    vmContext: null,
    opcodes: OP,
    keyMatchesInput,
    renderMacros: (line: string) => line,
    decodeResponseOpcodeAware: () => ({
      lines: [],
      stopOpcode: 0,
      stopPc: -1
    })
  });
  assert.equal(out.kind, "no-match", "cursor reply should not match name");
}

function testLegacyConversationReplyFallbackKinds() {
  const noMatch = legacyConversationReply({
    typed: "job",
    rules: [],
    keyMatchesInput,
    decodeResponseBytes: () => ({ lines: [] }),
    renderMacros: (line: string) => line
  });
  assert.equal(noMatch.kind, "no-match", "legacy reply should report no-match with empty rules");

  const unimplemented = legacyConversationReply({
    typed: "job",
    rules: [{
      keys: ["job"],
      responseBytes: new Uint8Array([1, 2, 3]),
      responseStartPc: 0,
      responseEndPc: 3
    }],
    keyMatchesInput,
    decodeResponseBytes: () => ({ lines: [] }),
    renderMacros: (line: string) => line
  });
  assert.equal(unimplemented.kind, "unimplemented", "legacy reply should expose unimplemented decode path");
}

testConversationRunFromKeyCursor();
testConversationRunFromKeyCursorNoMatch();
testLegacyConversationReplyFallbackKinds();

console.log("conversation_dialog_runtime_test: ok");
