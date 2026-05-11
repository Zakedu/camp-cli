// Minimal HTTP client with Bearer auth.

import { loadCredentials } from "./auth.js";

export const DEFAULT_BASE_URL = process.env.CAMP_BASE_URL || "https://camp.scaila.kr";

export class ApiError extends Error {
  constructor(status, message, body) {
    super(message);
    this.status = status;
    this.body = body;
  }
}

async function request(pathname, init = {}, { baseUrl, token, requireAuth = true } = {}) {
  let url = pathname.startsWith("http") ? pathname : null;
  let resolvedToken = token;
  let resolvedBase = baseUrl;

  if (!url) {
    if (!resolvedBase || (requireAuth && !resolvedToken)) {
      const creds = await loadCredentials();
      if (creds) {
        resolvedToken = resolvedToken || creds.token;
        resolvedBase = resolvedBase || creds.baseUrl;
      }
    }
    resolvedBase = resolvedBase || DEFAULT_BASE_URL;
    url = resolvedBase + pathname;
  }

  if (requireAuth && !resolvedToken) {
    throw new ApiError(0, "로그인이 필요합니다. → npx @scaila/camp-cli login");
  }

  const headers = {
    "Content-Type": "application/json",
    ...(resolvedToken ? { Authorization: `Bearer ${resolvedToken}` } : {}),
    ...(init.headers || {}),
  };

  let res;
  try {
    res = await fetch(url, { ...init, headers });
  } catch (err) {
    throw new ApiError(0, `네트워크 오류: ${err.message}`);
  }
  if (!res.ok) {
    let bodyText = "";
    let bodyJson = null;
    try {
      bodyText = await res.text();
      bodyJson = JSON.parse(bodyText);
    } catch { /* not json */ }
    const msg = bodyJson?.error || bodyText.slice(0, 200) || `HTTP ${res.status}`;
    throw new ApiError(res.status, msg, bodyJson);
  }
  return res;
}

export async function apiGet(pathname, opts = {}) {
  const res = await request(pathname, { method: "GET" }, opts);
  const ct = res.headers.get("content-type") || "";
  return ct.includes("application/json") ? res.json() : res.arrayBuffer();
}

export async function apiPost(pathname, body, opts = {}) {
  const res = await request(
    pathname,
    { method: "POST", body: JSON.stringify(body ?? {}) },
    opts,
  );
  const ct = res.headers.get("content-type") || "";
  return ct.includes("application/json") ? res.json() : res.text();
}

export async function recordEvent(eventType, metadata = {}) {
  try {
    await apiPost("/api/setup/events", { eventType, metadata });
  } catch {
    // best-effort
  }
}
