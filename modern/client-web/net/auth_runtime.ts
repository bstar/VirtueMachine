import type { SimSnapshotRuntime } from "./snapshot_codec_runtime.ts";

export interface NetLoginPayload {
  token?: unknown;
  user?: {
    user_id?: unknown;
    username?: unknown;
    email?: unknown;
    email_verified?: unknown;
  };
  snapshot_base64?: unknown;
  [key: string]: unknown;
}

export type NetLoginRequest = (
  route: string,
  init?: RequestInit,
  auth?: boolean
) => Promise<NetLoginPayload | null>;

export async function performNetLoginFlow(
  inputs: {
    apiBaseInput: string;
    usernameInput: string;
    passwordInput: string;
  },
  deps: {
    setStatus: (kind: string, text: string) => void;
    setBackgroundSyncPaused: (paused: boolean) => void;
    setApiBase: (apiBase: string) => void;
    request: NetLoginRequest;
    applyLogin: (login: NetLoginPayload | null, username: string) => void;
    ensureCharacter: () => Promise<void>;
    snapshotRoute: () => string;
    decodeSnapshot: (snapshotBase64: string) => SimSnapshotRuntime | null;
    applyLoadedSim: (loaded: SimSnapshotRuntime) => void;
    pollWorldClock: () => Promise<void>;
    pollPresence: () => Promise<void>;
    setResumeFromSnapshot: (resumed: boolean) => void;
    resetBackgroundFailures: () => void;
    updateSessionStat: () => void;
    getUsername: () => string;
    getCharacterName: () => string;
    getEmail: () => string;
    syncEmailInput: () => void;
    persistLoginSettings: (args: {
      apiBase: string;
      username: string;
      characterName: string;
      email: string;
    }) => void;
    onProfileUpdated: () => void;
  }
): Promise<void> {
  deps.setStatus("connecting", "Authenticating...");
  deps.setBackgroundSyncPaused(false);
  const apiBase = String(inputs.apiBaseInput || "").trim() || "http://127.0.0.1:8081";
  const username = String(inputs.usernameInput || "").trim().toLowerCase();
  const password = String(inputs.passwordInput || "");
  if (!username || !password) {
    throw new Error("Username and password are required");
  }
  deps.setApiBase(apiBase);
  const login = await deps.request("/api/auth/login", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ username, password })
  }, false);
  deps.applyLogin(login, username);
  await deps.ensureCharacter();

  let resumedFromSnapshot = false;
  try {
    const route = deps.snapshotRoute() || "/api/world/snapshot";
    const out = await deps.request(route, { method: "GET" }, true);
    if (out?.snapshot_base64) {
      const loaded = deps.decodeSnapshot(String(out.snapshot_base64));
      if (loaded) {
        deps.applyLoadedSim(loaded);
        resumedFromSnapshot = true;
      }
    }
  } catch (_err) {
    // No prior snapshot for this character is a valid first-login state.
  }

  await deps.pollWorldClock();
  await deps.pollPresence();
  deps.setResumeFromSnapshot(resumedFromSnapshot);
  deps.resetBackgroundFailures();
  deps.updateSessionStat();

  const finalUser = deps.getUsername();
  const finalCharacter = deps.getCharacterName();
  deps.setStatus(
    "online",
    resumedFromSnapshot
      ? `${finalUser}/${finalCharacter} (resumed)`
      : `${finalUser}/${finalCharacter}`
  );
  deps.syncEmailInput();
  deps.persistLoginSettings({
    apiBase,
    username: finalUser,
    characterName: finalCharacter,
    email: deps.getEmail()
  });
  deps.onProfileUpdated();
}
