import assert from "node:assert/strict";
import {
  DEFAULT_RUNTIME_EXTENSIONS,
  RUNTIME_PROFILES,
  createDefaultRuntimeExtensions,
  normalizeRuntimeProfile,
  parseRuntimeExtensionListCsv,
  parseRuntimeExtensionsHeader,
  runtimeExtensionsSummary,
  sanitizeRuntimeExtensions
} from "../runtime_contract.mjs";

function testProfiles() {
  assert.deepEqual(RUNTIME_PROFILES, ["canonical_strict", "canonical_plus"]);
  assert.equal(normalizeRuntimeProfile("canonical_strict"), "canonical_strict");
  assert.equal(normalizeRuntimeProfile("CANONICAL_PLUS"), "canonical_plus");
  assert.equal(normalizeRuntimeProfile("unknown_mode"), "canonical_strict");
}

function testExtensionsHeaderParsing() {
  assert.deepEqual(parseRuntimeExtensionsHeader("none"), []);
  assert.deepEqual(parseRuntimeExtensionsHeader(""), []);
  assert.deepEqual(
    parseRuntimeExtensionsHeader("quest_system,housing,quest_system, bad-token!,party_mmo"),
    ["housing", "party_mmo", "quest_system"]
  );
}

function testExtensionsObjectSanitization() {
  const raw = {
    quest_system: 1,
    housing: true,
    farming: "yes",
    extra_unknown: true
  };
  const sane = sanitizeRuntimeExtensions(raw);
  assert.deepEqual(sane, {
    quest_system: true,
    party_mmo: false,
    housing: true,
    crafting: false,
    farming: true
  });
}

function testCsvRoundtrip() {
  const out = parseRuntimeExtensionListCsv("quest_system,housing");
  assert.equal(out.quest_system, true);
  assert.equal(out.housing, true);
  assert.equal(out.party_mmo, false);
  assert.deepEqual(runtimeExtensionsSummary(out), ["housing", "quest_system"]);
}

function testDefaults() {
  assert.deepEqual(DEFAULT_RUNTIME_EXTENSIONS, {
    quest_system: false,
    party_mmo: false,
    housing: false,
    crafting: false,
    farming: false
  });
  assert.deepEqual(createDefaultRuntimeExtensions(), DEFAULT_RUNTIME_EXTENSIONS);
}

testProfiles();
testExtensionsHeaderParsing();
testExtensionsObjectSanitization();
testCsvRoundtrip();
testDefaults();

console.log("runtime_contract_test: ok");
