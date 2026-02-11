const TICK_MS = 100;
const TILE_SIZE = 32;
const VIEW_W = 11;
const VIEW_H = 11;
const COMMAND_WIRE_SIZE = 16;

const canvas = document.getElementById("viewport");
const ctx = canvas.getContext("2d");

const statTick = document.getElementById("statTick");
const statPos = document.getElementById("statPos");
const statTile = document.getElementById("statTile");
const statQueued = document.getElementById("statQueued");
const statSource = document.getElementById("statSource");

const state = {
  tick: 0,
  mapX: 0x133,
  mapY: 0x160,
  mapZ: 0,
  queue: [],
  mapCtx: null,
  lastTs: performance.now(),
  accMs: 0
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
  const bytes = packCommand(state.tick + 1, 1, dx, dy);
  state.queue.push(unpackCommand(bytes));
}

function applyCommandsForTick(tick) {
  const pending = [];
  for (const c of state.queue) {
    if (c.tick !== tick) {
      pending.push(c);
      continue;
    }
    if (c.type === 1) {
      state.mapX = Math.max(0, Math.min(0x3ff, state.mapX + c.arg0));
      state.mapY = Math.max(0, Math.min(0x3ff, state.mapY + c.arg1));
    }
  }
  state.queue = pending;
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

  const startX = state.mapX - (VIEW_W >> 1);
  const startY = state.mapY - (VIEW_H >> 1);

  let centerTile = 0;
  for (let gy = 0; gy < VIEW_H; gy += 1) {
    for (let gx = 0; gx < VIEW_W; gx += 1) {
      const wx = startX + gx;
      const wy = startY + gy;
      let t = 0;
      if (state.mapCtx) {
        t = state.mapCtx.tileAt(wx, wy, state.mapZ);
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
  statTick.textContent = String(state.tick);
  statPos.textContent = `${state.mapX}, ${state.mapY}, ${state.mapZ}`;
  statQueued.textContent = String(state.queue.length);
}

function tickLoop(ts) {
  state.accMs += ts - state.lastTs;
  state.lastTs = ts;

  while (state.accMs >= TICK_MS) {
    state.accMs -= TICK_MS;
    state.tick += 1;
    applyCommandsForTick(state.tick);
  }

  drawTileGrid();
  updateStats();
  requestAnimationFrame(tickLoop);
}

async function loadRuntimeAssets() {
  try {
    const [mapRes, chunksRes] = await Promise.all([
      fetch("../assets/runtime/map"),
      fetch("../assets/runtime/chunks")
    ]);
    if (!mapRes.ok || !chunksRes.ok) {
      throw new Error("map/chunks fetch failed");
    }
    const [mapBuf, chunkBuf] = await Promise.all([mapRes.arrayBuffer(), chunksRes.arrayBuffer()]);
    state.mapCtx = new U6MapJS(new Uint8Array(mapBuf), new Uint8Array(chunkBuf));
    statSource.textContent = "runtime assets";
  } catch (_err) {
    state.mapCtx = null;
    statSource.textContent = "synthetic fallback";
  }
}

window.addEventListener("keydown", (ev) => {
  const k = ev.key.toLowerCase();
  if (k === "w") queueMove(0, -1);
  else if (k === "s") queueMove(0, 1);
  else if (k === "a") queueMove(-1, 0);
  else if (k === "d") queueMove(1, 0);
  else if (k === "r") {
    state.mapX = 0x133;
    state.mapY = 0x160;
    state.mapZ = 0;
  } else {
    return;
  }
  ev.preventDefault();
});

loadRuntimeAssets().then(() => {
  requestAnimationFrame((ts) => {
    state.lastTs = ts;
    requestAnimationFrame(tickLoop);
  });
});
