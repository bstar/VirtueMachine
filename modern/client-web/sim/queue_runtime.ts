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

export function queueAvatarMoveCommandRuntime(args: {
  state: AvatarMoveQueueStateRuntime;
  dx: number;
  dy: number;
  nowMs: number;
  minIntervalMs: number;
  walkAnimWindowMs: number;
  commandLogMax: number;
}): boolean {
  const state = args.state;
  const dx = Number(args.dx) | 0;
  const dy = Number(args.dy) | 0;
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
  state.avatarWalkAnimUntilMs = args.nowMs + args.walkAnimWindowMs;
  const targetTick = (Number(state.sim.tick) + 1) >>> 0;
  const cmd = buildLegacyWireCommandRuntime(targetTick, LEGACY_COMMAND_TYPE_RUNTIME.MOVE_AVATAR, dx, dy);
  if (upsertMoveCommandForTickRuntime({
    queue: state.queue,
    commandLog: state.commandLog,
    cmd,
    targetTick,
    moveType: LEGACY_COMMAND_TYPE_RUNTIME.MOVE_AVATAR,
    commandLogMax: args.commandLogMax
  })) {
    return true;
  }
  enqueueCommandRuntime({
    queue: state.queue,
    commandLog: state.commandLog,
    cmd,
    commandLogMax: args.commandLogMax
  });
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
