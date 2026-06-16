import { clearFurnitureAvatarPoseRuntime, type FurnitureInteractionSimRuntime } from "./furniture_pose_runtime.ts";
import { LEGACY_COMMAND_TYPE_RUNTIME } from "./legacy_command_runtime.ts";
import { clampI32Runtime } from "./sim_utils_runtime.ts";

export type AvatarMoveRuntimeMode = "avatar" | string;

export type AvatarMoveRuntimeResult =
  | {
      kind: "pose-set-this-tick";
      moved: false;
      targetX: number;
      targetY: number;
      targetZ: number;
    }
  | {
      kind: "free-move";
      moved: true;
      targetX: number;
      targetY: number;
      targetZ: number;
    }
  | {
      kind: "avatar-move";
      moved: true;
      targetX: number;
      targetY: number;
      targetZ: number;
    }
  | {
      kind: "blocked";
      moved: false;
      targetX: number;
      targetY: number;
      targetZ: number;
    };

export type AvatarMoveRuntimeDeps = {
  isBlockedAt(x: number, y: number, z: number): boolean;
  movementMode: AvatarMoveRuntimeMode;
};

export type AvatarMoveAnimationPatchRuntime = {
  avatarLastMoveTick: number | null;
  avatarWalkAnimUntilMs: number | null;
};

export function countQueuedAvatarMoveCommandsRuntime(queue: unknown): number {
  if (!Array.isArray(queue)) {
    return 0;
  }
  return queue.reduce((count, entry) => {
    const commandType = entry && typeof entry === "object"
      ? Number((entry as { type?: unknown }).type) | 0
      : 0;
    return count + (commandType === LEGACY_COMMAND_TYPE_RUNTIME.MOVE_AVATAR ? 1 : 0);
  }, 0);
}

export function avatarWalkPresentationActiveRuntime(args: {
  queuedMoveCount?: unknown;
  nowMs: unknown;
  walkAnimUntilMs: unknown;
}): boolean {
  void args.queuedMoveCount;
  return Number(args.walkAnimUntilMs) >= Number(args.nowMs);
}

export function avatarMoveAnimationPatchRuntime(args: {
  result: AvatarMoveRuntimeResult;
  simTick: unknown;
  nowMs: unknown;
  walkAnimWindowMs: unknown;
}): AvatarMoveAnimationPatchRuntime {
  if (args.result.kind === "blocked") {
    return {
      avatarLastMoveTick: null,
      avatarWalkAnimUntilMs: -1
    };
  }
  if (args.result.kind !== "avatar-move") {
    return {
      avatarLastMoveTick: null,
      avatarWalkAnimUntilMs: null
    };
  }
  return {
    avatarLastMoveTick: Number(args.simTick) >>> 0,
    avatarWalkAnimUntilMs: Number(args.nowMs) + Number(args.walkAnimWindowMs)
  };
}

export function applyAvatarMoveCommandRuntime(
  sim: FurnitureInteractionSimRuntime,
  dx: number,
  dy: number,
  deps: AvatarMoveRuntimeDeps
): AvatarMoveRuntimeResult {
  const targetX = clampI32Runtime(sim.world.map_x + dx, -4096, 4095);
  const targetY = clampI32Runtime(sim.world.map_y + dy, -4096, 4095);
  const targetZ = sim.world.map_z | 0;

  if ((sim.avatarPoseSetTick | 0) === (sim.tick | 0)) {
    return {
      kind: "pose-set-this-tick",
      moved: false,
      targetX,
      targetY,
      targetZ
    };
  }

  if (sim.avatarPose !== "stand") {
    clearFurnitureAvatarPoseRuntime(sim);
  }

  if (deps.movementMode !== "avatar") {
    sim.world.map_x = targetX;
    sim.world.map_y = targetY;
    return {
      kind: "free-move",
      moved: true,
      targetX,
      targetY,
      targetZ
    };
  }

  if (deps.isBlockedAt(targetX, targetY, targetZ)) {
    return {
      kind: "blocked",
      moved: false,
      targetX,
      targetY,
      targetZ
    };
  }

  sim.world.map_x = targetX;
  sim.world.map_y = targetY;
  return {
    kind: "avatar-move",
    moved: true,
    targetX,
    targetY,
    targetZ
  };
}
