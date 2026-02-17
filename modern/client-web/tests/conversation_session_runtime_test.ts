import assert from "node:assert/strict";
import {
  buildDebugChatLedgerText,
  pushLedgerMessage,
  submitLegacyConversationInput
} from "../conversation/session_runtime.ts";

function testUnimplementedReplyFallsBackToCanonicalNoResponse() {
  const lines: string[] = [];
  const state: any = {
    legacyConversationInput: "job",
    legacyConversationActive: true,
    legacyConversationActorEntityId: 5,
    legacyConversationTargetObjNum: 5,
    legacyConversationTargetObjType: 0x199
  };
  const out = submitLegacyConversationInput(state, {
    pushLedgerMessage: (line: string) => lines.push(String(line || "")),
    pushPrompt: () => {},
    reply: () => ({ kind: "unimplemented", lines: [] })
  });
  assert.equal(out.kind, "response", "submit should return response kind");
  assert.deepEqual(
    lines,
    ["job", "No response."],
    "unimplemented reply should degrade to canonical no-response ledger output"
  );
}

testUnimplementedReplyFallsBackToCanonicalNoResponse();

function testDebugLedgerIncludesConversationMetadata() {
  const state: any = {
    legacyConversationActive: true,
    legacyConversationActorEntityId: 6,
    legacyConversationTargetObjNum: 6,
    legacyConversationTargetObjType: 0x17a,
    legacyLedgerLines: [],
    debugChatLedger: []
  };
  pushLedgerMessage(state, "You see mage.", {
    maxChars: 32,
    maxLines: 40,
    tick: 2_988_076,
    nowMs: 1_738_800_000_000
  });
  const text = buildDebugChatLedgerText(state.debugChatLedger);
  assert.match(
    text,
    /\[2988076\] You see mage\. \{actor=6 conv=6 type=0x17a\}/,
    "debug ledger text should include actor/conv/type metadata for active conversation lines"
  );
}

function testDebugLedgerFormatsPlainLinesWithoutMetadata() {
  const text = buildDebugChatLedgerText([
    { tick: 123, line: "plain status message", actorId: null, convId: null, objType: null }
  ]);
  assert.equal(
    text,
    "[0000123] plain status message",
    "non-conversation debug ledger rows should not include metadata suffix"
  );
}

testDebugLedgerIncludesConversationMetadata();
testDebugLedgerFormatsPlainLinesWithoutMetadata();

console.log("conversation_session_runtime_test: ok");
