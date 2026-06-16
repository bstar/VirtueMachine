export type ReplayCheckpointRuntime = {
  hash: string;
  tick: number;
};

export type ReplayCheckpointComparisonRuntime = {
  allMatch: boolean;
  sameLength: boolean;
};

export type ReplayVerificationViewRuntime = {
  diagClass: "ok" | "warn";
  diagText: string;
  replayStable: boolean;
  statText: string;
};

export type ReplayVerificationResultRuntime = ReplayVerificationViewRuntime & {
  csvText: string | null;
};

export type ReplayDownloadLinkRuntime = {
  classList: {
    add(name: string): void;
    remove(name: string): void;
  };
  download: string;
  href: string;
  removeAttribute(name: string): void;
};

export type ReplayObjectUrlStateRuntime = {
  replayUrl: string | null;
};

export type ReplayObjectUrlRuntime = {
  createObjectURL(blob: Blob): string;
  revokeObjectURL(url: string): void;
};

export function replayTotalTicksRuntime(args: {
  commandTicks: readonly unknown[];
  currentTick: unknown;
}): number {
  const currentTick = Math.max(0, Number(args.currentTick) | 0);
  const maxCommandTick = args.commandTicks.reduce<number>((maxTick, raw) => {
    const tick = Math.max(0, Number(raw) | 0);
    return Math.max(maxTick, tick);
  }, 0);
  return Math.max(currentTick, maxCommandTick, 1);
}

export function replayCommandTicksRuntime(commands: readonly { tick?: unknown }[]): number[] {
  return commands.map((cmd) => Number(cmd.tick) | 0);
}

export function runReplayCheckpointsRuntime<TSim, TCommand>(args: {
  commands: readonly TCommand[];
  createSim: () => TSim;
  hashSim: (sim: TSim) => string;
  interval: unknown;
  stepSim: (sim: TSim, queue: TCommand[]) => readonly TCommand[];
  totalTicks: unknown;
}): ReplayCheckpointRuntime[] {
  const totalTicks = Math.max(0, Number(args.totalTicks) | 0);
  const interval = Math.max(1, Number(args.interval) | 0);
  const sim = args.createSim();
  const queue = args.commands.map((cmd) => ({ ...(cmd as object) })) as TCommand[];
  const checkpoints: ReplayCheckpointRuntime[] = [];

  for (let i = 0; i < totalTicks; i += 1) {
    const pending = args.stepSim(sim, queue);
    queue.length = 0;
    queue.push(...pending);

    const tick = Number((sim as { tick?: unknown }).tick) | 0;
    if ((tick % interval) === 0 || tick === totalTicks) {
      checkpoints.push({
        tick,
        hash: args.hashSim(sim)
      });
    }
  }

  return checkpoints;
}

export function replayCheckpointsCsvRuntime(checkpoints: readonly ReplayCheckpointRuntime[]): string {
  const lines = ["tick,hash"];
  for (const cp of checkpoints) {
    lines.push(`${cp.tick},${cp.hash}`);
  }
  return `${lines.join("\n")}\n`;
}

export function compareReplayCheckpointsRuntime(
  a: readonly ReplayCheckpointRuntime[],
  b: readonly ReplayCheckpointRuntime[]
): ReplayCheckpointComparisonRuntime {
  const sameLength = a.length === b.length;
  return {
    allMatch: sameLength && a.every((cp, idx) => cp.tick === b[idx].tick && cp.hash === b[idx].hash),
    sameLength
  };
}

export function replayVerificationViewRuntime(args: {
  animation: ReplayCheckpointComparisonRuntime;
  animationCheckpointCount: number;
  replay: ReplayCheckpointComparisonRuntime;
  replayCheckpointCount: number;
  totalTicks: number;
}): ReplayVerificationViewRuntime {
  if (args.replay.allMatch && args.animation.allMatch) {
    const hasAnimationCheckpoints = args.animationCheckpointCount > 0;
    return {
      diagClass: "ok",
      diagText: hasAnimationCheckpoints
        ? `Replay + animation verified stable over ${args.totalTicks} ticks. Download checkpoints.csv for baseline tracking.`
        : `Replay verified stable over ${args.totalTicks} ticks. Download checkpoints.csv for baseline tracking.`,
      replayStable: true,
      statText: `stable (${args.replayCheckpointCount} checkpoints)`
    };
  }

  if (!args.replay.allMatch) {
    return {
      diagClass: "warn",
      diagText: "Replay mismatch detected. Determinism drift likely in command/tick path.",
      replayStable: false,
      statText: "mismatch"
    };
  }

  return {
    diagClass: "warn",
    diagText: "Animation mismatch detected. Animated tile phase is not deterministic.",
    replayStable: false,
    statText: "mismatch"
  };
}

export function replayVerificationResultRuntime(args: {
  animationA: readonly ReplayCheckpointRuntime[];
  animationB: readonly ReplayCheckpointRuntime[];
  replayA: readonly ReplayCheckpointRuntime[];
  replayB: readonly ReplayCheckpointRuntime[];
  totalTicks: number;
}): ReplayVerificationResultRuntime {
  const replay = compareReplayCheckpointsRuntime(args.replayA, args.replayB);
  const animation = compareReplayCheckpointsRuntime(args.animationA, args.animationB);
  const view = replayVerificationViewRuntime({
    animation,
    animationCheckpointCount: args.animationA.length,
    replay,
    replayCheckpointCount: args.replayA.length,
    totalTicks: args.totalTicks
  });
  return {
    ...view,
    csvText: view.replayStable ? replayCheckpointsCsvRuntime(args.replayA) : null
  };
}

export function applyReplayDownloadReadyRuntime(
  link: ReplayDownloadLinkRuntime,
  url: string,
  filename = "virtuemachine-replay-checkpoints.csv"
): void {
  link.href = url;
  link.download = filename;
  link.classList.remove("disabled");
}

export function applyReplayDownloadDisabledRuntime(link: ReplayDownloadLinkRuntime): void {
  link.classList.add("disabled");
  link.removeAttribute("href");
}

export function releaseReplayUrlRuntime(
  state: ReplayObjectUrlStateRuntime,
  url: Pick<ReplayObjectUrlRuntime, "revokeObjectURL">
): void {
  if (!state.replayUrl) {
    return;
  }
  url.revokeObjectURL(state.replayUrl);
  state.replayUrl = null;
}

export function setReplayCsvRuntime(args: {
  csvText: string;
  link: ReplayDownloadLinkRuntime;
  state: ReplayObjectUrlStateRuntime;
  url: ReplayObjectUrlRuntime;
}): void {
  releaseReplayUrlRuntime(args.state, args.url);
  const blob = new Blob([String(args.csvText || "")], { type: "text/csv;charset=utf-8" });
  args.state.replayUrl = args.url.createObjectURL(blob);
  applyReplayDownloadReadyRuntime(args.link, args.state.replayUrl);
}
