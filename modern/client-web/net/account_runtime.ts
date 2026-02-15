export type NetAccountCommonDeps = {
  ensureAuth: () => Promise<void>;
  isAuthenticated: () => boolean;
  request: (route: string, init?: RequestInit, auth?: boolean) => Promise<any>;
  setStatus: (level: string, text: string) => void;
};

export async function performNetSetEmail(
  emailRaw: string,
  deps: NetAccountCommonDeps & {
    applyEmail: (email: string, verified: boolean) => void;
    persistEmail: (email: string) => void;
    onProfileUpdated: () => void;
  }
): Promise<any> {
  if (!deps.isAuthenticated()) {
    await deps.ensureAuth();
  }
  const email = String(emailRaw || "").trim().toLowerCase();
  if (!email) {
    throw new Error("Recovery email is required");
  }
  deps.setStatus("sync", "Saving recovery email...");
  const out = await deps.request("/api/auth/set-email", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email })
  }, true);
  const nextEmail = String(out?.user?.email || email);
  const verified = !!out?.user?.email_verified;
  deps.applyEmail(nextEmail, verified);
  deps.persistEmail(nextEmail);
  deps.onProfileUpdated();
  deps.setStatus("online", verified ? "Email verified" : "Email set (verification required)");
  return out;
}

export async function performNetSendEmailVerification(deps: NetAccountCommonDeps): Promise<any> {
  if (!deps.isAuthenticated()) {
    await deps.ensureAuth();
  }
  deps.setStatus("sync", "Sending verification email...");
  const out = await deps.request("/api/auth/send-email-verification", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({})
  }, true);
  deps.setStatus("online", "Verification code sent to recovery email");
  return out;
}

export async function performNetVerifyEmail(
  codeRaw: string,
  deps: NetAccountCommonDeps & {
    applyEmail: (email: string, verified: boolean) => void;
    currentEmail: () => string;
    onVerified: (email: string) => void;
  }
): Promise<any> {
  if (!deps.isAuthenticated()) {
    await deps.ensureAuth();
  }
  const code = String(codeRaw || "").trim();
  if (!code) {
    throw new Error("Verification code is required");
  }
  deps.setStatus("sync", "Verifying recovery email...");
  const out = await deps.request("/api/auth/verify-email", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ code })
  }, true);
  const nextEmail = String(out?.user?.email || deps.currentEmail() || "");
  const verified = !!out?.user?.email_verified;
  deps.applyEmail(nextEmail, verified);
  deps.onVerified(nextEmail);
  deps.setStatus("online", "Recovery email verified");
  return out;
}

export async function performNetRecoverPassword(
  baseRaw: string,
  usernameRaw: string,
  emailRaw: string,
  deps: {
    request: (route: string, init?: RequestInit, auth?: boolean) => Promise<any>;
    setApiBase: (base: string) => void;
    setStatus: (level: string, text: string) => void;
  }
): Promise<any> {
  const base = String(baseRaw || "").trim() || "http://127.0.0.1:8081";
  const username = String(usernameRaw || "").trim().toLowerCase();
  const email = String(emailRaw || "").trim().toLowerCase();
  if (!username) {
    throw new Error("Username is required");
  }
  if (!email) {
    throw new Error("Recovery email is required");
  }
  deps.setApiBase(base);
  deps.setStatus("connecting", "Sending password recovery email...");
  const out = await deps.request(
    `/api/auth/recover-password?username=${encodeURIComponent(username)}&email=${encodeURIComponent(email)}`,
    { method: "GET" },
    false
  );
  deps.setStatus("online", `Recovery email sent for ${out?.user?.username || username}`);
  return out;
}

export async function performNetChangePassword(
  oldPasswordRaw: string,
  newPasswordRaw: string,
  deps: NetAccountCommonDeps & {
    persistPassword: (password: string) => void;
    onPasswordChanged: (nextPassword: string) => void;
    onProfileUpdated: () => void;
  }
): Promise<any> {
  if (!deps.isAuthenticated()) {
    await deps.ensureAuth();
  }
  const oldPassword = String(oldPasswordRaw || "");
  const newPassword = String(newPasswordRaw || "");
  if (!oldPassword) {
    throw new Error("Current password is required");
  }
  if (!newPassword) {
    throw new Error("New password is required");
  }
  if (newPassword === oldPassword) {
    throw new Error("New password must be different");
  }
  deps.setStatus("sync", "Updating account password...");
  const out = await deps.request("/api/auth/change-password", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      old_password: oldPassword,
      new_password: newPassword
    })
  }, true);
  deps.onPasswordChanged(newPassword);
  deps.persistPassword(newPassword);
  deps.onProfileUpdated();
  deps.setStatus("online", "Password updated");
  return out;
}
