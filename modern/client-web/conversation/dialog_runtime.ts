import type { ConversationVmContext } from "./text_runtime.ts";

type ConversationVmContextRuntime = Partial<ConversationVmContext> | null;

type ConversationOpcodeMapRuntime = {
  ASKTOP?: unknown;
  END?: unknown;
  ENDRES?: unknown;
  GET?: unknown;
  KEY?: unknown;
  RES?: unknown;
};

type ConversationRuleRuntime = {
  keys?: unknown;
  responseBytes?: unknown;
  responseEndPc?: unknown;
  responseStartPc?: unknown;
};

type ConversationDecodeResultRuntime = {
  lines?: unknown;
  nextPc?: unknown;
  stopOpcode?: unknown;
  stopPc?: unknown;
};

type DecodeResponseBytesRuntime = (
  responseBytes: Uint8Array,
  script: Uint8Array | null,
  startPc: number,
  endPc: number,
  vmContext: ConversationVmContextRuntime
) => ConversationDecodeResultRuntime;

type DecodeResponseOpcodeAwareRuntime = (
  scriptBytes: Uint8Array,
  startPc: number,
  endPc: number,
  opts: {
    followGoto?: boolean;
    stopOnGoto?: boolean;
    stopOnInput?: boolean;
    vmContext?: ConversationVmContextRuntime;
  }
) => ConversationDecodeResultRuntime;

type RenderMacrosRuntime = (line: unknown, vmContext?: ConversationVmContextRuntime) => string;
type KeyMatchesInputRuntime = (pattern: unknown, input: string) => boolean;
type FormatYouSeeLineRuntime = (subject: unknown) => string;

type LegacyConversationReplyOptions = {
  decodeResponseBytes?: unknown;
  descText?: unknown;
  formatYouSeeLine?: unknown;
  keyMatchesInput?: unknown;
  renderMacros?: unknown;
  rules?: unknown;
  script?: unknown;
  typed?: unknown;
  vmContext?: unknown;
};

type LegacyConversationReplyResult =
  | { kind: "ok"; lines: string[] }
  | { kind: "unimplemented"; lines: string[] }
  | { kind: "no-match"; lines: string[] };

type ConversationRunFromKeyCursorOptions = {
  decodeResponseOpcodeAware?: unknown;
  keyMatchesInput?: unknown;
  opcodes?: unknown;
  renderMacros?: unknown;
  scriptBytes?: unknown;
  startPc?: unknown;
  typed?: unknown;
  vmContext?: unknown;
};

type ConversationRunFromKeyCursorResult = {
  kind: "ok" | "no-match";
  lines: string[];
  nextPc: number;
  stopOpcode: number;
};

function asVmContext(raw: unknown): ConversationVmContextRuntime {
  return raw && typeof raw === "object" ? raw as Partial<ConversationVmContext> : null;
}

function asDecodeResponseBytes(raw: unknown): DecodeResponseBytesRuntime | null {
  return typeof raw === "function" ? raw as DecodeResponseBytesRuntime : null;
}

function asDecodeResponseOpcodeAware(raw: unknown): DecodeResponseOpcodeAwareRuntime | null {
  return typeof raw === "function" ? raw as DecodeResponseOpcodeAwareRuntime : null;
}

function asRenderMacros(raw: unknown): RenderMacrosRuntime {
  return typeof raw === "function" ? raw as RenderMacrosRuntime : ((line: unknown) => String(line || ""));
}

function asKeyMatchesInput(raw: unknown): KeyMatchesInputRuntime {
  return typeof raw === "function" ? raw as KeyMatchesInputRuntime : (() => false);
}

export function legacyConversationReply(opts: LegacyConversationReplyOptions = {}): LegacyConversationReplyResult {
  const query = String(opts.typed || "").trim();
  const queryUse = query || "bye";
  const rules: ConversationRuleRuntime[] = Array.isArray(opts.rules) ? opts.rules as ConversationRuleRuntime[] : [];
  const script = (opts.script instanceof Uint8Array) ? opts.script : null;
  const decodeResponseBytes = asDecodeResponseBytes(opts.decodeResponseBytes);
  const renderMacros = asRenderMacros(opts.renderMacros);
  const keyMatchesInput = asKeyMatchesInput(opts.keyMatchesInput);
  const vmContext = asVmContext(opts.vmContext);

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
        rule.responseBytes instanceof Uint8Array ? rule.responseBytes : new Uint8Array(0),
        script,
        Number(rule.responseStartPc),
        Number(rule.responseEndPc),
        vmContext
      )
      : { lines: [] };
    const out: string[] = [];
    for (const line of (Array.isArray(decoded?.lines) ? decoded.lines : [])) {
      const msg = renderMacros(line, vmContext);
      if (msg) out.push(msg);
    }
    if (out.length > 0) {
      return { kind: "ok", lines: out };
    }
    return { kind: "unimplemented", lines: [] };
  }
  if (String(queryUse).toLowerCase() === "look" && opts.descText) {
    const formatter = (typeof opts.formatYouSeeLine === "function")
      ? opts.formatYouSeeLine as FormatYouSeeLineRuntime
      : ((s: unknown) => `You see ${String(s || "").trim()}.`);
    return { kind: "ok", lines: [formatter(opts.descText)] };
  }
  return { kind: "no-match", lines: [] };
}

export function conversationRunFromKeyCursor(opts: ConversationRunFromKeyCursorOptions = {}): ConversationRunFromKeyCursorResult {
  const scriptBytes = (opts.scriptBytes instanceof Uint8Array) ? opts.scriptBytes : null;
  if (!scriptBytes) {
    return { kind: "no-match", lines: [], nextPc: -1, stopOpcode: 0 };
  }
  const decodeResponseOpcodeAware = asDecodeResponseOpcodeAware(opts.decodeResponseOpcodeAware);
  const renderMacros = asRenderMacros(opts.renderMacros);
  const keyMatchesInput = asKeyMatchesInput(opts.keyMatchesInput);
  const vmContext = asVmContext(opts.vmContext);
  const op: ConversationOpcodeMapRuntime = (opts.opcodes && typeof opts.opcodes === "object")
    ? opts.opcodes as ConversationOpcodeMapRuntime
    : {};
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
    const keys: string[] = [];
    while (pc < scriptBytes.length) {
      const keyBytes: number[] = [];
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
    const boundary = decodeResponseOpcodeAware
      ? decodeResponseOpcodeAware(
        scriptBytes,
        responseStartPc,
        scriptBytes.length,
        {
          stopOnGoto: true,
          followGoto: false,
          stopOnInput: true,
          vmContext
        }
      )
      : { lines: [], stopOpcode: 0, stopPc: -1, nextPc: responseStartPc + 1 };
    const boundaryStopOpcode = Number(boundary?.stopOpcode) & 0xff;
    const boundaryStopPc = Number(boundary?.stopPc) | 0;
    const responseEndPc = (boundaryStopOpcode === OP_KEY)
      ? boundaryStopPc
      : Math.max(responseStartPc, Number(boundary?.nextPc) | 0);
    const afterResponsePc = (boundaryStopOpcode === OP_KEY)
      ? Math.max(responseStartPc, boundaryStopPc)
      : Math.max(responseStartPc, Number(boundary?.nextPc) | 0);

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
          scriptBytes.length,
          {
          stopOnGoto: false,
          followGoto: true,
          vmContext,
          stopOnInput: true
        }
      )
      : { lines: [], stopOpcode: 0, stopPc: afterResponsePc };

      const lines = (Array.isArray(decoded?.lines) ? decoded.lines : [])
        .map((line: unknown) => renderMacros(line, vmContext))
        .map((line: string) => String(line || "").trim())
        .filter((line: string, idx: number, arr: string[]) => line || (idx > 0 && idx < (arr.length - 1)));
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
