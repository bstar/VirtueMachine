import assert from "node:assert/strict";
import {
  beginLegacyConversationSession,
  buildDebugChatLedgerText,
  legacyLedgerPaginationOptionsRuntime,
  legacyLedgerPushOptionsRuntime,
  legacyConversationEndedDiagRuntime,
  legacyConversationOkDiagRuntime,
  legacyConversationReplyFailedDiagRuntime,
  pushLedgerMessage,
  submitLegacyConversationInput,
  type LegacyConversationState
} from "../conversation/session_runtime.ts";

function testUnimplementedReplyFallsBackToCanonicalNoResponse() {
  const lines: string[] = [];
  const state: LegacyConversationState = {
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
  const state: LegacyConversationState = {
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
    ["bad-row"],
    null,
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

function testBeginConversationSessionAppliesStateAndOpeningBlock() {
  const state: LegacyConversationState = {
    legacyStatusDisplay: 0x92
  };
  const out = beginLegacyConversationSession(state, {
    actorEntityId: 12,
    authoritative: true,
    desc: "Maldric",
    equipmentSlots: [{ slot: "weapon", label: "Sword" }],
    formatYouSeeLine: (text) => `You see ${text}.`,
    inputOpcode: 0xef,
    openingLines: ["Good day.", "", "Name?"],
    portraitTile: 0x123,
    sessionId: "sess1",
    statusDisplay: 0x9e,
    targetName: "Maldric",
    targetObjNum: 99,
    targetObjType: 0x18d,
    pc: 0x222
  });
  assert.deepEqual(out.openingBlock, ["You see Maldric.", "", "Good day.", "Name?", ""]);
  assert.equal(state.legacyConversationPrevStatus, 0x92);
  assert.equal(state.legacyStatusDisplay, 0x9e);
  assert.equal(state.legacyConversationActive, true);
  assert.equal(state.legacyConversationAuthoritative, true);
  assert.equal(state.legacyConversationSessionId, "sess1");
  assert.equal(state.legacyConversationInput, "");
  assert.equal(state.legacyConversationTargetName, "Maldric");
  assert.equal(state.legacyConversationActorEntityId, 12);
  assert.equal(state.legacyConversationPortraitTile, 0x123);
  assert.equal(state.legacyConversationTargetObjNum, 99);
  assert.equal(state.legacyConversationTargetObjType, 0x18d);
  assert.equal(state.legacyConversationShowInventory, true);
  assert.equal(state.legacyConversationPc, 0x222);
  assert.equal(state.legacyConversationInputOpcode, 0xef);
}

function testBeginConversationSessionDefaultsEmptyEquipmentAndTarget() {
  const state: LegacyConversationState = {};
  const out = beginLegacyConversationSession(state, {
    desc: "",
    openingLines: ["  "],
    targetName: ""
  });
  assert.deepEqual(out.openingBlock, ["Unknown"]);
  assert.equal(state.legacyConversationTargetName, "Unknown");
  assert.equal(state.legacyConversationDescText, "Unknown");
  assert.equal(state.legacyConversationShowInventory, false);
  assert.deepEqual(state.legacyConversationEquipmentSlots, []);
}

testBeginConversationSessionAppliesStateAndOpeningBlock();
testBeginConversationSessionDefaultsEmptyEquipmentAndTarget();

assert.deepEqual(legacyLedgerPushOptionsRuntime({
  maxChars: 17.9,
  maxLines: 10.1,
  tick: -1,
  nowMs: 1234
}), {
  maxChars: 17,
  maxLines: 10,
  tick: 0xffffffff,
  nowMs: 1234
});

assert.deepEqual(legacyLedgerPaginationOptionsRuntime({
  maxChars: 17,
  maxLines: 10,
  tick: 42,
  nowMs: 1234
}), {
  pageMaxLines: 9,
  maxChars: 17,
  tick: 42,
  nowMs: 1234
});

assert.deepEqual(legacyLedgerPaginationOptionsRuntime({
  maxChars: 0,
  maxLines: 0,
  tick: "bad",
  nowMs: 0
}).pageMaxLines, 1);

assert.deepEqual(legacyConversationOkDiagRuntime("Conversation cancelled."), {
  diagClass: "diag ok",
  diagText: "Conversation cancelled."
});
assert.equal(legacyConversationOkDiagRuntime(""), null);
assert.deepEqual(legacyConversationEndedDiagRuntime(), {
  diagClass: "diag ok",
  diagText: "Conversation ended."
});
assert.deepEqual(legacyConversationReplyFailedDiagRuntime("offline"), {
  diagClass: "diag warn",
  diagText: "Conversation reply failed: offline"
});

console.log("conversation_session_runtime_test: ok");
