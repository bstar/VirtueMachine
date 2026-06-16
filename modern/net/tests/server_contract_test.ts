import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import assert from "node:assert/strict";
import {
  OBJ_COORD_USE_CONTAINED,
  OBJ_COORD_USE_EQUIP,
  OBJ_COORD_USE_INVEN,
  OBJ_COORD_USE_LOCXYZ,
  OBJ_COORD_USE_MASK
} from "../../common/u6_object_constants.ts";
import { canTakeWorldObject } from "../world_object_policy.ts";
import { loadTypeWeightMap } from "../world_map_runtime.ts";

const ROOT = path.resolve(new URL("../../..", import.meta.url).pathname);
const SERVER_TS = path.join(ROOT, "modern/net/server.ts");
const SIM_CORE_INTERACT_BIN = path.join(ROOT, "build", "modern", "sim-core", "sim_core_world_interact_bridge");
const SIM_CORE_ASSOC_BIN = path.join(ROOT, "build", "modern", "sim-core", "sim_core_assoc_chain_bridge");
const SIM_CORE_ASSOC_BATCH_BIN = path.join(ROOT, "build", "modern", "sim-core", "sim_core_assoc_chain_batch_bridge");
const SIM_CORE_WORLD_QUERY_BIN = path.join(ROOT, "build", "modern", "sim-core", "sim_core_world_objects_query_bridge");
const ROOM_HOTSPOT_FIXTURES = path.join(ROOT, "modern", "net", "tests", "fixtures", "room_hotspots.level0.json");
const RUNTIME_DIR = path.join(ROOT, "modern", "assets", "runtime");
const SERVER_NODE_OPTIONS = [
  String(process.env.NODE_OPTIONS || "").trim(),
  "--disable-warning=MODULE_TYPELESS_PACKAGE_JSON"
].filter(Boolean).join(" ");

type ClockNpcStateTestRow = {
  action?: unknown;
  npc_id?: unknown;
  path_status?: unknown;
  pose?: unknown;
  target_x?: unknown;
  x?: unknown;
  y?: unknown;
  z?: unknown;
};

type JsonResponseBody = Record<string, any> | null;

type JsonFetchResult = {
  body: JsonResponseBody;
  status: number;
};

type JsonHeaders = Record<string, string> | null | undefined;

type ContractWorldObjectRow = {
  dropped_at_ms?: unknown;
  despawn_at_ms?: unknown;
  frame?: unknown;
  holder_kind?: unknown;
  object_key?: unknown;
  source_area?: unknown;
  source_index?: unknown;
  source_object_key?: unknown;
  status?: unknown;
  type?: unknown;
  x?: unknown;
  y?: unknown;
  z?: unknown;
};

type RoomHotspotFixtureRow = {
  center?: {
    x?: unknown;
    y?: unknown;
    z?: unknown;
  };
  frame?: unknown;
  id?: unknown;
  label?: unknown;
  must_exclude?: RoomHotspotFixtureRow[];
  must_include?: RoomHotspotFixtureRow[];
  radius?: unknown;
  type?: unknown;
  x?: unknown;
  y?: unknown;
  z?: unknown;
};

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForHealth(baseUrl: string, timeoutMs = 5000): Promise<void> {
  const start = Date.now();
  while ((Date.now() - start) < timeoutMs) {
    try {
      const res = await fetch(`${baseUrl}/health`);
      if (res.ok) {
        return;
      }
    } catch (_err) {
      // Keep polling until timeout.
    }
    await sleep(100);
  }
  throw new Error("net server did not become healthy in time");
}

async function jsonFetch(baseUrl: string, route: string, init: RequestInit = {}): Promise<JsonFetchResult> {
  const res = await fetch(`${baseUrl}${route}`, init);
  const text = await res.text();
  let body: JsonResponseBody = null;
  try {
    body = text.trim() ? JSON.parse(text) : null;
  } catch (_err) {
    throw new Error(`invalid JSON response for ${route}: ${text}`);
  }
  return { status: res.status, body };
}

function jsonRequestInit(method: "POST" | "PUT", headers: JsonHeaders, body: unknown): RequestInit {
  return {
    method,
    headers: { "content-type": "application/json", ...(headers || {}) },
    body: JSON.stringify(body)
  };
}

function jsonPost(headers: JsonHeaders, body: unknown): RequestInit {
  return jsonRequestInit("POST", headers, body);
}

function jsonPut(headers: JsonHeaders, body: unknown): RequestInit {
  return jsonRequestInit("PUT", headers, body);
}

function coordUseOfStatus(status: unknown): number {
  return (Number(status) & OBJ_COORD_USE_MASK) >>> 0;
}

function isStatus0010(status: unknown): boolean {
  return (Number(status) & 0x10) !== 0;
}

function findObjectByKey(list: unknown, key: unknown): ContractWorldObjectRow | null {
  return (Array.isArray(list) ? list : []).find((o) => String(o?.object_key || "") === String(key || "")) || null;
}

function objectKeyList(list: unknown): string[] {
  return (Array.isArray(list) ? list : []).map((o) => String(o?.object_key || "")).filter(Boolean);
}

function loadRoomHotspotFixtures(): RoomHotspotFixtureRow[] {
  const raw = fs.readFileSync(ROOM_HOTSPOT_FIXTURES, "utf8");
  const parsed = JSON.parse(raw);
  return Array.isArray(parsed?.fixtures) ? parsed.fixtures : [];
}

function objectMatchesExpectation(
  obj: ContractWorldObjectRow | null | undefined,
  exp: RoomHotspotFixtureRow | null | undefined
): boolean {
  if (!obj || !exp) {
    return false;
  }
  if ((Number(obj.x) | 0) !== (Number(exp.x) | 0)) return false;
  if ((Number(obj.y) | 0) !== (Number(exp.y) | 0)) return false;
  if ((Number(obj.z) | 0) !== (Number(exp.z) | 0)) return false;
  if ((Number(obj.type) | 0) !== (Number(exp.type) | 0)) return false;
  if (Object.prototype.hasOwnProperty.call(exp, "frame")) {
    if ((Number(obj.frame) | 0) !== (Number(exp.frame) | 0)) return false;
  }
  return true;
}

function compareLegacyWorldObjectOrder(a: ContractWorldObjectRow, b: ContractWorldObjectRow): number {
  const aUse = coordUseOfStatus(a.status);
  const bUse = coordUseOfStatus(b.status);
  if (aUse !== 0 && bUse === 0) return -1;
  if (bUse !== 0 && aUse === 0) return 1;
  if ((Number(a.y) | 0) !== (Number(b.y) | 0)) return (Number(a.y) | 0) - (Number(b.y) | 0);
  if ((Number(a.x) | 0) !== (Number(b.x) | 0)) return (Number(a.x) | 0) - (Number(b.x) | 0);
  if ((Number(a.z) | 0) !== (Number(b.z) | 0)) return (Number(b.z) | 0) - (Number(a.z) | 0);
  if (isStatus0010(a.status) !== isStatus0010(b.status)) {
    return isStatus0010(a.status) ? -1 : 1;
  }
  if ((Number(a.source_area) | 0) !== (Number(b.source_area) | 0)) {
    return (Number(a.source_area) | 0) - (Number(b.source_area) | 0);
  }
  if ((Number(a.source_index) | 0) !== (Number(b.source_index) | 0)) {
    return (Number(a.source_index) | 0) - (Number(b.source_index) | 0);
  }
  return String(a.object_key || "").localeCompare(String(b.object_key || ""));
}

async function main() {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "vm-net-test-"));
  const dataDir = path.join(tmp, "data");
  fs.mkdirSync(dataDir, { recursive: true });

  const host = "127.0.0.1";
  const port = 18081;
  const baseUrl = `http://${host}:${port}`;

  let stderr = "";
  let stdout = "";
  let child: ReturnType<typeof spawn> | null = null;

  async function startServer() {
    const next = spawn(process.execPath, [SERVER_TS], {
      env: {
        ...process.env,
        VM_NET_HOST: host,
        VM_NET_PORT: String(port),
        VM_NET_DATA_DIR: dataDir,
        VM_SIM_CORE_INTERACT_BIN: SIM_CORE_INTERACT_BIN,
        VM_SIM_CORE_ASSOC_BIN: SIM_CORE_ASSOC_BIN,
        VM_SIM_CORE_ASSOC_BATCH_BIN: SIM_CORE_ASSOC_BATCH_BIN,
        VM_SIM_CORE_WORLD_QUERY_BIN: SIM_CORE_WORLD_QUERY_BIN,
        VM_EMAIL_MODE: "log",
        NODE_OPTIONS: SERVER_NODE_OPTIONS
      },
      stdio: ["ignore", "pipe", "pipe"]
    });
    child = next;
    next.stdout.on("data", (buf) => {
      stdout += String(buf);
    });
    next.stderr.on("data", (buf) => {
      stderr += String(buf);
    });
    try {
      await waitForHealth(baseUrl);
      return next;
    } catch (err) {
      if (next.exitCode === null) {
        next.kill("SIGTERM");
        await new Promise((resolve) => next.once("exit", resolve));
      }
      if (stderr.trim() || stdout.trim()) {
        process.stdout.write(`net test server startup stdout:\n${stdout}\n`);
        process.stdout.write(`net test server startup stderr:\n${stderr}\n`);
      }
      child = null;
      throw err;
    }
  }

  async function stopServer() {
    if (!child) {
      return;
    }
    const stopping = child;
    child = null;
    if (stopping.exitCode !== null) {
      return;
    }
    stopping.kill("SIGTERM");
    await new Promise((resolve) => stopping.once("exit", resolve));
  }

  try {
    await startServer();

    const runtimeContract = await jsonFetch(baseUrl, "/api/runtime/contract", {
      method: "GET"
    });
    assert.equal(runtimeContract.status, 200);
    assert.equal(runtimeContract.body?.runtime_contract?.default_profile, "canonical_strict");
    assert.deepEqual(runtimeContract.body?.runtime_contract?.profiles, ["canonical_plus", "canonical_strict"]);
    assert.equal(runtimeContract.body?.runtime_contract?.extension_header_format, "comma-separated ids or 'none'");

    const login = await jsonFetch(baseUrl, "/api/auth/login", jsonPost(null, {
      username: "avatar",
      password: "quest123"
    }));
    assert.equal(login.status, 200);
    assert.ok(login.body?.token);
    const token = login.body.token;
    const accountUserId = String(login.body?.user?.user_id || "");
    assert.ok(accountUserId, "login should expose account user id");
    const runtimeHeaders = {
      "x-vm-runtime-profile": "canonical_plus",
      "x-vm-runtime-extensions": "quest_system,housing"
    };
    const authHeaders = {
      "content-type": "application/json",
      authorization: `Bearer ${token}`,
      ...runtimeHeaders
    };

    const badLogin = await jsonFetch(baseUrl, "/api/auth/login", jsonPost(null, {
      username: "avatar",
      password: "wrong"
    }));
    assert.equal(badLogin.status, 401);

    const recoveredUnverified = await jsonFetch(baseUrl, "/api/auth/recover-password?username=avatar&email=avatar@example.com", {
      method: "GET"
    });
    assert.equal(recoveredUnverified.status, 403);

    const setEmail = await jsonFetch(baseUrl, "/api/auth/set-email", jsonPost(authHeaders, {
      email: "avatar@example.com"
    }));
    assert.equal(setEmail.status, 200);
    assert.equal(setEmail.body?.user?.email, "avatar@example.com");
    assert.equal(setEmail.body?.user?.email_verified, false);

    const worldObjects = await jsonFetch(baseUrl, "/api/world/objects?x=307&y=347&z=0&radius=0&limit=32", {
      method: "GET",
      headers: { authorization: `Bearer ${token}`, ...runtimeHeaders }
    });
    assert.equal(worldObjects.status, 200);
    assert.ok(worldObjects.body?.meta);
    assert.equal(worldObjects.body?.runtime_contract?.profile, "canonical_plus");
    assert.deepEqual(worldObjects.body?.runtime_contract?.extensions, ["housing", "quest_system"]);
    assert.ok(Array.isArray(worldObjects.body?.objects));
    assert.ok(Number.isInteger(worldObjects.body?.meta?.active_count));
    if (worldObjects.body.objects.length > 0) {
      const first = worldObjects.body.objects[0];
      assert.ok(Number.isInteger(Number(first.legacy_order)));
      assert.ok(Number.isInteger(Number(first.assoc_child_count)));
      assert.ok(Number.isInteger(Number(first.assoc_child_0010_count)));
    }

    const worldObjectsDefaultContract = await jsonFetch(baseUrl, "/api/world/objects?x=307&y=347&z=0&radius=0&limit=8", {
      method: "GET",
      headers: { authorization: `Bearer ${token}` }
    });
    assert.equal(worldObjectsDefaultContract.status, 200);
    assert.equal(worldObjectsDefaultContract.body?.runtime_contract?.profile, "canonical_strict");
    assert.deepEqual(worldObjectsDefaultContract.body?.runtime_contract?.extensions, []);

    const worldObjectsSweep = await jsonFetch(baseUrl, "/api/world/objects?x=300&y=353&z=0&radius=12&limit=4096&projection=footprint&include_footprint=1", {
      method: "GET",
      headers: { authorization: `Bearer ${token}`, ...runtimeHeaders }
    });
    assert.equal(worldObjectsSweep.status, 200);
    assert.ok(Array.isArray(worldObjectsSweep.body?.objects));
    const sweep = worldObjectsSweep.body.objects;
    for (let i = 1; i < sweep.length; i += 1) {
      const prev = sweep[i - 1];
      const cur = sweep[i];
      assert.ok(
        compareLegacyWorldObjectOrder(prev, cur) <= 0,
        `world object order regression at index ${i - 1}->${i}: ${prev.object_key} then ${cur.object_key}`
      );
    }

    const roomHotspotFixtures = loadRoomHotspotFixtures();
    for (const fixture of roomHotspotFixtures) {
      const cx = Number(fixture?.center?.x) | 0;
      const cy = Number(fixture?.center?.y) | 0;
      const cz = Number(fixture?.center?.z) | 0;
      const radius = Number(fixture?.radius) | 0;
      const sample = await jsonFetch(baseUrl, `/api/world/objects?x=${cx}&y=${cy}&z=${cz}&radius=${radius}&limit=4096`, {
        method: "GET",
        headers: { authorization: `Bearer ${token}`, ...runtimeHeaders }
      });
      assert.equal(sample.status, 200, `fixture ${fixture.id}: sample query failed`);
      const objects = Array.isArray(sample.body?.objects) ? sample.body.objects : [];
      for (const req of (fixture.must_include || [])) {
        const found = objects.some((o) => objectMatchesExpectation(o, req));
        assert.equal(
          found,
          true,
          `fixture ${fixture.id}: missing required object ${req.label || `${req.type}@${req.x},${req.y},${req.z}`}`
        );
      }
      for (const deny of (fixture.must_exclude || [])) {
        const found = objects.some((o) => objectMatchesExpectation(o, deny));
        assert.equal(
          found,
          false,
          `fixture ${fixture.id}: forbidden object present ${deny.label || `${deny.type}@${deny.x},${deny.y},${deny.z}`}`
        );
      }
    }

    const anchorSample = await jsonFetch(baseUrl, "/api/world/objects?x=298&y=355&z=0&radius=0&limit=64&projection=anchor", {
      method: "GET",
      headers: { authorization: `Bearer ${token}`, ...runtimeHeaders }
    });
    const footprintSample = await jsonFetch(baseUrl, "/api/world/objects?x=298&y=355&z=0&radius=0&limit=64&projection=footprint", {
      method: "GET",
      headers: { authorization: `Bearer ${token}`, ...runtimeHeaders }
    });
    assert.equal(anchorSample.status, 200);
    assert.equal(footprintSample.status, 200);
    assert.ok(
      (footprintSample.body?.objects || []).length >= (anchorSample.body?.objects || []).length,
      "footprint projection should include at least anchor projection results at same cell/radius"
    );

    const limitRunA = await jsonFetch(baseUrl, "/api/world/objects?x=300&y=353&z=0&radius=12&limit=5&projection=anchor", {
      method: "GET",
      headers: { authorization: `Bearer ${token}` }
    });
    const limitRunB = await jsonFetch(baseUrl, "/api/world/objects?x=300&y=353&z=0&radius=12&limit=5&projection=anchor", {
      method: "GET",
      headers: { authorization: `Bearer ${token}` }
    });
    assert.equal(limitRunA.status, 200);
    assert.equal(limitRunB.status, 200);
    const keysA = (limitRunA.body?.objects || []).map((o: ContractWorldObjectRow) => String(o.object_key || ""));
    const keysB = (limitRunB.body?.objects || []).map((o: ContractWorldObjectRow) => String(o.object_key || ""));
    assert.deepEqual(keysA, keysB, "limited world object query must be deterministic across repeated calls");

    const lifecycleObjects = await jsonFetch(baseUrl, "/api/world/objects?x=300&y=353&z=0&radius=12&limit=4096", {
      method: "GET",
      headers: { authorization: `Bearer ${token}`, ...runtimeHeaders }
    });
    assert.equal(lifecycleObjects.status, 200);
    assert.ok(Array.isArray(lifecycleObjects.body?.objects));
    const typeWeights = loadTypeWeightMap(RUNTIME_DIR);
    const targets = lifecycleObjects.body.objects.filter((o) => (
      coordUseOfStatus(o.status) === OBJ_COORD_USE_LOCXYZ
      && canTakeWorldObject(o, typeWeights)
    ));
    assert.ok(targets.length >= 3, "need at least three LOCXYZ objects for interaction lifecycle contract test");
    const targetKey = String(targets[0].object_key || "");
    const containerKey = String(targets[1].object_key || "");
    const accountAliasTargetKey = String(targets[2].object_key || "");
    assert.ok(targetKey && containerKey && targetKey !== containerKey, "target/container keys must be distinct");
    assert.ok(accountAliasTargetKey && accountAliasTargetKey !== targetKey && accountAliasTargetKey !== containerKey, "account alias target key must be distinct");
    const actorX = Number(targets[0].x) | 0;
    const actorY = Number(targets[0].y) | 0;
    const actorZ = Number(targets[0].z) | 0;

    const aliasCharacter = await jsonFetch(baseUrl, "/api/characters", jsonPost(authHeaders, {
      name: "AccountAliasDrop"
    }));
    assert.equal(aliasCharacter.status, 201);
    const aliasCharacterId = String(aliasCharacter.body?.character_id || "");
    assert.ok(aliasCharacterId, "account alias drop test needs a real character id");

    const aliasTake = await jsonFetch(baseUrl, "/api/world/objects/interact", jsonPost(authHeaders, {
      verb: "take",
      target_key: accountAliasTargetKey,
      actor_id: aliasCharacterId,
      actor_x: Number(targets[2].x) | 0,
      actor_y: Number(targets[2].y) | 0,
      actor_z: Number(targets[2].z) | 0
    }));
    assert.equal(aliasTake.status, 200);
    const aliasHeldKey = String(aliasTake.body?.target?.object_key || "");
    assert.ok(aliasHeldKey && aliasHeldKey !== accountAliasTargetKey, "alias take should create a held clone");
    assert.equal(String(aliasTake.body?.target?.holder_id || ""), aliasCharacterId);

    const aliasDropViaAccountId = await jsonFetch(baseUrl, "/api/world/objects/interact", jsonPost(authHeaders, {
      verb: "drop",
      target_key: aliasHeldKey,
      actor_id: accountUserId,
      actor_x: Number(targets[2].x) | 0,
      actor_y: Number(targets[2].y) | 0,
      actor_z: Number(targets[2].z) | 0
    }));
    assert.equal(aliasDropViaAccountId.status, 200);
    assert.equal(coordUseOfStatus(aliasDropViaAccountId.body?.target?.status), OBJ_COORD_USE_LOCXYZ);
    assert.equal(String(aliasDropViaAccountId.body?.target?.holder_kind || ""), "none");

    async function runInteractionLifecycle() {
      let carriedKey = targetKey;
      const blockedDropWorldObject = await jsonFetch(baseUrl, "/api/world/objects/interact", jsonPost(authHeaders, {
        verb: "drop",
        target_key: targetKey,
        actor_id: "contract-avatar",
        actor_x: actorX,
        actor_y: actorY,
        actor_z: actorZ
      }));
      assert.equal(blockedDropWorldObject.status, 409);
      assert.equal(String(blockedDropWorldObject.body?.error?.code || ""), "object_not_held");

      const missingActorTake = await jsonFetch(baseUrl, "/api/world/objects/interact", jsonPost(authHeaders, {
        verb: "take",
        target_key: targetKey,
        actor_x: actorX,
        actor_y: actorY,
        actor_z: actorZ
      }));
      assert.equal(missingActorTake.status, 400);
      assert.equal(String(missingActorTake.body?.error?.code || ""), "bad_actor_id");

      const take = await jsonFetch(baseUrl, "/api/world/objects/interact", jsonPost(authHeaders, {
        verb: "take",
        target_key: targetKey,
        actor_id: "contract-avatar",
        actor_x: actorX,
        actor_y: actorY,
        actor_z: actorZ
      }));
      assert.equal(take.status, 200);
      assert.equal(coordUseOfStatus(take.body?.target?.status), OBJ_COORD_USE_INVEN);
      assert.equal(String(take.body?.target?.holder_kind || ""), "npc");
      assert.equal(String(take.body?.target?.holder_id || ""), "contract-avatar");
      assert.notEqual(String(take.body?.target?.object_key || ""), targetKey, "baseline take should return a cloned inventory object");
      assert.equal(String(take.body?.target?.source_object_key || ""), targetKey);
      assert.equal(String(take.body?.inventory_item?.object_key || ""), String(take.body?.target?.object_key || ""));
      assert.equal(String(take.body?.respawn?.source_object_key || ""), targetKey);
      assert.equal(Number(take.body?.respawn?.respawn_ms), 10 * 60 * 1000);
      assert.ok(Number(take.body?.interaction_checkpoint?.seq) >= 1);
      assert.ok(String(take.body?.interaction_checkpoint?.hash || "").length > 0);
      assert.equal(take.body?.runtime_contract?.profile, "canonical_plus");
      assert.deepEqual(take.body?.runtime_contract?.extensions, ["housing", "quest_system"]);
      carriedKey = String(take.body?.target?.object_key || "");

      const inventoryAfterTake = await jsonFetch(baseUrl, "/api/world/inventory?actor_id=contract-avatar", {
        method: "GET",
        headers: authHeaders
      });
      assert.equal(inventoryAfterTake.status, 200);
      assert.ok(
        objectKeyList(inventoryAfterTake.body?.objects).includes(carriedKey),
        "taken clone must appear in actor inventory projection"
      );
      assert.equal(
        findObjectByKey(inventoryAfterTake.body?.objects || [], targetKey),
        null,
        "inventory projection must contain the clone, not the baseline source object"
      );

      const afterTakeObjects = await jsonFetch(baseUrl, `/api/world/objects?x=${actorX}&y=${actorY}&z=${actorZ}&radius=0&limit=64&projection=footprint&include_footprint=1`, {
        method: "GET",
        headers: authHeaders
      });
      assert.equal(afterTakeObjects.status, 200);
      assert.equal(
        findObjectByKey(afterTakeObjects.body?.objects || [], targetKey),
        null,
        "taken baseline source object must be absent from world queries until respawn"
      );
      assert.ok(
        (afterTakeObjects.body?.meta?.hidden_objects || []).some((row: ContractWorldObjectRow) => String(row?.object_key || "") === targetKey),
        "taken baseline source object must be advertised as hidden in world-object metadata"
      );

      const equip = await jsonFetch(baseUrl, "/api/world/objects/interact", jsonPost(authHeaders, {
        verb: "equip",
        target_key: carriedKey,
        actor_id: "contract-avatar"
      }));
      assert.equal(equip.status, 200);
      assert.equal(coordUseOfStatus(equip.body?.target?.status), OBJ_COORD_USE_EQUIP);

      const clockForNpcTalk = await jsonFetch(baseUrl, "/api/world/clock", {
        method: "GET",
        headers: authHeaders
      });
      assert.equal(clockForNpcTalk.status, 200);
      assert.ok(Array.isArray(clockForNpcTalk.body?.npc_states));
      assert.ok(
        clockForNpcTalk.body.npc_states.length > 3,
        "expected all scheduled NPC state, not only the castle pilot"
      );
      assert.ok(Array.isArray(clockForNpcTalk.body?.npc_overrides));
      assert.equal(
        clockForNpcTalk.body.npc_overrides.length,
        clockForNpcTalk.body.npc_states.length,
        "npc_overrides should remain a compatibility alias for npc_states"
      );
      assert.equal(String(clockForNpcTalk.body?.intro_state?.phase || ""), "post_intro");
      const npcRows = Array.isArray(clockForNpcTalk.body?.npc_states)
        ? clockForNpcTalk.body.npc_states as ClockNpcStateTestRow[]
        : [];
      const lbNpc = npcRows.find((row) => Number(row?.npc_id) === 5);
      assert.ok(lbNpc, "expected Lord British npc state in clock response");
      assert.equal(Number.isInteger(lbNpc.target_x), true, "scheduled NPC should expose target_x");
      assert.equal(Number.isInteger(lbNpc.action), true, "scheduled NPC should expose action");
      assert.equal(typeof lbNpc.pose, "string", "scheduled NPC should expose render pose");
      const geoffreyNpc = npcRows.find((row) => Number(row?.npc_id) === 7);
      assert.ok(geoffreyNpc, "expected Geoffrey npc state in clock response");
      assert.match(
        String(geoffreyNpc.path_status || ""),
        /^(idle|walking|blocked)$/,
        "Geoffrey should expose a supported canonical schedule path status"
      );
      if (String(geoffreyNpc.path_status || "") === "walking") {
        assert.notEqual(Number(geoffreyNpc.x), Number(geoffreyNpc.target_x), "walking NPC should have a distinct target");
      }

      const introStateGet = await jsonFetch(baseUrl, "/api/world/intro-state", {
        method: "GET",
        headers: authHeaders
      });
      assert.equal(introStateGet.status, 200);
      assert.equal(String(introStateGet.body?.intro_state?.phase || ""), "post_intro");

      const introStatePre = await jsonFetch(baseUrl, "/api/world/intro-state", jsonPut(authHeaders, {
        phase: "pre_intro"
      }));
      assert.equal(introStatePre.status, 200);
      assert.equal(String(introStatePre.body?.intro_state?.phase || ""), "pre_intro");

      const talkStartIntro = await jsonFetch(baseUrl, "/api/world/objects/interact", jsonPost(authHeaders, {
        verb: "talk",
        npc_id: 5,
        actor_id: "contract-avatar",
        actor_x: Number(lbNpc.x) | 0,
        actor_y: Number(lbNpc.y) | 0,
        actor_z: Number(lbNpc.z) | 0,
        player_name: "Avatar"
      }));
      assert.equal(talkStartIntro.status, 200);
      assert.match(
        String((talkStartIntro.body?.conversation_session?.opening_lines || []).join(" ")),
        /Compendium/i,
        "pre-intro LB opening should expose the Compendium challenge"
      );

      const introStatePost = await jsonFetch(baseUrl, "/api/world/intro-state", jsonPut(authHeaders, {
        phase: "post_intro"
      }));
      assert.equal(introStatePost.status, 200);
      assert.equal(String(introStatePost.body?.intro_state?.phase || ""), "post_intro");

      const talkStart = await jsonFetch(baseUrl, "/api/world/objects/interact", jsonPost(authHeaders, {
        verb: "talk",
        npc_id: 5,
        actor_id: "contract-avatar",
        actor_x: Number(lbNpc.x) | 0,
        actor_y: Number(lbNpc.y) | 0,
        actor_z: Number(lbNpc.z) | 0,
        player_name: "Avatar"
      }));
      assert.equal(talkStart.status, 200);
      assert.equal(String(talkStart.body?.conversation_session?.target_name || ""), "Lord British");
      assert.ok(Array.isArray(talkStart.body?.conversation_session?.opening_lines));
      assert.ok(String(talkStart.body?.conversation_session?.session_id || "").length > 0);
      assert.doesNotMatch(
        String((talkStart.body?.conversation_session?.opening_lines || []).join(" ")),
        /\*/,
        "authoritative opening lines should not leak legacy asterisk control markers"
      );

      const talkReplyName = await jsonFetch(baseUrl, "/api/world/conversation/respond", jsonPost(authHeaders, {
        session_id: String(talkStart.body?.conversation_session?.session_id || ""),
        typed: "name"
      }));
      assert.equal(talkReplyName.status, 200);
      assert.ok(Array.isArray(talkReplyName.body?.lines));
      assert.match(String((talkReplyName.body?.lines || []).join(" ")), /I am Lord British/i);

      const talkReplyJob = await jsonFetch(baseUrl, "/api/world/conversation/respond", jsonPost(authHeaders, {
        session_id: String(talkStart.body?.conversation_session?.session_id || ""),
        typed: "job"
      }));
      assert.equal(talkReplyJob.status, 200);
      assert.match(String((talkReplyJob.body?.lines || []).join(" ")), /throne of Britannia/i);

      const putCycle = await jsonFetch(baseUrl, "/api/world/objects/interact", jsonPost(authHeaders, {
        verb: "put",
        target_key: carriedKey,
        container_key: carriedKey,
        actor_id: "contract-avatar"
      }));
      assert.equal(putCycle.status, 409);
      assert.equal(String(putCycle.body?.error?.code || ""), "interaction_container_cycle");
      assert.equal(
        String(putCycle.body?.error?.blocked_by || ""),
        "",
        "self-cycle rejection should not report unrelated blocker key"
      );

      const put = await jsonFetch(baseUrl, "/api/world/objects/interact", jsonPost(authHeaders, {
        verb: "put",
        target_key: carriedKey,
        container_key: containerKey,
        actor_id: "contract-avatar"
      }));
      assert.equal(put.status, 200);
      assert.equal(coordUseOfStatus(put.body?.target?.status), OBJ_COORD_USE_CONTAINED);
      assert.equal(String(put.body?.target?.holder_kind || ""), "object");
      assert.equal(String(put.body?.target?.holder_key || ""), containerKey);
      assert.ok(Array.isArray(put.body?.target?.assoc_chain));
      assert.ok(String(put.body?.target?.root_anchor_key || "").length > 0);

      const takeContainer = await jsonFetch(baseUrl, "/api/world/objects/interact", jsonPost(authHeaders, {
        verb: "take",
        target_key: containerKey,
        actor_id: "contract-avatar",
        actor_x: actorX,
        actor_y: actorY,
        actor_z: actorZ
      }));
      assert.equal(takeContainer.status, 200);
      assert.equal(coordUseOfStatus(takeContainer.body?.target?.status), OBJ_COORD_USE_INVEN);
      assert.equal(String(takeContainer.body?.target?.holder_kind || ""), "npc");
      const carriedContainerKey = String(takeContainer.body?.target?.object_key || "");
      assert.ok(carriedContainerKey && carriedContainerKey !== containerKey, "taken container should be represented by a clone key");

      const blockedTakeContained = await jsonFetch(baseUrl, "/api/world/objects/interact", jsonPost(authHeaders, {
        verb: "take",
        target_key: carriedKey,
        actor_id: "contract-avatar",
        actor_x: actorX,
        actor_y: actorY,
        actor_z: actorZ
      }));
      assert.equal(blockedTakeContained.status, 409);
      assert.equal(blockedTakeContained.body?.error?.code, "interaction_container_blocked");
      assert.equal(
        String(blockedTakeContained.body?.error?.blocked_by || ""),
        `parent-owned:${carriedContainerKey}`,
        "blocked take should surface containing container clone key"
      );

      const dropContainer = await jsonFetch(baseUrl, "/api/world/objects/interact", jsonPost(authHeaders, {
        verb: "drop",
        target_key: carriedContainerKey,
        actor_id: "contract-avatar",
        actor_x: actorX,
        actor_y: actorY,
        actor_z: actorZ
      }));
      assert.equal(dropContainer.status, 200);
      assert.equal(coordUseOfStatus(dropContainer.body?.target?.status), OBJ_COORD_USE_LOCXYZ);

      const takeAgain = await jsonFetch(baseUrl, "/api/world/objects/interact", jsonPost(authHeaders, {
        verb: "take",
        target_key: carriedKey,
        actor_id: "contract-avatar",
        actor_x: actorX,
        actor_y: actorY,
        actor_z: actorZ
      }));
      assert.equal(takeAgain.status, 200);
      assert.equal(coordUseOfStatus(takeAgain.body?.target?.status), OBJ_COORD_USE_INVEN);
      assert.equal(String(takeAgain.body?.target?.holder_kind || ""), "npc");
      assert.equal(Number(takeAgain.body?.target?.despawn_at_ms || 0), 0);
      assert.equal(Number(takeAgain.body?.target?.dropped_at_ms || 0), 0);

      const inventoryAfterTakeAgain = await jsonFetch(baseUrl, "/api/world/inventory?actor_id=contract-avatar", {
        method: "GET",
        headers: authHeaders
      });
      assert.equal(inventoryAfterTakeAgain.status, 200);
      assert.ok(
        objectKeyList(inventoryAfterTakeAgain.body?.objects).includes(carriedKey),
        "re-taken dropped clone must return to actor inventory projection"
      );

      const drop = await jsonFetch(baseUrl, "/api/world/objects/interact", jsonPost(authHeaders, {
        verb: "drop",
        target_key: carriedKey,
        actor_id: "contract-avatar",
        actor_x: actorX,
        actor_y: actorY,
        actor_z: actorZ
      }));
      assert.equal(drop.status, 200);
      assert.equal(coordUseOfStatus(drop.body?.target?.status), OBJ_COORD_USE_LOCXYZ);
      assert.equal(String(drop.body?.target?.holder_kind || ""), "none");
      assert.ok(Number(drop.body?.target?.dropped_at_ms || 0) > 0);
      assert.equal(
        Number(drop.body?.target?.despawn_at_ms || 0) - Number(drop.body?.target?.dropped_at_ms || 0),
        10 * 60 * 1000
      );
      assert.ok(Number(drop.body?.interaction_checkpoint?.seq) >= 7);
      assert.ok(String(drop.body?.interaction_checkpoint?.hash || "").length > 0);

      const inventoryAfterDrop = await jsonFetch(baseUrl, "/api/world/inventory?actor_id=contract-avatar", {
        method: "GET",
        headers: authHeaders
      });
      assert.equal(inventoryAfterDrop.status, 200);
      assert.equal(
        findObjectByKey(inventoryAfterDrop.body?.objects || [], carriedKey),
        null,
        "dropped clone must be removed from actor inventory projection"
      );

      const droppedCellObjects = await jsonFetch(baseUrl, `/api/world/objects?x=${actorX}&y=${actorY}&z=${actorZ}&radius=0&limit=64&projection=footprint&include_footprint=1`, {
        method: "GET",
        headers: authHeaders
      });
      assert.equal(droppedCellObjects.status, 200);
      const droppedClone = findObjectByKey(droppedCellObjects.body?.objects || [], carriedKey);
      assert.ok(droppedClone, "dropped clone must be queryable in the world at its drop cell");
      assert.equal(coordUseOfStatus(droppedClone.status), OBJ_COORD_USE_LOCXYZ);
      assert.equal(String(droppedClone.holder_kind || ""), "none");
      assert.equal(Number(droppedClone.despawn_at_ms || 0), Number(drop.body?.target?.despawn_at_ms || 0));

      return {
        seq: Number(drop.body?.interaction_checkpoint?.seq) | 0,
        hash: String(drop.body?.interaction_checkpoint?.hash || ""),
        carriedKey
      };
    }

    const lifecycleRun1 = await runInteractionLifecycle();

    const worldObjectsAfterLifecycle = await jsonFetch(baseUrl, "/api/world/objects?x=300&y=353&z=0&radius=12&limit=4096", {
      method: "GET",
      headers: { authorization: `Bearer ${token}` }
    });
    assert.equal(worldObjectsAfterLifecycle.status, 200);
    const originalAfter = findObjectByKey(worldObjectsAfterLifecycle.body?.objects, targetKey);
    assert.equal(originalAfter, null, "source object should stay hidden until its respawn timer matures");
    const targetAfter = findObjectByKey(worldObjectsAfterLifecycle.body?.objects, lifecycleRun1.carriedKey);
    assert.ok(targetAfter, "cloned inventory object must remain addressable by object_key after lifecycle");
    assert.equal(coordUseOfStatus(targetAfter.status), OBJ_COORD_USE_LOCXYZ);
    assert.equal(String(targetAfter.holder_kind || ""), "none");
    assert.ok(Number(targetAfter.despawn_at_ms || 0) > Number(targetAfter.dropped_at_ms || 0));

    await stopServer();
    await startServer();

    const worldObjectsAfterRestart = await jsonFetch(baseUrl, "/api/world/objects?x=300&y=353&z=0&radius=12&limit=4096", {
      method: "GET",
      headers: { authorization: `Bearer ${token}` }
    });
    assert.equal(worldObjectsAfterRestart.status, 200);
    assert.equal(
      findObjectByKey(worldObjectsAfterRestart.body?.objects, targetKey),
      null,
      "source object should remain hidden after server restart until its respawn timer matures"
    );
    const cloneAfterRestart = findObjectByKey(worldObjectsAfterRestart.body?.objects, lifecycleRun1.carriedKey);
    assert.ok(cloneAfterRestart, "dropped clone must remain queryable after server restart");
    assert.equal(coordUseOfStatus(cloneAfterRestart.status), OBJ_COORD_USE_LOCXYZ);
    assert.equal(String(cloneAfterRestart.holder_kind || ""), "none");
    assert.equal(String(cloneAfterRestart.source_object_key || ""), targetKey);
    assert.equal(Number(cloneAfterRestart.dropped_at_ms || 0), Number(targetAfter.dropped_at_ms || 0));
    assert.equal(Number(cloneAfterRestart.despawn_at_ms || 0), Number(targetAfter.despawn_at_ms || 0));

    const worldObjectsReset = await jsonFetch(baseUrl, "/api/world/objects/reset", jsonPost(authHeaders, {}));
    assert.equal(worldObjectsReset.status, 200);
    assert.equal(worldObjectsReset.body?.ok, true);
    assert.equal(Number(worldObjectsReset.body?.interaction_checkpoint?.seq), 0);

    const aliasTakeReplay = await jsonFetch(baseUrl, "/api/world/objects/interact", jsonPost(authHeaders, {
      verb: "take",
      target_key: accountAliasTargetKey,
      actor_id: aliasCharacterId,
      actor_x: Number(targets[2].x) | 0,
      actor_y: Number(targets[2].y) | 0,
      actor_z: Number(targets[2].z) | 0
    }));
    assert.equal(aliasTakeReplay.status, 200);
    const aliasHeldReplayKey = String(aliasTakeReplay.body?.target?.object_key || "");
    assert.ok(aliasHeldReplayKey, "alias replay take should create a held clone");
    const aliasDropReplayViaAccountId = await jsonFetch(baseUrl, "/api/world/objects/interact", jsonPost(authHeaders, {
      verb: "drop",
      target_key: aliasHeldReplayKey,
      actor_id: accountUserId,
      actor_x: Number(targets[2].x) | 0,
      actor_y: Number(targets[2].y) | 0,
      actor_z: Number(targets[2].z) | 0
    }));
    assert.equal(aliasDropReplayViaAccountId.status, 200);

    const lifecycleRun2 = await runInteractionLifecycle();
    assert.equal(lifecycleRun2.seq, lifecycleRun1.seq);
    assert.equal(lifecycleRun2.hash, lifecycleRun1.hash, "interaction checkpoint hash should be deterministic across reset+replay");

    const worldObjectsResetAfterReplay = await jsonFetch(baseUrl, "/api/world/objects/reset", jsonPost(authHeaders, {}));
    assert.equal(worldObjectsResetAfterReplay.status, 200);
    assert.equal(worldObjectsResetAfterReplay.body?.ok, true);

    const sendVerify = await jsonFetch(baseUrl, "/api/auth/send-email-verification", jsonPost(authHeaders, {}));
    assert.equal(sendVerify.status, 200);

    const outboxPath = path.join(dataDir, "email_outbox.log");
    const outboxLines = fs.readFileSync(outboxPath, "utf8")
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);
    assert.ok(outboxLines.length >= 1);
    const verifyMail = JSON.parse(outboxLines[outboxLines.length - 1]);
    const matchCode = String(verifyMail?.body_text || "").match(/(\d{6})/);
    assert.ok(matchCode && matchCode[1], "verification email must contain 6-digit code");
    const verifyCode = matchCode[1];

    const verifyEmail = await jsonFetch(baseUrl, "/api/auth/verify-email", jsonPost(authHeaders, { code: verifyCode }));
    assert.equal(verifyEmail.status, 200);
    assert.equal(verifyEmail.body?.user?.email_verified, true);

    const changePassword = await jsonFetch(baseUrl, "/api/auth/change-password", jsonPost(authHeaders, {
      old_password: "quest123",
      new_password: "quest456"
    }));
    assert.equal(changePassword.status, 200);
    assert.equal(changePassword.body?.ok, true);

    const oldPasswordLogin = await jsonFetch(baseUrl, "/api/auth/login", jsonPost(null, {
      username: "avatar",
      password: "quest123"
    }));
    assert.equal(oldPasswordLogin.status, 401);

    const newPasswordLogin = await jsonFetch(baseUrl, "/api/auth/login", jsonPost(null, {
      username: "avatar",
      password: "quest456"
    }));
    assert.equal(newPasswordLogin.status, 200);

    const recovered = await jsonFetch(baseUrl, "/api/auth/recover-password?username=avatar&email=avatar@example.com", {
      method: "GET"
    });
    assert.equal(recovered.status, 200);
    assert.equal(recovered.body?.delivered, true);

    const createChar = await jsonFetch(baseUrl, "/api/characters", jsonPost(authHeaders, { name: "Avatar" }));
    assert.equal(createChar.status, 201);
    assert.ok(createChar.body?.character_id);
    const characterId = createChar.body.character_id;

    const saveSnapshot = await jsonFetch(baseUrl, `/api/characters/${characterId}/snapshot`, jsonPut(authHeaders, {
      schema_version: 1,
      sim_core_version: "test",
      saved_tick: 42,
      snapshot_base64: Buffer.from(JSON.stringify({
        tick: 42,
        inventory: {
          "0x113:0x00": 1,
          "0x117:0x04": 2
        }
      }), "utf8").toString("base64")
    }));
    assert.equal(saveSnapshot.status, 200);
    assert.equal(saveSnapshot.body?.snapshot_meta?.saved_tick, 42);
    assert.ok(saveSnapshot.body?.snapshot_meta?.snapshot_hash);

    const loadSnapshot = await jsonFetch(baseUrl, `/api/characters/${characterId}/snapshot`, {
      method: "GET",
      headers: { authorization: `Bearer ${token}` }
    });
    assert.equal(loadSnapshot.status, 200);
    assert.ok(loadSnapshot.body?.snapshot_base64);
    assert.deepEqual(
      JSON.parse(Buffer.from(String(loadSnapshot.body.snapshot_base64), "base64").toString("utf8")).inventory,
      { "0x113:0x00": 1 }
    );

    const heartbeat = await jsonFetch(baseUrl, "/api/world/presence/heartbeat", jsonPost(authHeaders, {
      session_id: "test-session-1",
      character_name: "Avatar",
      map_x: 307,
      map_y: 347,
      map_z: 0,
      facing_dx: 0,
      facing_dy: 1,
      tick: 42,
      mode: "avatar"
    }));
    assert.equal(heartbeat.status, 200);
    assert.equal(heartbeat.body?.ok, true);
    assert.equal(heartbeat.body?.runtime_contract?.profile, "canonical_plus");
    assert.deepEqual(heartbeat.body?.runtime_contract?.extensions, ["housing", "quest_system"]);

    const heartbeatSecondSession = await jsonFetch(baseUrl, "/api/world/presence/heartbeat", jsonPost(authHeaders, {
      session_id: "test-session-2",
      character_name: "Avatar",
      map_x: 309,
      map_y: 349,
      map_z: 0,
      facing_dx: 1,
      facing_dy: 0,
      tick: 45,
      mode: "avatar"
    }));
    assert.equal(heartbeatSecondSession.status, 200);
    assert.equal(heartbeatSecondSession.body?.ok, true);
    assert.equal(heartbeatSecondSession.body?.runtime_contract?.profile, "canonical_plus");
    assert.deepEqual(heartbeatSecondSession.body?.runtime_contract?.extensions, ["housing", "quest_system"]);

    const presence = await jsonFetch(baseUrl, "/api/world/presence", {
      method: "GET",
      headers: { authorization: `Bearer ${token}` }
    });
    assert.equal(presence.status, 200);
    assert.ok(Array.isArray(presence.body?.players));
    assert.equal(presence.body.players.length, 1);
    assert.equal(presence.body.players[0]?.username, "avatar");
    assert.equal(presence.body.players[0]?.map_x, 309);
    assert.equal(presence.body.players[0]?.session_id, "test-session-2");
    assert.equal(presence.body.players[0]?.runtime_profile, "canonical_plus");
    assert.deepEqual(presence.body.players[0]?.runtime_extensions, ["housing", "quest_system"]);

    const leave = await jsonFetch(baseUrl, "/api/world/presence/leave", jsonPost(authHeaders, {
      session_id: "test-session-2"
    }));
    assert.equal(leave.status, 200);
    assert.equal(leave.body?.ok, true);

    const presenceAfterLeave = await jsonFetch(baseUrl, "/api/world/presence", {
      method: "GET",
      headers: { authorization: `Bearer ${token}` }
    });
    assert.equal(presenceAfterLeave.status, 200);
    assert.ok(Array.isArray(presenceAfterLeave.body?.players));
    assert.equal(presenceAfterLeave.body.players.length, 0);

    const clock1 = await jsonFetch(baseUrl, "/api/world/clock", {
      method: "GET",
      headers: { authorization: `Bearer ${token}`, ...runtimeHeaders }
    });
    assert.equal(clock1.status, 200);
    assert.ok(Number.isInteger(clock1.body?.tick));
    assert.ok(Number.isInteger(clock1.body?.time_h));
    assert.ok(Number.isInteger(clock1.body?.time_m));
    assert.equal(clock1.body?.runtime_contract?.profile, "canonical_plus");
    assert.deepEqual(clock1.body?.runtime_contract?.extensions, ["housing", "quest_system"]);
    await sleep(220);
    const clock2 = await jsonFetch(baseUrl, "/api/world/clock", {
      method: "GET",
      headers: { authorization: `Bearer ${token}`, ...runtimeHeaders }
    });
    assert.equal(clock2.status, 200);
    assert.ok(clock1.body);
    assert.ok(clock2.body);
    assert.ok(clock2.body.tick >= clock1.body.tick);
    assert.ok(Array.isArray(clock2.body?.npc_states));
    assert.ok(clock2.body.npc_states.length > 3);

    const clockDefaultContract = await jsonFetch(baseUrl, "/api/world/clock", {
      method: "GET",
      headers: { authorization: `Bearer ${token}` }
    });
    assert.equal(clockDefaultContract.status, 200);
    assert.equal(clockDefaultContract.body?.runtime_contract?.profile, "canonical_strict");
    assert.deepEqual(clockDefaultContract.body?.runtime_contract?.extensions, []);

    const policy = await jsonFetch(baseUrl, "/api/world/critical-items/policy", {
      method: "GET",
      headers: { authorization: `Bearer ${token}` }
    });
    assert.equal(policy.status, 200);
    assert.ok(Array.isArray(policy.body?.critical_item_policy));

    const maintenance1 = await jsonFetch(baseUrl, "/api/world/critical-items/maintenance", jsonPost(authHeaders, {
      tick: 1000,
      world_items: []
    }));
    assert.equal(maintenance1.status, 200);
    assert.ok(Array.isArray(maintenance1.body?.events));
    assert.equal(maintenance1.body.events.length, 1);

    const maintenance2 = await jsonFetch(baseUrl, "/api/world/critical-items/maintenance", jsonPost(authHeaders, {
      tick: 1001,
      world_items: []
    }));
    assert.equal(maintenance2.status, 200);
    assert.ok(Array.isArray(maintenance2.body?.events));
    assert.equal(maintenance2.body.events.length, 0);
  } finally {
    await stopServer();
    fs.rmSync(tmp, { recursive: true, force: true });
  }

  if (stderr.trim()) {
    process.stdout.write(`net test server stderr:\n${stderr}\n`);
  }
  process.stdout.write("modern/net server contract test passed\n");
}

main().catch((err) => {
  process.stderr.write(`${err?.stack || err}\n`);
  process.exit(1);
});
