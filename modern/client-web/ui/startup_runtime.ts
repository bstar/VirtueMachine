export function normalizeStartupMenuIndexRuntime(nextIndex: number, count: number): number {
  const c = count | 0;
  if (c <= 0) {
    return 0;
  }
  let idx = nextIndex | 0;
  if (idx < 0) {
    idx = c - 1;
  } else if (idx >= c) {
    idx = 0;
  }
  return idx;
}

export function startupMenuIndexAtLogicalPosRuntime(
  lx: number,
  ly: number,
  hitbox: {
    x0: number;
    x1: number;
    rows: Array<[number, number]>;
  }
): number {
  if (lx < hitbox.x0 || lx > hitbox.x1) {
    return -1;
  }
  for (let i = 0; i < hitbox.rows.length; i += 1) {
    const row = hitbox.rows[i];
    if (ly > row[0] && ly < row[1]) {
      return i;
    }
  }
  return -1;
}

export function startupMenuIndexAtSurfacePointRuntime(
  clientX: number,
  clientY: number,
  bounds: { left: number; top: number; width: number; height: number },
  surfaceSize: { width: number; height: number },
  hitbox: {
    x0: number;
    x1: number;
    rows: Array<[number, number]>;
  }
): number {
  if (bounds.width <= 0 || bounds.height <= 0) {
    return -1;
  }
  if (surfaceSize.width <= 0 || surfaceSize.height <= 0) {
    return -1;
  }
  const px = ((clientX - bounds.left) * surfaceSize.width) / bounds.width;
  const py = ((clientY - bounds.top) * surfaceSize.height) / bounds.height;
  const menuScale = Math.max(1, Math.floor(surfaceSize.width / 320));
  const lx = Math.floor(px / menuScale);
  const ly = Math.floor(py / menuScale);
  return startupMenuIndexAtLogicalPosRuntime(lx, ly, hitbox);
}

export function startupMenuItemEnabledRuntime(
  item: { id?: string; enabled?: boolean } | null | undefined,
  isAuthenticated: boolean
): boolean {
  if (!item) {
    return false;
  }
  if (!item.enabled) {
    return false;
  }
  if (item.id === "journey") {
    return !!isAuthenticated;
  }
  return true;
}
