import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  UI_PROBE_SCHEMA_VERSION,
  buildUiProbeContract,
  createCanonicalTestAvatar,
  uiProbeDigest
} from "../ui_probe_contract.ts";

function runSampleProbeFixture() {
  const probe = buildUiProbeContract({ mode: "sample" });
  assert.equal(probe.schema_version, UI_PROBE_SCHEMA_VERSION, "schema mismatch");
  assert.equal(probe.mode, "sample", "mode mismatch");
  assert.equal(probe.runtime_profile, "canonical_strict", "sample runtime profile mismatch");
  assert.deepEqual(probe.runtime_extensions, {}, "sample runtime extensions mismatch");
  assert.equal(probe.canonical_ui.avatar_panel.avatar.id, 1, "sample avatar id mismatch");
  assert.equal(probe.canonical_ui.avatar_panel.avatar.party_index, 0, "sample avatar active index mismatch");
  assert.equal(probe.canonical_ui.inventory_panel.entries[0].key, "0x073:0", "inventory sort mismatch");
  assert.equal(probe.canonical_ui.inventory_panel.hitboxes.length, 12, "inventory hitbox count mismatch");
  assert.equal(
    probe.canonical_ui.inventory_panel.regression_probe_counts.inventory_to_equip,
    96,
    "inventory->equip probe count mismatch"
  );
  assert.equal(
    probe.canonical_ui.inventory_panel.regression_probe_counts.equip_to_inventory,
    96,
    "equip->inventory probe count mismatch"
  );
  assert.equal(probe.canonical_ui.paperdoll_panel.slots.length, 10, "equip slots length mismatch");
  assert.equal(probe.canonical_ui.paperdoll_panel.hitboxes.length, 8, "paperdoll hitbox count mismatch");
  assert.equal(
    probe.canonical_ui.paperdoll_panel.regression_probe_counts.equip_resolution_cases,
    6,
    "paperdoll equip-resolution case count mismatch"
  );
  assert.equal(
    probe.canonical_ui.paperdoll_panel.regression_probe_counts.equip_resolution_dropped_total,
    2,
    "paperdoll equip-resolution dropped total mismatch"
  );
  assert.equal(probe.canonical_ui.party_panel.members.length, 3, "sample party member count mismatch");
  assert.equal(
    probe.canonical_ui.party_panel.regression_probe_counts.selection_cases,
    4,
    "party selection probe count mismatch"
  );
  assert.equal(
    probe.canonical_ui.message_log_panel.regression_probe_counts.window_cases,
    2,
    "message window probe count mismatch"
  );
  assert.equal(
    probe.canonical_ui.message_log_panel.regression_probe_counts.scroll_command_cases,
    4,
    "message scroll command probe count mismatch"
  );
  assert.equal(
    probe.canonical_ui.message_log_panel.regression_probe_counts.persistence_cases,
    1,
    "message persistence probe count mismatch"
  );
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
  assert.equal(probe.canonical_ui.party_panel.members.length, 3, "live party member projection mismatch");
  assert.equal(probe.canonical_ui.party_panel.members[1].id, 77, "live active party member id mismatch");
  assert.equal(probe.canonical_ui.party_panel.members[1].active, true, "live active party member flag mismatch");
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

function runSampleSnapshotFixture() {
  const fixturePath = path.resolve(
    path.dirname(new URL(import.meta.url).pathname),
    "fixtures",
    "ui_probe.sample.json"
  );
  const expected = JSON.parse(fs.readFileSync(fixturePath, "utf8"));
  const actual = buildUiProbeContract({ mode: "sample" });
  assert.deepEqual(actual, expected, "sample probe fixture drift");
}

runSampleProbeFixture();
runLiveProbeFixture();
runAvatarProcessFixture();
runDigestFixture();
runSampleSnapshotFixture();

console.log("ui_probe_contract_test: ok");
