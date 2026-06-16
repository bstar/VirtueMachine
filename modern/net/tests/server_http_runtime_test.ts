import assert from "node:assert/strict";
import { PassThrough } from "node:stream";
import {
  DEFAULT_CORS_PREFLIGHT_HEADERS,
  DEFAULT_JSON_RESPONSE_HEADERS,
  jsonResponseBodyRuntime,
  readJsonBodyOrErrorRuntime,
  readJsonBodyRuntime,
  sendCorsPreflightRuntime,
  sendErrorRuntime,
  sendJsonRuntime,
  type JsonRequestLike,
  type JsonResponseLike
} from "../server_http_runtime.ts";

function makeResponseRecorder() {
  const calls: {
    body: string;
    headers: Record<string, string>;
    status: number;
  } = {
    body: "",
    headers: {},
    status: 0
  };
  const res = {
    writeHead(status: number, headers: Record<string, string>) {
      calls.status = status;
      calls.headers = headers;
      return res;
    },
    end(body: string) {
      calls.body = body;
      return res;
    }
  } as unknown as JsonResponseLike;
  return { calls, res };
}

assert.equal(jsonResponseBodyRuntime({ ok: true }), "{\"ok\":true}\n");

{
  const { calls, res } = makeResponseRecorder();
  sendJsonRuntime(res, 201, { created: true });
  assert.equal(calls.status, 201);
  assert.deepEqual(calls.headers, DEFAULT_JSON_RESPONSE_HEADERS);
  assert.equal(calls.body, "{\"created\":true}\n");
}

{
  const { calls, res } = makeResponseRecorder();
  sendErrorRuntime(res, 400, "bad_request", "invalid input");
  assert.equal(calls.status, 400);
  assert.equal(calls.body, "{\"error\":{\"code\":\"bad_request\",\"message\":\"invalid input\"}}\n");
}

{
  const { calls, res } = makeResponseRecorder();
  sendCorsPreflightRuntime(res);
  assert.equal(calls.status, 204);
  assert.deepEqual(calls.headers, DEFAULT_CORS_PREFLIGHT_HEADERS);
  assert.equal(calls.body, undefined);
  assert.equal(
    DEFAULT_CORS_PREFLIGHT_HEADERS["access-control-allow-headers"],
    DEFAULT_JSON_RESPONSE_HEADERS["access-control-allow-headers"]
  );
}

{
  const stream = new PassThrough();
  const parsed = readJsonBodyRuntime(stream as unknown as JsonRequestLike, 100);
  stream.end("{\"x\":42}");
  assert.deepEqual(await parsed, { x: 42 });
}

{
  const stream = new PassThrough();
  const parsed = readJsonBodyRuntime(stream as unknown as JsonRequestLike, 100);
  stream.end("   ");
  assert.equal(await parsed, null);
}

{
  const stream = new PassThrough();
  const parsed = readJsonBodyRuntime(stream as unknown as JsonRequestLike, 100);
  stream.end("{");
  await assert.rejects(parsed, /invalid json/);
}

{
  const stream = new PassThrough();
  const parsed = readJsonBodyRuntime(stream as unknown as JsonRequestLike, 3);
  stream.end("{\"x\":42}");
  await assert.rejects(parsed, /body too large/);
}

{
  const stream = new PassThrough();
  const { calls, res } = makeResponseRecorder();
  const parsed = readJsonBodyOrErrorRuntime({
    req: stream as unknown as JsonRequestLike,
    res,
    maxBodyBytes: 100,
    coerce: (raw) => raw && typeof raw === "object" ? raw as { x?: unknown } : {}
  });
  stream.end("{\"x\":42}");
  assert.deepEqual(await parsed, { ok: true, body: { x: 42 } });
  assert.equal(calls.status, 0);
}

{
  const stream = new PassThrough();
  const { calls, res } = makeResponseRecorder();
  const parsed = readJsonBodyOrErrorRuntime({
    req: stream as unknown as JsonRequestLike,
    res,
    maxBodyBytes: 100,
    coerce: (raw) => raw,
    errorMessage: () => "custom bad json"
  });
  stream.end("{");
  assert.deepEqual(await parsed, { ok: false });
  assert.equal(calls.status, 400);
  assert.equal(calls.body, "{\"error\":{\"code\":\"bad_json\",\"message\":\"custom bad json\"}}\n");
}

console.log("server_http_runtime_test: ok");
