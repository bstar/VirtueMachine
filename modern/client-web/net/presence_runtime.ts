export interface PresenceRuntimeJson {
  [key: string]: unknown;
}

export interface RemotePresencePlayer {
  session_id?: unknown;
  user_id?: unknown;
  username?: unknown;
  updated_at_ms?: unknown;
  [key: string]: unknown;
}

export interface WorldClockPayload {
  tick?: unknown;
  time_m?: unknown;
  time_h?: unknown;
  date_d?: unknown;
  date_m?: unknown;
  date_y?: unknown;
  [key: string]: unknown;
}

export interface AuthoritativeNpcStateRow {
  action?: unknown;
  direction?: unknown;
  mode?: unknown;
  npc_id?: unknown;
  path_status?: unknown;
  pose?: unknown;
  schedule_index?: unknown;
  x?: unknown;
  y?: unknown;
  z?: unknown;
  [key: string]: unknown;
}

export interface AuthoritativeNpcEntityRuntime {
  authoritative?: boolean;
  authoritativeAction?: number;
  authoritativeDirection?: number;
  authoritativeLastX?: number;
  authoritativeLastY?: number;
  authoritativeLastZ?: number;
  authoritativeMode?: number;
  authoritativeMovedAtMs?: number;
  authoritativePathStatus?: string;
  authoritativePose?: string;
  authoritativeScheduleIndex?: number;
  authoritativeUpdatedAtMs?: number;
  homeX?: number;
  homeY?: number;
  id?: unknown;
  movable?: boolean;
  x?: number;
  y?: number;
  z?: number;
}

export type PresenceCommonDeps = {
  isAuthenticated: () => boolean;
  request: (route: string, init?: RequestInit, auth?: boolean) => Promise<PresenceRuntimeJson | null>;
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
  playersRaw: RemotePresencePlayer[] | null | undefined,
  self: { sessionId: string; userId: string; username: string }
): RemotePresencePlayer[] {
  const players = Array.isArray(playersRaw) ? playersRaw : [];
  const filtered = players.filter((p) => {
    const sameSession = String(p.session_id || "") === String(self.sessionId || "");
    const sameUser = String(p.user_id || "") === String(self.userId || "");
    const sameUsername = String(p.username || "").toLowerCase() === String(self.username || "").toLowerCase();
    return !sameSession && !sameUser && !sameUsername;
  });
  const newestByIdentity = new Map<string, RemotePresencePlayer>();
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
    setRemotePlayers: (players: RemotePresencePlayer[]) => void;
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
  clock: WorldClockPayload | null | undefined,
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

export function applyAuthoritativeNpcStatesRuntime(
  entries: Iterable<AuthoritativeNpcEntityRuntime> | null | undefined,
  rows: unknown,
  nowMs: number
): number {
  if (!entries) {
    return 0;
  }
  const authoritativeRows = Array.isArray(rows) ? rows as AuthoritativeNpcStateRow[] : [];
  const byId = new Map(authoritativeRows.map((row) => [Number(row?.npc_id) | 0, row]));
  let applied = 0;
  for (const entity of entries) {
    const row = byId.get(Number(entity.id) | 0);
    if (!row) {
      continue;
    }
    const nextX = Number(row.x) | 0;
    const nextY = Number(row.y) | 0;
    const nextZ = Number(row.z) | 0;
    const hadAuthoritativePosition = Number.isFinite(entity.authoritativeLastX)
      && Number.isFinite(entity.authoritativeLastY)
      && Number.isFinite(entity.authoritativeLastZ);
    const moved = hadAuthoritativePosition
      && ((Number(entity.authoritativeLastX) | 0) !== nextX
        || (Number(entity.authoritativeLastY) | 0) !== nextY
        || (Number(entity.authoritativeLastZ) | 0) !== nextZ);
    entity.x = nextX;
    entity.y = nextY;
    entity.z = nextZ;
    entity.homeX = nextX;
    entity.homeY = nextY;
    entity.authoritative = true;
    entity.authoritativeLastX = nextX;
    entity.authoritativeLastY = nextY;
    entity.authoritativeLastZ = nextZ;
    entity.authoritativeUpdatedAtMs = nowMs;
    if (moved || !Number.isFinite(entity.authoritativeMovedAtMs)) {
      entity.authoritativeMovedAtMs = nowMs;
    }
    entity.movable = false;
    entity.authoritativeAction = Number(row.action) & 0xff;
    entity.authoritativeMode = Number(row.mode ?? row.action) & 0xff;
    entity.authoritativeDirection = Number(row.direction ?? 4) & 0x07;
    entity.authoritativePose = String(row.pose || "").trim().toLowerCase();
    entity.authoritativePathStatus = String(row.path_status || "").trim().toLowerCase();
    entity.authoritativeScheduleIndex = Number(row.schedule_index) | 0;
    applied += 1;
  }
  return applied;
}

export async function performWorldClockPoll(
  deps: PresenceCommonDeps & {
    isPollInFlight: () => boolean;
    setPollInFlight: (inFlight: boolean) => void;
    applyClock: (clock: WorldClockPayload | null) => void;
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
