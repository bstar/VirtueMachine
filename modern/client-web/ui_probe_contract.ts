import {
  buildInventoryEquipRegressionProbesRuntime,
  buildLegacyInventoryPaperdollLayoutRuntime
} from "./ui/inventory_paperdoll_layout_runtime.ts";
import {
  buildLegacyEquipmentResolutionRegressionProbesRuntime,
  projectLegacyEquipmentSlotsRuntime
} from "./ui/paperdoll_equipment_runtime.ts";
import {
  buildPartyMessageRegressionProbesRuntime,
  clampActivePartyIndexRuntime,
  normalizePartyMemberIdsRuntime,
  projectPartyPanelMembersRuntime
} from "./ui/party_message_runtime.ts";
import {
  buildMessageLogRegressionProbesRuntime,
  computeMessageLogWindowRuntime
} from "./ui/message_log_runtime.ts";
import { listPanelScopeRuntime } from "./ui/panel_scope_runtime.ts";
import { buildTargetResolverRegressionProbesRuntime } from "./sim/target_runtime.ts";
import {
  buildMechanicsCapabilityMatrixRuntime,
  summarizeMechanicsCapabilitiesRuntime,
  validateMechanicsCapabilityMatrixRuntime
} from "./gameplay/mechanics_capability_runtime.ts";
import {
  buildVerbCapabilityBindingsRuntime,
  summarizeVerbCapabilityBindingsRuntime,
  summarizeVerbCapabilityCoverageRuntime
} from "./gameplay/verb_capability_runtime.ts";

const UI_PROBE_SCHEMA_VERSION = 1;

const LEGACY_EQUIP_SLOTS = Object.freeze([
  { index: 0, key: "head", legacy: "SLOT_HEAD" },
  { index: 1, key: "neck", legacy: "SLOT_NECK" },
  { index: 2, key: "right_hand", legacy: "SLOT_RHND" },
  { index: 3, key: "right_finger", legacy: "SLOT_RFNG" },
  { index: 4, key: "chest", legacy: "SLOT_CHST" },
  { index: 5, key: "left_hand", legacy: "SLOT_LHND" },
  { index: 6, key: "left_finger", legacy: "SLOT_LFNG" },
  { index: 7, key: "feet", legacy: "SLOT_FEET" },
  { index: 8, key: "two_handed", legacy: "SLOT_2HND" },
  { index: 9, key: "ring", legacy: "SLOT_RING" }
]);

function toU32(v: unknown): number {
  return Number(v) >>> 0;
}

function normalizeInventory(inventory: Record<string, unknown> | null | undefined) {
  const out = [];
  for (const [k, v] of Object.entries(inventory || {})) {
    out.push({
      key: String(k),
      count: toU32(v)
    });
  }
  out.sort((a, b) => a.key.localeCompare(b.key));
  return out;
}

function normalizeEquipment(equipment: unknown) {
  const projected = projectLegacyEquipmentSlotsRuntime((Array.isArray(equipment) ? equipment : []).map((e: any) => ({
    tileId: toU32(e.tile_id != null ? e.tile_id : e.tile_hex),
    object_key: e.object_key == null ? "" : String(e.object_key)
  })));
  const byIndex = new Map();
  for (const e of projected) {
    const idx = toU32(e.slot);
    byIndex.set(idx, {
      slot: idx,
      object_key: e.object_key == null ? null : String(e.object_key),
      tile_hex: e.tile_hex == null ? null : String(e.tile_hex)
    });
  }
  return LEGACY_EQUIP_SLOTS.map((slot) => ({
    ...slot,
    ...(byIndex.get(slot.index) || { object_key: null, tile_hex: null })
  }));
}

function normalizeConversation(conversation: any) {
  const c: any = conversation && typeof conversation === "object" ? conversation : {};
  return {
    active: !!c.active,
    target_name: String(c.target_name || ""),
    target_obj_num: toU32(c.target_obj_num || 0),
    target_obj_type: toU32(c.target_obj_type || 0),
    portrait_tile_hex: c.portrait_tile_hex == null ? null : String(c.portrait_tile_hex),
    /*
      Canonical anchor: C_27A1_02D9 can switch between converse-only portrait
      and portrait+equipment/inventory composition based on context scripts.
      This flag drives that branch in the modern HUD renderer.
    */
    show_inventory: c.show_inventory == null ? true : !!c.show_inventory,
    /*
      Talk-mode equipment is a canonical connection point; live extraction from
      NPC equip tables is pending, but the contract is finalized now.
    */
    equipment_slots: normalizeEquipment(c.equipment || [])
  };
}

function deterministicSample() {
  return {
    tick: 4242,
    mode: "sample",
    runtime_profile: "canonical_strict",
    runtime_extensions: {},
    world: {
      map_x: 307,
      map_y: 347,
      map_z: 0
    },
    party_members: [1, 12, 23],
    active_party_index: 0,
    inventory: {
      "0x073:0": 1,
      "0x097:0": 1,
      "0x0fa:2": 3
    },
    equipment: [
      { tile_id: 0x220, object_key: "0x12c:1" },
      { tile_id: 0x210, object_key: "0x090:0" },
      { tile_id: 0x21a, object_key: "0x0b0:1" }
    ],
    party: [
      { id: 1, name: "Avatar", in_party: true, active: true },
      { id: 12, name: "Iolo", in_party: true, active: false },
      { id: 23, name: "Shamino", in_party: true, active: false }
    ],
    messages: [
      { tick: 4239, level: "info", text: "Party mode ready." },
      { tick: 4240, level: "system", text: "Inventory refresh complete." },
      { tick: 4241, level: "info", text: "Awaiting command." }
    ],
    conversation: {
      active: false,
      target_name: "",
      target_obj_num: 0,
      target_obj_type: 0,
      portrait_tile_hex: null,
      show_inventory: true,
      equipment: [
        { tile_id: 0x220, object_key: "0x12c:1" },
        { tile_id: 0x208, object_key: "0x12e:1" }
      ]
    }
  };
}

function fromRuntime(runtime: any) {
  const sim = runtime && runtime.sim ? runtime.sim : {};
  const world = sim.world || {};
  const commandLog = Array.isArray(runtime && runtime.commandLog) ? runtime.commandLog : [];
  const partyMembers = normalizePartyMemberIdsRuntime(runtime?.partyMembers, 1);
  const activeIndex = clampActivePartyIndexRuntime(world.active || 0, partyMembers.length);
  const activeId = partyMembers[activeIndex] || partyMembers[0] || 1;
  const partyPanelMembers = projectPartyPanelMembersRuntime({
    partyMembers,
    activeIndex,
    nameById: runtime?.partyNameById || null
  });
  const messageEntries = computeMessageLogWindowRuntime({
    entries: commandLog.map((c, i) => ({
      tick: toU32(c?.tick != null ? c.tick : i),
      level: "info",
      text: String(c?.kind || "command"),
      seq: i
    })),
    windowSize: 8,
    scrollOffset: 0,
    lineMaxChars: 64
  }).entries;
  return {
    tick: toU32(sim.tick || 0),
    mode: "live",
    runtime_profile: String(runtime.runtimeProfile || "canonical_strict"),
    runtime_extensions: { ...(runtime.runtimeExtensions || {}) },
    world: {
      map_x: toU32(world.map_x || 0),
      map_y: toU32(world.map_y || 0),
      map_z: toU32(world.map_z || 0)
    },
    party_members: partyMembers,
    active_party_index: activeIndex,
    inventory: { ...(sim.inventory || {}) },
    equipment: [], // pending canonical equip-state bridge
    party: partyPanelMembers.length
      ? partyPanelMembers
      : [{ id: activeId || 1, name: activeId ? `Actor_${activeId}` : "Avatar", in_party: true, active: true, party_index: 0 }],
    messages: messageEntries,
    conversation: normalizeConversation(runtime.conversation)
  };
}

/*
 Canonical avatar probe source process:
 1) Resolve active index from world.active.
 2) Resolve avatar object id from Party[active] else Party[0], mirroring legacy fallback.
 3) Anchor panel location to current world map coords.
*/
export function createCanonicalTestAvatar(snapshot: any = {}) {
  const partyMembers = normalizePartyMemberIdsRuntime(snapshot.party_members, 1);
  const activeIndex = clampActivePartyIndexRuntime(snapshot.active_party_index || 0, partyMembers.length);
  const resolvedId = partyMembers[activeIndex] || partyMembers[0] || 1;
  const world = snapshot.world || {};
  return {
    id: toU32(resolvedId),
    party_index: activeIndex,
    party_count: partyMembers.length >>> 0,
    map_x: toU32(world.map_x || 0),
    map_y: toU32(world.map_y || 0),
    map_z: toU32(world.map_z || 0),
    source_process: "legacy_party_active_resolution"
  };
}

export function buildUiProbeContract(opts: any = {}) {
  const mode = String(opts.mode || "sample");
  const src = mode === "live" ? fromRuntime(opts.runtime || {}) : deterministicSample();
  const avatar = createCanonicalTestAvatar(src);
  const cmd92Layout = buildLegacyInventoryPaperdollLayoutRuntime({
    statusDisplay: 0x92,
    talkStatusDisplay: 0x9e,
    talkShowInventory: true
  });
  const cmd92ProbeMatrix = buildInventoryEquipRegressionProbesRuntime(cmd92Layout);
  const equipResolutionProbes = buildLegacyEquipmentResolutionRegressionProbesRuntime();
  const partyMessageProbes = buildPartyMessageRegressionProbesRuntime();
  const messageLogProbes = buildMessageLogRegressionProbesRuntime();
  const targetResolverProbes = buildTargetResolverRegressionProbesRuntime();
  const mechanicsCapability = buildMechanicsCapabilityMatrixRuntime(src.runtime_extensions);
  const mechanicsSummary = summarizeMechanicsCapabilitiesRuntime(mechanicsCapability);
  const mechanicsValidation = validateMechanicsCapabilityMatrixRuntime(mechanicsCapability);
  const verbBindings = buildVerbCapabilityBindingsRuntime(mechanicsCapability);
  const verbBindingSummary = summarizeVerbCapabilityBindingsRuntime(verbBindings);
  const verbBindingCoverage = summarizeVerbCapabilityCoverageRuntime(mechanicsCapability, verbBindings);
  const panelScope = listPanelScopeRuntime();
  const equipResolutionDroppedTotal = equipResolutionProbes.cases
    .reduce((acc, cur) => acc + (Number(cur.dropped_count) | 0), 0) >>> 0;
  return {
    schema_version: UI_PROBE_SCHEMA_VERSION,
    mode: src.mode,
    tick: toU32(src.tick),
    runtime_profile: String(src.runtime_profile || "canonical_strict"),
    runtime_extensions: { ...(src.runtime_extensions || {}) },
    canonical_ui: {
      avatar_panel: {
        avatar,
        portrait_hitbox: {
          x: cmd92Layout.portrait.x,
          y: cmd92Layout.portrait.y,
          w: cmd92Layout.portrait.w,
          h: cmd92Layout.portrait.h
        }
      },
      inventory_panel: {
        entries: normalizeInventory(src.inventory),
        hitboxes: cmd92Layout.inventoryCells.map((cell) => ({
          index: cell.index,
          x: cell.x,
          y: cell.y,
          w: cell.w,
          h: cell.h,
          source: cmd92Layout.anchors.inventory_hitbox
        })),
        regression_probe_counts: {
          inventory_to_equip: cmd92ProbeMatrix.inventory_to_equip.length >>> 0,
          equip_to_inventory: cmd92ProbeMatrix.equip_to_inventory.length >>> 0
        }
      },
      paperdoll_panel: {
        slots: normalizeEquipment(src.equipment),
        hitboxes: cmd92Layout.equipSlots.map((slot) => ({
          slot: slot.slot,
          key: slot.key,
          x: slot.x,
          y: slot.y,
          w: slot.w,
          h: slot.h,
          source: cmd92Layout.anchors.equip_hitbox
        })),
        regression_probe_counts: {
          equip_resolution_cases: equipResolutionProbes.cases.length >>> 0,
          equip_resolution_dropped_total: equipResolutionDroppedTotal
        }
      },
      party_panel: {
        members: projectPartyPanelMembersRuntime({
          partyMembers: src.party_members,
          activeIndex: src.active_party_index,
          nameById: Object.fromEntries((Array.isArray(src.party) ? src.party : []).map((m: any) => [String(m.id), String(m.name || "")]))
        }),
        regression_probe_counts: {
          selection_cases: partyMessageProbes.party_selection.length >>> 0
        }
      },
      message_log_panel: {
        entries: computeMessageLogWindowRuntime({
          entries: src.messages,
          windowSize: 8,
          scrollOffset: 0,
          lineMaxChars: 64
        }).entries.map((m) => ({
          tick: m.tick,
          level: m.level,
          text: m.text
        })),
        scrollback: {
          window_size: 8,
          scroll_offset: 0,
          max_offset: Math.max(0, (Array.isArray(src.messages) ? src.messages.length : 0) - 8)
        },
        regression_probe_counts: {
          window_cases: messageLogProbes.window_cases.length >>> 0,
          scroll_command_cases: messageLogProbes.scroll_command_cases.length >>> 0,
          persistence_cases: messageLogProbes.persistence_cases.length >>> 0
        }
      },
      conversation_panel: normalizeConversation(src.conversation)
    },
    canonical_contract_notes: {
      inventory_and_paperdoll:
        "Slot and hitbox probes are anchored to C_155D_1267/C_155D_130E with deterministic inventory<->equip probe counts.",
      conversation_panel:
        "C_27A1_02D9 / TALK_talkTo alignment surface. Live NPC equipment extraction pending; fields are canonicalized now."
    },
    modern_ui: {
      account_panel: {
        source: mode === "live" ? "runtime" : "sample",
        note: "Non-legacy account/auth controls are tracked separately from canonical gameplay UI."
      }
    },
    canonical_runtime: {
      target_resolver: {
        regression_probe_counts: {
          world_overlap_cases: targetResolverProbes.world_overlap_cases.length >>> 0,
          talk_overlap_cases: targetResolverProbes.talk_overlap_cases.length >>> 0
        }
      },
      mechanics_capability: {
        summary: mechanicsSummary,
        validation: mechanicsValidation,
        entries: mechanicsCapability,
        verb_bindings: {
          summary: verbBindingSummary,
          coverage: verbBindingCoverage,
          entries: verbBindings
        }
      }
    },
    ui_scope: panelScope,
    legacy_anchors: {
      command_loop: "legacy/u6-decompiled/SRC/seg_0A33.c",
      inventory_and_equipment: "legacy/u6-decompiled/SRC/seg_27a1.c",
      equip_slot_layout: "legacy/u6-decompiled/SRC/seg_155D.c",
      slot_constants: "legacy/u6-decompiled/SRC/u6.h"
    }
  };
}

export function uiProbeDigest(probe: unknown): string {
  const json = JSON.stringify(probe);
  let h = 2166136261 >>> 0;
  for (let i = 0; i < json.length; i += 1) {
    h ^= json.charCodeAt(i) & 0xff;
    h = Math.imul(h, 16777619) >>> 0;
  }
  return `0x${h.toString(16).padStart(8, "0")}`;
}

export { UI_PROBE_SCHEMA_VERSION, LEGACY_EQUIP_SLOTS };
