import assert from "node:assert/strict";
import {
  UI_PROBE_SCHEMA_VERSION,
  buildUiProbeContract,
  createCanonicalTestAvatar,
  uiProbeDigest
} from "../ui_probe_contract.js";

function runSampleProbeFixture() {
  const probe = buildUiProbeContract({ mode: "sample" });
  assert.equal(probe.schema_version, UI_PROBE_SCHEMA_VERSION, "schema mismatch");
  assert.equal(probe.mode, "sample", "mode mismatch");
  assert.equal(probe.runtime_profile, "canonical_strict", "sample runtime profile mismatch");
  assert.deepEqual(probe.runtime_extensions, {}, "sample runtime extensions mismatch");
  assert.equal(probe.canonical_ui.avatar_panel.avatar.id, 1, "sample avatar id mismatch");
  assert.equal(probe.canonical_ui.avatar_panel.avatar.party_index, 0, "sample avatar active index mismatch");
  assert.equal(probe.canonical_ui.inventory_panel.entries[0].key, "0x073:0", "inventory sort mismatch");
  assert.equal(probe.canonical_ui.paperdoll_panel.slots.length, 10, "equip slots length mismatch");
}

function runLiveProbeFixture() {
  const probe = buildUiProbeContract({
    mode: "live",
    runtime: {
      sim: {
        tick: 99,
        world: { active: 1, map_x: 400, map_y: 401, map_z: 0 },
        inventory: { "0x0fa:1": 2, "0x073:0": 1 }
      },
      partyMembers: [1, 77, 88],
      commandLog: [
        { tick: 90, kind: "move" },
        { tick: 92, kind: "get" }
      ],
      runtimeProfile: "canonical_plus",
      runtimeExtensions: {
        quest_system: true,
        housing: true
      }
    }
  });
  assert.equal(probe.mode, "live", "live mode mismatch");
  assert.equal(probe.tick, 99, "live tick mismatch");
  assert.equal(probe.runtime_profile, "canonical_plus", "live runtime profile mismatch");
  assert.equal(probe.runtime_extensions.quest_system, true, "live runtime quest extension mismatch");
  assert.equal(probe.runtime_extensions.housing, true, "live runtime housing extension mismatch");
  assert.equal(probe.canonical_ui.avatar_panel.avatar.id, 77, "live avatar resolution mismatch");
  assert.equal(probe.canonical_ui.avatar_panel.avatar.map_x, 400, "live avatar map_x mismatch");
  assert.equal(probe.canonical_ui.inventory_panel.entries.length, 2, "live inventory entries mismatch");
  assert.equal(probe.canonical_ui.message_log_panel.entries.length, 2, "live message projection mismatch");
}

function runAvatarProcessFixture() {
  const a = createCanonicalTestAvatar({
    world: { map_x: 307, map_y: 347, map_z: 0 },
    party_members: [1, 12, 23],
    active_party_index: 2
  });
  assert.equal(a.id, 23, "active party resolution mismatch");
  const b = createCanonicalTestAvatar({
    world: { map_x: 307, map_y: 347, map_z: 0 },
    party_members: [1, 12, 23],
    active_party_index: 99
  });
  assert.equal(b.id, 1, "fallback party[0] resolution mismatch");
}

function runDigestFixture() {
  const a = uiProbeDigest(buildUiProbeContract({ mode: "sample" }));
  const b = uiProbeDigest(buildUiProbeContract({ mode: "sample" }));
  assert.equal(a, b, "sample digest must be deterministic");
}

runSampleProbeFixture();
runLiveProbeFixture();
runAvatarProcessFixture();
runDigestFixture();

console.log("ui_probe_contract_test: ok");
