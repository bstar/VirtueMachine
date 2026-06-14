import assert from "node:assert/strict";
import {
  persistRuntimeProfileConfigRuntime,
  resolveRuntimeProfileConfigRuntime
} from "../net/runtime_profile_config_runtime.ts";
import type { PreferenceStorageRuntime } from "../ui/preference_runtime.ts";

const keys = {
  profileKey: "profile",
  extensionsKey: "extensions"
};

function memoryStorage(seed: Record<string, string> = {}): PreferenceStorageRuntime & {
  data: Record<string, string>;
} {
  return {
    data: { ...seed },
    getItem(key: string) {
      return Object.prototype.hasOwnProperty.call(this.data, key) ? this.data[key] : null;
    },
    setItem(key: string, value: string) {
      this.data[key] = value;
    }
  };
}

assert.deepEqual(resolveRuntimeProfileConfigRuntime({ keys }), {
  profile: "canonical_strict",
  extensions: {
    quest_system: false,
    party_mmo: false,
    housing: false,
    crafting: false,
    farming: false
  }
});

{
  const storage = memoryStorage({
    profile: "canonical_plus",
    extensions: JSON.stringify({ quest_system: true, housing: true, unknown: true })
  });
  assert.deepEqual(resolveRuntimeProfileConfigRuntime({ keys, storage }), {
    profile: "canonical_plus",
    extensions: {
      quest_system: true,
      party_mmo: false,
      housing: true,
      crafting: false,
      farming: false
    }
  });
}

{
  const storage = memoryStorage({
    profile: "bad-profile",
    extensions: "{"
  });
  assert.deepEqual(resolveRuntimeProfileConfigRuntime({
    keys,
    storage,
    locationSearch: "?profile=canonical_plus&ext=crafting,farming,unknown"
  }), {
    profile: "canonical_plus",
    extensions: {
      quest_system: false,
      party_mmo: false,
      housing: false,
      crafting: true,
      farming: true
    }
  });
}

{
  const storage = memoryStorage();
  assert.equal(persistRuntimeProfileConfigRuntime(storage, keys, {
    profile: "canonical_plus",
    extensions: {
      quest_system: true,
      party_mmo: false,
      housing: false,
      crafting: false,
      farming: true
    }
  }), true);
  assert.equal(storage.data.profile, "canonical_plus");
  assert.equal(storage.data.extensions, JSON.stringify({
    quest_system: true,
    party_mmo: false,
    housing: false,
    crafting: false,
    farming: true
  }));
}

{
  const storage: PreferenceStorageRuntime = {
    getItem() {
      throw new Error("blocked");
    },
    setItem() {
      throw new Error("blocked");
    }
  };
  assert.equal(resolveRuntimeProfileConfigRuntime({ keys, storage }).profile, "canonical_strict");
  assert.equal(persistRuntimeProfileConfigRuntime(storage, keys, resolveRuntimeProfileConfigRuntime({ keys })), false);
}

console.log("net_runtime_profile_config_runtime_test: ok");
