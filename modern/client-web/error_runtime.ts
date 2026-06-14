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
