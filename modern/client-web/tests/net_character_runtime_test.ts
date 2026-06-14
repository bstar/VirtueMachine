import assert from "node:assert/strict";
import {
  characterPayloadsFromJsonRuntime,
  performNetEnsureCharacter
} from "../net/character_runtime.ts";

assert.deepEqual(characterPayloadsFromJsonRuntime(null), []);
assert.equal(characterPayloadsFromJsonRuntime([
  { character_id: "c1", name: "Avatar" },
  null,
  "bad"
]).length, 1);

{
  const calls: string[] = [];
  const out = await performNetEnsureCharacter("Avatar", async (route, init, auth) => {
    calls.push(`${init?.method}:${route}:${auth}`);
    return {
      characters: [
        { character_id: "c1", name: "Avatar" }
      ]
    };
  });
  assert.deepEqual(calls, ["GET:/api/characters:true"]);
  assert.deepEqual(out, { characterId: "c1", characterName: "Avatar" });
}

{
  const calls: string[] = [];
  const out = await performNetEnsureCharacter("Dupre", async (route, init, auth) => {
    calls.push(`${init?.method}:${route}:${auth}`);
    if (init?.method === "GET") {
      return { characters: [null, "bad"] };
    }
    assert.deepEqual(JSON.parse(String(init?.body || "{}")), { name: "Dupre" });
    return { character_id: "c2", name: "Dupre" };
  });
  assert.deepEqual(calls, ["GET:/api/characters:true", "POST:/api/characters:true"]);
  assert.deepEqual(out, { characterId: "c2", characterName: "Dupre" });
}

{
  const calls: string[] = [];
  const out = await performNetEnsureCharacter("", async (route, init, auth) => {
    calls.push(`${init?.method}:${route}:${auth}`);
    if (init?.method === "GET") {
      return null;
    }
    return { character_id: "c3" };
  });
  assert.deepEqual(calls, ["GET:/api/characters:true", "POST:/api/characters:true"]);
  assert.deepEqual(out, { characterId: "c3", characterName: "Avatar" });
}

console.log("net_character_runtime_test: ok");
