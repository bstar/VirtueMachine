import {
  LEGACY_COMMAND_TYPE_RUNTIME,
  buildLegacyWireCommandRuntime,
  legacyVerbCommandTypeRuntime,
  normalizeLegacyTargetVerbRuntime
} from "./legacy_command_runtime.ts";

export interface SimCommandRuntime {
  type: number;
  tick: number;
  arg0?: number;
  arg1?: number;
}

export type MoveDeltaRuntime = readonly [number, number];

export type MoveKeyEventRuntime = {
  code?: unknown;
  key?: unknown;
};

export type SimCommandDispatchRuntime =
  | "move_avatar"
  | "use_facing"
  | "use_at_cell"
  | "look_at_cell"
  | "talk_at_cell"
  | "get_at_cell"
  | "attack_at_cell"
  | "cast_at_cell"
  | "drop_at_cell"
  | "move_at_cell"
  | "use_verb_at_cell"
  | "unknown";

export type SimCommandActionRuntime =
  | "move_avatar"
  | "use_facing"
  | "use_at_cell"
  | "look_at_cell"
  | "talk_at_cell"
  | "get_at_cell"
  | "attack_at_cell"
  | "cast_at_cell"
  | "drop_at_cell"
  | "move_at_cell"
  | "use_verb_at_cell"
  | "none";

export type SimCommandActionPlanRuntime = {
  action: SimCommandActionRuntime;
  arg0: number;
  arg1: number;
  facingDx: number;
  facingDy: number;
  shouldUpdateFacing: boolean;
};

export type SimCommandApplyStateRuntime = {
  commandsApplied: number;
};

export type SimCommandFacingStateRuntime = {
  avatarFacingDx: number;
  avatarFacingDy: number;
};

export type SimCommandActionHandlersRuntime<TSim extends SimCommandApplyStateRuntime> = {
  attackAtCell?: (sim: TSim, x: number, y: number) => void;
  castAtCell?: (sim: TSim, x: number, y: number) => void;
  dropAtCell?: (sim: TSim, x: number, y: number) => void;
  getAtCell?: (sim: TSim, x: number, y: number) => void;
  lookAtCell?: (sim: TSim, x: number, y: number) => void;
  moveAtCell?: (sim: TSim, x: number, y: number) => void;
  moveAvatar?: (sim: TSim, dx: number, dy: number) => boolean | void;
  talkAtCell?: (sim: TSim, x: number, y: number) => void;
  useAtCell?: (sim: TSim, x: number, y: number) => void;
  useFacing?: (sim: TSim, dx: number, dy: number) => void;
};

export function applySimCommandActionPlanRuntime<TSim extends SimCommandApplyStateRuntime>(args: {
  facingState?: SimCommandFacingStateRuntime | null;
  handlers: SimCommandActionHandlersRuntime<TSim>;
  plan: SimCommandActionPlanRuntime;
  sim: TSim;
}): {
  action: SimCommandActionRuntime;
  applied: boolean;
  commandsApplied: number;
  facingUpdated: boolean;
} {
  const { handlers, plan, sim } = args;
  let applied = true;
  let facingUpdated = false;
  if (plan.action === "none") {
    // The app shell consumes due no-op commands after dispatch, matching the pre-extraction path.
  } else if (plan.action === "move_avatar") {
    applied = handlers.moveAvatar?.(sim, plan.arg0, plan.arg1) !== false;
  } else if (plan.action === "use_facing") {
    handlers.useFacing?.(sim, plan.arg0, plan.arg1);
  } else if (plan.action === "use_at_cell") {
    if (plan.shouldUpdateFacing && args.facingState) {
      args.facingState.avatarFacingDx = plan.facingDx;
      args.facingState.avatarFacingDy = plan.facingDy;
      facingUpdated = true;
    }
    handlers.useAtCell?.(sim, plan.arg0, plan.arg1);
  } else if (plan.action === "look_at_cell") {
    handlers.lookAtCell?.(sim, plan.arg0, plan.arg1);
  } else if (plan.action === "talk_at_cell") {
    handlers.talkAtCell?.(sim, plan.arg0, plan.arg1);
  } else if (plan.action === "get_at_cell") {
    handlers.getAtCell?.(sim, plan.arg0, plan.arg1);
  } else if (plan.action === "attack_at_cell") {
    handlers.attackAtCell?.(sim, plan.arg0, plan.arg1);
  } else if (plan.action === "cast_at_cell") {
    handlers.castAtCell?.(sim, plan.arg0, plan.arg1);
  } else if (plan.action === "drop_at_cell") {
    handlers.dropAtCell?.(sim, plan.arg0, plan.arg1);
  } else if (plan.action === "move_at_cell") {
    handlers.moveAtCell?.(sim, plan.arg0, plan.arg1);
  } else if (plan.action === "use_verb_at_cell") {
    handlers.useAtCell?.(sim, plan.arg0, plan.arg1);
  }
  if (applied) {
    sim.commandsApplied = (Number(sim.commandsApplied) + 1) >>> 0;
  }
  return {
    action: plan.action,
    applied,
    commandsApplied: sim.commandsApplied,
    facingUpdated
  };
}

export function simCommandDispatchRuntime(commandType: unknown): SimCommandDispatchRuntime {
  switch (Number(commandType) | 0) {
    case LEGACY_COMMAND_TYPE_RUNTIME.MOVE_AVATAR:
      return "move_avatar";
    case LEGACY_COMMAND_TYPE_RUNTIME.USE_FACING:
      return "use_facing";
    case LEGACY_COMMAND_TYPE_RUNTIME.USE_AT_CELL:
      return "use_at_cell";
    case LEGACY_COMMAND_TYPE_RUNTIME.LOOK_AT_CELL:
      return "look_at_cell";
    case LEGACY_COMMAND_TYPE_RUNTIME.TALK_AT_CELL:
      return "talk_at_cell";
    case LEGACY_COMMAND_TYPE_RUNTIME.GET_AT_CELL:
      return "get_at_cell";
    case LEGACY_COMMAND_TYPE_RUNTIME.ATTACK_AT_CELL:
      return "attack_at_cell";
    case LEGACY_COMMAND_TYPE_RUNTIME.CAST_AT_CELL:
      return "cast_at_cell";
    case LEGACY_COMMAND_TYPE_RUNTIME.DROP_AT_CELL:
      return "drop_at_cell";
    case LEGACY_COMMAND_TYPE_RUNTIME.MOVE_AT_CELL:
      return "move_at_cell";
    case LEGACY_COMMAND_TYPE_RUNTIME.USE_VERB_AT_CELL:
      return "use_verb_at_cell";
    default:
      return "unknown";
  }
}

export function simCommandActionRuntime(args: {
  avatarX?: unknown;
  avatarY?: unknown;
  command: SimCommandRuntime;
  movementMode?: unknown;
}): SimCommandActionPlanRuntime {
  const arg0 = Number(args.command.arg0) | 0;
  const arg1 = Number(args.command.arg1) | 0;
  const dispatch = simCommandDispatchRuntime(args.command.type);
  if (dispatch === "move_avatar") {
    return {
      action: "move_avatar",
      arg0,
      arg1,
      facingDx: 0,
      facingDy: 0,
      shouldUpdateFacing: false
    };
  }
  if (args.movementMode !== "avatar") {
    return {
      action: "none",
      arg0,
      arg1,
      facingDx: 0,
      facingDy: 0,
      shouldUpdateFacing: false
    };
  }
  if (dispatch === "unknown") {
    return {
      action: "none",
      arg0,
      arg1,
      facingDx: 0,
      facingDy: 0,
      shouldUpdateFacing: false
    };
  }
  const facingDx = Math.sign(arg0 - (Number(args.avatarX) | 0));
  const facingDy = Math.sign(arg1 - (Number(args.avatarY) | 0));
  return {
    action: dispatch,
    arg0,
    arg1,
    facingDx,
    facingDy,
    shouldUpdateFacing: dispatch === "use_at_cell" && (facingDx !== 0 || facingDy !== 0)
  };
}

export function moveDeltaFromKeyRuntime(
  ev: MoveKeyEventRuntime,
  allowDiagonal: boolean
): MoveDeltaRuntime | null {
  const k = String(ev.key || "").toLowerCase();
  const code = String(ev.code || "");
  /* Canonical keyboard verbs use A/C/T/L/G/D/M/U; movement stays on arrows/numpad only. */
  if (k === "arrowup" || code === "Numpad8") return [0, -1];
  if (k === "arrowdown" || code === "Numpad2") return [0, 1];
  if (k === "arrowleft" || code === "Numpad4") return [-1, 0];
  if (k === "arrowright" || code === "Numpad6") return [1, 0];
  if (!allowDiagonal) {
    return null;
  }
  if (code === "Numpad7") return [-1, -1];
  if (code === "Numpad9") return [1, -1];
  if (code === "Numpad1") return [-1, 1];
  if (code === "Numpad3") return [1, 1];
  return null;
}

export function appendCommandLogRuntime(
  commandLog: SimCommandRuntime[],
  cmd: SimCommandRuntime,
  maxEntries: number
): void {
  commandLog.push({ ...cmd });
  const extra = commandLog.length - (maxEntries | 0);
  if (extra > 0) {
    commandLog.splice(0, extra);
  }
}

export function shouldSuppressRepeatedMoveRuntime(args: {
  dx: number;
  dy: number;
  lastDx: number;
  lastDy: number;
  lastQueuedAtMs: number;
  nowMs: number;
  minIntervalMs: number;
}): boolean {
  const sameAsLast = (args.dx | 0) === (args.lastDx | 0) && (args.dy | 0) === (args.lastDy | 0);
  if (!sameAsLast) {
    return false;
  }
  if ((args.lastQueuedAtMs | 0) < 0) {
    return false;
  }
  return (args.nowMs - args.lastQueuedAtMs) < args.minIntervalMs;
}

export function normalizedAvatarMoveDeltaRuntime(args: {
  dx: unknown;
  dy: unknown;
}): MoveDeltaRuntime | null {
  const dx = Number(args.dx) | 0;
  const dy = Number(args.dy) | 0;
  if (Math.abs(dx) + Math.abs(dy) !== 1) {
    return null;
  }
  return [dx, dy];
}

export function upsertMoveCommandForTickRuntime(args: {
  queue: SimCommandRuntime[];
  commandLog: SimCommandRuntime[];
  cmd: SimCommandRuntime;
  targetTick: number;
  moveType: number;
  commandLogMax: number;
}): boolean {
  for (let i = args.queue.length - 1; i >= 0; i -= 1) {
    if (args.queue[i].type === args.moveType && args.queue[i].tick === args.targetTick) {
      if (args.queue[i].arg0 === args.cmd.arg0 && args.queue[i].arg1 === args.cmd.arg1) {
        return true;
      }
      args.queue[i] = args.cmd;
      for (let j = args.commandLog.length - 1; j >= 0; j -= 1) {
        const prev = args.commandLog[j];
        if (prev.type === args.moveType && prev.tick === args.targetTick) {
          args.commandLog.splice(j, 1);
          break;
        }
      }
      appendCommandLogRuntime(args.commandLog, args.cmd, args.commandLogMax);
      return true;
    }
  }

  for (let i = args.queue.length - 1; i >= 0; i -= 1) {
    if (args.queue[i].type === args.moveType) {
      args.queue.splice(i, 1);
    }
  }
  return false;
}

export function enqueueCommandRuntime(args: {
  queue: SimCommandRuntime[];
  commandLog: SimCommandRuntime[];
  cmd: SimCommandRuntime;
  commandLogMax: number;
}): void {
  args.queue.push(args.cmd);
  appendCommandLogRuntime(args.commandLog, args.cmd, args.commandLogMax);
}

export type AvatarMoveQueueStateRuntime = {
  avatarFacingDx: number;
  avatarFacingDy: number;
  avatarWalkAnimUntilMs: number;
  commandLog: SimCommandRuntime[];
  lastMoveInputDx: number;
  lastMoveInputDy: number;
  lastMoveQueueAtMs: number;
  queue: SimCommandRuntime[];
  sim: {
    tick: number;
  };
};

export type MoveInputThrottleStateRuntime = {
  lastMoveInputDx: number;
  lastMoveInputDy: number;
  lastMoveQueueAtMs: number;
};

export function resetMoveInputThrottleRuntime(state: MoveInputThrottleStateRuntime): void {
  state.lastMoveQueueAtMs = -1;
  state.lastMoveInputDx = 0;
  state.lastMoveInputDy = 1;
}

export function queueAvatarMoveCommandRuntime(args: {
  state: AvatarMoveQueueStateRuntime;
  dx: number;
  dy: number;
  nowMs: number;
  minIntervalMs: number;
  walkAnimWindowMs?: number;
  commandLogMax: number;
}): boolean {
  const state = args.state;
  const delta = normalizedAvatarMoveDeltaRuntime({ dx: args.dx, dy: args.dy });
  if (!delta) {
    return false;
  }
  const [dx, dy] = delta;
  if (shouldSuppressRepeatedMoveRuntime({
    dx,
    dy,
    lastDx: state.lastMoveInputDx,
    lastDy: state.lastMoveInputDy,
    lastQueuedAtMs: state.lastMoveQueueAtMs,
    nowMs: args.nowMs,
    minIntervalMs: args.minIntervalMs
  })) {
    return false;
  }
  state.lastMoveQueueAtMs = args.nowMs;
  state.lastMoveInputDx = dx;
  state.lastMoveInputDy = dy;
  state.avatarFacingDx = dx;
  state.avatarFacingDy = dy;
  const targetTick = (Number(state.sim.tick) + 1) >>> 0;
  const cmd = buildLegacyWireCommandRuntime(targetTick, LEGACY_COMMAND_TYPE_RUNTIME.MOVE_AVATAR, dx, dy);
  const markQueuedMovePresentation = (): void => {
    if (Number.isFinite(args.walkAnimWindowMs)) {
      state.avatarWalkAnimUntilMs = args.nowMs + Number(args.walkAnimWindowMs);
    }
  };
  if (upsertMoveCommandForTickRuntime({
    queue: state.queue,
    commandLog: state.commandLog,
    cmd,
    targetTick,
    moveType: LEGACY_COMMAND_TYPE_RUNTIME.MOVE_AVATAR,
    commandLogMax: args.commandLogMax
  })) {
    markQueuedMovePresentation();
    return true;
  }
  enqueueCommandRuntime({
    queue: state.queue,
    commandLog: state.commandLog,
    cmd,
    commandLogMax: args.commandLogMax
  });
  markQueuedMovePresentation();
  return true;
}

export function queueFacingUseCommandRuntime(args: {
  queue: SimCommandRuntime[];
  commandLog: SimCommandRuntime[];
  tick: number;
  facingDx: number;
  facingDy: number;
  commandLogMax: number;
}): void {
  enqueueCommandRuntime({
    queue: args.queue,
    commandLog: args.commandLog,
    cmd: buildLegacyWireCommandRuntime(
      (Number(args.tick) + 1) >>> 0,
      LEGACY_COMMAND_TYPE_RUNTIME.USE_FACING,
      Number(args.facingDx) | 0,
      Number(args.facingDy) | 0
    ),
    commandLogMax: args.commandLogMax
  });
}

export function queueCellCommandRuntime(args: {
  queue: SimCommandRuntime[];
  commandLog: SimCommandRuntime[];
  tick: number;
  commandType: number;
  wx: number;
  wy: number;
  commandLogMax: number;
}): boolean {
  const commandType = Number(args.commandType) | 0;
  if (!commandType) {
    return false;
  }
  enqueueCommandRuntime({
    queue: args.queue,
    commandLog: args.commandLog,
    cmd: buildLegacyWireCommandRuntime(
      (Number(args.tick) + 1) >>> 0,
      commandType,
      Number(args.wx) | 0,
      Number(args.wy) | 0
    ),
    commandLogMax: args.commandLogMax
  });
  return true;
}

export function queueLegacyTargetVerbCommandRuntime(args: {
  queue: SimCommandRuntime[];
  commandLog: SimCommandRuntime[];
  tick: number;
  verb: unknown;
  wx: number;
  wy: number;
  commandLogMax: number;
}): boolean {
  const verb = normalizeLegacyTargetVerbRuntime(args.verb);
  const commandType = legacyVerbCommandTypeRuntime(verb) | 0;
  return queueCellCommandRuntime({
    queue: args.queue,
    commandLog: args.commandLog,
    tick: args.tick,
    commandType,
    wx: args.wx,
    wy: args.wy,
    commandLogMax: args.commandLogMax
  });
}

export function filterFutureCommandsOfTypeRuntime(
  queue: readonly SimCommandRuntime[],
  currentTick: number,
  commandType: number
): SimCommandRuntime[] {
  const now = Number(currentTick) | 0;
  const type = commandType | 0;
  return queue.filter((cmd) => {
    if (!cmd || (cmd.type | 0) !== type) {
      return true;
    }
    return (Number(cmd.tick) | 0) <= now;
  });
}

export function partitionCommandsForTickRuntime(
  queue: readonly SimCommandRuntime[],
  tick: number
): { due: SimCommandRuntime[]; pending: SimCommandRuntime[] } {
  const targetTick = tick >>> 0;
  const due: SimCommandRuntime[] = [];
  const pending: SimCommandRuntime[] = [];
  for (const cmd of queue) {
    if ((cmd.tick >>> 0) === targetTick) {
      due.push(cmd);
    } else {
      pending.push(cmd);
    }
  }
  return { due, pending };
}
