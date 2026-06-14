import { clearFurnitureAvatarPoseRuntime, type FurnitureInteractionSimRuntime } from "./furniture_pose_runtime.ts";
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
