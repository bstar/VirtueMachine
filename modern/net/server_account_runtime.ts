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
  created_at?: unknown;
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

export type ServerPublicUserRuntime = {
  email?: string;
  email_verified?: boolean;
  user_id: unknown;
  username: unknown;
};

export type LoginAccountResultRuntime =
  | {
    ok: true;
    token: string;
    user: ServerUserRuntime;
  }
  | {
    code: "bad_username" | "bad_password" | "auth_invalid";
    http: 400 | 401;
    message: string;
    ok: false;
  };

export type AccountMutationResultRuntime =
  | { ok: true }
  | {
    code:
      | "bad_email"
      | "bad_code"
      | "no_pending_verification"
      | "verification_expired"
      | "verification_invalid"
      | "bad_old_password"
      | "bad_new_password"
      | "auth_invalid"
      | "password_unchanged";
    http: 400 | 401 | 409 | 410;
    message: string;
    ok: false;
  };

export type PasswordRecoveryAccountResultRuntime<TUser extends ServerUserRuntime = ServerUserRuntime> =
  | {
    email: string;
    ok: true;
    user: TUser;
  }
  | {
    code:
      | "bad_username"
      | "bad_email"
      | "user_not_found"
      | "email_unverified"
      | "email_mismatch";
    http: 400 | 401 | 403 | 404;
    message: string;
    ok: false;
  };

export type CharacterNameValidationRuntime =
  | { name: string; ok: true }
  | {
    code: "bad_character_name";
    http: 400;
    message: string;
    ok: false;
  };

type ServerEmailVerificationSourceRuntime = {
  code?: unknown;
  expires_at_ms?: unknown;
  issued_at?: unknown;
};

type ServerUserSourceRuntime = {
  created_at?: unknown;
  email?: unknown;
  email_verified?: unknown;
  email_verification?: unknown;
  password_plaintext?: unknown;
  user_id?: unknown;
  username?: unknown;
};

type ServerTokenSourceRuntime = {
  expires_at_ms?: unknown;
  issued_at?: unknown;
  token?: unknown;
  user_id?: unknown;
};

type ServerSnapshotMetaSourceRuntime = {
  [key: string]: unknown;
};

type ServerCharacterSourceRuntime = {
  character_id?: unknown;
  created_at?: unknown;
  name?: unknown;
  snapshot_base64?: unknown;
  snapshot_meta?: unknown;
  updated_at?: unknown;
  user_id?: unknown;
};

function isObjectSourceRuntime(value: unknown): value is object {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function emailVerificationSourceOrNullRuntime(value: unknown): ServerEmailVerificationSourceRuntime | null {
  return isObjectSourceRuntime(value) ? value as ServerEmailVerificationSourceRuntime : null;
}

function userSourceOrNullRuntime(value: unknown): ServerUserSourceRuntime | null {
  return isObjectSourceRuntime(value) ? value as ServerUserSourceRuntime : null;
}

function tokenSourceOrNullRuntime(value: unknown): ServerTokenSourceRuntime | null {
  return isObjectSourceRuntime(value) ? value as ServerTokenSourceRuntime : null;
}

function snapshotMetaSourceOrNullRuntime(value: unknown): ServerSnapshotMetaSourceRuntime | null {
  return isObjectSourceRuntime(value) ? value as ServerSnapshotMetaSourceRuntime : null;
}

function characterSourceOrNullRuntime(value: unknown): ServerCharacterSourceRuntime | null {
  return isObjectSourceRuntime(value) ? value as ServerCharacterSourceRuntime : null;
}

function normalizeEmailVerificationRuntime(raw: unknown): ServerUserRuntime["email_verification"] {
  const row = emailVerificationSourceOrNullRuntime(raw);
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
    const row = userSourceOrNullRuntime(value);
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
      user.created_at = String(row.created_at || "");
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
    const row = tokenSourceOrNullRuntime(value);
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
    const row = characterSourceOrNullRuntime(value);
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
      snapshot_meta: snapshotMetaSourceOrNullRuntime(row.snapshot_meta),
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

export function secureSixDigitEmailVerificationCodeRuntime(
  randomInt: (maxExclusive: number) => number
): string {
  const raw = Number(randomInt(900000));
  const n = Number.isFinite(raw) ? Math.max(0, Math.min(899999, Math.floor(raw))) : 0;
  return String(100000 + n);
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

export function publicUserPayloadRuntime(
  user: ServerUserRuntime,
  opts: { includeEmail?: boolean; includeEmailVerified?: boolean } = {}
): ServerPublicUserRuntime {
  const out: ServerPublicUserRuntime = {
    user_id: user.user_id,
    username: user.username
  };
  if (opts.includeEmail) {
    out.email = String(user.email || "");
  }
  if (opts.includeEmailVerified) {
    out.email_verified = !!user.email_verified;
  }
  return out;
}

export function loginAccountRuntime(
  args: {
    body: { password?: unknown; username?: unknown } | null | undefined;
    nowIso: string;
    nowMs: number;
    randomHex: (bytes: number) => string;
    tokens: ServerTokenRuntime[];
    users: ServerUserRuntime[];
  }
): LoginAccountResultRuntime {
  const username = normalizeUsernameRuntime(args.body && args.body.username);
  const password = String(args.body && args.body.password || "");
  if (!username || username.length < 2) {
    return {
      ok: false,
      http: 400,
      code: "bad_username",
      message: "username is required"
    };
  }
  if (!password) {
    return {
      ok: false,
      http: 400,
      code: "bad_password",
      message: "password is required"
    };
  }

  let user = findUserByUsernameRuntime(args.users, username);
  if (!user) {
    const newUser: ServerUserRuntime = {
      user_id: newUserIdRuntime(args.users, args.randomHex),
      username,
      password_plaintext: password,
      email: "",
      email_verified: false,
      email_verification: null,
      created_at: String(args.nowIso || "")
    };
    user = newUser;
    args.users.push(user);
  } else if (!user.password_plaintext) {
    user.password_plaintext = password;
  } else if (user.password_plaintext !== password) {
    return {
      ok: false,
      http: 401,
      code: "auth_invalid",
      message: "invalid username/password"
    };
  }

  return {
    ok: true,
    user,
    token: issueTokenRuntime(args.tokens, {
      nowIso: args.nowIso,
      nowMs: args.nowMs,
      randomHex: args.randomHex,
      userId: user.user_id
    })
  };
}

export function setAccountEmailRuntime(user: ServerUserRuntime, rawEmail: unknown): AccountMutationResultRuntime {
  const email = normalizeEmailRuntime(rawEmail);
  if (!isValidEmailRuntime(email)) {
    return {
      ok: false,
      http: 400,
      code: "bad_email",
      message: "valid email is required"
    };
  }
  if (email !== normalizeEmailRuntime(user.email || "")) {
    user.email_verified = false;
    user.email_verification = null;
  }
  user.email = email;
  return { ok: true };
}

export function verifyAccountEmailRuntime(
  user: ServerUserRuntime,
  args: {
    code: unknown;
    nowMs: number;
  }
): AccountMutationResultRuntime {
  const code = String(args.code || "").trim();
  if (!code) {
    return {
      ok: false,
      http: 400,
      code: "bad_code",
      message: "verification code is required"
    };
  }
  const pending = user.email_verification;
  if (!pending || typeof pending !== "object") {
    return {
      ok: false,
      http: 409,
      code: "no_pending_verification",
      message: "no pending email verification"
    };
  }
  if (Number(pending.expires_at_ms) < Number(args.nowMs || 0)) {
    user.email_verification = null;
    return {
      ok: false,
      http: 410,
      code: "verification_expired",
      message: "verification code expired"
    };
  }
  if (String(pending.code || "") !== code) {
    return {
      ok: false,
      http: 401,
      code: "verification_invalid",
      message: "invalid verification code"
    };
  }
  user.email_verified = true;
  user.email_verification = null;
  return { ok: true };
}

export function changeAccountPasswordRuntime(
  user: ServerUserRuntime,
  args: {
    newPassword?: unknown;
    oldPassword?: unknown;
  }
): AccountMutationResultRuntime {
  const oldPassword = String(args.oldPassword || "");
  const newPassword = String(args.newPassword || "");
  if (!oldPassword) {
    return {
      ok: false,
      http: 400,
      code: "bad_old_password",
      message: "old_password is required"
    };
  }
  if (!newPassword) {
    return {
      ok: false,
      http: 400,
      code: "bad_new_password",
      message: "new_password is required"
    };
  }
  if (String(user.password_plaintext || "") !== oldPassword) {
    return {
      ok: false,
      http: 401,
      code: "auth_invalid",
      message: "invalid old password"
    };
  }
  if (oldPassword === newPassword) {
    return {
      ok: false,
      http: 409,
      code: "password_unchanged",
      message: "new password must differ from old password"
    };
  }
  user.password_plaintext = newPassword;
  return { ok: true };
}

export function passwordRecoveryAccountRuntime<TUser extends ServerUserRuntime>(
  args: {
    email: unknown;
    username: unknown;
    users: readonly TUser[];
  }
): PasswordRecoveryAccountResultRuntime<TUser> {
  const username = normalizeUsernameRuntime(args.username);
  const email = normalizeEmailRuntime(args.email);
  if (!username || username.length < 2) {
    return {
      ok: false,
      http: 400,
      code: "bad_username",
      message: "username is required"
    };
  }
  if (!isValidEmailRuntime(email)) {
    return {
      ok: false,
      http: 400,
      code: "bad_email",
      message: "email is required"
    };
  }
  const user = findUserByUsernameRuntime(args.users, username);
  if (!user) {
    return {
      ok: false,
      http: 404,
      code: "user_not_found",
      message: "user not found"
    };
  }
  if (!user.email_verified) {
    return {
      ok: false,
      http: 403,
      code: "email_unverified",
      message: "email must be verified before password recovery"
    };
  }
  if (normalizeEmailRuntime(user.email || "") !== email) {
    return {
      ok: false,
      http: 401,
      code: "email_mismatch",
      message: "email does not match account"
    };
  }
  return {
    ok: true,
    email,
    user
  };
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

export function validateCharacterNameRuntime(body: unknown): CharacterNameValidationRuntime {
  const source = body && typeof body === "object" ? body as { name?: unknown } : {};
  const name = String(source.name || "").trim();
  if (!name || name.length < 2) {
    return {
      ok: false,
      http: 400,
      code: "bad_character_name",
      message: "name is required"
    };
  }
  return {
    ok: true,
    name
  };
}

export function characterCreatedPayloadRuntime(character: Pick<
  ServerCharacterRuntime,
  "character_id" | "name" | "snapshot_meta" | "user_id"
>): {
  character_id: unknown;
  name: unknown;
  snapshot_meta: unknown;
  user_id: unknown;
} {
  return {
    character_id: character.character_id,
    name: character.name,
    user_id: character.user_id,
    snapshot_meta: character.snapshot_meta
  };
}

export function characterSnapshotPayloadRuntime(
  character: Pick<ServerCharacterRuntime, "character_id" | "snapshot_meta">,
  snapshotBase64?: unknown
): {
  character_id: unknown;
  snapshot_base64?: unknown;
  snapshot_meta: unknown;
} {
  const payload: {
    character_id: unknown;
    snapshot_base64?: unknown;
    snapshot_meta: unknown;
  } = {
    character_id: character.character_id,
    snapshot_meta: character.snapshot_meta
  };
  if (arguments.length >= 2) {
    payload.snapshot_base64 = snapshotBase64;
  }
  return payload;
}
