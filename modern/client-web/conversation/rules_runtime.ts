export type ConversationOpcodeMap = {
  KEY: number;
  RES: number;
  ENDRES: number;
};

export type ConversationRule = {
  keys: string[];
  responseBytes: Uint8Array;
  responseStartPc: number;
  responseEndPc: number;
};

function parseConversationRulesInRange(
  scriptBytes: Uint8Array,
  startPc: number,
  endPc: number,
  out: ConversationRule[],
  opcodes: ConversationOpcodeMap
): void {
  const keyOp = Number(opcodes?.KEY) & 0xff;
  const resOp = Number(opcodes?.RES) & 0xff;
  const endResOp = Number(opcodes?.ENDRES) & 0xff;
  const end = Math.max(0, Math.min(Number(endPc) | 0, scriptBytes.length));
  let i = Math.max(0, Math.min(Number(startPc) | 0, end));
  while (i < end) {
    if ((scriptBytes[i] & 0xff) !== keyOp) {
      i += 1;
      continue;
    }
    i += 1;
    const keys = [];
    while (i < end) {
      const keyBytes = [];
      while (
        i < end
        && (scriptBytes[i] & 0xff) !== 0x2c
        && (scriptBytes[i] & 0xff) !== resOp
      ) {
        keyBytes.push(scriptBytes[i] & 0xff);
        i += 1;
      }
      const key = String.fromCharCode(...keyBytes).trim().toLowerCase();
      if (key) {
        keys.push(key);
      }
      if (i >= end) break;
      if ((scriptBytes[i] & 0xff) === 0x2c) {
        i += 1;
        continue;
      }
      if ((scriptBytes[i] & 0xff) === resOp) {
        i += 1;
        break;
      }
    }

    const respStart = i;
    while (i < end && (scriptBytes[i] & 0xff) !== endResOp) {
      i += 1;
    }
    const respEnd = i;
    if (i < end && (scriptBytes[i] & 0xff) === endResOp) {
      i += 1;
    }
    if (keys.length > 0 && respEnd > respStart) {
      out.push({
        keys,
        responseBytes: scriptBytes.slice(respStart, respEnd),
        responseStartPc: respStart,
        responseEndPc: respEnd
      });
      parseConversationRulesInRange(scriptBytes, respStart, respEnd, out, opcodes);
    }
  }
}

export function parseConversationRules(
  scriptBytes: Uint8Array,
  mainPc: number,
  opcodes: ConversationOpcodeMap
): ConversationRule[] {
  if (!(scriptBytes instanceof Uint8Array) || !scriptBytes.length) {
    return [];
  }
  const out = [];
  parseConversationRulesInRange(
    scriptBytes,
    Math.max(0, Number(mainPc) | 0),
    scriptBytes.length,
    out,
    opcodes
  );
  return out;
}

export function findConversationFirstKeyPc(
  scriptBytes: Uint8Array,
  mainPc: number,
  opcodes: ConversationOpcodeMap
): number {
  if (!(scriptBytes instanceof Uint8Array) || !scriptBytes.length) {
    return -1;
  }
  const keyOp = Number(opcodes?.KEY) & 0xff;
  let pc = Math.max(0, Number(mainPc) | 0);
  while (pc < scriptBytes.length) {
    if ((scriptBytes[pc] & 0xff) === keyOp) {
      return pc;
    }
    pc += 1;
  }
  return -1;
}
