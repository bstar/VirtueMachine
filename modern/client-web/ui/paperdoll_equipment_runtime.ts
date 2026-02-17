export const LEGACY_PAPERDOLL_SLOT_KEYS = Object.freeze([
  "head",
  "neck",
  "right_hand",
  "right_finger",
  "chest",
  "left_hand",
  "left_finger",
  "feet"
]);

export type LegacyEquipProjectionRowRuntime = {
  tileId: number;
  object_key: string;
};

export type LegacyEquipResolutionCandidateRuntime = {
  slot_hint: number;
  tile_id: number;
  object_key: string;
};

export type LegacyEquipResolutionPlacedRuntime = {
  slot: number;
  slot_key: string;
  slot_hint: number;
  object_key: string;
  tile_hex: string;
};

export type LegacyEquipResolutionDroppedRuntime = {
  slot_hint: number;
  object_key: string;
  tile_hex: string;
  reason: "slot_unmapped" | "slot_occupied";
};

type LegacyEquipOccupiedEntryRuntime = {
  slot_hint: number;
  tile_id: number;
  object_key: string;
};

/*
  Mirrors STAT_GetEquipSlot tile->slot family with SLOT_2HND/SLOT_RING pseudo slots.
*/
export function legacyEquipSlotForTileRuntime(tileId: number): number {
  const t = Number(tileId) & 0xffff;
  if (t === 0x21a || t === 0x21b) return 7; /* SLOT_FEET */
  if (t === 0x258 || (t >= 0x37d && t <= 0x37f)) return 9; /* SLOT_RING pseudo */
  if (t === 0x219 || (t >= 0x250 && t <= 0x252) || t === 0x217 || t === 0x101) return 1; /* SLOT_NECK */
  if (t >= 0x200 && t <= 0x207) return 0; /* SLOT_HEAD */
  if ((t >= 0x210 && t <= 0x216) || t === 0x218 || t === 0x219 || t === 0x28c || t === 0x28e || t === 0x29d || t === 0x257) return 4; /* SLOT_CHST */
  if (t === 0x228 || t === 0x229 || t === 0x231 || t === 0x235 || (t >= 0x22b && t <= 0x22e)) return 8; /* SLOT_2HND pseudo */
  if ((t >= 0x208 && t <= 0x20f) || t === 0x222) return 5; /* SLOT_LHND */
  if (
    t === 0x220 || t === 0x221 || t === 0x223 || t === 0x224 || t === 0x225 || t === 0x226 || t === 0x227 || t === 0x22a
    || t === 0x22f || t === 0x230 || t === 0x238 || t === 0x254 || t === 0x256 || t === 0x255 || t === 0x259 || t === 0x262
    || t === 0x263 || t === 0x264 || t === 0x270 || t === 0x271 || t === 0x272 || t === 0x273 || t === 0x274 || t === 0x275
    || t === 0x279 || t === 0x27d || t === 0x27e || t === 0x27f || t === 0x280 || t === 0x281 || t === 0x2a2 || t === 0x2a3
    || t === 0x2b9
  ) return 2; /* SLOT_RHND */
  return -1;
}

function resolveLegacySlotHintRuntime(
  slotHint: number,
  occupied: Array<LegacyEquipOccupiedEntryRuntime | null>
): number {
  let slot = Number(slotHint) | 0;
  if (slot === 8) { /* SLOT_2HND */
    if (occupied[2]) {
      slot = occupied[5] ? -1 : 5;
    } else {
      slot = 2;
    }
  } else if (slot === 2 && occupied[2] && !occupied[5]) {
    slot = 5;
  } else if (slot === 5 && occupied[5] && !occupied[2]) {
    slot = 2;
  } else if (slot === 9) { /* SLOT_RING */
    slot = occupied[3] ? 6 : 3;
  }
  return slot;
}

export function resolveLegacyEquipmentCandidatesRuntime(
  candidates: LegacyEquipResolutionCandidateRuntime[]
): {
  placed: LegacyEquipResolutionPlacedRuntime[];
  dropped: LegacyEquipResolutionDroppedRuntime[];
  slot_occupancy: Array<LegacyEquipResolutionPlacedRuntime | null>;
} {
  const occupied: Array<LegacyEquipOccupiedEntryRuntime | null> = new Array(8).fill(null);
  const dropped: LegacyEquipResolutionDroppedRuntime[] = [];

  for (const candidate of (Array.isArray(candidates) ? candidates : [])) {
    const slotHint = Number(candidate?.slot_hint) | 0;
    const tileId = Number(candidate?.tile_id) & 0xffff;
    const objectKey = String(candidate?.object_key || "").trim();
    let slot = resolveLegacySlotHintRuntime(slotHint, occupied);
    if (slot < 0 || slot > 7) {
      dropped.push({
        slot_hint: slotHint,
        object_key: objectKey,
        tile_hex: `0x${tileId.toString(16)}`,
        reason: "slot_unmapped"
      });
      continue;
    }
    if (occupied[slot]) {
      dropped.push({
        slot_hint: slotHint,
        object_key: objectKey,
        tile_hex: `0x${tileId.toString(16)}`,
        reason: "slot_occupied"
      });
      continue;
    }
    occupied[slot] = {
      slot_hint: slotHint,
      tile_id: tileId,
      object_key: objectKey
    };
  }

  const slot_occupancy: Array<LegacyEquipResolutionPlacedRuntime | null> = occupied.map((entry, slot) => {
    if (!entry) {
      return null;
    }
    return {
      slot,
      slot_key: LEGACY_PAPERDOLL_SLOT_KEYS[slot] || `slot_${slot}`,
      slot_hint: entry.slot_hint,
      object_key: entry.object_key,
      tile_hex: `0x${(entry.tile_id & 0xffff).toString(16)}`
    };
  });
  const placed = slot_occupancy.filter(Boolean) as LegacyEquipResolutionPlacedRuntime[];

  return { placed, dropped, slot_occupancy };
}

export function projectLegacyEquipmentSlotsRuntime(
  rows: LegacyEquipProjectionRowRuntime[]
): LegacyEquipResolutionPlacedRuntime[] {
  const candidates: LegacyEquipResolutionCandidateRuntime[] = [];
  for (const row of (Array.isArray(rows) ? rows : [])) {
    const tileId = Number(row?.tileId) & 0xffff;
    const slotHint = legacyEquipSlotForTileRuntime(tileId);
    candidates.push({
      slot_hint: slotHint,
      tile_id: tileId,
      object_key: String(row?.object_key || "")
    });
  }
  const resolution = resolveLegacyEquipmentCandidatesRuntime(candidates);
  return resolution.placed;
}

export function buildLegacyEquipmentResolutionRegressionProbesRuntime(): {
  cases: Array<{
    id: string;
    placed_slots: number[];
    dropped_count: number;
    dropped_reasons: string[];
  }>;
} {
  const scenarios: Array<{ id: string; candidates: LegacyEquipResolutionCandidateRuntime[] }> = [
    {
      id: "two_handed_prefers_right",
      candidates: [
        { slot_hint: 8, tile_id: 0x228, object_key: "2h_0" }
      ]
    },
    {
      id: "two_handed_falls_back_left",
      candidates: [
        { slot_hint: 2, tile_id: 0x22a, object_key: "rh_0" },
        { slot_hint: 8, tile_id: 0x228, object_key: "2h_0" }
      ]
    },
    {
      id: "ring_spills_to_left_finger",
      candidates: [
        { slot_hint: 9, tile_id: 0x258, object_key: "ring_0" },
        { slot_hint: 9, tile_id: 0x37d, object_key: "ring_1" }
      ]
    },
    {
      id: "right_hand_spills_left_hand",
      candidates: [
        { slot_hint: 2, tile_id: 0x22a, object_key: "rh_0" },
        { slot_hint: 2, tile_id: 0x220, object_key: "rh_1" }
      ]
    },
    {
      id: "left_hand_spills_right_hand",
      candidates: [
        { slot_hint: 5, tile_id: 0x208, object_key: "lh_0" },
        { slot_hint: 5, tile_id: 0x209, object_key: "lh_1" }
      ]
    },
    {
      id: "ring_and_two_handed_with_overflow_drop",
      candidates: [
        { slot_hint: 9, tile_id: 0x258, object_key: "ring_0" },
        { slot_hint: 9, tile_id: 0x37d, object_key: "ring_1" },
        { slot_hint: 9, tile_id: 0x37e, object_key: "ring_2" },
        { slot_hint: 8, tile_id: 0x228, object_key: "2h_0" },
        { slot_hint: 8, tile_id: 0x229, object_key: "2h_1" },
        { slot_hint: 8, tile_id: 0x231, object_key: "2h_2" }
      ]
    }
  ];

  const cases = scenarios.map((scenario) => {
    const resolution = resolveLegacyEquipmentCandidatesRuntime(scenario.candidates);
    return {
      id: scenario.id,
      placed_slots: resolution.placed.map((p) => p.slot | 0),
      dropped_count: resolution.dropped.length >>> 0,
      dropped_reasons: resolution.dropped.map((d) => d.reason)
    };
  });

  return { cases };
}
