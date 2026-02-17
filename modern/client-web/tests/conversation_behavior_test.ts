import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { conversationRunFromKeyCursor } from "../conversation/dialog_runtime.ts";

const ROOT = path.resolve(new URL("../..", import.meta.url).pathname);
const OP_KEY = 0xef;
const OP_RES = 0xf6;
const OP_ENDRES = 0xee;
const OP_DESC = 0xf1;
const OP_MAIN = 0xf2;
const OP_END = 0xff;
const OP_JOIN = 0xca;
const OP_ASKTOP = 0xf7;
const OP_GET = 0xf8;

function decompressU6Lzw(bytes) {
  if (!bytes || bytes.length < 4) return null;
  const outLen = (bytes[0] | (bytes[1] << 8) | (bytes[2] << 16) | (bytes[3] << 24)) >>> 0;
  const src = bytes.subarray(4);
  const out = new Uint8Array(outLen);
  const CLEAR = 256;
  const END = 257;
  const table = new Array(4096);
  for (let i = 0; i < 256; i += 1) table[i] = Uint8Array.of(i);
  let bitPos = 0;
  let codeSize = 9;
  let nextCode = 258;
  let prev = null;
  let outPos = 0;
  function readCode(n) {
    let outCode = 0;
    for (let i = 0; i < n; i += 1) {
      const bi = (bitPos + i) >> 3;
      const bt = (bitPos + i) & 7;
      if (bi >= src.length) return -1;
      outCode |= ((src[bi] >> bt) & 1) << i;
    }
    bitPos += n;
    return outCode;
  }
  while (outPos < out.length) {
    const code = readCode(codeSize);
    if (code < 0) break;
    if (code === CLEAR) {
      for (let i = 258; i < table.length; i += 1) table[i] = undefined;
      codeSize = 9;
      nextCode = 258;
      prev = null;
      continue;
    }
    if (code === END) break;
    let entry = null;
    if (table[code]) {
      entry = table[code];
    } else if (code === nextCode && prev) {
      entry = new Uint8Array(prev.length + 1);
      entry.set(prev, 0);
      entry[prev.length] = prev[0];
    } else {
      break;
    }
    out.set(entry.slice(0, Math.max(0, out.length - outPos)), outPos);
    outPos += entry.length;
    if (prev && nextCode < 4096) {
      const n = new Uint8Array(prev.length + 1);
      n.set(prev, 0);
      n[prev.length] = entry[0];
      table[nextCode] = n;
      nextCode += 1;
      if ((nextCode === 512 || nextCode === 1024 || nextCode === 2048) && codeSize < 12) {
        codeSize += 1;
      }
    }
    prev = entry;
  }
  return out;
}

function decodeU6LzwWithKnownLength(srcBytes, outLen) {
  const wrapped = new Uint8Array(srcBytes.length + 4);
  wrapped[0] = outLen & 0xff;
  wrapped[1] = (outLen >>> 8) & 0xff;
  wrapped[2] = (outLen >>> 16) & 0xff;
  wrapped[3] = (outLen >>> 24) & 0xff;
  wrapped.set(srcBytes, 4);
  return decompressU6Lzw(wrapped);
}

function loadConversationScript(npcNum) {
  const file = (npcNum > 0x62) ? "converse.b" : "converse.a";
  const index = (npcNum > 0x62) ? (npcNum - 0x63) : npcNum;
  const archive = new Uint8Array(fs.readFileSync(path.join(ROOT, "assets/runtime", file)));
  const dv = new DataView(archive.buffer, archive.byteOffset, archive.byteLength);
  const offset = dv.getUint32(index << 2, true) >>> 0;
  assert.ok(offset > 0, `npc ${npcNum}: missing conversation offset`);
  const inflated = dv.getUint32(offset, true) >>> 0;
  if (inflated > 0 && inflated < 0x2800) {
    return decodeU6LzwWithKnownLength(archive.subarray(offset + 4), inflated);
  }
  return archive.subarray(offset + 4, Math.min(archive.length, offset + 4 + 0x2800));
}

function parseHeader(scriptBytes) {
  let i = 0;
  if (scriptBytes[i] === OP_END) i += 1;
  i += 1;
  let name = "";
  while (i < scriptBytes.length && scriptBytes[i] !== OP_DESC) {
    const b = scriptBytes[i++];
    if (b >= 32 && b < 127) name += String.fromCharCode(b);
  }
  if (scriptBytes[i] === OP_DESC) i += 1;
  let desc = "";
  while (i < scriptBytes.length && scriptBytes[i] !== OP_MAIN) {
    const b = scriptBytes[i++];
    if (b === 0x2a) break;
    if (b >= 32 && b < 127) desc += String.fromCharCode(b);
    else if (b === 10 || b === 13) desc += " ";
  }
  while (i < scriptBytes.length && scriptBytes[i] !== OP_MAIN) i += 1;
  if (scriptBytes[i] === OP_MAIN) i += 1;
  return {
    name: String(name || "").trim(),
    desc: String(desc || "").replace(/\s+/g, " ").trim(),
    mainPc: i
  };
}

function parseRulesInRange(scriptBytes, startPc, endPc, out) {
  const end = Math.max(0, Math.min(Number(endPc) | 0, scriptBytes.length));
  let i = Math.max(0, Math.min(Number(startPc) | 0, end));
  while (i < end) {
    if (scriptBytes[i] !== OP_KEY) {
      i += 1;
      continue;
    }
    i += 1;
    const keys = [];
    while (i < end) {
      const keyBytes = [];
      while (i < end && scriptBytes[i] !== 0x2c && scriptBytes[i] !== OP_RES) {
        keyBytes.push(scriptBytes[i]);
        i += 1;
      }
      const key = String.fromCharCode(...keyBytes).trim().toLowerCase();
      if (key) keys.push(key);
      if (i >= end) break;
      if (scriptBytes[i] === 0x2c) {
        i += 1;
        continue;
      }
      if (scriptBytes[i] === OP_RES) {
        i += 1;
        break;
      }
    }
    const respStart = i;
    while (i < end && scriptBytes[i] !== OP_ENDRES) i += 1;
    const respEnd = i;
    if (i < end && scriptBytes[i] === OP_ENDRES) i += 1;
    if (keys.length > 0 && respEnd > respStart) {
      out.push({
        keys,
        responseBytes: scriptBytes.slice(respStart, respEnd),
        responseStartPc: respStart,
        responseEndPc: respEnd
      });
      parseRulesInRange(scriptBytes, respStart, respEnd, out);
    }
  }
}

function parseRules(scriptBytes, mainPc) {
  const out = [];
  parseRulesInRange(scriptBytes, mainPc, scriptBytes.length, out);
  return out;
}

function findFirstKeyPc(scriptBytes, mainPc) {
  let pc = Math.max(0, Number(mainPc) | 0);
  while (pc < scriptBytes.length) {
    if ((scriptBytes[pc] & 0xff) === OP_KEY) {
      return pc;
    }
    pc += 1;
  }
  return -1;
}

function splitWords(input) {
  return String(input || "")
    .toLowerCase()
    .replace(/[^a-z0-9?\s]+/g, " ")
    .split(/\s+/)
    .filter(Boolean);
}

function keyMatchesInput(pattern, input) {
  const p = String(pattern || "").trim().toLowerCase();
  if (!p) return false;
  if (p === "*") return true;
  const words = splitWords(input);
  for (const w of words) {
    if (w.length < p.length) continue;
    let ok = true;
    for (let i = 0; i < p.length; i += 1) {
      if (p[i] !== "?" && p[i] !== w[i]) {
        ok = false;
        break;
      }
    }
    if (ok) return true;
  }
  return false;
}

assert.equal(keyMatchesInput("end", "endurance"), true, "Canonical KEY matching is prefix-based");
assert.equal(keyMatchesInput("fire", "fireball"), true, "Canonical KEY should match longer token prefix");
assert.equal(keyMatchesInput("orb", "or"), false, "Canonical KEY should reject shorter token");

function decodeResponseOpcodeAware(scriptBytes, startPc, endPc, opts = null) {
  const options = (opts && typeof opts === "object") ? opts : {};
  const stopOnGoto = options.stopOnGoto !== false;
  const followGoto = !!options.followGoto;
  const lines = [];
  let cur = "";
  let pc = Math.max(0, Number(startPc) | 0);
  const end = Math.max(pc, Math.min(scriptBytes.length, Number(endPc) | 0));
  const maxSteps = Math.max(1024, Math.min(65536, scriptBytes.length * 4));
  let steps = 0;
  const seenTargets = new Set();
  const flush = () => {
    const text = cur.replace(/\s+/g, " ").trim();
    if (text) lines.push(text);
    cur = "";
  };
  let quoted = false;
  while (pc < end) {
    steps += 1;
    if (steps > maxSteps) {
      break;
    }
    const op = scriptBytes[pc] & 0xff;
    pc += 1;
    if (op === 0x22) {
      if (quoted) flush();
      quoted = !quoted;
      continue;
    }
    if (op < 0x80) {
      if (quoted && op >= 32 && op < 0x80) {
        cur += String.fromCharCode(op);
      }
      continue;
    }
    if (op === OP_ENDRES || op === OP_END || op === OP_KEY) {
      break;
    }
    if (op === 0xb0) {
      if ((pc + 4) > scriptBytes.length) {
        break;
      }
      const target = (
        (scriptBytes[pc] & 0xff)
        | ((scriptBytes[pc + 1] & 0xff) << 8)
        | ((scriptBytes[pc + 2] & 0xff) << 16)
        | ((scriptBytes[pc + 3] & 0xff) << 24)
      ) >>> 0;
      pc += 4;
      if (stopOnGoto) {
        break;
      }
      if (followGoto && target < scriptBytes.length) {
        const key = `${pc}->${target}`;
        if (seenTargets.has(key)) {
          break;
        }
        seenTargets.add(key);
        pc = target;
      }
      continue;
    }
    if (op === 0xb1 || op === 0xd2) {
      pc += 4;
      continue;
    }
    if (op === 0xd3) {
      pc += 1;
      continue;
    }
    if (op === 0xd4) {
      pc += 2;
      continue;
    }
  }
  if (quoted) flush();
  return lines;
}

function decodeOpeningLines(scriptBytes, mainPc) {
  const start = Math.max(0, Number(mainPc) | 0);
  return decodeResponseOpcodeAware(scriptBytes, start, scriptBytes.length, { stopOnGoto: false, followGoto: true });
}

function renderConversationMacros(text, ctx) {
  const player = String(ctx?.player || "avatar").trim() || "avatar";
  const target = String(ctx?.target || "").trim();
  const title = String(ctx?.title || "milady").trim() || "milady";
  const timeWord = String(ctx?.timeWord || "morning").trim() || "morning";
  return String(text || "")
    .replace(/\$P/g, player)
    .replace(/\$N/g, target)
    .replace(/\$G/g, "milady")
    .replace(/\$T/g, title)
    .replace(/\$4/g, player)
    .replace(/\$5/g, timeWord)
    .replace(/\$2/g, title)
    .replace(/@([A-Za-z0-9]+)/g, "$1");
}

function runTopic(scriptBytes, header, topic, ctx = {}) {
  const rules = parseRules(scriptBytes, header.mainPc);
  const query = String(topic || "").trim().toLowerCase() || "bye";
  for (const rule of rules) {
    if (!rule.keys.some((k) => keyMatchesInput(k, query))) continue;
    const raw = decodeResponseOpcodeAware(
      scriptBytes,
      Number(rule.responseStartPc),
      Number(rule.responseEndPc)
    );
    const out = raw.map((ln) => renderConversationMacros(ln, ctx)).filter(Boolean);
    if (rule.responseBytes.includes(OP_JOIN)) {
      out.push("(join)");
    }
    if (out.length > 0) return out;
  }
  return [];
}

function runTopicFromCursor(scriptBytes, header, topic, ctx = {}) {
  const startPc = findFirstKeyPc(scriptBytes, header.mainPc);
  assert.ok(startPc >= 0, "conversation cursor start pc missing");
  const out = conversationRunFromKeyCursor({
    scriptBytes,
    startPc,
    typed: topic,
    vmContext: ctx,
    opcodes: {
      ASKTOP: OP_ASKTOP,
      GET: OP_GET,
      KEY: OP_KEY,
      RES: OP_RES,
      ENDRES: OP_ENDRES,
      END: OP_END
    },
    keyMatchesInput,
    renderMacros: (line) => renderConversationMacros(line, ctx),
    decodeResponseOpcodeAware: (bytes, start, end) => ({
      lines: decodeResponseOpcodeAware(bytes, start, end, { stopOnGoto: false, followGoto: true }),
      stopOpcode: 0,
      stopPc: end
    })
  });
  return out;
}

const lbScript = loadConversationScript(5);
const lbHeader = parseHeader(lbScript);
assert.equal(lbHeader.name, "Lord British");
{
  const opening = decodeOpeningLines(lbScript, lbHeader.mainPc).map((ln) => renderConversationMacros(ln, { player: "avatar", target: "Lord British", timeWord: "morning" }));
  const opener = opening.join(" ").toLowerCase();
  assert.ok(Array.isArray(opening), "LB opening decode should return line array");
  assert.match(opener, /what wouldst thou speak of/, "LB opening should ask what subject to discuss");
  assert.ok(opening.length > 0, "LB opening should include at least one line");
  assert.match(String(opening[0] || ""), /good/i, "LB opening should include canonical time-of-day greeting");
  assert.doesNotMatch(opener, /\$[0-9a-z]/i, "LB opening should not leak unresolved macro placeholders");
}
{
  const nameLines = runTopic(lbScript, lbHeader, "name", { target: "Lord British" });
  assert.ok(nameLines.length > 0, "LB name should produce response lines");
  assert.match(nameLines[0], /I am Lord British/i, "LB name should identify correctly");
  const all = nameLines.join(" ").toLowerCase();
  assert.doesNotMatch(all, /\bcomp\b/, "LB name should not spill into later keyword list");
  assert.doesNotMatch(all, /\bbye\b/, "LB name should not spill into fallback branch");
}
{
  const jobLines = runTopic(lbScript, lbHeader, "job", { target: "Lord British" });
  assert.ok(jobLines.length > 0, "LB job should produce response lines");
  assert.match(jobLines[0], /throne of Britannia/i, "LB job should mention throne/Britannia");
  assert.ok(jobLines.every((ln) => !String(ln).includes("@")), "LB job should not leak '@' keyword markers");
  assert.doesNotMatch(jobLines.join(" ").toLowerCase(), /\bcomp\b/, "LB job should not spill into keyword list trailer");
  assert.doesNotMatch(jobLines.join(" ").toLowerCase(), /\bbye\b/, "LB job should not spill into fallback branch");
  const cursorJob = runTopicFromCursor(lbScript, lbHeader, "job", { target: "Lord British" });
  assert.equal(cursorJob.kind, "ok", "LB job cursor-path should resolve");
  assert.ok(Array.isArray(cursorJob.lines) && cursorJob.lines.length > 0, "LB cursor job should return response lines");
  assert.doesNotMatch(String(cursorJob.lines?.[0] || ""), /^No response\.?$/i, "LB cursor job should not fall back to no-response");
}
{
  const orbLines = runTopic(lbScript, lbHeader, "orb", { target: "Lord British" });
  assert.ok(orbLines.length > 0, "LB orb should produce response lines");
  const all = orbLines.join(" ").toLowerCase();
  assert.match(all, /\bopen a gate\b/i, "LB orb response should include gate usage guidance");
  assert.doesNotMatch(all, /\bcomp\b/, "LB orb should not include keyword list trailer noise");
  assert.doesNotMatch(all, /\bbye\b/, "LB orb should not include fallback branch keyword");
}
{
  const gargLines = runTopic(lbScript, lbHeader, "garg", { target: "Lord British" });
  assert.ok(gargLines.length > 0, "LB garg should produce response lines");
  assert.match(gargLines.join(" "), /vile creatures/i, "LB garg response should include canonical threat phrasing");
}

const nystulScript = loadConversationScript(6);
const nystulHeader = parseHeader(nystulScript);
assert.equal(nystulHeader.name, "Nystul");
{
  const opening = decodeOpeningLines(nystulScript, nystulHeader.mainPc).map((ln) => renderConversationMacros(ln, { player: "avatar", target: "Nystul", timeWord: "morning" }));
  assert.ok(opening.length > 0, "Nystul opening decode should return line array");
  const opener = opening.join(" ").toLowerCase();
  assert.doesNotMatch(opener, /\$[0-9a-z]/i, "Nystul opening should not leak unresolved macro placeholders");
  assert.doesNotMatch(opener, /\bcomp\b/, "Nystul opening should not leak keyword-list trailer noise");
}
{
  const introLines = runTopic(nystulScript, nystulHeader, "n", { target: "Nystul" });
  assert.ok(introLines.length > 0, "Nystul intro path should produce response lines");
}
{
  const nameLines = runTopic(nystulScript, nystulHeader, "name", { target: "Nystul" });
  assert.ok(nameLines.length > 0, "Nystul name should produce response lines");
  assert.doesNotMatch(nameLines.join(" "), /^No response\.?$/i, "Nystul name should not resolve to fallback no-response");
}

const dupreScript = loadConversationScript(2);
const dupreHeader = parseHeader(dupreScript);
assert.equal(dupreHeader.name, "Dupre");
{
  const joinLines = runTopic(dupreScript, dupreHeader, "join", { target: "Dupre" });
  assert.ok(joinLines.length > 0, "Dupre join should produce response lines");
}

console.log("conversation_behavior_test: ok");
