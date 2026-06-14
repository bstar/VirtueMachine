import fs from "node:fs";

export function ensureServerDataDirRuntime(dataDir: string): void {
  fs.mkdirSync(dataDir, { recursive: true });
}

export function readJsonFileRuntime<T>(filePath: string, fallback: T): T {
  try {
    const raw = fs.readFileSync(filePath, "utf8");
    return JSON.parse(raw) as T;
  } catch (_err) {
    return fallback;
  }
}

export function writeJsonFileRuntime(filePath: string, value: unknown): void {
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

export function appendJsonLineRuntime(filePath: string, value: unknown): void {
  fs.appendFileSync(filePath, `${JSON.stringify(value)}\n`, "utf8");
}

export function readJsonLinesRuntime(filePath: string): unknown[] {
  try {
    const raw = fs.readFileSync(filePath, "utf8");
    const lines = raw.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
    const parsed: unknown[] = [];
    for (const line of lines) {
      try {
        parsed.push(JSON.parse(line));
      } catch (_err) {
        // Keep append-only logs resilient to partial or manually edited lines.
      }
    }
    return parsed;
  } catch (_err) {
    return [];
  }
}
