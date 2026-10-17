/**
 * Confluence Unified HTTP API Client
 * - Prepends /api
 * - Includes credentials: "include" for httpOnly session cookies
 * - Normalizes MongoDB `_id` to `id`
 * - Throws descriptive Error objects on failure
 */

function normalizeIds(data: any): any {
  if (!data || typeof data !== "object") return data;

  if (Array.isArray(data)) {
    return data.map(normalizeIds);
  }

  const normalized: Record<string, any> = {};
  for (const key of Object.keys(data)) {
    if (key === "_id" && !data.id) {
      normalized.id = String(data._id);
    }
    normalized[key] = normalizeIds(data[key]);
  }

  if (normalized._id && !normalized.id) {
    normalized.id = String(normalized._id);
  }

  return normalized;
}

export class ApiError extends Error {
  status: number;
  data: any;

  constructor(message: string, status: number, data?: any) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.data = data;
  }
}

const API_BASE_URL = (import.meta.env.VITE_API_URL || "").replace(/\/+$/, "");
const baseAlreadyHasApi = API_BASE_URL.endsWith("/api");

// Token management for cross-origin deployments where httpOnly cookies don't work
let authToken: string | null = null;
try { authToken = localStorage.getItem('tradevault_token'); } catch {}

export function setApiToken(token: string | null) {
  authToken = token;
  try {
    if (token) localStorage.setItem('tradevault_token', token);
    else localStorage.removeItem('tradevault_token');
  } catch {}
}

export function getApiToken(): string | null {
  return authToken;
}

async function request<T = any>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const normalizedEndpoint = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
  // Only prepend /api if the base URL doesn't already include it
  const path = baseAlreadyHasApi || normalizedEndpoint.startsWith("/api")
    ? normalizedEndpoint
    : `/api${normalizedEndpoint}`;
  const url = `${API_BASE_URL}${path}`;

  const headers: Record<string, string> = {
    Accept: "application/json",
    ...(options.headers as Record<string, string>),
  };

  // Attach JWT token as Authorization header for cross-origin requests
  if (authToken && !headers['Authorization']) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }

  if (options.body && !(options.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
    if (typeof options.body === "object") {
      options.body = JSON.stringify(options.body);
    }
  }

  const response = await fetch(url, {
    ...options,
    headers,
    credentials: "include",
  });

  if (response.status === 204) {
    return {} as T;
  }

  let json: any = null;
  const text = await response.text();
  try {
    json = text ? JSON.parse(text) : {};
  } catch {
    json = { message: text };
  }

  if (!response.ok) {
    const errorMsg = json?.error || json?.message || `Request failed with status ${response.status}`;
    throw new ApiError(errorMsg, response.status, json);
  }

  return normalizeIds(json) as T;
}

export const api = {
  get: <T = any>(endpoint: string, options?: RequestInit) =>
    request<T>(endpoint, { ...options, method: "GET" }),

  post: <T = any>(endpoint: string, body?: any, options?: RequestInit) =>
    request<T>(endpoint, { ...options, method: "POST", body }),

  put: <T = any>(endpoint: string, body?: any, options?: RequestInit) =>
    request<T>(endpoint, { ...options, method: "PUT", body }),

  patch: <T = any>(endpoint: string, body?: any, options?: RequestInit) =>
    request<T>(endpoint, { ...options, method: "PATCH", body }),

  delete: <T = any>(endpoint: string, options?: RequestInit) =>
    request<T>(endpoint, { ...options, method: "DELETE" }),
};
