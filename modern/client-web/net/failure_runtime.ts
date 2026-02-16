export function resetBackgroundFailureState(netState: {
  backgroundFailCount: number;
  firstBackgroundFailAtMs: number;
  backgroundSyncPaused: boolean;
}): void {
  netState.backgroundFailCount = 0;
  netState.firstBackgroundFailAtMs = 0;
  netState.backgroundSyncPaused = false;
}

export function handleBackgroundFailure(
  netState: {
    backgroundFailCount: number;
    firstBackgroundFailAtMs: number;
    backgroundSyncPaused: boolean;
  },
  args: {
    err: unknown;
    context: string;
    nowMs: number;
    windowMs: number;
    maxFailures: number;
    setStatus: (level: string, text: string) => void;
  }
): void {
  if (!netState.firstBackgroundFailAtMs || (args.nowMs - netState.firstBackgroundFailAtMs) > args.windowMs) {
    netState.firstBackgroundFailAtMs = args.nowMs;
    netState.backgroundFailCount = 0;
  }
  netState.backgroundFailCount += 1;
  if (netState.backgroundFailCount >= args.maxFailures) {
    netState.backgroundSyncPaused = true;
    args.setStatus("offline", "Server unreachable. Auto-sync paused; use Net Login to retry.");
    return;
  }
  const suffix = args.err ? `: ${String((args.err as any).message || args.err)}` : "";
  args.setStatus("error", `${args.context} failed${suffix}`);
}

export function recordBackgroundFailureRuntime(
  netState: {
    backgroundFailCount: number;
    firstBackgroundFailAtMs: number;
    backgroundSyncPaused: boolean;
  },
  args: {
    err: unknown;
    context: string;
    nowMs: number;
    windowMs: number;
    maxFailures: number;
    setStatus: (level: string, text: string) => void;
  }
): void {
  handleBackgroundFailure(netState, args);
}
