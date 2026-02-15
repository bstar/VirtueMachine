/**
 * @typedef {Object} NetRuntimeRequestOptions
 * @property {string} apiBase
 * @property {string} route
 * @property {RequestInit=} init
 * @property {boolean=} auth
 * @property {string=} token
 * @property {string=} runtimeProfile
 * @property {string[]} runtimeExtensions
 * @property {() => void=} onPulse
 */

/**
 * Build runtime contract headers for client->net requests.
 *
 * @param {Object} options
 * @param {string} options.runtimeProfile
 * @param {string[]} options.runtimeExtensions
 * @param {string=} options.token
 * @param {Record<string, string>=} options.extraHeaders
 * @param {boolean=} options.auth
 * @returns {Record<string, string>}
 */
export function buildRuntimeContractHeaders(options) {
  const profile = String(options?.runtimeProfile || "").trim();
  const extensions = Array.isArray(options?.runtimeExtensions)
    ? options.runtimeExtensions.map((v) => String(v || "").trim()).filter(Boolean)
    : [];
  const token = String(options?.token || "").trim();
  const extra = options?.extraHeaders || {};
  const auth = options?.auth !== false;
  /** @type {Record<string, string>} */
  const headers = { ...extra };
  headers["x-vm-runtime-profile"] = profile;
  headers["x-vm-runtime-extensions"] = extensions.length ? extensions.join(",") : "none";
  if (auth && token) {
    headers.authorization = `Bearer ${token}`;
  }
  return headers;
}

/**
 * Execute a net request and decode JSON response body.
 *
 * @param {NetRuntimeRequestOptions} options
 * @returns {Promise<{status:number, ok:boolean, body:any, statusText:string}>}
 */
export async function netJsonRequest(options) {
  const base = String(options?.apiBase || "").trim().replace(/\/+$/, "");
  if (!base) {
    throw new Error("Net API base URL is empty");
  }
  const init = options?.init || {};
  const inHeaders = /** @type {Record<string, string>} */ (init.headers || {});
  const headers = buildRuntimeContractHeaders({
    runtimeProfile: String(options?.runtimeProfile || ""),
    runtimeExtensions: Array.isArray(options?.runtimeExtensions) ? options.runtimeExtensions : [],
    token: String(options?.token || ""),
    extraHeaders: inHeaders,
    auth: options?.auth !== false
  });
  const res = await fetch(`${base}${String(options?.route || "")}`, { ...init, headers });
  const text = await res.text();
  const body = text.trim() ? JSON.parse(text) : null;
  if (res.ok && typeof options?.onPulse === "function") {
    options.onPulse();
  }
  return {
    status: res.status,
    ok: res.ok,
    statusText: res.statusText,
    body
  };
}
