export function legacyConversationReply(opts = {}) {
  const query = String(opts.typed || "").trim();
  const queryUse = query || "bye";
  const rules = Array.isArray(opts.rules) ? opts.rules : [];
  const script = (opts.script instanceof Uint8Array) ? opts.script : null;
  const decodeResponseBytes = (typeof opts.decodeResponseBytes === "function")
    ? opts.decodeResponseBytes
    : null;
  const renderMacros = (typeof opts.renderMacros === "function")
    ? opts.renderMacros
    : ((line) => String(line || ""));
  const keyMatchesInput = (typeof opts.keyMatchesInput === "function")
    ? opts.keyMatchesInput
    : (() => false);

  for (const rule of rules) {
    const keys = Array.isArray(rule.keys) ? rule.keys : [];
    let matched = false;
    for (const key of keys) {
      if (keyMatchesInput(key, queryUse)) {
        matched = true;
        break;
      }
    }
    if (!matched) {
      continue;
    }
    const decoded = decodeResponseBytes
      ? decodeResponseBytes(
        rule.responseBytes || new Uint8Array(0),
        script,
        Number(rule.responseStartPc),
        Number(rule.responseEndPc),
        opts.vmContext || null
      )
      : { lines: [] };
    const out = [];
    for (const line of (Array.isArray(decoded?.lines) ? decoded.lines : [])) {
      const msg = renderMacros(line, opts.vmContext || null);
      if (msg) out.push(msg);
    }
    if (out.length > 0) {
      return { kind: "ok", lines: out };
    }
    return { kind: "unimplemented", lines: [] };
  }
  if (String(queryUse).toLowerCase() === "look" && opts.descText) {
    const formatter = (typeof opts.formatYouSeeLine === "function")
      ? opts.formatYouSeeLine
      : ((s) => `You see ${String(s || "").trim()}.`);
    return { kind: "ok", lines: [formatter(opts.descText)] };
  }
  return { kind: "no-match", lines: [] };
}

export function conversationRunFromKeyCursor(opts = {}) {
  const scriptBytes = (opts.scriptBytes instanceof Uint8Array) ? opts.scriptBytes : null;
  if (!scriptBytes) {
    return { kind: "no-match", lines: [], nextPc: -1, stopOpcode: 0 };
  }
  const decodeResponseOpcodeAware = (typeof opts.decodeResponseOpcodeAware === "function")
    ? opts.decodeResponseOpcodeAware
    : null;
  const renderMacros = (typeof opts.renderMacros === "function")
    ? opts.renderMacros
    : ((line) => String(line || ""));
  const keyMatchesInput = (typeof opts.keyMatchesInput === "function")
    ? opts.keyMatchesInput
    : (() => false);
  const op = opts.opcodes || {};
  const OP_ASKTOP = Number(op.ASKTOP) & 0xff;
  const OP_GET = Number(op.GET) & 0xff;
  const OP_KEY = Number(op.KEY) & 0xff;
  const OP_RES = Number(op.RES) & 0xff;
  const OP_ENDRES = Number(op.ENDRES) & 0xff;
  const OP_END = Number(op.END) & 0xff;

  let pc = Math.max(0, Number(opts.startPc) | 0);
  const input = String(opts.typed || "").trim();
  if (pc < scriptBytes.length && (scriptBytes[pc] & 0xff) === OP_ASKTOP) {
    pc += 1;
  } else if (pc < scriptBytes.length && (scriptBytes[pc] & 0xff) === OP_GET) {
    pc += 1;
    while (pc < scriptBytes.length && (scriptBytes[pc] & 0xff) !== OP_KEY) {
      pc += 1;
    }
  }

  while (pc < scriptBytes.length) {
    const opcode = scriptBytes[pc] & 0xff;
    if (opcode === OP_END || opcode === OP_ENDRES) {
      return { kind: "no-match", lines: [], nextPc: pc + 1, stopOpcode: opcode };
    }
    if (opcode !== OP_KEY) {
      pc += 1;
      continue;
    }
    pc += 1;
    const keys = [];
    while (pc < scriptBytes.length) {
      const keyBytes = [];
      while (
        pc < scriptBytes.length
        && (scriptBytes[pc] & 0xff) !== 0x2c
        && (scriptBytes[pc] & 0xff) !== OP_RES
      ) {
        keyBytes.push(scriptBytes[pc] & 0xff);
        pc += 1;
      }
      const key = String.fromCharCode(...keyBytes).trim().toLowerCase();
      if (key) keys.push(key);
      if (pc >= scriptBytes.length) break;
      if ((scriptBytes[pc] & 0xff) === 0x2c) {
        pc += 1;
        continue;
      }
      if ((scriptBytes[pc] & 0xff) === OP_RES) {
        pc += 1;
        break;
      }
    }

    const responseStartPc = pc;
    while (pc < scriptBytes.length && (scriptBytes[pc] & 0xff) !== OP_ENDRES) {
      pc += 1;
    }
    const responseEndPc = pc;
    const afterResponsePc = (pc < scriptBytes.length) ? (pc + 1) : pc;

    let matched = false;
    for (const key of keys) {
      if (keyMatchesInput(key, input || "bye")) {
        matched = true;
        break;
      }
    }
    if (matched) {
      const decoded = decodeResponseOpcodeAware
        ? decodeResponseOpcodeAware(
          scriptBytes,
          responseStartPc,
          responseEndPc,
          {
            stopOnGoto: false,
            followGoto: true,
            vmContext: opts.vmContext || null,
            stopOnInput: true
          }
        )
        : { lines: [], stopOpcode: 0, stopPc: afterResponsePc };

      const lines = (Array.isArray(decoded?.lines) ? decoded.lines : [])
        .map((line) => renderMacros(line, opts.vmContext || null))
        .map((line) => String(line || "").trim())
        .filter((line, idx, arr) => line || (idx > 0 && idx < (arr.length - 1)));
      const stopOpcode = Number(decoded?.stopOpcode) | 0;
      let nextPc = afterResponsePc;
      if (stopOpcode) {
        nextPc = Number(decoded?.stopPc) | 0;
      }
      return { kind: "ok", lines, nextPc, stopOpcode };
    }
    pc = afterResponsePc;
  }
  return { kind: "no-match", lines: [], nextPc: pc, stopOpcode: 0 };
}
