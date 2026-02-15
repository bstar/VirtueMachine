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
