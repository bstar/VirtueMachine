export type ServerCharacterRuntime = {
  character_id?: unknown;
  created_at?: unknown;
  name?: unknown;
  snapshot_base64?: unknown;
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
  password_plaintext?: unknown;
  user_id?: unknown;
  username?: unknown;
};

export type ServerTokenRuntime = {
  expires_at_ms?: unknown;
  issued_at?: unknown;
  token?: unknown;
  user_id?: unknown;
};

function recordOrNull(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" ? value as Record<string, unknown> : null;
}

function normalizeEmailVerificationRuntime(raw: unknown): ServerUserRuntime["email_verification"] {
  const row = recordOrNull(raw);
  if (!row) {
    return null;
  }
  const code = String(row.code || "").trim();
  const issuedAt = String(row.issued_at || "").trim();
  const expiresAtMs = Number(row.expires_at_ms);
  if (!code || !issuedAt || !Number.isFinite(expiresAtMs)) {
    return null;
  }
  return {
    code,
    issued_at: issuedAt,
    expires_at_ms: expiresAtMs
  };
}

export function normalizeServerUsersRuntime(raw: unknown): ServerUserRuntime[] {
  if (!Array.isArray(raw)) {
    return [];
  }
  const out: ServerUserRuntime[] = [];
  const seen = new Set<string>();
  for (const value of raw) {
    const row = recordOrNull(value);
    if (!row) {
      continue;
    }
    const userId = String(row.user_id || "").trim();
    const username = normalizeUsernameRuntime(row.username);
    if (!userId || !username || seen.has(userId)) {
      continue;
    }
    seen.add(userId);
    const user: ServerUserRuntime = {
      user_id: userId,
      username,
      password_plaintext: String(row.password_plaintext || ""),
      email: normalizeEmailRuntime(row.email),
      email_verified: row.email_verified === true,
      email_verification: normalizeEmailVerificationRuntime(row.email_verification)
    };
    if (row.created_at != null) {
      (user as ServerUserRuntime & { created_at?: unknown }).created_at = String(row.created_at || "");
    }
    out.push(user);
  }
  return out;
}

export function normalizeServerTokensRuntime(raw: unknown): ServerTokenRuntime[] {
  if (!Array.isArray(raw)) {
    return [];
  }
  const out: ServerTokenRuntime[] = [];
  const seen = new Set<string>();
  for (const value of raw) {
    const row = recordOrNull(value);
    if (!row) {
      continue;
    }
    const token = String(row.token || "").trim();
    const userId = String(row.user_id || "").trim();
    const expiresAtMs = Number(row.expires_at_ms);
    if (!token || !userId || !Number.isFinite(expiresAtMs) || expiresAtMs <= 0 || seen.has(token)) {
      continue;
    }
    seen.add(token);
    out.push({
      token,
      user_id: userId,
      issued_at: String(row.issued_at || ""),
      expires_at_ms: expiresAtMs
    });
  }
  return out;
}

export function normalizeServerCharactersRuntime(raw: unknown): ServerCharacterRuntime[] {
  if (!Array.isArray(raw)) {
    return [];
  }
  const out: ServerCharacterRuntime[] = [];
  const seen = new Set<string>();
  for (const value of raw) {
    const row = recordOrNull(value);
    if (!row) {
      continue;
    }
    const characterId = String(row.character_id || "").trim();
    const userId = String(row.user_id || "").trim();
    const name = String(row.name || "").trim();
    if (!characterId || !userId || !name || seen.has(characterId)) {
      continue;
    }
    seen.add(characterId);
    out.push({
      character_id: characterId,
      user_id: userId,
      name,
      created_at: String(row.created_at || ""),
      updated_at: String(row.updated_at || ""),
      snapshot_meta: recordOrNull(row.snapshot_meta) || null,
      snapshot_base64: row.snapshot_base64 == null ? null : String(row.snapshot_base64 || "")
    });
  }
  return out;
}

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
