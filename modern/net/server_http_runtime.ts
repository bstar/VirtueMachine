import type { IncomingMessage, ServerResponse } from "node:http";

export const DEFAULT_JSON_RESPONSE_HEADERS: Record<string, string> = {
  "content-type": "application/json; charset=utf-8",
  "cache-control": "no-store",
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET,POST,PUT,OPTIONS",
  "access-control-allow-headers": "content-type,authorization,x-vm-runtime-profile,x-vm-runtime-extensions"
};

export type JsonResponseLike = Pick<ServerResponse, "end" | "writeHead">;
export type JsonRequestLike = Pick<IncomingMessage, "destroy" | "on">;

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
