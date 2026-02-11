const TICK_MS = 100;
const TILE_SIZE = 32;
const VIEW_W = 11;
const VIEW_H = 11;
const COMMAND_WIRE_SIZE = 16;
const TICKS_PER_MINUTE = 4;
const MINUTES_PER_HOUR = 60;
const HOURS_PER_DAY = 24;
const DAYS_PER_MONTH = 28;
const MONTHS_PER_YEAR = 13;
const REPLAY_CHECKPOINT_INTERVAL = 32;

const HASH_OFFSET = 1469598103934665603n;
const HASH_PRIME = 1099511628211n;
const HASH_MASK = (1n << 64n) - 1n;

const canvas = document.getElementById("viewport");
const ctx = canvas.getContext("2d");

const statTick = document.getElementById("statTick");
const statPos = document.getElementById("statPos");
const statClock = document.getElementById("statClock");
const statDate = document.getElementById("statDate");
const statTile = document.getElementById("statTile");
const statQueued = document.getElementById("statQueued");
const statSource = document.getElementById("statSource");
const statHash = document.getElementById("statHash");
const statReplay = document.getElementById("statReplay");
const diagBox = document.getElementById("diagBox");
const replayDownload = document.getElementById("replayDownload");
const themeSelect = document.getElementById("themeSelect");
const layoutSelect = document.getElementById("layoutSelect");
const fontSelect = document.getElementById("fontSelect");

const THEME_KEY = "vm_theme";
const LAYOUT_KEY = "vm_layout";
const FONT_KEY = "vm_font";
const THEMES = [
  "obsidian",
  "phosphor",
  "amber",
  "cga-cyan",
  "cga-magenta",
  "parchment",
  "cobalt",
  "bloodstone",
  "moonstone",
  "ash"
];
const LAYOUTS = [
  "classic-right",
  "classic-left",
  "ledger-split",
  "ledger-compact",
  "ledger-focus"
];
const FONTS = ["blockblueprint", "kaijuz", "orangekid", "silkscreen"];

const INITIAL_WORLD = Object.freeze({
  is_on_quest: 0,
  next_sleep: 0,
  time_m: 0,
  time_h: 0,
  date_d: 1,
  date_m: 1,
  date_y: 1,
  wind_dir: 0,
  active: 0,
  map_x: 0x133,
  map_y: 0x160,
  map_z: 0,
  in_combat: 0,
  sound_enabled: 1
});

const INITIAL_SEED = 0x12345678;

const state = {
  sim: createInitialSimState(),
  queue: [],
  commandLog: [],
  mapCtx: null,
  lastTs: performance.now(),
  accMs: 0,
  replayUrl: null
};

class U6MapJS {
  constructor(mapBytes, chunkBytes) {
    this.map = mapBytes;
    this.chunks = chunkBytes;
    this.window = new Uint8Array(0x600);
    this.loadedZ = -1;
    this.loadedMapId0 = -1;
  }

  mkMapId(x, y) {
    return (x >> 7) + ((y >> 4) & 0x38);
  }

  readU16LE(buf, off) {
    return buf[off] | (buf[off + 1] << 8);
  }

  loadWindow(x, y, z) {
    x &= 0x3ff;
    y &= 0x3ff;

    if (z !== 0) {
      const off = ((z + z + z) << 9) + 0x5a00;
      this.window.set(this.map.slice(off, off + 0x600), 0);
      this.loadedZ = z;
      this.loadedMapId0 = -1;
      return;
    }

    const mapId = this.mkMapId(x, y);
    const ids = [mapId, (mapId + 1) & 0x3f, (mapId + 8) & 0x3f, (mapId + 9) & 0x3f];
    for (let i = 0; i < 4; i += 1) {
      const src = ids[i] * 0x180;
      const dst = i * 0x180;
      this.window.set(this.map.slice(src, src + 0x180), dst);
    }
    this.loadedZ = 0;
    this.loadedMapId0 = mapId;
  }

  chunkIndexAt(x, y, z) {
    this.loadWindow(x, y, z);
    x &= 0x3ff;
    y &= 0x3ff;

    let si;
    if (z !== 0) {
      si = ((x >> 3) & 0x1f) + ((y << 2) & 0x3e0);
      si += si >> 1;
    } else {
      const mapId = this.mkMapId(x, y);
      let bp02 = 0;
      if ((mapId - this.loadedMapId0) & 1) bp02 = 0x100;
      if ((mapId - this.loadedMapId0) & 8) bp02 += 0x200;
      si = ((x >> 3) & 0xf) + bp02;
      si += (y << 1) & 0xf0;
      si += si >> 1;
    }

    const v = this.readU16LE(this.window, si);
    return (x & 8) ? (v >> 4) : (v & 0x0fff);
  }

  tileAt(x, y, z) {
    const ci = this.chunkIndexAt(x, y, z);
    const co = ci * 0x40;
    if (co + 0x40 > this.chunks.length) return 0;
    return this.chunks[co + ((y & 7) * 8) + (x & 7)];
  }
}

function createInitialSimState() {
  return {
    tick: 0,
    rngState: INITIAL_SEED >>> 0,
    worldFlags: 0,
    commandsApplied: 0,
    world: { ...INITIAL_WORLD }
  };
}

function setTheme(themeName) {
  const theme = THEMES.includes(themeName) ? themeName : "obsidian";
  document.documentElement.setAttribute("data-theme", theme);
  if (themeSelect) {
    themeSelect.value = theme;
  }
  try {
    localStorage.setItem(THEME_KEY, theme);
  } catch (_err) {
    // ignore storage failures in restrictive browser contexts
  }
}

function initTheme() {
  let saved = "obsidian";
  try {
    const fromStorage = localStorage.getItem(THEME_KEY);
    if (fromStorage) {
      saved = fromStorage;
    }
  } catch (_err) {
    // ignore storage failures in restrictive browser contexts
  }
  setTheme(saved);
  if (themeSelect) {
    themeSelect.addEventListener("change", () => {
      setTheme(themeSelect.value);
    });
  }
}

function setLayout(layoutName) {
  const layout = LAYOUTS.includes(layoutName) ? layoutName : "classic-right";
  document.documentElement.setAttribute("data-layout", layout);
  if (layoutSelect) {
    layoutSelect.value = layout;
  }
  try {
    localStorage.setItem(LAYOUT_KEY, layout);
  } catch (_err) {
    // ignore storage failures in restrictive browser contexts
  }
}

function initLayout() {
  let saved = "classic-right";
  try {
    const fromStorage = localStorage.getItem(LAYOUT_KEY);
    if (fromStorage) {
      saved = fromStorage;
    }
  } catch (_err) {
    // ignore storage failures in restrictive browser contexts
  }
  setLayout(saved);
  if (layoutSelect) {
    layoutSelect.addEventListener("change", () => {
      setLayout(layoutSelect.value);
    });
  }
}

function setFont(fontName) {
  const font = FONTS.includes(fontName) ? fontName : "blockblueprint";
  document.documentElement.setAttribute("data-font", font);
  if (fontSelect) {
    fontSelect.value = font;
  }
  try {
    localStorage.setItem(FONT_KEY, font);
  } catch (_err) {
    // ignore storage failures in restrictive browser contexts
  }
}

function initFont() {
  let saved = "blockblueprint";
  try {
    const fromStorage = localStorage.getItem(FONT_KEY);
    if (fromStorage) {
      saved = fromStorage;
    }
  } catch (_err) {
    // ignore storage failures in restrictive browser contexts
  }
  setFont(saved);
  if (fontSelect) {
    fontSelect.addEventListener("change", () => {
      setFont(fontSelect.value);
    });
  }
}

function cloneSimState(sim) {
  return {
    tick: sim.tick >>> 0,
    rngState: sim.rngState >>> 0,
    worldFlags: sim.worldFlags >>> 0,
    commandsApplied: sim.commandsApplied >>> 0,
    world: { ...sim.world }
  };
}

function xorshift32(x) {
  let v = x >>> 0;
  if (v === 0) {
    v = 0x6d2b79f5;
  }
  v ^= v << 13;
  v ^= v >>> 17;
  v ^= v << 5;
  return v >>> 0;
}

function clampI32(value, lo, hi) {
  if (value < lo) return lo;
  if (value > hi) return hi;
  return value | 0;
}

function advanceWorldMinute(world) {
  world.time_m += 1;
  if (world.time_m < MINUTES_PER_HOUR) return;
  world.time_m = 0;
  world.time_h += 1;
  if (world.time_h < HOURS_PER_DAY) return;
  world.time_h = 0;
  world.date_d += 1;
  if (world.date_d <= DAYS_PER_MONTH) return;
  world.date_d = 1;
  world.date_m += 1;
  if (world.date_m <= MONTHS_PER_YEAR) return;
  world.date_m = 1;
  world.date_y += 1;
}

function applyCommand(sim, cmd) {
  if (cmd.type === 1) {
    sim.world.map_x = clampI32(sim.world.map_x + cmd.arg0, -4096, 4095);
    sim.world.map_y = clampI32(sim.world.map_y + cmd.arg1, -4096, 4095);
  }
  sim.commandsApplied += 1;
}

function stepSimTick(sim, queue) {
  const nextTick = (sim.tick + 1) >>> 0;
  const pending = [];

  for (const cmd of queue) {
    if (cmd.tick === nextTick) {
      applyCommand(sim, cmd);
      continue;
    }
    pending.push(cmd);
  }

  sim.rngState = xorshift32(sim.rngState);
  sim.worldFlags ^= sim.rngState & 1;
  if ((nextTick % TICKS_PER_MINUTE) === 0) {
    advanceWorldMinute(sim.world);
  }
  sim.tick = nextTick;

  return pending;
}

function hashMixU32(h, value) {
  const mixed = (h ^ BigInt(value >>> 0)) * HASH_PRIME;
  return mixed & HASH_MASK;
}

function asU32Signed(value) {
  return (value | 0) >>> 0;
}

function simStateHash(sim) {
  let h = HASH_OFFSET;
  h = hashMixU32(h, sim.tick);
  h = hashMixU32(h, sim.rngState);
  h = hashMixU32(h, sim.worldFlags);
  h = hashMixU32(h, sim.commandsApplied);
  h = hashMixU32(h, sim.world.is_on_quest);
  h = hashMixU32(h, sim.world.next_sleep);
  h = hashMixU32(h, sim.world.time_m);
  h = hashMixU32(h, sim.world.time_h);
  h = hashMixU32(h, sim.world.date_d);
  h = hashMixU32(h, sim.world.date_m);
  h = hashMixU32(h, sim.world.date_y);
  h = hashMixU32(h, asU32Signed(sim.world.wind_dir));
  h = hashMixU32(h, sim.world.active);
  h = hashMixU32(h, asU32Signed(sim.world.map_x));
  h = hashMixU32(h, asU32Signed(sim.world.map_y));
  h = hashMixU32(h, asU32Signed(sim.world.map_z));
  h = hashMixU32(h, sim.world.in_combat);
  h = hashMixU32(h, sim.world.sound_enabled);
  return h;
}

function hashHex(hashValue) {
  return hashValue.toString(16).padStart(16, "0");
}

function packCommand(tick, type, arg0, arg1) {
  const b = new Uint8Array(COMMAND_WIRE_SIZE);
  const dv = new DataView(b.buffer);
  dv.setUint32(0, tick, true);
  dv.setUint8(4, type);
  dv.setInt32(8, arg0, true);
  dv.setInt32(12, arg1, true);
  return b;
}

function unpackCommand(bytes) {
  const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  return {
    tick: dv.getUint32(0, true),
    type: dv.getUint8(4),
    arg0: dv.getInt32(8, true),
    arg1: dv.getInt32(12, true)
  };
}

function queueMove(dx, dy) {
  const bytes = packCommand(state.sim.tick + 1, 1, dx, dy);
  const cmd = unpackCommand(bytes);
  state.queue.push(cmd);
  state.commandLog.push({ ...cmd });
}

function tileColor(t) {
  const r = (t * 53) & 0xff;
  const g = (t * 97) & 0xff;
  const b = (t * 31) & 0xff;
  return `rgb(${r}, ${g}, ${b})`;
}

function drawTileGrid() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#0a0f13";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const startX = state.sim.world.map_x - (VIEW_W >> 1);
  const startY = state.sim.world.map_y - (VIEW_H >> 1);

  let centerTile = 0;
  for (let gy = 0; gy < VIEW_H; gy += 1) {
    for (let gx = 0; gx < VIEW_W; gx += 1) {
      const wx = startX + gx;
      const wy = startY + gy;
      let t = 0;
      if (state.mapCtx) {
        t = state.mapCtx.tileAt(wx, wy, state.sim.world.map_z);
      } else {
        t = (wx * 7 + wy * 13) & 0xff;
      }
      if (gx === (VIEW_W >> 1) && gy === (VIEW_H >> 1)) {
        centerTile = t;
      }
      ctx.fillStyle = tileColor(t);
      ctx.fillRect(gx * TILE_SIZE, gy * TILE_SIZE, TILE_SIZE, TILE_SIZE);
      ctx.strokeStyle = "rgba(15, 20, 24, 0.55)";
      ctx.strokeRect(gx * TILE_SIZE, gy * TILE_SIZE, TILE_SIZE, TILE_SIZE);
    }
  }

  const cx = (VIEW_W >> 1) * TILE_SIZE;
  const cy = (VIEW_H >> 1) * TILE_SIZE;
  ctx.strokeStyle = "#f1f3f5";
  ctx.lineWidth = 2;
  ctx.strokeRect(cx + 2, cy + 2, TILE_SIZE - 4, TILE_SIZE - 4);

  statTile.textContent = `0x${centerTile.toString(16).padStart(2, "0")}`;
}

function updateStats() {
  const w = state.sim.world;
  statTick.textContent = String(state.sim.tick);
  statPos.textContent = `${w.map_x}, ${w.map_y}, ${w.map_z}`;
  statClock.textContent = `${String(w.time_h).padStart(2, "0")}:${String(w.time_m).padStart(2, "0")}`;
  statDate.textContent = `${w.date_d} / ${w.date_m} / ${w.date_y}`;
  statQueued.textContent = String(state.queue.length);
  statHash.textContent = hashHex(simStateHash(state.sim));
}

function releaseReplayUrl() {
  if (state.replayUrl) {
    URL.revokeObjectURL(state.replayUrl);
    state.replayUrl = null;
  }
}

function setReplayCsv(csvText) {
  releaseReplayUrl();
  const blob = new Blob([csvText], { type: "text/csv;charset=utf-8" });
  state.replayUrl = URL.createObjectURL(blob);
  replayDownload.href = state.replayUrl;
  replayDownload.download = "virtuemachine-replay-checkpoints.csv";
  replayDownload.classList.remove("disabled");
}

function replayCheckpointsCsv(checkpoints) {
  const lines = ["tick,hash"];
  for (const cp of checkpoints) {
    lines.push(`${cp.tick},${cp.hash}`);
  }
  return `${lines.join("\n")}\n`;
}

function runReplayCheckpoints(commands, totalTicks, interval) {
  const sim = createInitialSimState();
  const queue = commands.map((cmd) => ({ ...cmd }));
  const checkpoints = [];

  for (let i = 0; i < totalTicks; i += 1) {
    const pending = stepSimTick(sim, queue);
    queue.length = 0;
    queue.push(...pending);

    if ((sim.tick % interval) === 0 || sim.tick === totalTicks) {
      checkpoints.push({
        tick: sim.tick,
        hash: hashHex(simStateHash(sim))
      });
    }
  }

  return checkpoints;
}

function verifyReplayStability() {
  const maxCommandTick = state.commandLog.reduce((maxTick, cmd) => Math.max(maxTick, cmd.tick), 0);
  const totalTicks = Math.max(state.sim.tick, maxCommandTick, 1);
  const a = runReplayCheckpoints(state.commandLog, totalTicks, REPLAY_CHECKPOINT_INTERVAL);
  const b = runReplayCheckpoints(state.commandLog, totalTicks, REPLAY_CHECKPOINT_INTERVAL);

  const sameLength = a.length === b.length;
  const allMatch = sameLength && a.every((cp, idx) => cp.tick === b[idx].tick && cp.hash === b[idx].hash);

  if (allMatch) {
    const csv = replayCheckpointsCsv(a);
    setReplayCsv(csv);
    statReplay.textContent = `stable (${a.length} checkpoints)`;
    diagBox.className = "diag ok";
    diagBox.textContent = `Replay verified stable over ${totalTicks} ticks. Download checkpoints.csv for baseline tracking.`;
    return;
  }

  statReplay.textContent = "mismatch";
  diagBox.className = "diag warn";
  diagBox.textContent = "Replay mismatch detected. Determinism drift likely in command/tick path.";
}

function resetRun() {
  state.sim = createInitialSimState();
  state.queue = [];
  state.commandLog = [];
  statReplay.textContent = "not run";
  releaseReplayUrl();
  replayDownload.classList.add("disabled");
  replayDownload.removeAttribute("href");
}

function tickLoop(ts) {
  state.accMs += ts - state.lastTs;
  state.lastTs = ts;

  while (state.accMs >= TICK_MS) {
    state.accMs -= TICK_MS;
    state.queue = stepSimTick(state.sim, state.queue);
  }

  drawTileGrid();
  updateStats();
  requestAnimationFrame(tickLoop);
}

async function loadRuntimeAssets() {
  const required = ["map", "chunks"];
  const missing = [];

  try {
    for (const name of required) {
      const res = await fetch(`../assets/runtime/${name}`);
      if (!res.ok) {
        missing.push(name);
      }
    }
    if (missing.length) {
      throw new Error(`missing ${missing.join(", ")}`);
    }

    const [mapRes, chunksRes] = await Promise.all([
      fetch("../assets/runtime/map"),
      fetch("../assets/runtime/chunks")
    ]);
    const [mapBuf, chunkBuf] = await Promise.all([mapRes.arrayBuffer(), chunksRes.arrayBuffer()]);
    state.mapCtx = new U6MapJS(new Uint8Array(mapBuf), new Uint8Array(chunkBuf));
    statSource.textContent = "runtime assets";
    diagBox.className = "diag ok";
    diagBox.textContent = "Runtime assets loaded. Rendering map/chunk data from local runtime directory.";
  } catch (err) {
    state.mapCtx = null;
    statSource.textContent = "synthetic fallback";
    diagBox.className = "diag warn";
    diagBox.textContent = `Fallback active: ${String(err.message || err)}. Run ./modern/tools/validate_assets.sh and ./modern/tools/sync_assets.sh.`;
  }
}

window.addEventListener("keydown", (ev) => {
  const k = ev.key.toLowerCase();
  if (k === "w") queueMove(0, -1);
  else if (k === "s") queueMove(0, 1);
  else if (k === "a") queueMove(-1, 0);
  else if (k === "d") queueMove(1, 0);
  else if (k === "r") resetRun();
  else if (k === "v") verifyReplayStability();
  else return;
  ev.preventDefault();
});

loadRuntimeAssets().then(() => {
  requestAnimationFrame((ts) => {
    state.lastTs = ts;
    requestAnimationFrame(tickLoop);
  });
});

initTheme();
initLayout();
initFont();
