export type ServerCharacterRuntime = {
  character_id?: unknown;
  created_at?: unknown;
  name?: unknown;
  snapshot_meta?: unknown;
  updated_at?: unknown;
  user_id?: unknown;
};

export type ServerUserRuntime = {
  email_verification?: {
    code: string;
    expires_at_ms: number;
    issued_at: string;
  } | null;
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
