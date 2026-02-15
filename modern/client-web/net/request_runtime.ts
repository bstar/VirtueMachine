export type NetRuntimeRequestOptions = {
  apiBase: string;
  route: string;
  init?: RequestInit;
  auth?: boolean;
  token?: string;
  runtimeProfile?: string;
  runtimeExtensions?: string[];
  onPulse?: () => void;
};

/**
 * Build runtime contract headers for client->net requests.
 */
export function buildRuntimeContractHeaders(options: {
  runtimeProfile: string;
  runtimeExtensions: string[];
  token?: string;
  extraHeaders?: Record<string, string>;
  auth?: boolean;
}): Record<string, string> {
  const profile = String(options?.runtimeProfile || "").trim();
  const extensions = Array.isArray(options?.runtimeExtensions)
    ? options.runtimeExtensions.map((v) => String(v || "").trim()).filter(Boolean)
    : [];
  const token = String(options?.token || "").trim();
  const extra = options?.extraHeaders || {};
  const auth = options?.auth !== false;
  const headers: Record<string, string> = { ...extra };
  headers["x-vm-runtime-profile"] = profile;
  headers["x-vm-runtime-extensions"] = extensions.length ? extensions.join(",") : "none";
  if (auth && token) {
    headers.authorization = `Bearer ${token}`;
  }
  return headers;
}

/**
 * Execute a net request and decode JSON response body.
 */
export async function netJsonRequest(options: NetRuntimeRequestOptions): Promise<{
  status: number;
  ok: boolean;
  body: any;
  statusText: string;
}> {
  const base = String(options?.apiBase || "").trim().replace(/\/+$/, "");
  if (!base) {
    throw new Error("Net API base URL is empty");
  }
  const init = options?.init || {};
  const inHeaders = (init.headers || {}) as Record<string, string>;
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

export async function performManagedNetRequest(options: {
  apiBase: string;
  route: string;
  init?: RequestInit;
  auth?: boolean;
  token?: string;
  runtimeProfile?: string;
  runtimeExtensions?: string[];
  onPulse?: () => void;
  onUnauthorized?: () => void;
}): Promise<any> {
  const out = await netJsonRequest({
    apiBase: options.apiBase,
    route: options.route,
    init: options.init,
    auth: options.auth,
    token: options.token,
    runtimeProfile: options.runtimeProfile,
    runtimeExtensions: options.runtimeExtensions,
    onPulse: options.onPulse
  });
  if (!out.ok) {
    if (out.status === 401 && typeof options.onUnauthorized === "function") {
      options.onUnauthorized();
    }
    const msg = out.body?.error?.message || `${out.status} ${out.statusText}`;
    throw new Error(msg);
  }
  return out.body;
}
