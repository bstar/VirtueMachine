import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(new URL("../..", import.meta.url).pathname);
const OP_KEY = 0xef;
const OP_RES = 0xf6;
const OP_ENDRES = 0xee;
const OP_DESC = 0xf1;
const OP_MAIN = 0xf2;
const OP_END = 0xff;

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
  return { name: name.trim(), desc: desc.replace(/\s+/g, " ").trim(), mainPc: i };
}

function readabilityScore(text) {
  const s = String(text || "");
  if (!s) return 0;
  let good = 0;
  for (let i = 0; i < s.length; i += 1) {
    const ch = s[i];
    if (/[A-Za-z0-9 ,.'!?-]/.test(ch)) good += 1;
  }
  return good / s.length;
}

function isLikelyValidHeader(h) {
  const name = String(h?.name || "").trim();
  const desc = String(h?.desc || "").trim();
  if (!name || !desc) return false;
  if (readabilityScore(name) < 0.85) return false;
  if (readabilityScore(desc) < 0.85) return false;
  return /[A-Za-z]/.test(name) && /[A-Za-z]/.test(desc);
}

function expectedDescTokensForNpc(objNum) {
  const n = Number(objNum) | 0;
  if (n === 5) return ["ruler", "britannia"];
  if (n === 6) return ["concerned", "mage"];
  if (n === 2) return ["handsome", "man"];
  return [];
}

function headerMatchesExpectedDesc(h, objNum) {
  const desc = String(h?.desc || "").toLowerCase();
  const tokens = expectedDescTokensForNpc(objNum);
  if (!tokens.length) return true;
  return tokens.every((t) => desc.includes(t));
}

function parseRules(scriptBytes, mainPc) {
  const out = [];
  function walk(startPc, endPc) {
    let i = Math.max(0, startPc | 0);
    const end = Math.max(i, Math.min(scriptBytes.length, endPc | 0));
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
        if (scriptBytes[i] === 0x2c) {
          i += 1;
          continue;
        }
        if (scriptBytes[i] === OP_RES) {
          i += 1;
        }
        break;
      }
      const start = i;
      while (i < end && scriptBytes[i] !== OP_ENDRES) i += 1;
      const finish = i;
      if (scriptBytes[i] === OP_ENDRES) i += 1;
      if (keys.length > 0 && finish > start) {
        out.push({ keys, response: scriptBytes.slice(start, finish) });
        walk(start, finish);
      }
    }
  }
  walk(mainPc, scriptBytes.length);
  return out;
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
    if (p.length !== w.length) continue;
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

function decodeResponseQuotedOnly(responseBytes) {
  const lines = [];
  let cur = "";
  let quoted = false;
  let sawQuotedText = false;
  const flush = () => {
    const text = cur.replace(/\s+/g, " ").trim();
    if (text) lines.push(text);
    cur = "";
  };
  for (let i = 0; i < responseBytes.length; i += 1) {
    const b = responseBytes[i] & 0xff;
    if (b === 0x22) {
      if (quoted) flush();
      quoted = !quoted;
      sawQuotedText = true;
      continue;
    }
    if (quoted && b >= 32 && b < 0x80) {
      cur += String.fromCharCode(b);
    }
  }
  if (quoted) flush();
  if (!sawQuotedText && !lines.length) {
    let tmp = "";
    for (let i = 0; i < responseBytes.length; i += 1) {
      const b = responseBytes[i] & 0xff;
      tmp += (b >= 32 && b < 0x7f) ? String.fromCharCode(b) : " ";
    }
    const safe = tmp.replace(/\s+/g, " ").trim();
    if (safe) lines.push(safe);
  }
  return lines;
}

function renderConversationMacros(line, ctx) {
  const player = String(ctx?.player || "avatar").trim() || "avatar";
  const target = String(ctx?.target || "").trim();
  const gender = String(ctx?.gender || "milady").trim() || "milady";
  const title = String(ctx?.title || gender).trim() || "milady";
  return String(line || "")
    .replace(/\$P/g, player)
    .replace(/\$N/g, target)
    .replace(/\$G/g, gender)
    .replace(/\$T/g, title);
}

function extractQuotedStrings(scriptBytes) {
  const out = [];
  let quoted = false;
  let cur = "";
  for (let i = 0; i < scriptBytes.length; i += 1) {
    const b = scriptBytes[i] & 0xff;
    if (b === 0x22) {
      if (quoted) {
        const text = cur.replace(/\s+/g, " ").trim();
        if (text) out.push(text);
        cur = "";
      }
      quoted = !quoted;
      continue;
    }
    if (quoted && b >= 32 && b < 127) {
      cur += String.fromCharCode(b);
    }
  }
  return out;
}

const lb = loadConversationScript(5);
const lbHeader = parseHeader(lb);
assert.equal(lbHeader.name, "Lord British");
assert.match(lbHeader.desc, /ruler of Britannia/i);
{
  const lbRules = parseRules(lb, lbHeader.mainPc);
  assert.ok(lbRules.length > 0, "Lord British rules should exist");
  assert.ok(lbRules.some((r) => r.keys.includes("job")), "Lord British should expose nested 'job' topic");
  const quoted = extractQuotedStrings(lb);
  assert.ok(quoted.length > 0, "Lord British should expose quoted dialogue");
  const macroLines = quoted.filter((ln) => /\$[A-Za-z]/.test(ln));
  assert.ok(macroLines.length > 0, "Lord British should have at least one macro-bearing line");
  const rendered = macroLines.map((ln) => renderConversationMacros(ln, {
    player: "avatar",
    target: "Lord British",
    gender: "milady",
    title: "milady"
  }));
  for (const line of rendered) {
    assert.match(line, /^[\x20-\x7e]+$/, `Rendered line has non-printable chars: ${JSON.stringify(line)}`);
    assert.ok(!/\$[A-Za-z]/.test(line), `Rendered line still has unresolved macro token: ${line}`);
  }
}

const nystul = loadConversationScript(6);
const nystulHeader = parseHeader(nystul);
assert.equal(nystulHeader.name, "Nystul");
assert.match(nystulHeader.desc, /concerned looking mage/i);
assert.equal(isLikelyValidHeader(nystulHeader), true, "Nystul header should be considered valid");
assert.equal(headerMatchesExpectedDesc(nystulHeader, 6), true, "Nystul desc should contain canonical markers");
{
  const rules = parseRules(nystul, nystulHeader.mainPc);
  assert.ok(rules.length > 0, "Nystul rules should exist");
  let lines = [];
  for (const rule of rules) {
    const maybe = decodeResponseQuotedOnly(rule.response);
    if (maybe.length > 0) {
      lines = maybe;
      break;
    }
  }
  assert.ok(lines.length > 0, "Nystul should decode at least one response line");
  for (const line of lines) {
    assert.match(line, /^[\x20-\x7e]+$/, `Nystul line contains non-printable bytes: ${JSON.stringify(line)}`);
  }
}

{
  let foundInvalid = null;
  for (let npc = 0; npc < 0x100; npc += 1) {
    try {
      const script = loadConversationScript(npc);
      if (!script || script.length < 8) continue;
      const h = parseHeader(script);
      if (!isLikelyValidHeader(h)) {
        foundInvalid = { npc, h };
        break;
      }
    } catch (_err) {
      // ignore out-of-range/missing offsets while scanning
    }
  }
  assert.ok(foundInvalid, "Expected at least one invalid conversation header candidate for fallback testing");
}

const dupre = loadConversationScript(2);
const dupreHeader = parseHeader(dupre);
assert.equal(dupreHeader.name, "Dupre");
assert.match(dupreHeader.desc, /handsome man/i);
assert.equal(headerMatchesExpectedDesc(dupreHeader, 2), true, "Dupre desc should contain canonical markers");

{
  const fakeCorrupt = { name: "Nystul", desc: "VEc>QTf]JUQByGJbN %,j( ACqyEzEBYhi[kH%[@" };
  assert.equal(isLikelyValidHeader(fakeCorrupt), false, "Corrupt header should fail readability gate");
  assert.equal(headerMatchesExpectedDesc(fakeCorrupt, 6), false, "Corrupt Nystul desc must fail canonical token check");
}

console.log("conversation_script_test: ok");
