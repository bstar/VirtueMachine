export function isTypingContextRuntime(target: EventTarget | null): boolean {
  if (!target) {
    return false;
  }
  const el = target instanceof Element ? target : null;
  if (!el) {
    return false;
  }
  if (el.isContentEditable) {
    return true;
  }
  const tag = el.tagName ? el.tagName.toLowerCase() : "";
  if (tag === "input" || tag === "textarea" || tag === "select") {
    return true;
  }
  return !!el.closest("input, textarea, select, [contenteditable=\"\"], [contenteditable=\"true\"]");
}
