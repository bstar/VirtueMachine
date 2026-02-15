export type NetSessionState = {
  token?: string;
  userId?: string;
  username?: string;
  email?: string;
  emailVerified?: boolean;
  characterId?: string;
  remotePlayers?: unknown[];
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
export function applyNetLoginState(netState: NetSessionState, loginPayload: any, fallbackUsername: string): void {
  const login = loginPayload || {};
  netState.token = String(login?.token || "");
  netState.userId = String(login?.user?.user_id || "");
  netState.username = String(login?.user?.username || fallbackUsername || "");
  netState.email = String(login?.user?.email || "");
  netState.emailVerified = !!login?.user?.email_verified;
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
