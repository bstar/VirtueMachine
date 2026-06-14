import fs from "node:fs";

export type JsonValueRuntime =
  | null
  | boolean
  | number
  | string
  | JsonValueRuntime[]
  | { [key: string]: JsonValueRuntime };

export function ensureServerDataDirRuntime(dataDir: string): void {
  fs.mkdirSync(dataDir, { recursive: true });
}

export function readJsonFileRuntime<T>(filePath: string, fallback: T): T {
  return readJsonFileValidatedRuntime(filePath, fallback);
}

export function readJsonFileValidatedRuntime<T>(
  filePath: string,
  fallback: T,
  validate?: (value: unknown) => T | null | undefined
): T {
  try {
    const raw = fs.readFileSync(filePath, "utf8");
    const parsed = JSON.parse(raw) as unknown;
    if (validate) {
      return validate(parsed) ?? fallback;
    }
    return parsed as T;
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

export function readJsonLinesRuntime(filePath: string): JsonValueRuntime[] {
  try {
    const raw = fs.readFileSync(filePath, "utf8");
    const lines = raw.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
    const parsed: JsonValueRuntime[] = [];
    for (const line of lines) {
      try {
        parsed.push(JSON.parse(line) as JsonValueRuntime);
      } catch (_err) {
        // Keep append-only logs resilient to partial or manually edited lines.
      }
    }
    return parsed;
  } catch (_err) {
    return [];
  }
}
