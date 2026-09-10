import type {
  AuthUser,
  HistoryListItem,
  HistoryRecord,
  KV,
  ProxyResponse,
} from '@/types';

/**
 * BASE_URL is '/' in dev and '/iposi/' in the production build, so the API
 * always resolves to <app-base>/api/* — matched by the nginx location block.
 */
const API_BASE = `${import.meta.env.BASE_URL.replace(/\/$/, '')}/api`;

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
    ...init,
  });

  const text = await res.text();
  const data = text ? JSON.parse(text) : {};

  if (!res.ok) {
    throw new ApiError(data?.error || `Request failed (${res.status})`, res.status);
  }
  return data as T;
}

// ---------------------------------------------------------------- auth
export const authApi = {
  me: () => req<{ user: AuthUser | null }>('/auth/me'),

  register: (body: { user: string; email: string; pass: string }) =>
    req<{ ok: true }>('/auth/register', { method: 'POST', body: JSON.stringify(body) }),

  login: (body: { user: string; pass: string; remember: boolean }) =>
    req<{ user: AuthUser }>('/auth/login', { method: 'POST', body: JSON.stringify(body) }),

  logout: () => req<{ ok: true }>('/auth/logout', { method: 'POST' }),
};

// ---------------------------------------------------------------- history
export interface SaveHistoryPayload {
  method: string;
  url: string;
  tabName: string;
  bodyType: string;
  rawType: string;
  body: string;
  params: KV[];
  headers: KV[];
  urlencoded: KV[];
  statusCode: number;
}

export const historyApi = {
  list: () => req<{ items: HistoryListItem[] }>('/history'),
  get: (id: number) => req<{ record: HistoryRecord }>(`/history/${id}`),
  remove: (id: number) => req<{ ok: true }>(`/history/${id}`, { method: 'DELETE' }),
  save: (payload: SaveHistoryPayload) =>
    req<{ ok: true }>('/history', { method: 'POST', body: JSON.stringify(payload) }),
};

// ---------------------------------------------------------------- proxy
export interface ProxyPayload {
  method: string;
  url: string;
  tabName: string;
  saveHistory: boolean;
  bodyType: string;
  rawType: string;
  body: string;
  params: KV[];
  headers: KV[];
  urlencoded: KV[];
}

export const requestApi = {
  send: (payload: ProxyPayload) =>
    req<ProxyResponse>('/request', { method: 'POST', body: JSON.stringify(payload) }),
};
