export interface SimCommandRuntime {
  type: number;
  tick: number;
  arg0?: number;
  arg1?: number;
  arg2?: number;
  arg3?: number;
  [key: string]: unknown;
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
