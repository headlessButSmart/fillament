// Minimal fetch-based remote client. Optional helper for users who want a
// pre-baked client; consumers can also pass their own `fetcher` to remoteOptions
// directly. We deliberately do NOT add React Query, SWR, or Redux as deps —
// adapters for those libraries should live in separate optional sub-modules.

export interface FetchRemoteClient {
  get<T = unknown>(input: RequestInfo | URL, init?: RequestInit): Promise<T>;
  post<T = unknown>(input: RequestInfo | URL, body?: unknown, init?: RequestInit): Promise<T>;
}

export interface FetchRemoteClientOptions {
  baseUrl?: string;
  headers?: HeadersInit;
  fetch?: typeof fetch;
}

function joinUrl(base: string | undefined, url: RequestInfo | URL): RequestInfo | URL {
  if (!base) return url;
  if (typeof url !== "string") return url;
  if (/^https?:\/\//i.test(url)) return url;
  return base.replace(/\/$/, "") + (url.startsWith("/") ? url : `/${url}`);
}

export function createFetchRemoteClient(options: FetchRemoteClientOptions = {}): FetchRemoteClient {
  const fImpl: typeof fetch | undefined =
    options.fetch ??
    (typeof fetch !== "undefined" ? fetch.bind(globalThis) : undefined);
  if (!fImpl) {
    throw new Error(
      "@fillament/remote: no global fetch available. Pass `fetch` in createFetchRemoteClient(options)."
    );
  }
  const f: typeof fetch = fImpl;
  async function request<T>(method: string, input: RequestInfo | URL, body?: unknown, init?: RequestInit): Promise<T> {
    const headers = new Headers(options.headers);
    if (init?.headers) new Headers(init.headers).forEach((v, k) => headers.set(k, v));
    if (body !== undefined && !headers.has("content-type")) {
      headers.set("content-type", "application/json");
    }
    const res = await f(joinUrl(options.baseUrl, input), {
      ...init,
      method,
      headers,
      body: body === undefined ? init?.body : JSON.stringify(body),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`Request failed (${res.status}): ${text || res.statusText}`);
    }
    const ct = res.headers.get("content-type") ?? "";
    if (ct.includes("application/json")) return (await res.json()) as T;
    return (await res.text()) as unknown as T;
  }
  return {
    get: (input, init) => request("GET", input, undefined, init),
    post: (input, body, init) => request("POST", input, body, init),
  };
}
