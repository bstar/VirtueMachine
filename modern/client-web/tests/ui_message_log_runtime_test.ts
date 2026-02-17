import assert from "node:assert/strict";
import {
  applyMessageLogScrollCommandRuntime,
  buildMessageLogRegressionProbesRuntime,
  computeMessageLogWindowRuntime,
  decodeMessageLogSnapshotRuntime,
  encodeMessageLogSnapshotRuntime
} from "../ui/message_log_runtime.ts";

function makeEntries(count: number) {
  return Array.from({ length: count }, (_unused, i) => ({
    tick: 100 + i,
    level: "info",
    text: `entry_${i}`,
    seq: i
  }));
}

function testWindowBoundaries() {
  const short = computeMessageLogWindowRuntime({
    entries: makeEntries(3),
    windowSize: 8,
    scrollOffset: 0
  });
  assert.equal(short.entries.length, 3, "short window count mismatch");
  assert.equal(short.max_offset, 0, "short window max offset mismatch");

  const trimmed = computeMessageLogWindowRuntime({
    entries: makeEntries(12),
    windowSize: 8,
    scrollOffset: 0
  });
  assert.equal(trimmed.entries.length, 8, "trimmed window count mismatch");
  assert.equal(trimmed.entries[0].tick, 104, "trimmed window first tick mismatch");
  assert.equal(trimmed.entries[7].tick, 111, "trimmed window last tick mismatch");
  assert.equal(trimmed.max_offset, 4, "trimmed window max offset mismatch");
}

function testScrollCommands() {
  const entries = makeEntries(12);
  const lineUp = applyMessageLogScrollCommandRuntime({
    entries,
    windowSize: 8,
    scrollOffset: 0,
    command: "line_up"
  });
  assert.equal(lineUp.scroll_offset, 1, "line_up offset mismatch");
  assert.equal(lineUp.entries[0].tick, 103, "line_up first tick mismatch");

  const home = applyMessageLogScrollCommandRuntime({
    entries,
    windowSize: 8,
    scrollOffset: 0,
    command: "home"
  });
  assert.equal(home.scroll_offset, 4, "home offset mismatch");
  assert.equal(home.entries[0].tick, 100, "home first tick mismatch");

  const end = applyMessageLogScrollCommandRuntime({
    entries,
    windowSize: 8,
    scrollOffset: 4,
    command: "end"
  });
  assert.equal(end.scroll_offset, 0, "end offset mismatch");
  assert.equal(end.entries[0].tick, 104, "end first tick mismatch");
}

function testPersistenceRoundtrip() {
  const encoded = encodeMessageLogSnapshotRuntime({
    entries: makeEntries(12),
    windowSize: 8,
    scrollOffset: 3
  });
  const decoded = decodeMessageLogSnapshotRuntime(encoded);
  assert.ok(decoded, "snapshot decode should succeed");
  assert.equal(decoded!.entries.length, 12, "decoded entry count mismatch");
  assert.equal(decoded!.window_size, 8, "decoded window size mismatch");
  assert.equal(decoded!.scroll_offset, 3, "decoded scroll offset mismatch");
}

function testRegressionProbes() {
  const probes = buildMessageLogRegressionProbesRuntime();
  assert.equal(probes.window_cases.length, 2, "message window case count mismatch");
  assert.equal(probes.scroll_command_cases.length, 4, "message scroll command case count mismatch");
  assert.equal(probes.persistence_cases.length, 1, "message persistence case count mismatch");
  assert.equal(probes.persistence_cases[0].ok, true, "message persistence probe should roundtrip");
}

testWindowBoundaries();
testScrollCommands();
testPersistenceRoundtrip();
testRegressionProbes();

console.log("ui_message_log_runtime_test: ok");
