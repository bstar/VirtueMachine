import assert from "node:assert/strict";
import { buildConversationVmContext } from "../conversation/text_runtime.ts";
import { decodeConversationResponseOpcodeAware } from "../conversation/vm_runtime.ts";

const SCRIPT = Uint8Array.from([
  0xa4,       // OP_SET
  0xd3, 0xeb, // BYTE OP_NPC
  0xa7,       // END_OF_FACTOR
  0xd3, 0x05, // BYTE bit 5
  0xa7,       // END_OF_FACTOR
  0xa5,       // OP_CLR
  0xd3, 0xeb, // BYTE OP_NPC
  0xa7,       // END_OF_FACTOR
  0xd3, 0x07, // BYTE bit 7
  0xa7,       // END_OF_FACTOR
  0xff        // END
]);

const ctx = buildConversationVmContext({
  objNum: 5,
  talkFlags: { 5: 0x80 }
});

const out = decodeConversationResponseOpcodeAware(SCRIPT, 0, SCRIPT.length, {
  vmContext: ctx,
  stopOnGoto: false,
  followGoto: true
});

assert.equal(Array.isArray(out.lines), true, "vm decode should return line array");
assert.equal(Number(ctx.talkFlags[5]) & 0xff, 0x20, "vm SET/CLR should update authoritative talk flags");

console.log("conversation_vm_runtime_test: ok");
