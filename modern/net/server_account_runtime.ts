export type ServerCharacterRuntime = {
  character_id?: unknown;
  created_at?: unknown;
  name?: unknown;
  snapshot_meta?: unknown;
  updated_at?: unknown;
  user_id?: unknown;
};

export type ServerUserRuntime = {
  email?: unknown;
  email_verified?: unknown;
  email_verification?: {
    code: string;
    expires_at_ms: number;
    issued_at: string;
  } | null;
  user_id?: unknown;
  username?: unknown;
};

export type ServerTokenRuntime = {
  expires_at_ms?: unknown;
  issued_at?: unknown;
  token?: unknown;
  user_id?: unknown;
};

export function issueEmailVerificationCodeRuntime(
  user: ServerUserRuntime,
  args: {
    code: string;
    expiresAtMs: number;
    issuedAt: string;
  }
): string {
  const code = String(args.code || "");
  user.email_verification = {
    code,
    issued_at: String(args.issuedAt || ""),
    expires_at_ms: Number(args.expiresAtMs) || 0
  };
  return code;
}

export function sixDigitEmailVerificationCodeRuntime(randomValue: number): string {
  const n = Number.isFinite(randomValue) ? Math.max(0, Math.min(0.999999999, randomValue)) : 0;
  return String(Math.floor(100000 + (n * 900000)));
}

export function normalizeUsernameRuntime(raw: unknown): string {
  return String(raw || "").trim().toLowerCase();
}

export function normalizeEmailRuntime(raw: unknown): string {
  return String(raw || "").trim().toLowerCase();
}

export function isValidEmailRuntime(raw: unknown): boolean {
  const v = normalizeEmailRuntime(raw);
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

export function findUserByUsernameRuntime<T extends ServerUserRuntime>(
  users: readonly T[],
  username: unknown
): T | null {
  const wanted = normalizeUsernameRuntime(username);
  return users.find((u) => normalizeUsernameRuntime(u.username) === wanted) || null;
}

export function ensureUserSchemaRuntime(user: ServerUserRuntime | null | undefined): void {
  if (!user || typeof user !== "object") {
    return;
  }
  if (!Object.prototype.hasOwnProperty.call(user, "email")) {
    user.email = "";
  }
  if (!Object.prototype.hasOwnProperty.call(user, "email_verified")) {
    user.email_verified = false;
  }
  if (!user.email_verification || typeof user.email_verification !== "object") {
    user.email_verification = null;
  }
}

export function parseAuthHeaderRuntime(raw: unknown): string | null {
  const header = String(raw || "");
  if (!header.startsWith("Bearer ")) {
    return null;
  }
  return header.slice("Bearer ".length).trim();
}

export function findUserForBearerTokenRuntime<TUser extends ServerUserRuntime, TToken extends ServerTokenRuntime>(
  args: {
    nowMs: number;
    token: unknown;
    tokens: readonly TToken[];
    users: readonly TUser[];
  }
): { code: "missing" | "invalid" | "user_not_found"; user: null } | { code: "ok"; user: TUser } {
  const token = String(args.token || "").trim();
  if (!token) {
    return { code: "missing", user: null };
  }
  const nowMs = Number(args.nowMs) || 0;
  const row = args.tokens.find((t) => String(t.token || "") === token && Number(t.expires_at_ms || 0) > nowMs);
  if (!row) {
    return { code: "invalid", user: null };
  }
  const user = args.users.find((u) => String(u.user_id || "") === String(row.user_id || ""));
  if (!user) {
    return { code: "user_not_found", user: null };
  }
  return { code: "ok", user };
}

export function newUserIdRuntime(
  users: readonly ServerUserRuntime[],
  randomHex: (bytes: number) => string
): string {
  for (;;) {
    const id = `usr_${String(randomHex(8) || "")}`;
    if (!users.find((u) => String(u.user_id || "") === id)) {
      return id;
    }
  }
}

export function issueTokenRuntime(
  tokens: ServerTokenRuntime[],
  args: {
    nowIso: string;
    nowMs: number;
    randomHex: (bytes: number) => string;
    ttlMs?: number;
    userId: unknown;
  }
): string {
  const token = String(args.randomHex(24) || "");
  const ttlMs = Number(args.ttlMs) || (1000 * 60 * 60 * 24 * 7);
  tokens.push({
    token,
    user_id: args.userId,
    issued_at: String(args.nowIso || ""),
    expires_at_ms: (Number(args.nowMs) || 0) + ttlMs
  });
  return token;
}

export function listUserCharactersRuntime(
  characters: readonly ServerCharacterRuntime[],
  userId: unknown
): Array<{
  character_id: unknown;
  created_at: unknown;
  name: unknown;
  snapshot_meta: unknown;
  updated_at: unknown;
  user_id: unknown;
}> {
  return characters.filter((c) => c.user_id === userId).map((c) => ({
    character_id: c.character_id,
    user_id: c.user_id,
    name: c.name,
    created_at: c.created_at,
    updated_at: c.updated_at,
    snapshot_meta: c.snapshot_meta
  }));
}
