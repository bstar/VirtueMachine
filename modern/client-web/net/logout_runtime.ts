export async function performNetLogoutSequence(
  deps: {
    hasSession: () => boolean;
    saveSnapshot: () => Promise<void>;
    leavePresence: () => Promise<void>;
  }
): Promise<{ saveErr: unknown; leaveErr: unknown }> {
  let saveErr: unknown = null;
  let leaveErr: unknown = null;
  if (deps.hasSession()) {
    try {
      await deps.saveSnapshot();
    } catch (err) {
      saveErr = err;
    }
    try {
      await deps.leavePresence();
    } catch (err) {
      leaveErr = err;
    }
  }
  return { saveErr, leaveErr };
}
