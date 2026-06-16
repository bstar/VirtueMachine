import assert from "node:assert/strict";
import {
  applyAnimationModePreferenceRuntime,
  applyAnimationModePreferenceStateRuntime,
  applyBooleanTogglePreferenceRuntime,
  applyBooleanTogglePreferenceStateRuntime,
  applyFontPreferenceRuntime,
  applyMovementModePreferenceRuntime,
  applyMovementModePreferenceStateRuntime,
  applyNamedPreferenceRuntime,
  applyPaletteFxPreferenceStateRuntime,
  applyThemePreferenceRuntime,
  animationModePreferenceModelRuntime,
  booleanTogglePreferenceModelRuntime,
  fontPreferenceModelRuntime,
  initBooleanTogglePreferenceRuntime,
  initChoicePreferenceRuntime,
  initPreferenceControlsRuntime,
  initPreferenceGroupRuntime,
  legacyScaleModePreferenceModelRuntime,
  movementModePreferenceModelRuntime,
  namedPreferenceModelRuntime,
  nextLegacyScaleModeRuntime,
  normalizeChoicePreferenceRuntime,
  onOffPreferenceRuntime,
  readStoredChoicePreferenceRuntime,
  readStoredStringPreferenceRuntime,
  themePreferenceModelRuntime,
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
  const calls: string[] = [];
  const out = initPreferenceGroupRuntime([
    () => {
      calls.push("grid");
      return { key: "grid", enabled: true };
    },
    () => {
      calls.push("movement");
      return { key: "movement", value: "avatar" };
    }
  ]);
  assert.deepEqual(calls, ["grid", "movement"]);
  assert.deepEqual(out, [
    { key: "grid", enabled: true },
    { key: "movement", value: "avatar" }
  ]);
}

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
assert.deepEqual(booleanTogglePreferenceModelRuntime(true), {
  enabled: true,
  value: "on"
});
assert.deepEqual(booleanTogglePreferenceModelRuntime(0), {
  enabled: false,
  value: "off"
});
{
  const storage = memoryStorage();
  const select = { value: "" };
  assert.deepEqual(applyBooleanTogglePreferenceRuntime({
    enabled: true,
    key: "grid",
    select,
    storage
  }), {
    enabled: true,
    stored: true,
    value: "on"
  });
  assert.equal(select.value, "on");
  assert.equal(storage.data.grid, "on");
}
{
  const storage: PreferenceStorageRuntime = {
    getItem() {
      return null;
    },
    setItem() {
      throw new Error("blocked");
    }
  };
  const select = { value: "" };
  assert.deepEqual(applyBooleanTogglePreferenceRuntime({
    enabled: false,
    key: "grid",
    select,
    storage
  }), {
    enabled: false,
    stored: false,
    value: "off"
  });
  assert.equal(select.value, "off");
}
{
  const storage = memoryStorage({ grid: "on" });
  const applied: boolean[] = [];
  let listener: (() => void) | null = null;
  const select = {
    value: "off",
    addEventListener(type: "change", fn: () => void) {
      assert.equal(type, "change");
      listener = fn;
    }
  };
  assert.deepEqual(initBooleanTogglePreferenceRuntime({
    fallback: "off",
    key: "grid",
    onApply: (enabled) => applied.push(enabled),
    select,
    storage
  }), {
    bound: true,
    initialEnabled: true,
    initialValue: "on"
  });
  assert.deepEqual(applied, [true]);
  select.value = "off";
  listener?.();
  assert.deepEqual(applied, [true, false]);
}
{
  const applied: boolean[] = [];
  assert.deepEqual(initBooleanTogglePreferenceRuntime({
    fallback: "on",
    key: "palette",
    onApply: (enabled) => applied.push(enabled),
    select: null,
    storage: memoryStorage({ palette: "bad" })
  }), {
    bound: false,
    initialEnabled: true,
    initialValue: "on"
  });
  assert.deepEqual(applied, [true]);
}
{
  const storage = memoryStorage();
  const select = { value: "" };
  const state = { showGrid: false, showOverlayDebug: true };
  assert.deepEqual(applyBooleanTogglePreferenceStateRuntime({
    enabled: true,
    key: "grid",
    select,
    state,
    stateKey: "showGrid",
    storage
  }), {
    enabled: true,
    stored: true,
    value: "on"
  });
  assert.deepEqual(state, {
    showGrid: true,
    showOverlayDebug: true
  });
  assert.equal(select.value, "on");
  assert.equal(storage.data.grid, "on");
}
{
  const storage = memoryStorage({ scale: "native" });
  const applied: string[] = [];
  let listener: (() => void) | null = null;
  const select = {
    value: "fit",
    addEventListener(type: "change", fn: () => void) {
      assert.equal(type, "change");
      listener = fn;
    }
  };
  assert.deepEqual(initChoicePreferenceRuntime({
    aliases: { native: "4" },
    allowed: ["fit", "4"],
    fallback: "fit",
    key: "scale",
    onApply: (value) => applied.push(value),
    select,
    storage
  }), {
    bound: true,
    initialValue: "4"
  });
  assert.deepEqual(applied, ["4"]);
  select.value = "bad";
  listener?.();
  assert.deepEqual(applied, ["4", "fit"]);
  select.value = "4";
  listener?.();
  assert.deepEqual(applied, ["4", "fit", "4"]);
}
{
  const applied: string[] = [];
  assert.deepEqual(initChoicePreferenceRuntime({
    allowed: ["avatar", "ghost"],
    fallback: "avatar",
    key: "movement",
    onApply: (value) => applied.push(value),
    select: null,
    storage: memoryStorage({ movement: "ghost" })
  }), {
    bound: false,
    initialValue: "ghost"
  });
  assert.deepEqual(applied, ["ghost"]);
}
{
  const storage = memoryStorage({
    grid: "on",
    movement: "ghost"
  });
  const calls: string[] = [];
  let gridListener: (() => void) | null = null;
  let movementListener: (() => void) | null = null;
  const gridSelect = {
    value: "off",
    addEventListener(type: "change", fn: () => void) {
      assert.equal(type, "change");
      gridListener = fn;
    }
  };
  const movementSelect = {
    value: "avatar",
    addEventListener(type: "change", fn: () => void) {
      assert.equal(type, "change");
      movementListener = fn;
    }
  };
  assert.deepEqual(initPreferenceControlsRuntime({
    storage,
    booleans: [{
      key: "grid",
      fallback: "off",
      select: gridSelect,
      onApply: (enabled) => calls.push(`grid:${enabled ? "on" : "off"}`)
    }],
    choices: [{
      key: "movement",
      fallback: "avatar",
      allowed: ["avatar", "ghost"],
      select: movementSelect,
      onApply: (value) => calls.push(`movement:${value}`)
    }]
  }), {
    booleans: [{
      bound: true,
      initialEnabled: true,
      initialValue: "on"
    }],
    choices: [{
      bound: true,
      initialValue: "ghost"
    }]
  });
  assert.deepEqual(calls, ["grid:on", "movement:ghost"]);
  gridSelect.value = "off";
  gridListener?.();
  movementSelect.value = "avatar";
  movementListener?.();
  assert.deepEqual(calls, ["grid:on", "movement:ghost", "grid:off", "movement:avatar"]);
}
assert.deepEqual(animationModePreferenceModelRuntime("freeze", 123), {
  animationFrozen: true,
  frozenAnimationTick: 123,
  value: "freeze"
});
assert.deepEqual(animationModePreferenceModelRuntime("bad", 123), {
  animationFrozen: false,
  frozenAnimationTick: null,
  value: "live"
});
{
  const storage = memoryStorage();
  const select = { value: "" };
  assert.deepEqual(applyAnimationModePreferenceRuntime({
    mode: "freeze",
    currentTick: 321,
    key: "animation",
    select,
    storage
  }), {
    animationFrozen: true,
    frozenAnimationTick: 321,
    stored: true,
    value: "freeze"
  });
  assert.equal(select.value, "freeze");
  assert.equal(storage.data.animation, "freeze");
}
{
  const storage = memoryStorage();
  const select = { value: "" };
  const state = {
    animationFrozen: false,
    frozenAnimationTick: null
  };
  assert.deepEqual(applyAnimationModePreferenceStateRuntime({
    mode: "freeze",
    currentTick: 456,
    key: "animation",
    select,
    state,
    storage
  }), {
    animationFrozen: true,
    frozenAnimationTick: 456,
    stored: true,
    value: "freeze"
  });
  assert.deepEqual(state, {
    animationFrozen: true,
    frozenAnimationTick: 456
  });
  assert.equal(select.value, "freeze");
  assert.equal(storage.data.animation, "freeze");
  assert.deepEqual(applyAnimationModePreferenceStateRuntime({
    mode: "live",
    currentTick: 789,
    key: "animation",
    select,
    state,
    storage
  }), {
    animationFrozen: false,
    frozenAnimationTick: null,
    stored: true,
    value: "live"
  });
  assert.deepEqual(state, {
    animationFrozen: false,
    frozenAnimationTick: null
  });
  assert.equal(select.value, "live");
  assert.equal(storage.data.animation, "live");
}
{
  const storage: PreferenceStorageRuntime = {
    getItem() {
      return null;
    },
    setItem() {
      throw new Error("blocked");
    }
  };
  const select = { value: "" };
  assert.deepEqual(applyAnimationModePreferenceRuntime({
    mode: "bad",
    currentTick: 321,
    key: "animation",
    select,
    storage
  }), {
    animationFrozen: false,
    frozenAnimationTick: null,
    stored: false,
    value: "live"
  });
  assert.equal(select.value, "live");
}
assert.deepEqual(movementModePreferenceModelRuntime("avatar"), {
  movementMode: "avatar",
  statText: "avatar",
  targetVerb: null,
  useCursorActive: null,
  value: "avatar"
});
assert.deepEqual(movementModePreferenceModelRuntime("bad"), {
  movementMode: "ghost",
  statText: "ghost",
  targetVerb: "",
  useCursorActive: false,
  value: "ghost"
});
{
  const storage = memoryStorage();
  const select = { value: "" };
  assert.deepEqual(applyMovementModePreferenceRuntime({
    mode: "avatar",
    key: "movement",
    select,
    storage
  }), {
    movementMode: "avatar",
    statText: "avatar",
    targetVerb: null,
    useCursorActive: null,
    value: "avatar",
    stored: true
  });
  assert.equal(select.value, "avatar");
  assert.equal(storage.data.movement, "avatar");
}
{
  const storage: PreferenceStorageRuntime = {
    getItem() {
      return null;
    },
    setItem() {
      throw new Error("blocked");
    }
  };
  const select = { value: "" };
  assert.deepEqual(applyMovementModePreferenceRuntime({
    mode: "bad",
    key: "movement",
    select,
    storage
  }), {
    movementMode: "ghost",
    statText: "ghost",
    targetVerb: "",
    useCursorActive: false,
    value: "ghost",
    stored: false
  });
  assert.equal(select.value, "ghost");
}
{
  const storage = memoryStorage();
  const select = { value: "" };
  const statAvatarState = { textContent: "" };
  const state = {
    movementMode: "avatar",
    targetVerb: "get",
    useCursorActive: true
  };
  assert.deepEqual(applyMovementModePreferenceStateRuntime({
    mode: "ghost",
    key: "movement",
    select,
    statAvatarState,
    state,
    storage
  }), {
    movementMode: "ghost",
    statText: "ghost",
    targetVerb: "",
    useCursorActive: false,
    value: "ghost",
    stored: true
  });
  assert.deepEqual(state, {
    movementMode: "ghost",
    targetVerb: "",
    useCursorActive: false
  });
  assert.equal(statAvatarState.textContent, "ghost");
  assert.equal(select.value, "ghost");
  assert.equal(storage.data.movement, "ghost");

  state.targetVerb = "look";
  state.useCursorActive = true;
  assert.deepEqual(applyMovementModePreferenceStateRuntime({
    mode: "avatar",
    key: "movement",
    select,
    statAvatarState,
    state,
    storage
  }), {
    movementMode: "avatar",
    statText: "avatar",
    targetVerb: null,
    useCursorActive: null,
    value: "avatar",
    stored: true
  });
  assert.deepEqual(state, {
    movementMode: "avatar",
    targetVerb: "look",
    useCursorActive: true
  });
  assert.equal(statAvatarState.textContent, "avatar");
}
assert.deepEqual(legacyScaleModePreferenceModelRuntime("2", ["fit", "1", "2", "3", "4"], "fit"), {
  legacyScaleMode: "2",
  value: "2"
});
assert.deepEqual(legacyScaleModePreferenceModelRuntime("bad", ["fit", "1", "2", "3", "4"], "fit"), {
  legacyScaleMode: "fit",
  value: "fit"
});
{
  const storage = memoryStorage();
  const select = { value: "" };
  const state = {
    enablePaletteFx: false,
    paletteFrameTick: 123,
    paletteFrame: { stale: true }
  };
  assert.deepEqual(applyPaletteFxPreferenceStateRuntime({
    enabled: true,
    key: "palette",
    select,
    state,
    storage
  }), {
    enabled: true,
    stored: true,
    value: "on"
  });
  assert.deepEqual(state, {
    enablePaletteFx: true,
    paletteFrameTick: -1,
    paletteFrame: null
  });
  assert.equal(select.value, "on");
  assert.equal(storage.data.palette, "on");
}
assert.equal(nextLegacyScaleModeRuntime("fit", 1, ["fit", "1", "2", "3", "4"], "fit"), "1");
assert.equal(nextLegacyScaleModeRuntime("fit", -1, ["fit", "1", "2", "3", "4"], "fit"), "4");
assert.equal(nextLegacyScaleModeRuntime("bad", 2, ["fit", "1", "2", "3", "4"], "fit"), "2");
assert.deepEqual(namedPreferenceModelRuntime("sans", ["sans", "silkscreen"], "silkscreen"), {
  value: "sans"
});
assert.deepEqual(namedPreferenceModelRuntime("bad", ["sans", "silkscreen"], "silkscreen"), {
  value: "silkscreen"
});
{
  const storage = memoryStorage();
  const select = { value: "" };
  assert.deepEqual(applyNamedPreferenceRuntime({
    value: "sans",
    allowed: ["sans", "silkscreen"],
    fallback: "silkscreen",
    key: "font",
    select,
    storage
  }), {
    stored: true,
    value: "sans"
  });
  assert.equal(select.value, "sans");
  assert.equal(storage.data.font, "sans");
}
{
  const storage: PreferenceStorageRuntime = {
    getItem() {
      return null;
    },
    setItem() {
      throw new Error("blocked");
    }
  };
  const select = { value: "" };
  assert.deepEqual(applyNamedPreferenceRuntime({
    value: "bad",
    allowed: ["sans", "silkscreen"],
    fallback: "silkscreen",
    key: "font",
    select,
    storage
  }), {
    stored: false,
    value: "silkscreen"
  });
  assert.equal(select.value, "silkscreen");
}
assert.deepEqual(fontPreferenceModelRuntime("u6", ["silkscreen", "u6"], "silkscreen"), {
  font: "u6",
  value: "u6"
});
assert.deepEqual(fontPreferenceModelRuntime("bad", ["silkscreen", "u6"], "silkscreen"), {
  font: "silkscreen",
  value: "silkscreen"
});
{
  const storage = memoryStorage();
  const attrs: Record<string, string> = {};
  const documentElement = {
    setAttribute(name: string, value: string) {
      attrs[name] = value;
    }
  };
  const select = { value: "" };
  assert.deepEqual(applyFontPreferenceRuntime({
    font: "u6",
    allowedFonts: ["silkscreen", "u6"],
    fallback: "silkscreen",
    key: "font",
    documentElement,
    select,
    storage
  }), {
    font: "u6",
    value: "u6",
    stored: true
  });
  assert.equal(attrs["data-font"], "u6");
  assert.equal(select.value, "u6");
  assert.equal(storage.data.font, "u6");
}
{
  const storage: PreferenceStorageRuntime = {
    getItem() {
      return null;
    },
    setItem() {
      throw new Error("blocked");
    }
  };
  const attrs: Record<string, string> = {};
  const documentElement = {
    setAttribute(name: string, value: string) {
      attrs[name] = value;
    }
  };
  const select = { value: "" };
  assert.deepEqual(applyFontPreferenceRuntime({
    font: "bad",
    allowedFonts: ["silkscreen", "u6"],
    fallback: "silkscreen",
    key: "font",
    documentElement,
    select,
    storage
  }), {
    font: "silkscreen",
    value: "silkscreen",
    stored: false
  });
  assert.equal(attrs["data-font"], "silkscreen");
  assert.equal(select.value, "silkscreen");
}
assert.deepEqual(themePreferenceModelRuntime("moonlit", ["obsidian", "moonlit"], "obsidian"), {
  theme: "moonlit",
  value: "moonlit",
  wikiHref: "/docs/wiki/?theme=moonlit"
});
assert.deepEqual(themePreferenceModelRuntime("bad value", ["obsidian", "moonlit"], "obsidian", "/docs/"), {
  theme: "obsidian",
  value: "obsidian",
  wikiHref: "/docs/?theme=obsidian"
});
{
  const storage = memoryStorage();
  const attrs: Record<string, string> = {};
  const documentElement = {
    setAttribute(name: string, value: string) {
      attrs[name] = value;
    }
  };
  const select = { value: "" };
  const wikiLink = { href: "" };
  assert.deepEqual(applyThemePreferenceRuntime({
    theme: "moonlit",
    allowedThemes: ["obsidian", "moonlit"],
    fallback: "obsidian",
    key: "theme",
    documentElement,
    select,
    wikiLink,
    storage
  }), {
    theme: "moonlit",
    value: "moonlit",
    wikiHref: "/docs/wiki/?theme=moonlit",
    stored: true
  });
  assert.equal(attrs["data-theme"], "moonlit");
  assert.equal(select.value, "moonlit");
  assert.equal(wikiLink.href, "/docs/wiki/?theme=moonlit");
  assert.equal(storage.data.theme, "moonlit");
}
{
  const storage: PreferenceStorageRuntime = {
    getItem() {
      return null;
    },
    setItem() {
      throw new Error("blocked");
    }
  };
  const attrs: Record<string, string> = {};
  const model = applyThemePreferenceRuntime({
    theme: "bad",
    allowedThemes: ["obsidian", "moonlit"],
    fallback: "obsidian",
    key: "theme",
    documentElement: {
      setAttribute(name: string, value: string) {
        attrs[name] = value;
      }
    },
    storage
  });
  assert.equal(model.theme, "obsidian");
  assert.equal(model.stored, false);
  assert.equal(attrs["data-theme"], "obsidian");
}

console.log("ui_preference_runtime_test: ok");
