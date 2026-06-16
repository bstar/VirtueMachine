import { netJsonPostInitRuntime } from "./request_runtime.ts";
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
}

export type NetLoginRequest = (
  route: string,
  init?: RequestInit,
  auth?: boolean
) => Promise<NetLoginPayload | null>;

export function netLoginTokenRuntime(payload: NetLoginPayload | null | undefined): string {
  return String(payload?.token || "");
}

export function netLoginUserIdRuntime(payload: NetLoginPayload | null | undefined): string {
  return String(payload?.user?.user_id || "");
}

export function netLoginUsernameRuntime(payload: NetLoginPayload | null | undefined, fallback = ""): string {
  return String(payload?.user?.username || fallback || "");
}

export function netLoginEmailRuntime(payload: NetLoginPayload | null | undefined): string {
  return String(payload?.user?.email || "");
}

export function netLoginEmailVerifiedRuntime(payload: NetLoginPayload | null | undefined): boolean {
  return !!payload?.user?.email_verified;
}

export function netLoginSnapshotBase64Runtime(payload: NetLoginPayload | null | undefined): string {
  return String(payload?.snapshot_base64 || "").trim();
}

export interface NetLoginDiagRuntime {
  diagClass: "diag ok" | "diag warn";
  diagText: string;
}

export interface NetLoginFailurePresentationRuntime extends NetLoginDiagRuntime {
  diagClass: "diag warn";
  statusLevel: "error";
  statusText: string;
}

export function netLoginPanelSuccessDiagRuntime(username: unknown, characterName: unknown): NetLoginDiagRuntime {
  return {
    diagClass: "diag ok",
    diagText: `Net login ok: ${String(username || "")}/${String(characterName || "")}`
  };
}

export function netLoginPanelFailureRuntime(reason: unknown): NetLoginFailurePresentationRuntime {
  const text = String(reason || "unknown error");
  return {
    diagClass: "diag warn",
    diagText: `Net login failed: ${text}`,
    statusLevel: "error",
    statusText: `Login failed: ${text}`
  };
}

export function netAutoLoginSuccessDiagRuntime(username: unknown, characterName: unknown): NetLoginDiagRuntime {
  return {
    diagClass: "diag ok",
    diagText: `Auto-login ok: ${String(username || "")}/${String(characterName || "")}`
  };
}

export function netAutoLoginFailureRuntime(reason: unknown): NetLoginFailurePresentationRuntime {
  const text = String(reason || "unknown error");
  return {
    diagClass: "diag warn",
    diagText: `Auto-login failed: ${text}`,
    statusLevel: "error",
    statusText: `Auto-login failed: ${text}`
  };
}

export function bindNetLoginButtonRuntime(args: {
  button?: { addEventListener: (type: "click", listener: () => void | Promise<void>) => void } | null;
  characterName: () => unknown;
  errorMessage: (err: unknown) => string;
  isAuthenticated: () => boolean;
  login: () => Promise<unknown>;
  logout: () => void;
  setAccountModalOpen: (open: boolean) => void;
  setDiag: (diag: NetLoginDiagRuntime) => void;
  setStatus: (level: string, text: string) => void;
  username: () => unknown;
}): boolean {
  if (!args.button) {
    return false;
  }
  args.button.addEventListener("click", () => {
    void (async () => {
      if (args.isAuthenticated()) {
        args.logout();
        return;
      }
      try {
        await args.login();
        args.setAccountModalOpen(false);
        args.setDiag(netLoginPanelSuccessDiagRuntime(args.username(), args.characterName()));
      } catch (err) {
        const failure = netLoginPanelFailureRuntime(args.errorMessage(err));
        args.setStatus(failure.statusLevel, failure.statusText);
        args.setDiag(failure);
      }
    })();
  });
  return true;
}

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
  const login = await deps.request("/api/auth/login", netJsonPostInitRuntime({ username, password }), false);
  deps.applyLogin(login, username);
  await deps.ensureCharacter();

  let resumedFromSnapshot = false;
  try {
    const route = deps.snapshotRoute() || "/api/world/snapshot";
    const out = await deps.request(route, { method: "GET" }, true);
    const snapshotBase64 = netLoginSnapshotBase64Runtime(out);
    if (snapshotBase64) {
      const loaded = deps.decodeSnapshot(snapshotBase64);
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
