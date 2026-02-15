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

function toU32(v) {
  return Number(v) >>> 0;
}

function normalizeInventory(inventory) {
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

function normalizeParty(party) {
  const out = Array.isArray(party) ? party.slice() : [];
  out.sort((a, b) => (toU32(a.id) - toU32(b.id)));
  return out.map((m) => ({
    id: toU32(m.id),
    name: String(m.name || `NPC_${toU32(m.id)}`),
    in_party: !!m.in_party,
    active: !!m.active
  }));
}

function normalizeMessages(messages) {
  const out = Array.isArray(messages) ? messages.slice() : [];
  out.sort((a, b) => (toU32(a.tick) - toU32(b.tick)) || (String(a.text || "").localeCompare(String(b.text || ""))));
  return out.map((m) => ({
    tick: toU32(m.tick),
    level: String(m.level || "info"),
    text: String(m.text || "")
  }));
}

function normalizeEquipment(equipment) {
  const byIndex = new Map();
  for (const e of (Array.isArray(equipment) ? equipment : [])) {
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

function normalizeConversation(conversation) {
  const c = conversation && typeof conversation === "object" ? conversation : {};
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
      { slot: 2, object_key: "0x12c:1", tile_hex: "0x431" },
      { slot: 4, object_key: "0x090:0", tile_hex: "0x2a8" },
      { slot: 7, object_key: "0x0b0:1", tile_hex: "0x2e1" }
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
        { slot: 2, object_key: "0x12c:1", tile_hex: "0x431" },
        { slot: 5, object_key: "0x12e:1", tile_hex: "0x44d" }
      ]
    }
  };
}

function fromRuntime(runtime) {
  const sim = runtime && runtime.sim ? runtime.sim : {};
  const world = sim.world || {};
  const commandLog = Array.isArray(runtime && runtime.commandLog) ? runtime.commandLog : [];
  const activeIndex = toU32(world.active || 0);
  const partyMembers = Array.isArray(runtime && runtime.partyMembers) ? runtime.partyMembers.map((v) => toU32(v)) : [1];
  const activeId = partyMembers[activeIndex] || partyMembers[0] || 1;
  return {
    tick: toU32(sim.tick || 0),
    mode: "live",
    world: {
      map_x: toU32(world.map_x || 0),
      map_y: toU32(world.map_y || 0),
      map_z: toU32(world.map_z || 0)
    },
    party_members: partyMembers,
    active_party_index: activeIndex,
    inventory: { ...(sim.inventory || {}) },
    equipment: [], // pending canonical equip-state bridge
    party: [
      { id: activeId || 1, name: activeId ? `Actor_${activeId}` : "Avatar", in_party: true, active: true }
    ],
    messages: commandLog.slice(-8).map((c, i) => ({
      tick: toU32(c.tick != null ? c.tick : i),
      level: "info",
      text: String(c.kind || "command")
    })),
    conversation: normalizeConversation(runtime.conversation)
  };
}

/*
 Canonical avatar probe source process:
 1) Resolve active index from world.active.
 2) Resolve avatar object id from Party[active] else Party[0], mirroring legacy fallback.
 3) Anchor panel location to current world map coords.
*/
export function createCanonicalTestAvatar(snapshot = {}) {
  const partyMembers = Array.isArray(snapshot.party_members) ? snapshot.party_members.map((v) => toU32(v)) : [1];
  const activeIndex = toU32(snapshot.active_party_index || 0);
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

export function buildUiProbeContract(opts = {}) {
  const mode = String(opts.mode || "sample");
  const src = mode === "live" ? fromRuntime(opts.runtime || {}) : deterministicSample();
  const avatar = createCanonicalTestAvatar(src);
  return {
    schema_version: UI_PROBE_SCHEMA_VERSION,
    mode: src.mode,
    tick: toU32(src.tick),
    canonical_ui: {
      avatar_panel: {
        avatar
      },
      inventory_panel: {
        entries: normalizeInventory(src.inventory)
      },
      paperdoll_panel: {
        slots: normalizeEquipment(src.equipment)
      },
      party_panel: {
        members: normalizeParty(src.party)
      },
      message_log_panel: {
        entries: normalizeMessages(src.messages)
      },
      conversation_panel: normalizeConversation(src.conversation)
    },
    canonical_contract_notes: {
      conversation_panel:
        "C_27A1_02D9 / TALK_talkTo alignment surface. Live NPC equipment extraction pending; fields are canonicalized now."
    },
    modern_ui: {
      account_panel: {
        source: mode === "live" ? "runtime" : "sample",
        note: "Non-legacy account/auth controls are tracked separately from canonical gameplay UI."
      }
    },
    legacy_anchors: {
      command_loop: "legacy/u6-decompiled/SRC/seg_0A33.c",
      inventory_and_equipment: "legacy/u6-decompiled/SRC/seg_27a1.c",
      equip_slot_layout: "legacy/u6-decompiled/SRC/seg_155D.c",
      slot_constants: "legacy/u6-decompiled/SRC/u6.h"
    }
  };
}

export function uiProbeDigest(probe) {
  const json = JSON.stringify(probe);
  let h = 2166136261 >>> 0;
  for (let i = 0; i < json.length; i += 1) {
    h ^= json.charCodeAt(i) & 0xff;
    h = Math.imul(h, 16777619) >>> 0;
  }
  return `0x${h.toString(16).padStart(8, "0")}`;
}

export { UI_PROBE_SCHEMA_VERSION, LEGACY_EQUIP_SLOTS };
