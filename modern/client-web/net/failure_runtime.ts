export function resetBackgroundFailureState(netState: {
  backgroundFailCount: number;
  firstBackgroundFailAtMs: number;
  backgroundSyncPaused: boolean;
}): void {
  netState.backgroundFailCount = 0;
  netState.firstBackgroundFailAtMs = 0;
  netState.backgroundSyncPaused = false;
}

export function backgroundFailureMessageRuntime(err: unknown): string {
  if (!err) {
    return "";
  }
  if (err instanceof Error && err.message) {
    return err.message;
  }
  if (err && typeof err === "object" && "message" in err) {
    const message = (err as { message?: unknown }).message;
    return String(message || err);
  }
  return String(err);
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
  const errMessage = backgroundFailureMessageRuntime(args.err);
  const suffix = errMessage ? `: ${errMessage}` : "";
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
