const CONV_OP_KEY = 0xef;
const CONV_OP_ENDRES = 0xee;
const CONV_OP_END = 0xff;
const CONV_OP_JOIN = 0xca;
const CONV_OP_ASKTOP = 0xf7;
const CONV_OP_GET = 0xf8;
const CONV_OP_GETSTR = 0xf9;
const CONV_OP_GETCHR = 0xfa;
const CONV_OP_GETINT = 0xfb;
const CONV_OP_GETDIGIT = 0xfc;
const CONV_OP_GOTO = 0xb0;
const CONV_OP_CALL = 0xb1;
const CONV_OP_VARINT = 0xb2;
const CONV_OP_VARSTR = 0xb3;
const CONV_OP_PRINTSTR = 0xb5;
const CONV_OP_IF = 0xa1;
const CONV_OP_ENDIF = 0xa2;
const CONV_OP_ELSE = 0xa3;
const CONV_OP_LET = 0xa6;
const CONV_OP_END_OF_FACTOR = 0xa7;
const CONV_OP_LET_VALUE = 0xa8;
const CONV_OP_TST = 0xab;
const CONV_OP_ADDRESS = 0xd2;
const CONV_OP_BYTE = 0xd3;
const CONV_OP_WORD = 0xd4;
const CONV_OP_EQU = 0x86;
const CONV_OP_DIF = 0x85;
const CONV_OP_SUP = 0x81;
const CONV_OP_SUPE = 0x82;
const CONV_OP_INF = 0x83;
const CONV_OP_INFE = 0x84;
const CONV_OP_ADD = 0x90;
const CONV_OP_SUB = 0x91;
const CONV_OP_MUL = 0x92;
const CONV_OP_DIV = 0x93;
const CONV_OP_OR = 0x94;
const CONV_OP_AND = 0x95;
const CONV_OP_NPC = 0xeb;

function appendConversationChar(ch, linesRef) {
  const arr = linesRef;
  if (!Array.isArray(arr) || arr.length <= 0) {
    arr.push("");
  }
  const idx = arr.length - 1;
  arr[idx] = String(arr[idx] || "") + ch;
}

function pushConversationLineBreak(linesRef) {
  const arr = linesRef;
  if (!Array.isArray(arr) || arr.length <= 0) {
    arr.push("");
    return;
  }
  if (arr[arr.length - 1] !== "") {
    arr.push("");
  }
}

function readConversationCString(scriptBytes, startPc) {
  const out = [];
  let i = Math.max(0, Number(startPc) | 0);
  while (i < scriptBytes.length) {
    const b = scriptBytes[i] & 0xff;
    i += 1;
    if (b === 0x00) {
      break;
    }
    if (b >= 0x20 && b < 0x80 && b !== 0x22) {
      out.push(String.fromCharCode(b));
    } else if (b === 10 || b === 13) {
      out.push(" ");
    }
  }
  return out.join("").replace(/\s+/g, " ").trim();
}

function readConversationU32(scriptBytes, pc) {
  if ((pc + 4) > scriptBytes.length) {
    return { value: 0, nextPc: scriptBytes.length };
  }
  const value = (
    (scriptBytes[pc] & 0xff)
    | ((scriptBytes[pc + 1] & 0xff) << 8)
    | ((scriptBytes[pc + 2] & 0xff) << 16)
    | ((scriptBytes[pc + 3] & 0xff) << 24)
  ) >>> 0;
  return { value, nextPc: pc + 4 };
}

function conversationVmReadVarInt(vmContext, idx) {
  const i = Number(idx) | 0;
  const src = Array.isArray(vmContext?.varInt) ? vmContext.varInt : null;
  if (!src || i < 0 || i >= src.length) return 0;
  return Number(src[i]) | 0;
}

function conversationVmReadVarStr(vmContext, idx) {
  const i = Number(idx) | 0;
  const src = Array.isArray(vmContext?.varStr) ? vmContext.varStr : null;
  if (!src || i < 0 || i >= src.length) return "";
  return String(src[i] || "");
}

function conversationVmWriteVarInt(vmContext, idx, value) {
  const i = Number(idx) | 0;
  const dst = Array.isArray(vmContext?.varInt) ? vmContext.varInt : null;
  if (!dst || i < 0 || i >= dst.length) return;
  dst[i] = Number(value) | 0;
}

function conversationVmWriteVarStr(vmContext, idx, value) {
  const i = Number(idx) | 0;
  const dst = Array.isArray(vmContext?.varStr) ? vmContext.varStr : null;
  if (!dst || i < 0 || i >= dst.length) return;
  dst[i] = String(value || "");
}

function conversationVmEvalFactor(scriptBytes, startPc, vmContext, endPc) {
  let pc = Math.max(0, Number(startPc) | 0);
  const end = Math.max(pc, Math.min(scriptBytes.length, Number(endPc) | 0));
  const stack = [];
  const pop = () => ((stack.length > 0) ? stack.pop() : 0);
  const asNum = (v) => {
    if (typeof v === "string") {
      const n = Number(v);
      return Number.isFinite(n) ? (n | 0) : 0;
    }
    return Number(v) | 0;
  };
  const asStr = (v) => String(v == null ? "" : v);
  while (pc < end) {
    const opcode = scriptBytes[pc] & 0xff;
    pc += 1;
    if (opcode === CONV_OP_END_OF_FACTOR || opcode === CONV_OP_LET_VALUE) {
      break;
    }
    let token = opcode;
    if (opcode === CONV_OP_ADDRESS) {
      const out = readConversationU32(scriptBytes, pc);
      token = out.value;
      pc = out.nextPc;
      stack.push(token);
      continue;
    }
    if (opcode === CONV_OP_BYTE) {
      token = (pc < end) ? (scriptBytes[pc] & 0xff) : 0;
      pc += 1;
      stack.push(token);
      continue;
    }
    if (opcode === CONV_OP_WORD) {
      token = (pc + 1 < end)
        ? ((scriptBytes[pc] & 0xff) | ((scriptBytes[pc + 1] & 0xff) << 8))
        : 0;
      pc += 2;
      stack.push(token);
      continue;
    }
    switch (token) {
      case CONV_OP_VARINT: {
        const idx = pop();
        stack.push(conversationVmReadVarInt(vmContext, idx));
      } break;
      case CONV_OP_VARSTR: {
        const idx = pop();
        stack.push(conversationVmReadVarStr(vmContext, idx));
      } break;
      case CONV_OP_TST: {
        const bit = asNum(pop()) & 0x1f;
        const objNumRaw = asNum(pop());
        const objNum = (objNumRaw === CONV_OP_NPC) ? (Number(vmContext?.objNum) | 0) : objNumRaw;
        const flags = Number(vmContext?.talkFlags?.[objNum]) | 0;
        stack.push((flags >> bit) & 1);
      } break;
      case CONV_OP_EQU: {
        const b = pop();
        const a = pop();
        if (typeof a === "string" || typeof b === "string") {
          stack.push(asStr(a).toLowerCase() === asStr(b).toLowerCase() ? 1 : 0);
        } else {
          stack.push(asNum(a) === asNum(b) ? 1 : 0);
        }
      } break;
      case CONV_OP_DIF: {
        const b = pop();
        const a = pop();
        if (typeof a === "string" || typeof b === "string") {
          stack.push(asStr(a).toLowerCase() !== asStr(b).toLowerCase() ? 1 : 0);
        } else {
          stack.push(asNum(a) !== asNum(b) ? 1 : 0);
        }
      } break;
      case CONV_OP_SUP: {
        const b = asNum(pop());
        const a = asNum(pop());
        stack.push(a > b ? 1 : 0);
      } break;
      case CONV_OP_SUPE: {
        const b = asNum(pop());
        const a = asNum(pop());
        stack.push(a >= b ? 1 : 0);
      } break;
      case CONV_OP_INF: {
        const b = asNum(pop());
        const a = asNum(pop());
        stack.push(a < b ? 1 : 0);
      } break;
      case CONV_OP_INFE: {
        const b = asNum(pop());
        const a = asNum(pop());
        stack.push(a <= b ? 1 : 0);
      } break;
      case CONV_OP_ADD: {
        const b = asNum(pop());
        const a = asNum(pop());
        stack.push((a + b) | 0);
      } break;
      case CONV_OP_SUB: {
        const b = asNum(pop());
        const a = asNum(pop());
        stack.push((a - b) | 0);
      } break;
      case CONV_OP_MUL: {
        const b = asNum(pop());
        const a = asNum(pop());
        stack.push((a * b) | 0);
      } break;
      case CONV_OP_DIV: {
        const b = asNum(pop());
        const a = asNum(pop());
        stack.push(b ? ((a / b) | 0) : 0);
      } break;
      case CONV_OP_AND: {
        const b = asNum(pop());
        const a = asNum(pop());
        stack.push((a && b) ? 1 : 0);
      } break;
      case CONV_OP_OR: {
        const b = asNum(pop());
        const a = asNum(pop());
        stack.push((a || b) ? 1 : 0);
      } break;
      default:
        stack.push(token);
    }
  }
  const value = (stack.length > 0) ? stack[stack.length - 1] : 0;
  return { value: Number(value) | 0, nextPc: pc };
}

function conversationVmSkipToElseOrEndIf(scriptBytes, startPc, endPc) {
  let pc = Math.max(0, Number(startPc) | 0);
  const end = Math.max(pc, Math.min(scriptBytes.length, Number(endPc) | 0));
  while (pc < end) {
    const opcode = scriptBytes[pc] & 0xff;
    pc += 1;
    if (opcode === CONV_OP_ELSE || opcode === CONV_OP_ENDIF) {
      return pc;
    }
    if (opcode === CONV_OP_GOTO || opcode === CONV_OP_CALL || opcode === CONV_OP_ADDRESS) {
      pc += 4;
      continue;
    }
    if (opcode === CONV_OP_BYTE) {
      pc += 1;
      continue;
    }
    if (opcode === CONV_OP_WORD) {
      pc += 2;
      continue;
    }
  }
  return pc;
}

function conversationVmSkipToEndIf(scriptBytes, startPc, endPc) {
  let pc = Math.max(0, Number(startPc) | 0);
  const end = Math.max(pc, Math.min(scriptBytes.length, Number(endPc) | 0));
  while (pc < end) {
    const opcode = scriptBytes[pc] & 0xff;
    pc += 1;
    if (opcode === CONV_OP_ENDIF) {
      return pc;
    }
    if (opcode === CONV_OP_GOTO || opcode === CONV_OP_CALL || opcode === CONV_OP_ADDRESS) {
      pc += 4;
      continue;
    }
    if (opcode === CONV_OP_BYTE) {
      pc += 1;
      continue;
    }
    if (opcode === CONV_OP_WORD) {
      pc += 2;
      continue;
    }
  }
  return pc;
}

export function decodeConversationResponseOpcodeAware(scriptBytes, startPc, endPc, opts = null) {
  const options = (opts && typeof opts === "object") ? opts : {};
  const stopOnGoto = options.stopOnGoto !== false;
  const followGoto = !!options.followGoto;
  const vmContext = (options.vmContext && typeof options.vmContext === "object")
    ? options.vmContext
    : {};
  const stopOnInput = options.stopOnInput !== false;
  const lines = [""];
  let sawJoin = false;
  let stopOpcode = 0;
  let stopPc = -1;
  let pc = Math.max(0, Number(startPc) | 0);
  const end = Math.max(pc, Math.min(scriptBytes.length, Number(endPc) | 0));
  const maxSteps = Math.max(1024, Math.min(65536, scriptBytes.length * 4));
  let steps = 0;
  const seenTargets = new Set();
  while (pc < end) {
    steps += 1;
    if (steps > maxSteps) {
      break;
    }
    const op = scriptBytes[pc] & 0xff;
    pc += 1;
    if (op < 0x80) {
      if (op === 10 || op === 13) {
        pushConversationLineBreak(lines);
      } else if (op >= 0x20 && op < 0x7f) {
        appendConversationChar(String.fromCharCode(op), lines);
      }
      continue;
    }
    if (op === CONV_OP_JOIN) {
      sawJoin = true;
      continue;
    }
    if (op === CONV_OP_ENDRES || op === CONV_OP_END) {
      stopOpcode = op;
      stopPc = pc - 1;
      break;
    }
    if (op === CONV_OP_KEY) {
      stopOpcode = op;
      stopPc = pc - 1;
      break;
    }
    if (
      stopOnInput
      && (op === CONV_OP_ASKTOP
        || op === CONV_OP_GET
        || op === CONV_OP_GETSTR
        || op === CONV_OP_GETCHR
        || op === CONV_OP_GETINT
        || op === CONV_OP_GETDIGIT)
    ) {
      stopOpcode = op;
      stopPc = pc - 1;
      break;
    }
    if (op >= 0xf0 || op === 0x00) {
      stopOpcode = op;
      stopPc = pc - 1;
      break;
    }
    if (op === CONV_OP_GOTO) {
      const out = readConversationU32(scriptBytes, pc);
      const target = out.value >>> 0;
      pc = out.nextPc;
      if (pc > scriptBytes.length) {
        break;
      }
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
    if (op === CONV_OP_CALL || op === CONV_OP_ADDRESS) {
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
    if (op === CONV_OP_IF) {
      const evalOut = conversationVmEvalFactor(scriptBytes, pc, vmContext, end);
      pc = evalOut.nextPc;
      if ((Number(evalOut.value) | 0) === 0) {
        pc = conversationVmSkipToElseOrEndIf(scriptBytes, pc, end);
      }
      continue;
    }
    if (op === CONV_OP_ELSE) {
      pc = conversationVmSkipToEndIf(scriptBytes, pc, end);
      continue;
    }
    if (op === CONV_OP_ENDIF) {
      continue;
    }
    if (op === CONV_OP_LET) {
      if (pc >= end) {
        break;
      }
      const dstIndex = scriptBytes[pc] & 0xff;
      pc += 1;
      if (pc >= end) {
        break;
      }
      const dstType = scriptBytes[pc] & 0xff;
      pc += 1;
      if (pc >= end || (scriptBytes[pc] & 0xff) !== CONV_OP_LET_VALUE) {
        continue;
      }
      pc += 1;
      if (dstType === CONV_OP_VARINT) {
        const evalOut = conversationVmEvalFactor(scriptBytes, pc, vmContext, end);
        pc = evalOut.nextPc;
        conversationVmWriteVarInt(vmContext, dstIndex, evalOut.value);
      } else if (dstType === CONV_OP_VARSTR) {
        if (pc < end && (scriptBytes[pc] & 0xff) === CONV_OP_ADDRESS) {
          pc += 1;
          const out = readConversationU32(scriptBytes, pc);
          pc = out.nextPc;
          conversationVmWriteVarStr(vmContext, dstIndex, readConversationCString(scriptBytes, out.value));
        } else if ((pc + 1) < end) {
          const srcIndex = scriptBytes[pc] & 0xff;
          const srcType = scriptBytes[pc + 1] & 0xff;
          pc += 2;
          if (srcType === CONV_OP_VARSTR) {
            conversationVmWriteVarStr(vmContext, dstIndex, conversationVmReadVarStr(vmContext, srcIndex));
          }
        }
      } else {
        const evalOut = conversationVmEvalFactor(scriptBytes, pc, vmContext, end);
        pc = evalOut.nextPc;
      }
      continue;
    }
    if (op === CONV_OP_PRINTSTR) {
      if (pc < end && (scriptBytes[pc] & 0xff) === CONV_OP_ADDRESS && (pc + 4) < end) {
        pc += 1;
        const out = readConversationU32(scriptBytes, pc);
        const target = out.value >>> 0;
        pc = out.nextPc;
        const text = readConversationCString(scriptBytes, target);
        if (text) {
          appendConversationChar(text, lines);
        }
      } else if ((pc + 1) < end) {
        const idx = scriptBytes[pc] & 0xff;
        const opType = scriptBytes[pc + 1] & 0xff;
        pc += 2;
        if (opType === CONV_OP_VARSTR) {
          appendConversationChar(conversationVmReadVarStr(vmContext, idx), lines);
        }
      } else {
        pc = end;
      }
      continue;
    }
    if (op === CONV_OP_BYTE) {
      pc += 1;
      continue;
    }
    if (op === CONV_OP_WORD) {
      pc += 2;
      continue;
    }
  }
  const out = lines.map((s) => String(s || "").replace(/\s+/g, " ").trim()).filter((v, idx, arr) => {
    if (v) return true;
    return idx > 0 && idx < (arr.length - 1);
  });
  return { lines: out, sawJoin, stopOpcode, stopPc, nextPc: pc };
}

export function decodeConversationResponseBytes(responseBytes, scriptBytes = null, startPc = -1, endPc = -1, vmContext = null) {
  if (scriptBytes instanceof Uint8Array && startPc >= 0 && endPc > startPc) {
    return decodeConversationResponseOpcodeAware(scriptBytes, startPc, endPc, { vmContext });
  }
  const lines = [];
  let cur = "";
  let quoted = false;
  let sawQuotedText = false;
  let sawJoin = false;
  const flush = () => {
    const text = cur.replace(/\s+/g, " ").trim();
    if (text) lines.push(text);
    cur = "";
  };
  for (let i = 0; i < responseBytes.length; i += 1) {
    const b = responseBytes[i] & 0xff;
    if (b === CONV_OP_JOIN) {
      sawJoin = true;
      continue;
    }
    if (b === 0x22) {
      if (quoted) {
        flush();
      }
      quoted = !quoted;
      sawQuotedText = true;
      continue;
    }
    if (quoted && b >= 32 && b < 0x80) {
      cur += String.fromCharCode(b);
    }
  }
  if (quoted) flush();
  if (!sawQuotedText && !lines.length && scriptBytes instanceof Uint8Array && startPc >= 0 && endPc > startPc) {
    return decodeConversationResponseOpcodeAware(scriptBytes, startPc, endPc, { vmContext });
  }
  if (!sawQuotedText && !lines.length) {
    let tmp = "";
    for (let i = 0; i < responseBytes.length; i += 1) {
      const b = responseBytes[i] & 0xff;
      if (b >= 32 && b < 0x7f) {
        tmp += String.fromCharCode(b);
      } else {
        tmp += " ";
      }
    }
    const safe = tmp.replace(/\s+/g, " ").trim();
    if (safe) {
      lines.push(safe);
    }
  }
  return { lines, sawJoin };
}

export function decodeConversationOpeningLines(scriptBytes, mainPc, vmContext = null) {
  if (!(scriptBytes instanceof Uint8Array)) {
    return [];
  }
  const start = Math.max(0, Number(mainPc) | 0);
  const decoded = decodeConversationResponseOpcodeAware(
    scriptBytes,
    start,
    scriptBytes.length,
    { stopOnGoto: false, followGoto: true, vmContext }
  );
  return Array.isArray(decoded?.lines) ? decoded.lines : [];
}

export function decodeConversationOpeningResult(scriptBytes, mainPc, vmContext = null) {
  if (!(scriptBytes instanceof Uint8Array)) {
    return { lines: [], stopOpcode: 0, stopPc: -1, nextPc: -1 };
  }
  const start = Math.max(0, Number(mainPc) | 0);
  const decoded = decodeConversationResponseOpcodeAware(
    scriptBytes,
    start,
    scriptBytes.length,
    { stopOnGoto: false, followGoto: true, vmContext }
  );
  return {
    lines: Array.isArray(decoded?.lines) ? decoded.lines : [],
    stopOpcode: Number(decoded?.stopOpcode) | 0,
    stopPc: Number(decoded?.stopPc) | 0,
    nextPc: Number(decoded?.nextPc) | 0
  };
}
