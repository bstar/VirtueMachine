export function xorshift32Runtime(x: number): number {
  let v = x >>> 0;
  if (v === 0) {
    v = 0x6d2b79f5;
  }
  v ^= v << 13;
  v ^= v >>> 17;
  v ^= v << 5;
  return v >>> 0;
}

export function clampI32Runtime(value: number, lo: number, hi: number): number {
  if (value < lo) return lo;
  if (value > hi) return hi;
  return value | 0;
}

export function advanceWorldMinuteRuntime(world: {
  time_m: number;
  time_h: number;
  date_d: number;
  date_m: number;
  date_y: number;
}, limits: {
  minutesPerHour: number;
  hoursPerDay: number;
  daysPerMonth: number;
  monthsPerYear: number;
}): void {
  world.time_m += 1;
  if (world.time_m < limits.minutesPerHour) return;
  world.time_m = 0;
  world.time_h += 1;
  if (world.time_h < limits.hoursPerDay) return;
  world.time_h = 0;
  world.date_d += 1;
  if (world.date_d <= limits.daysPerMonth) return;
  world.date_d = 1;
  world.date_m += 1;
  if (world.date_m <= limits.monthsPerYear) return;
  world.date_m = 1;
  world.date_y += 1;
}

export function expireRemovedWorldPropsRuntime(
  sim: {
    removedObjectKeys: Record<string, any>;
    removedObjectAtTick: Record<string, any>;
    removedObjectCount: number;
  },
  tickNow: number,
  worldPropResetTicks: number
): void {
  const removed = sim.removedObjectKeys;
  if (!removed || typeof removed !== "object") {
    sim.removedObjectCount = 0;
    return;
  }
  const atTick = sim.removedObjectAtTick || {};
  let remaining = 0;
  for (const key of Object.keys(removed)) {
    if (!removed[key]) {
      delete removed[key];
      delete atTick[key];
      continue;
    }
    const removedTick = Number(atTick[key]) >>> 0;
    const age = (tickNow - removedTick) >>> 0;
    if (age >= worldPropResetTicks) {
      delete removed[key];
      delete atTick[key];
      continue;
    }
    remaining += 1;
  }
  sim.removedObjectAtTick = atTick;
  sim.removedObjectCount = remaining >>> 0;
}
