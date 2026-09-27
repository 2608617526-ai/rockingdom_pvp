import type { AuthUser, HistoryBattleDetail, HistoryBattleSummary } from '@rockingdom/shared';

async function postJson<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return (await res.json()) as T;
}

async function getJson<T>(url: string, token: string): Promise<T> {
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return (await res.json()) as T;
}

export interface AuthResponse {
  success: boolean;
  token?: string;
  user?: AuthUser;
  message?: string;
  code?: string;
}

export function register(payload: {
  account: string;
  password: string;
  nickname: string;
  avatar: string;
}): Promise<AuthResponse> {
  return postJson<AuthResponse>('/api/auth/register', payload);
}

export function login(account: string, password: string): Promise<AuthResponse> {
  return postJson<AuthResponse>('/api/auth/login', { account, password });
}

export interface HistoryListResponse {
  success: boolean;
  battles?: HistoryBattleSummary[];
  total?: number;
  wins?: number;
  message?: string;
}

export function fetchHistory(token: string): Promise<HistoryListResponse> {
  return getJson<HistoryListResponse>('/api/battles/history', token);
}

export interface BattleDetailResponse {
  success: boolean;
  battle?: HistoryBattleDetail;
  message?: string;
}

export function fetchBattleDetail(token: string, id: string): Promise<BattleDetailResponse> {
  return getJson<BattleDetailResponse>(`/api/battles/${id}`, token);
}
