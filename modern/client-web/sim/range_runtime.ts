export function chebyshevDistanceRuntime(ax: number, ay: number, bx: number, by: number): number {
  const dx = Math.abs((ax | 0) - (bx | 0));
  const dy = Math.abs((ay | 0) - (by | 0));
  return Math.max(dx, dy);
}

export function isWithinChebyshevRangeRuntime(
  ax: number,
  ay: number,
  bx: number,
  by: number,
  maxRange: number
): boolean {
  return chebyshevDistanceRuntime(ax, ay, bx, by) <= (maxRange | 0);
}
