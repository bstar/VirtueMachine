import assert from "node:assert/strict";
import {
  areaIdForWorldXYRuntime,
  canonicalLookSentenceForTileRuntime,
  canonicalTalkSpeakerForTileRuntime,
  legacyDropObjectLabelRuntime,
  legacyDropTargetPromptLinesRuntime,
  legacyArticleForTileRuntime,
  legacyLookupTileStringRuntime,
  sanitizeLegacyHudLabelTextRuntime
} from "../ui/legacy_text_runtime.ts";

const entries = [
  { tileId: 0x010, text: "floor" },
  { tileId: 0x020, text: "a chair" },
  { tileId: 0x030, text: "LORD BRITISH OR BRITANNIA" },
  { tileId: 0x040, text: "" }
];

const flags2 = new Uint8Array(0x800);
flags2[0x020] = 0x40;
flags2[0x021] = 0x80;
flags2[0x022] = 0xc0;

assert.equal(legacyLookupTileStringRuntime(0x000, null), "nothing");
assert.equal(legacyLookupTileStringRuntime(0x010, entries), "floor");
assert.equal(legacyLookupTileStringRuntime(0x01f, entries), "a chair");
assert.equal(legacyLookupTileStringRuntime(0x025, entries), "LORD BRITISH OR BRITANNIA");
assert.equal(legacyLookupTileStringRuntime(0x045, entries), "LORD BRITISH OR BRITANNIA");

assert.equal(legacyArticleForTileRuntime(0x020, flags2), "a ");
assert.equal(legacyArticleForTileRuntime(0x021, flags2), "an ");
assert.equal(legacyArticleForTileRuntime(0x022, flags2), "the ");
assert.equal(legacyArticleForTileRuntime(0x023, flags2), "");
assert.equal(legacyArticleForTileRuntime(0x020, null), "");

assert.equal(
  canonicalLookSentenceForTileRuntime(0x020, entries, flags2),
  "Thou dost see a a chair."
);
assert.equal(
  canonicalTalkSpeakerForTileRuntime(0x020, entries, flags2),
  "chair"
);
assert.equal(
  canonicalTalkSpeakerForTileRuntime(0x030, entries, flags2),
  "LORD BRITISH of Britannia"
);

assert.equal(sanitizeLegacyHudLabelTextRuntime("  Lord\tBritish***\n"), "Lord British");
assert.equal(sanitizeLegacyHudLabelTextRuntime("Dupre's sword, +1"), "Dupre's sword, 1");

assert.equal(legacyDropObjectLabelRuntime(null, entries, flags2), "nothing");
assert.equal(
  legacyDropObjectLabelRuntime({ tile_id: 0x020, type: 0x120 }, entries, flags2),
  "a a chair"
);
assert.equal(
  legacyDropObjectLabelRuntime({ inventory_key: "0x113:0x00", tile_id: 0x000, type: 0x113 }, null, flags2, "0x113:0x00"),
  "0x113 0x00"
);
assert.equal(
  legacyDropObjectLabelRuntime({ tile_id: 0x000, type: 0x113 }, null, flags2, "0x113:0x00"),
  "0x113 0x00"
);
assert.deepEqual(
  legacyDropTargetPromptLinesRuntime({ tile_id: 0x020, type: 0x120 }, entries, flags2),
  [">Drop-a a chair", "Location:"]
);

assert.equal(areaIdForWorldXYRuntime(0, 0), 0);
assert.equal(areaIdForWorldXYRuntime(127, 0), 0);
assert.equal(areaIdForWorldXYRuntime(128, 0), 1);
assert.equal(areaIdForWorldXYRuntime(0, 128), 8);
assert.equal(areaIdForWorldXYRuntime(1023, 1023), 63);

console.log("legacy_text_runtime_test: ok");
