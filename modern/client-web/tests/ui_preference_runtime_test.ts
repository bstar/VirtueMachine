import assert from "node:assert/strict";
import {
  normalizeChoicePreferenceRuntime,
  onOffPreferenceRuntime,
  readStoredChoicePreferenceRuntime,
  readStoredStringPreferenceRuntime,
  writeStoredStringPreferenceRuntime,
  type PreferenceStorageRuntime
} from "../ui/preference_runtime.ts";

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

assert.equal(normalizeChoicePreferenceRuntime("b", "a", ["a", "b"]), "b");
assert.equal(normalizeChoicePreferenceRuntime("c", "a", ["a", "b"]), "a");
assert.equal(normalizeChoicePreferenceRuntime("legacy", "fit", ["fit", "4"], { legacy: "4" }), "4");
assert.equal(normalizeChoicePreferenceRuntime(null, "on", ["on", "off"]), "on");

{
  const storage = memoryStorage({ theme: "moonlit" });
  assert.equal(readStoredStringPreferenceRuntime(storage, "theme", "obsidian"), "moonlit");
  assert.equal(readStoredStringPreferenceRuntime(storage, "missing", "obsidian"), "obsidian");
  assert.equal(readStoredChoicePreferenceRuntime(storage, "theme", "obsidian", ["obsidian", "moonlit"]), "moonlit");
  assert.equal(readStoredChoicePreferenceRuntime(storage, "theme", "obsidian", ["obsidian"]), "obsidian");
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
  assert.equal(readStoredStringPreferenceRuntime(storage, "theme", "obsidian"), "obsidian");
  assert.equal(readStoredChoicePreferenceRuntime(storage, "grid", "off", ["on", "off"]), "off");
  assert.equal(writeStoredStringPreferenceRuntime(storage, "theme", "obsidian"), false);
}

{
  const storage = memoryStorage();
  assert.equal(writeStoredStringPreferenceRuntime(storage, "font", "u6"), true);
  assert.equal(storage.data.font, "u6");
}

assert.equal(onOffPreferenceRuntime(true), "on");
assert.equal(onOffPreferenceRuntime(false), "off");

console.log("ui_preference_runtime_test: ok");
