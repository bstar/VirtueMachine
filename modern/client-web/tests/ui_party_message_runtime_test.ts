import assert from "node:assert/strict";
import {
  buildPartyMessageRegressionProbesRuntime,
  normalizePartyMemberIdsRuntime,
  projectMessageLogEntriesRuntime,
  projectPartyPanelMembersRuntime,
  resolvePartySwitchDigitRuntime
} from "../ui/party_message_runtime.ts";

function testPartyMemberNormalization() {
  assert.deepEqual(
    normalizePartyMemberIdsRuntime([1, 12, 12, 0, -3, 23], 1),
    [1, 12, 23],
    "party member normalization mismatch"
  );
  assert.deepEqual(
    normalizePartyMemberIdsRuntime([], 77),
    [77],
    "party member fallback mismatch"
  );
}

function testPartyProjection() {
  const panel = projectPartyPanelMembersRuntime({
    partyMembers: [1, 23, 12],
    activeIndex: 1,
    nameById: { "1": "Avatar", "12": "Iolo", "23": "Shamino" }
  });
  assert.deepEqual(
    panel.map((m) => ({ id: m.id, name: m.name, active: m.active, idx: m.party_index })),
    [
      { id: 1, name: "Avatar", active: false, idx: 0 },
      { id: 23, name: "Shamino", active: true, idx: 1 },
      { id: 12, name: "Iolo", active: false, idx: 2 }
    ],
    "party projection should preserve party order"
  );
}

function testPartySwitchDigit() {
  const applied = resolvePartySwitchDigitRuntime({
    digitKey: "2",
    partyMembers: [1, 12, 23],
    activeIndex: 0
  });
  assert.equal(applied.changed, true, "digit 2 should apply switch");
  assert.equal(applied.next_active_index, 1, "digit 2 should map to party index 1");

  const same = resolvePartySwitchDigitRuntime({
    digitKey: "1",
    partyMembers: [1, 12, 23],
    activeIndex: 0
  });
  assert.equal(same.changed, false, "selecting current party member should not change");
  assert.equal(same.reason, "same_index", "same-index reason mismatch");

  const outOfRange = resolvePartySwitchDigitRuntime({
    digitKey: "9",
    partyMembers: [1, 12, 23],
    activeIndex: 1
  });
  assert.equal(outOfRange.changed, false, "out-of-range digit should not change");
  assert.equal(outOfRange.reason, "out_of_range", "out-of-range reason mismatch");
}

function testMessageWindowProjection() {
  const entries = projectMessageLogEntriesRuntime({
    entries: Array.from({ length: 12 }, (_unused, i) => ({
      tick: 100 + i,
      level: "info",
      text: `entry_${i}`,
      seq: i
    })),
    maxEntries: 8,
    lineMaxChars: 16
  });
  assert.equal(entries.length, 8, "message window length mismatch");
  assert.equal(entries[0].tick, 104, "message window first tick mismatch");
  assert.equal(entries[7].tick, 111, "message window last tick mismatch");
}

function testRegressionProbeMatrix() {
  const probes = buildPartyMessageRegressionProbesRuntime();
  assert.equal(probes.party_selection.length, 4, "party selection probe count mismatch");
  assert.equal(probes.message_windows.length, 2, "message window probe count mismatch");
  assert.deepEqual(
    probes.party_selection[0],
    {
      id: "select_first",
      changed: true,
      next_active_index: 0,
      reason: "applied"
    },
    "first party selection probe mismatch"
  );
}

testPartyMemberNormalization();
testPartyProjection();
testPartySwitchDigit();
testMessageWindowProjection();
testRegressionProbeMatrix();

console.log("ui_party_message_runtime_test: ok");
