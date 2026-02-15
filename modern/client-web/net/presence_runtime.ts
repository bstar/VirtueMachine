export type PresenceCommonDeps = {
  isAuthenticated: () => boolean;
  request: (route: string, init?: RequestInit, auth?: boolean) => Promise<any>;
  resetBackgroundFailures: () => void;
};

export async function performPresenceHeartbeat(
  payload: {
    session_id: string;
    character_name: string;
    map_x: number;
    map_y: number;
    map_z: number;
    facing_dx: number;
    facing_dy: number;
    tick: number;
    mode: string;
  },
  deps: PresenceCommonDeps & { isSessionStarted: () => boolean }
): Promise<void> {
  if (!deps.isAuthenticated() || !deps.isSessionStarted()) {
    return;
  }
  await deps.request("/api/world/presence/heartbeat", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload)
  }, true);
  deps.resetBackgroundFailures();
}

export async function performPresenceLeave(
  sessionId: string,
  deps: PresenceCommonDeps
): Promise<void> {
  if (!deps.isAuthenticated()) {
    return;
  }
  await deps.request("/api/world/presence/leave", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ session_id: sessionId })
  }, true);
  deps.resetBackgroundFailures();
}

export function projectRemotePresencePlayers(
  playersRaw: any[],
  self: { sessionId: string; userId: string; username: string }
): any[] {
  const players = Array.isArray(playersRaw) ? playersRaw : [];
  const filtered = players.filter((p) => {
    const sameSession = String(p.session_id || "") === String(self.sessionId || "");
    const sameUser = String(p.user_id || "") === String(self.userId || "");
    const sameUsername = String(p.username || "").toLowerCase() === String(self.username || "").toLowerCase();
    return !sameSession && !sameUser && !sameUsername;
  });
  const newestByIdentity = new Map<string, any>();
  for (const p of filtered) {
    const key = String(p.user_id || p.username || p.session_id || "");
    const prev = newestByIdentity.get(key);
    if (!prev || Number(p.updated_at_ms || 0) >= Number(prev.updated_at_ms || 0)) {
      newestByIdentity.set(key, p);
    }
  }
  return [...newestByIdentity.values()];
}

export async function performPresencePoll(
  deps: PresenceCommonDeps & {
    isPollInFlight: () => boolean;
    setPollInFlight: (inFlight: boolean) => void;
    setRemotePlayers: (players: any[]) => void;
    selfIdentity: () => { sessionId: string; userId: string; username: string };
  }
): Promise<void> {
  if (!deps.isAuthenticated()) {
    deps.setRemotePlayers([]);
    return;
  }
  if (deps.isPollInFlight()) {
    return;
  }
  deps.setPollInFlight(true);
  try {
    const out = await deps.request("/api/world/presence", { method: "GET" }, true);
    const players = Array.isArray(out?.players) ? out.players : [];
    deps.setRemotePlayers(projectRemotePresencePlayers(players, deps.selfIdentity()));
    deps.resetBackgroundFailures();
  } finally {
    deps.setPollInFlight(false);
  }
}

export function applyAuthoritativeWorldClockToSim(
  clock: any,
  setTickAndClock: (next: {
    tick: number;
    time_m: number;
    time_h: number;
    date_d: number;
    date_m: number;
    date_y: number;
  }) => void
): void {
  if (!clock || typeof clock !== "object") {
    return;
  }
  setTickAndClock({
    tick: Number(clock.tick) >>> 0,
    time_m: Number(clock.time_m) >>> 0,
    time_h: Number(clock.time_h) >>> 0,
    date_d: Number(clock.date_d) >>> 0,
    date_m: Number(clock.date_m) >>> 0,
    date_y: Number(clock.date_y) >>> 0
  });
}

export async function performWorldClockPoll(
  deps: PresenceCommonDeps & {
    isPollInFlight: () => boolean;
    setPollInFlight: (inFlight: boolean) => void;
    applyClock: (clock: any) => void;
  }
): Promise<void> {
  if (!deps.isAuthenticated()) {
    return;
  }
  if (deps.isPollInFlight()) {
    return;
  }
  deps.setPollInFlight(true);
  try {
    const out = await deps.request("/api/world/clock", { method: "GET" }, true);
    deps.applyClock(out);
    deps.resetBackgroundFailures();
  } finally {
    deps.setPollInFlight(false);
  }
}
