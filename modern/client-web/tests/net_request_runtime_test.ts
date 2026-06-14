import assert from "node:assert/strict";
import {
  buildRuntimeContractHeaders,
  netJsonRequest,
  performManagedNetRequest,
  type NetJsonBody
} from "../net/request_runtime.ts";

assert.deepEqual(buildRuntimeContractHeaders({
  auth: true,
  extraHeaders: { "content-type": "application/json" },
  runtimeExtensions: ["quest_system", ""],
  runtimeProfile: "canonical_plus",
  token: "token"
}), {
  authorization: "Bearer token",
  "content-type": "application/json",
  "x-vm-runtime-extensions": "quest_system",
  "x-vm-runtime-profile": "canonical_plus"
});

const originalFetch = globalThis.fetch;
const requests: string[] = [];
let pulseCount = 0;

globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
  requests.push(`${String(input)}:${String(init?.headers && (init.headers as Record<string, string>)["x-vm-runtime-profile"] || "")}`);
  return new Response(JSON.stringify({
    items: [1, "two", true, null],
    ok: true,
    nested: { value: 3 }
  } satisfies NetJsonBody), {
    status: 200,
    statusText: "OK"
  });
}) as typeof fetch;

try {
  const out = await netJsonRequest({
    apiBase: "http://net/",
    auth: false,
    route: "/api/test",
    runtimeExtensions: [],
    runtimeProfile: "canonical_strict",
    onPulse: () => {
      pulseCount += 1;
    }
  });
  assert.equal(out.ok, true);
  assert.equal(pulseCount, 1);
  assert.deepEqual(out.body?.items, [1, "two", true, null]);
  assert.deepEqual(requests, ["http://net/api/test:canonical_strict"]);

  globalThis.fetch = (async (): Promise<Response> => new Response(JSON.stringify({
    error: { message: "bad request" }
  } satisfies NetJsonBody), {
    status: 400,
    statusText: "Bad Request"
  })) as typeof fetch;

  await assert.rejects(
    () => performManagedNetRequest({
      apiBase: "http://net",
      route: "/api/fail",
      runtimeExtensions: [],
      runtimeProfile: "canonical_strict"
    }),
    /bad request/
  );
} finally {
  globalThis.fetch = originalFetch;
}

console.log("net_request_runtime_test: ok");
