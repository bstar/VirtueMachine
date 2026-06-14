import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  appendJsonLineRuntime,
  ensureServerDataDirRuntime,
  readJsonFileRuntime,
  readJsonFileValidatedRuntime,
  readJsonLinesRuntime,
  writeJsonFileRuntime
} from "../server_file_store.ts";

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "vm-server-file-store-"));
try {
  const dataDir = path.join(tmp, "data", "nested");
  ensureServerDataDirRuntime(dataDir);
  assert.equal(fs.statSync(dataDir).isDirectory(), true);

  const jsonPath = path.join(dataDir, "state.json");
  assert.deepEqual(readJsonFileRuntime(jsonPath, { fallback: true }), { fallback: true });

  writeJsonFileRuntime(jsonPath, { b: 2, a: [1] });
  assert.equal(fs.readFileSync(jsonPath, "utf8"), "{\n  \"b\": 2,\n  \"a\": [\n    1\n  ]\n}\n");
  assert.deepEqual(readJsonFileRuntime(jsonPath, null), { b: 2, a: [1] });

  fs.writeFileSync(jsonPath, "{bad", "utf8");
  assert.deepEqual(readJsonFileRuntime(jsonPath, { fallback: "bad-json" }), { fallback: "bad-json" });

  fs.writeFileSync(jsonPath, "{\"items\":[1,2]}\n", "utf8");
  assert.deepEqual(
    readJsonFileValidatedRuntime(jsonPath, { items: [] as number[] }, (value) => {
      if (!value || typeof value !== "object" || !Array.isArray((value as { items?: unknown }).items)) {
        return null;
      }
      return { items: (value as { items: number[] }).items };
    }),
    { items: [1, 2] }
  );
  fs.writeFileSync(jsonPath, "{\"items\":\"corrupt\"}\n", "utf8");
  assert.deepEqual(
    readJsonFileValidatedRuntime(jsonPath, { items: [9] }, (value) => {
      if (!value || typeof value !== "object" || !Array.isArray((value as { items?: unknown }).items)) {
        return null;
      }
      return { items: (value as { items: number[] }).items };
    }),
    { items: [9] }
  );

  const logPath = path.join(dataDir, "events.log");
  appendJsonLineRuntime(logPath, { seq: 1 });
  fs.appendFileSync(logPath, "not-json\n", "utf8");
  appendJsonLineRuntime(logPath, { seq: 2 });
  assert.deepEqual(readJsonLinesRuntime(logPath), [{ seq: 1 }, { seq: 2 }]);
  assert.deepEqual(readJsonLinesRuntime(path.join(dataDir, "missing.log")), []);
} finally {
  fs.rmSync(tmp, { recursive: true, force: true });
}

console.log("server_file_store_test: ok");
