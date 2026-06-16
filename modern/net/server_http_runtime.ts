import type { IncomingMessage, ServerResponse } from "node:http";

export const DEFAULT_JSON_RESPONSE_HEADERS: Record<string, string> = {
  "content-type": "application/json; charset=utf-8",
  "cache-control": "no-store",
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET,POST,PUT,OPTIONS",
  "access-control-allow-headers": "content-type,authorization,x-vm-runtime-profile,x-vm-runtime-extensions"
};

export const DEFAULT_CORS_PREFLIGHT_HEADERS: Record<string, string> = {
  "access-control-allow-origin": DEFAULT_JSON_RESPONSE_HEADERS["access-control-allow-origin"],
  "access-control-allow-methods": DEFAULT_JSON_RESPONSE_HEADERS["access-control-allow-methods"],
  "access-control-allow-headers": DEFAULT_JSON_RESPONSE_HEADERS["access-control-allow-headers"],
  "access-control-max-age": "86400"
};

export type JsonResponseLike = Pick<ServerResponse, "end" | "writeHead">;
export type JsonRequestLike = Pick<IncomingMessage, "destroy" | "on">;

export type ReadJsonBodyResultRuntime<T> =
  | { ok: true; body: T }
  | { ok: false };

export function jsonResponseBodyRuntime(value: unknown): string {
  return `${JSON.stringify(value)}\n`;
}

export function sendJsonRuntime(
  res: JsonResponseLike,
  status: number,
  value: unknown
): void {
  res.writeHead(status, DEFAULT_JSON_RESPONSE_HEADERS);
  res.end(jsonResponseBodyRuntime(value));
}

export function sendErrorRuntime(
  res: JsonResponseLike,
  status: number,
  code: string,
  message: string
): void {
  sendJsonRuntime(res, status, {
    error: {
      code,
      message
    }
  });
}

export function sendCorsPreflightRuntime(res: JsonResponseLike): void {
  res.writeHead(204, DEFAULT_CORS_PREFLIGHT_HEADERS);
  res.end();
}

export function readJsonBodyRuntime(
  req: JsonRequestLike,
  maxBodyBytes: number
): Promise<unknown | null> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let size = 0;
    req.on("data", (chunk: Buffer | string) => {
      const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk), "utf8");
      size += buffer.length;
      if (size > maxBodyBytes) {
        reject(new Error("body too large"));
        req.destroy();
        return;
      }
      chunks.push(buffer);
    });
    req.on("end", () => {
      if (!chunks.length) {
        resolve(null);
        return;
      }
      const raw = Buffer.concat(chunks).toString("utf8").trim();
      if (!raw) {
        resolve(null);
        return;
      }
      try {
        resolve(JSON.parse(raw));
      } catch (_err) {
        reject(new Error("invalid json"));
      }
    });
    req.on("error", reject);
  });
}

export async function readJsonBodyOrErrorRuntime<T>(args: {
  req: JsonRequestLike;
  res: JsonResponseLike;
  maxBodyBytes: number;
  coerce: (raw: unknown | null) => T;
  errorMessage?: (err: unknown) => string;
}): Promise<ReadJsonBodyResultRuntime<T>> {
  try {
    return {
      ok: true,
      body: args.coerce(await readJsonBodyRuntime(args.req, args.maxBodyBytes))
    };
  } catch (err) {
    sendErrorRuntime(args.res, 400, "bad_json", args.errorMessage ? args.errorMessage(err) : String(err));
    return { ok: false };
  }
}
