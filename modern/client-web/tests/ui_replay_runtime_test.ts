import assert from "node:assert/strict";
import {
  applyReplayDownloadDisabledRuntime,
  applyReplayDownloadReadyRuntime,
  compareReplayCheckpointsRuntime,
  replayCommandTicksRuntime,
  replayCheckpointsCsvRuntime,
  replayTotalTicksRuntime,
  replayVerificationResultRuntime,
  replayVerificationViewRuntime,
  releaseReplayUrlRuntime,
  runReplayCheckpointsRuntime,
  setReplayCsvRuntime,
  type ReplayCheckpointRuntime
} from "../ui/replay_runtime.ts";

function fakeReplayLink() {
  const classes = new Set<string>(["disabled"]);
  return {
    classes,
    download: "",
    href: "",
    removed: [] as string[],
    classList: {
      add(name: string) {
        classes.add(name);
      },
      remove(name: string) {
        classes.delete(name);
      }
    },
    removeAttribute(name: string) {
      this.removed.push(name);
      if (name === "href") {
        this.href = "";
      }
    }
  };
}

const checkpoints: ReplayCheckpointRuntime[] = [
  { hash: "abcd", tick: 32 },
  { hash: "ef01", tick: 64 }
];

assert.equal(replayCheckpointsCsvRuntime(checkpoints), "tick,hash\n32,abcd\n64,ef01\n");
assert.equal(replayCheckpointsCsvRuntime([]), "tick,hash\n");
assert.deepEqual(replayCommandTicksRuntime([{ tick: 3 }, { tick: "7" }, {}]), [3, 7, 0]);
assert.equal(replayTotalTicksRuntime({ currentTick: 0, commandTicks: [] }), 1);
assert.equal(replayTotalTicksRuntime({ currentTick: 5, commandTicks: [1, 9, 2] }), 9);
assert.equal(replayTotalTicksRuntime({ currentTick: 12, commandTicks: [1, 9, 2] }), 12);

{
  type Sim = { tick: number; value: number };
  type Command = { delta?: number; tick?: number };
  const checkpoints = runReplayCheckpointsRuntime<Sim, Command>({
    commands: [{ delta: 2, tick: 1 }, { delta: 3, tick: 2 }],
    createSim: () => ({ tick: 0, value: 1 }),
    interval: 2,
    totalTicks: 5,
    stepSim: (sim, queue) => {
      sim.tick += 1;
      for (const cmd of queue) {
        sim.value += Number(cmd.delta) || 0;
      }
      return sim.tick === 1 ? [{ delta: 4, tick: 3 }] : [];
    },
    hashSim: (sim) => `${sim.tick}:${sim.value}`
  });
  assert.deepEqual(checkpoints, [
    { tick: 2, hash: "2:10" },
    { tick: 4, hash: "4:10" },
    { tick: 5, hash: "5:10" }
  ]);
}

assert.deepEqual(compareReplayCheckpointsRuntime(checkpoints, checkpoints.map((cp) => ({ ...cp }))), {
  allMatch: true,
  sameLength: true
});
assert.deepEqual(compareReplayCheckpointsRuntime(checkpoints, checkpoints.slice(0, 1)), {
  allMatch: false,
  sameLength: false
});
assert.deepEqual(compareReplayCheckpointsRuntime(checkpoints, [
  { hash: "abcd", tick: 32 },
  { hash: "mismatch", tick: 64 }
]), {
  allMatch: false,
  sameLength: true
});

assert.deepEqual(replayVerificationViewRuntime({
  animation: { allMatch: true, sameLength: true },
  animationCheckpointCount: 2,
  replay: { allMatch: true, sameLength: true },
  replayCheckpointCount: 2,
  totalTicks: 64
}), {
  diagClass: "ok",
  diagText: "Replay + animation verified stable over 64 ticks. Download checkpoints.csv for baseline tracking.",
  replayStable: true,
  statText: "stable (2 checkpoints)"
});

assert.deepEqual(replayVerificationViewRuntime({
  animation: { allMatch: true, sameLength: true },
  animationCheckpointCount: 0,
  replay: { allMatch: true, sameLength: true },
  replayCheckpointCount: 2,
  totalTicks: 64
}), {
  diagClass: "ok",
  diagText: "Replay verified stable over 64 ticks. Download checkpoints.csv for baseline tracking.",
  replayStable: true,
  statText: "stable (2 checkpoints)"
});

assert.deepEqual(replayVerificationViewRuntime({
  animation: { allMatch: true, sameLength: true },
  animationCheckpointCount: 2,
  replay: { allMatch: false, sameLength: true },
  replayCheckpointCount: 2,
  totalTicks: 64
}), {
  diagClass: "warn",
  diagText: "Replay mismatch detected. Determinism drift likely in command/tick path.",
  replayStable: false,
  statText: "mismatch"
});

assert.deepEqual(replayVerificationViewRuntime({
  animation: { allMatch: false, sameLength: true },
  animationCheckpointCount: 2,
  replay: { allMatch: true, sameLength: true },
  replayCheckpointCount: 2,
  totalTicks: 64
}), {
  diagClass: "warn",
  diagText: "Animation mismatch detected. Animated tile phase is not deterministic.",
  replayStable: false,
  statText: "mismatch"
});

assert.deepEqual(replayVerificationResultRuntime({
  animationA: checkpoints,
  animationB: checkpoints.map((cp) => ({ ...cp })),
  replayA: checkpoints,
  replayB: checkpoints.map((cp) => ({ ...cp })),
  totalTicks: 64
}), {
  diagClass: "ok",
  diagText: "Replay + animation verified stable over 64 ticks. Download checkpoints.csv for baseline tracking.",
  replayStable: true,
  statText: "stable (2 checkpoints)",
  csvText: "tick,hash\n32,abcd\n64,ef01\n"
});

assert.deepEqual(replayVerificationResultRuntime({
  animationA: checkpoints,
  animationB: checkpoints.map((cp) => ({ ...cp })),
  replayA: checkpoints,
  replayB: [{ hash: "abcd", tick: 32 }],
  totalTicks: 64
}), {
  diagClass: "warn",
  diagText: "Replay mismatch detected. Determinism drift likely in command/tick path.",
  replayStable: false,
  statText: "mismatch",
  csvText: null
});

{
  const link = fakeReplayLink();
  applyReplayDownloadReadyRuntime(link, "blob:abc");
  assert.equal(link.href, "blob:abc");
  assert.equal(link.download, "virtuemachine-replay-checkpoints.csv");
  assert.equal(link.classes.has("disabled"), false);
}

{
  const link = fakeReplayLink();
  link.href = "blob:abc";
  applyReplayDownloadDisabledRuntime(link);
  assert.equal(link.classes.has("disabled"), true);
  assert.deepEqual(link.removed, ["href"]);
  assert.equal(link.href, "");
}

{
  const revoked: string[] = [];
  const state = { replayUrl: "blob:old" };
  releaseReplayUrlRuntime(state, {
    revokeObjectURL: (url) => revoked.push(url)
  });
  assert.deepEqual(revoked, ["blob:old"]);
  assert.equal(state.replayUrl, null);
  releaseReplayUrlRuntime(state, {
    revokeObjectURL: (url) => revoked.push(url)
  });
  assert.deepEqual(revoked, ["blob:old"]);
}

{
  const link = fakeReplayLink();
  const revoked: string[] = [];
  const createdTypes: string[] = [];
  const state = { replayUrl: "blob:old" };
  setReplayCsvRuntime({
    csvText: "tick,hash\n1,abc\n",
    link,
    state,
    url: {
      createObjectURL: (blob) => {
        createdTypes.push(blob.type);
        return "blob:new";
      },
      revokeObjectURL: (url) => revoked.push(url)
    }
  });
  assert.deepEqual(revoked, ["blob:old"]);
  assert.deepEqual(createdTypes, ["text/csv;charset=utf-8"]);
  assert.equal(state.replayUrl, "blob:new");
  assert.equal(link.href, "blob:new");
  assert.equal(link.download, "virtuemachine-replay-checkpoints.csv");
  assert.equal(link.classes.has("disabled"), false);
}

console.log("ui_replay_runtime_test: ok");
