export function deriveNetIndicatorState(
  level: string,
  isAuthenticated: boolean
): "offline" | "error" | "sync" | "connecting" | "online" {
  const lvl = String(level || "idle");
  if (isAuthenticated) {
    if (lvl === "error") return "error";
    if (lvl === "sync") return "sync";
    if (lvl === "connecting") return "connecting";
    if (lvl === "offline") return "offline";
    return "online";
  }
  if (lvl === "connecting") return "connecting";
  if (lvl === "error") return "error";
  return "offline";
}

export function deriveNetQuickStatusText(isAuthenticated: boolean): string {
  return isAuthenticated ? "Account: Signed in" : "Account: Signed out";
}

export function deriveNetSessionText(args: {
  token: string;
  userId: string;
  username: string;
  characterName: string;
}): string {
  if (!String(args.token || "") || !String(args.userId || "")) {
    return "offline";
  }
  const name = String(args.characterName || "").trim() || "(no-char)";
  return `${String(args.username || "")}/${name}`;
}

export function deriveNetAuthButtonModel(isAuthenticated: boolean): {
  text: string;
  addClass: "control-btn--login" | "control-btn--logout";
  removeClasses: ["control-btn--login", "control-btn--logout"];
} {
  return {
    text: isAuthenticated ? "Logout (Shift+I)" : "Net Login (Shift+I)",
    addClass: isAuthenticated ? "control-btn--logout" : "control-btn--login",
    removeClasses: ["control-btn--login", "control-btn--logout"]
  };
}

export function deriveTopNetStatusText(level: string, text: string): string {
  return `${String(level || "idle")} - ${String(text || "")}`;
}
