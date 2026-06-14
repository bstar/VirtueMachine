import {
  netLoginEmailRuntime,
  netLoginEmailVerifiedRuntime,
  netLoginTokenRuntime,
  netLoginUserIdRuntime,
  netLoginUsernameRuntime,
  type NetLoginPayload
} from "./auth_runtime.ts";
import type { RemotePresencePlayer } from "./presence_runtime.ts";

export type NetSessionState = {
  token?: string;
  userId?: string;
  username?: string;
  email?: string;
  emailVerified?: boolean;
  characterId?: string;
  remotePlayers?: RemotePresencePlayer[];
  lastPresenceHeartbeatTick?: number;
  lastPresencePollTick?: number;
  lastClockPollTick?: number;
  resumeFromSnapshot?: boolean;
  backgroundSyncPaused?: boolean;
  backgroundFailCount?: number;
  firstBackgroundFailAtMs?: number;
};

/**
 * Reset transient net polling/sync state.
 */
export function resetNetPollingState(netState: NetSessionState): void {
  netState.remotePlayers = [];
  netState.lastPresenceHeartbeatTick = -1;
  netState.lastPresencePollTick = -1;
  netState.lastClockPollTick = -1;
  netState.resumeFromSnapshot = false;
  netState.backgroundSyncPaused = false;
  netState.backgroundFailCount = 0;
  netState.firstBackgroundFailAtMs = 0;
}

/**
 * Apply login response fields to net session state.
 */
export function applyNetLoginState(netState: NetSessionState, loginPayload: NetLoginPayload | null | undefined, fallbackUsername: string): void {
  netState.token = netLoginTokenRuntime(loginPayload);
  netState.userId = netLoginUserIdRuntime(loginPayload);
  netState.username = netLoginUsernameRuntime(loginPayload, fallbackUsername);
  netState.email = netLoginEmailRuntime(loginPayload);
  netState.emailVerified = netLoginEmailVerifiedRuntime(loginPayload);
  resetNetPollingState(netState);
}

/**
 * Clear authenticated net session fields.
 */
export function clearNetSessionState(netState: NetSessionState): void {
  netState.token = "";
  netState.userId = "";
  netState.characterId = "";
  resetNetPollingState(netState);
}
