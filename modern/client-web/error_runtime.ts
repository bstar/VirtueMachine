export function errorMessageRuntime(err: unknown, fallback = ""): string {
  if (err && typeof err === "object" && "message" in err) {
    const message = (err as { message?: unknown }).message;
    if (message != null && String(message)) {
      return String(message);
    }
  }
  const text = String(err ?? "");
  return text || fallback;
}

export function errorNameRuntime(err: unknown): string {
  if (err && typeof err === "object" && "name" in err) {
    return String((err as { name?: unknown }).name || "");
  }
  return "";
}
