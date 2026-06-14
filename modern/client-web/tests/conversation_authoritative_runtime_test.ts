import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  canonicalConversationHintIdFromSpeakerRuntime,
  conversationHeaderIsPlausibleCanonicalFallbackRuntime,
  conversationHeaderMatchesExpectedCanonicalDescRuntime,
  conversationHeaderMatchesExpectedCanonicalNameRuntime,
  loadLegacyConversationScriptForNpcRuntime,
  normalizedConversationNameRuntime,
  parseConversationHeaderAndDescRuntime
} from "../conversation/archive_runtime.ts";
import { buildConversationVmContext, conversationKeyMatchesInput, renderConversationMacrosWithContext } from "../conversation/text_runtime.ts";
import { decodeConversationOpeningResult, decodeConversationResponseOpcodeAware } from "../conversation/vm_runtime.ts";
import { conversationRunFromKeyCursor } from "../conversation/dialog_runtime.ts";

const ROOT = path.resolve(new URL("../..", import.meta.url).pathname);
const RUNTIME_DIR = path.join(ROOT, "assets", "runtime");
const OBJLIST_PATH = path.join(RUNTIME_DIR, "savegame", "objlist");

const OP_KEY = 0xef;
const OP_RES = 0xf6;
const OP_ENDRES = 0xee;
const OP_END = 0xff;
const OP_ASKTOP = 0xf7;
const OP_GET = 0xf8;

function readConversationArchives() {
  return {
    a: new Uint8Array(fs.readFileSync(path.join(RUNTIME_DIR, "converse.a"))),
    b: new Uint8Array(fs.readFileSync(path.join(RUNTIME_DIR, "converse.b")))
  };
}

function readObjlistTalkFlags() {
  const objlist = new Uint8Array(fs.readFileSync(OBJLIST_PATH));
  const TALK_FLAGS_OFF = 0x17f1;
  return Array.from(objlist.slice(TALK_FLAGS_OFF, TALK_FLAGS_OFF + 0x100));
}

function renderLines(lines: unknown[], vmContext: any) {
  return (Array.isArray(lines) ? lines : [])
    .map((line) => renderConversationMacrosWithContext(String(line || ""), vmContext))
    .map((line) => String(line || "").trim())
    .filter(Boolean);
}

function runCursorReply(script: Uint8Array, startPc: number, typed: string, vmContext: any) {
  return conversationRunFromKeyCursor({
    scriptBytes: script,
    startPc,
    typed,
    vmContext,
    opcodes: {
      ASKTOP: OP_ASKTOP,
      GET: OP_GET,
      KEY: OP_KEY,
      RES: OP_RES,
      ENDRES: OP_ENDRES,
      END: OP_END
    },
    keyMatchesInput: conversationKeyMatchesInput,
    decodeResponseOpcodeAware: decodeConversationResponseOpcodeAware,
    renderMacros: (line: string, ctx: any) => renderConversationMacrosWithContext(line, ctx)
  });
}

const archives = readConversationArchives();
const savedTalkFlags = readObjlistTalkFlags();

assert.equal(canonicalConversationHintIdFromSpeakerRuntime("Lord British, ruler of Britannia"), 5);
assert.equal(canonicalConversationHintIdFromSpeakerRuntime("concerned looking mage"), 6);
assert.equal(canonicalConversationHintIdFromSpeakerRuntime("fighter"), 2);
assert.equal(canonicalConversationHintIdFromSpeakerRuntime("unknown villager"), -1);
assert.equal(normalizedConversationNameRuntime("  Lord-British!! "), "lord british");

{
  const script = loadLegacyConversationScriptForNpcRuntime(archives, 5, 0x199);
  assert.ok(script instanceof Uint8Array, "Lord British script should load");
  const header = parseConversationHeaderAndDescRuntime(script);
  assert.equal(conversationHeaderMatchesExpectedCanonicalNameRuntime(header, 5), true);
  assert.equal(conversationHeaderMatchesExpectedCanonicalDescRuntime(header, 5), true);
  assert.equal(conversationHeaderIsPlausibleCanonicalFallbackRuntime(script, header, 5), true);

  const introVm = buildConversationVmContext({
    hour: 9,
    player: "Avatar",
    target: "Lord British",
    objNum: 5,
    talkFlags: new Array(0x100).fill(0)
  });
  const introOpening = decodeConversationOpeningResult(script!, header.mainPc, introVm);
  const introLines = renderLines(introOpening.lines, introVm);
  assert.match(introLines.join(" "), /compendium/i, "LB intro opening should still expose the Compendium challenge");
  assert.doesNotMatch(introLines.join(" "), /\*/i, "LB intro opening should not leak legacy asterisk control markers");

  const postIntroVm = buildConversationVmContext({
    hour: 9,
    player: "Avatar",
    target: "Lord British",
    objNum: 5,
    talkFlags: savedTalkFlags
  });
  const postIntroOpening = decodeConversationOpeningResult(script!, header.mainPc, postIntroVm);
  const postIntroLines = renderLines(postIntroOpening.lines, postIntroVm);
  assert.match(postIntroLines.join(" "), /what wouldst thou speak of\?/i, "LB saved-state opening should land on the canonical topic prompt");
  assert.doesNotMatch(postIntroLines.join(" "), /\*/i, "LB saved-state opening should not leak legacy asterisk control markers");

  const nameReply = runCursorReply(script!, postIntroOpening.stopPc, "name", postIntroVm);
  assert.equal(nameReply.kind, "ok", "LB name should resolve through the cursor path");
  assert.match(String(nameReply.lines?.join(" ") || ""), /I am Lord British/i, "LB name should identify correctly");

  const jobReply = runCursorReply(script!, Number(nameReply.nextPc) | 0, "job", postIntroVm);
  assert.equal(jobReply.kind, "ok", "LB job should resolve through the cursor path after a prior reply");
  assert.match(String(jobReply.lines?.join(" ") || ""), /throne of Britannia/i, "LB job should mention the throne of Britannia");
}

{
  const script = loadLegacyConversationScriptForNpcRuntime(archives, 2, 0x19b);
  assert.ok(script instanceof Uint8Array, "Dupre script should load");
  const header = parseConversationHeaderAndDescRuntime(script);
  assert.equal(conversationHeaderMatchesExpectedCanonicalNameRuntime(header, 2), true);
  assert.equal(conversationHeaderMatchesExpectedCanonicalDescRuntime(header, 2), true);
  assert.equal(conversationHeaderIsPlausibleCanonicalFallbackRuntime(script, header, 2), true);
  const vmContext = buildConversationVmContext({
    hour: 9,
    player: "Avatar",
    target: "Dupre",
    objNum: 2,
    talkFlags: savedTalkFlags
  });
  const opening = decodeConversationOpeningResult(script!, header.mainPc, vmContext);
  const jobReply = runCursorReply(script!, opening.stopPc, "job", vmContext);
  assert.equal(jobReply.kind, "ok", "Dupre job should resolve through the cursor path");
  assert.match(String(jobReply.lines?.join(" ") || ""), /questing, of course/i, "Dupre job should return the canonical questing line");
}

{
  const script = loadLegacyConversationScriptForNpcRuntime(archives, 6, 0x17a);
  assert.ok(script instanceof Uint8Array, "Nystul script should load");
  const header = parseConversationHeaderAndDescRuntime(script);
  assert.equal(conversationHeaderMatchesExpectedCanonicalNameRuntime(header, 6), true);
  assert.equal(conversationHeaderMatchesExpectedCanonicalDescRuntime(header, 6), true);
  assert.equal(conversationHeaderIsPlausibleCanonicalFallbackRuntime(script, header, 6), true);
  assert.equal(
    conversationHeaderMatchesExpectedCanonicalDescRuntime({ ...header, desc: "garbled text" }, 6),
    false
  );
  const introVm = buildConversationVmContext({
    hour: 9,
    player: "Avatar",
    target: "Nystul",
    objNum: 6,
    talkFlags: new Array(0x100).fill(0)
  });
  const opening = decodeConversationOpeningResult(script!, header.mainPc, introVm);
  const lines = renderLines(opening.lines, introVm);
  assert.match(lines.join(" "), /red gateway/i, "Nystul intro opening should keep the canonical gateway/book sequence");
  assert.doesNotMatch(lines.join(" "), /\*/i, "Nystul opening should not leak legacy asterisk control markers");
}

console.log("conversation_authoritative_runtime_test: ok");
