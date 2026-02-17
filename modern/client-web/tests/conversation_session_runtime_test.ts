import assert from "node:assert/strict";
import { submitLegacyConversationInput } from "../conversation/session_runtime.ts";

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

console.log("conversation_session_runtime_test: ok");
