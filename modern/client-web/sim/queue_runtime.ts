export function appendCommandLogRuntime(
  commandLog: Array<any>,
  cmd: any,
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
  queue: Array<any>;
  commandLog: Array<any>;
  cmd: any;
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
  queue: Array<any>;
  commandLog: Array<any>;
  cmd: any;
  commandLogMax: number;
}): void {
  args.queue.push(args.cmd);
  appendCommandLogRuntime(args.commandLog, args.cmd, args.commandLogMax);
}
