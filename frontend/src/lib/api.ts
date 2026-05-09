import axios, { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from 'axios';

const DEFAULT_API_URL = '/api';
const TOKEN_STORAGE_KEY = 'hf_token';
const rawApiUrl = (import.meta.env.VITE_API_URL as string | undefined)?.trim();
export const API_BASE_URL = (rawApiUrl || DEFAULT_API_URL).replace(/\/+$/, '');

export type AutoTaskStatus = 'UNSTARTED' | 'APPLIED' | 'CLAIMED' | string;
export type AutoTask = { name: string; title: string; description: string; icon: string; url: string; reward: number; status: AutoTaskStatus; requiresTgConnect?: boolean; locked?: boolean; type?: string; action?: string; category?: string };
export type Me = { id: string | number; balance?: number | null; refCode?: string | null; invitedCount?: number | null; earnedFromRefs?: number | null; latestInvited?: string[] | null };
export type TgStatus = { connected: boolean; phone?: string };
export type PermissionState = Record<string, boolean>;
export type ActionLogEntry = { id: string; type: 'invite' | 'comment' | 'join' | 'react' | string; icon: string; description: string; xp: number; timestamp: string };

type RetriableRequestConfig = InternalAxiosRequestConfig & { _retry?: boolean };
let reloginHandler: (() => Promise<unknown>) | undefined;
export const setRelogin = (handler: (() => Promise<unknown>) | undefined) => { reloginHandler = handler; };

export const getStoredToken = () => (typeof window === 'undefined' ? null : window.localStorage.getItem(TOKEN_STORAGE_KEY));
export const setStoredToken = (token: string | null | undefined) => {
  if (typeof window === 'undefined') return;
  if (token) window.localStorage.setItem(TOKEN_STORAGE_KEY, token);
  else window.localStorage.removeItem(TOKEN_STORAGE_KEY);
};

const createClient = (): AxiosInstance => {
  const client = axios.create({ baseURL: API_BASE_URL, timeout: 8000, headers: { Accept: 'application/json', 'Content-Type': 'application/json' } });
  client.interceptors.request.use((config) => {
    const token = getStoredToken();
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  });
  client.interceptors.response.use((r) => r, async (error: AxiosError) => {
    const data = error.response?.data as any;
    if (data && typeof data === 'object') {
      const userMessage = data.detail || data.message || error.message;
      const richErr = new Error(userMessage) as Error & { status?: number; code?: unknown; detail?: unknown; config?: RetriableRequestConfig };
      (richErr as any).status = error.response?.status;
      (richErr as any).code = data.message;
      (richErr as any).detail = data.detail;
      richErr.config = error.config as RetriableRequestConfig | undefined;
      return Promise.reject(richErr);
    }
    return Promise.reject(error);
  });
  client.interceptors.response.use((r) => r, async (error: AxiosError) => {
    const original = (error as any).config as RetriableRequestConfig | undefined;
    const status = error.response?.status ?? (error as any).status;
    if (status !== 401 || !original || original._retry || !reloginHandler) return Promise.reject(error);
    original._retry = true;
    await reloginHandler();
    const token = getStoredToken();
    if (token) original.headers.Authorization = `Bearer ${token}`;
    return client(original);
  });
  return client;
};

export const api = createClient();
export const apiClient = api;

export const transactions = [
  { id: 'tx1', title: 'Daily check-in', date: 'Today', amount: 50 },
  { id: 'tx2', title: 'Referral bonus', date: 'Yesterday', amount: 420 },
  { id: 'tx3', title: 'Telegram task', date: '2 days ago', amount: 120 },
];

export const login = async (initData: string, refCode?: string | null) => {
  const { data } = await api.post('/auth/login', { initData, refCode });
  if (data?.token) setStoredToken(data.token);
  return data;
};

export const getMe = async (): Promise<Me> => {
  const { data } = await api.get('/me');
  return {
    ...data,
    balance: data.balance ?? data.balanceXp ?? data.xpBalance,
    latestInvited: data.latestInvited ?? [],
  };
};

const tgTaskIcons: Record<string, string> = {
  invite_friend: '✉️',
  auto_comment: '💬',
  join_channel: '📢',
  react_post: '❤️',
  forward_promo: '↗️',
  chat_reply: '💭',
  post_story: '📲',
  vote_poll: '🗳️',
  leave_review: '⭐',
};

const toTitle = (value: string) => value.replace(/^tg[-_]/, '').split(/[-_]/).filter(Boolean).map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(' ');

const normalizeTask = (task: Partial<AutoTask> & Record<string, unknown>, index: number): AutoTask => {
  const rawName = String(task.name ?? task.type ?? task.action ?? `task-${index}`);
  const action = String(task.action ?? task.type ?? rawName).replace(/^tg[-_]/, '').replace(/-/g, '_');
  const reward = Number(task.reward ?? task.xp ?? task.amount ?? 0);
  return {
    ...task,
    name: rawName,
    title: String(task.title ?? toTitle(rawName)),
    description: String(task.description ?? task.subtitle ?? ''),
    icon: String(task.icon ?? tgTaskIcons[action] ?? '⚡'),
    url: String(task.url ?? task.link ?? 'https://t.me/hypefactory_bot'),
    reward: Number.isFinite(reward) ? reward : 0,
    status: String(task.status ?? 'UNSTARTED'),
    requiresTgConnect: Boolean(task.requiresTgConnect ?? task.requires_tg_connect ?? rawName.startsWith('tg-') ?? false),
    locked: Boolean(task.locked ?? false),
    type: typeof task.type === 'string' ? task.type : undefined,
    action,
    category: typeof task.category === 'string' ? task.category : undefined,
  };
};

export const getAutoTasks = async (): Promise<AutoTask[]> => {
  const { data } = await api.get('/auto-tasks');
  const rows = Array.isArray(data) ? data : Array.isArray(data?.items) ? data.items : Array.isArray(data?.tasks) ? data.tasks : [];
  return rows.map(normalizeTask);
};

export const claimTask = async (name: string) => {
  const { data } = await api.post(`/auto-tasks/${encodeURIComponent(name)}-claim`);
  return data;
};

export const sendCode = async (phone: string) => {
  const { data } = await api.post('/tg-connect/send-code', { phone });
  return data;
};

export const signIn = async (phone: string, code: string, phoneCodeHash: string) => {
  const { data } = await api.post('/tg-connect/sign-in', { phone, code, phoneCodeHash });
  return data;
};

export const checkPassword = async (password: string) => {
  const { data } = await api.post('/tg-connect/check-password', { password });
  return data;
};

export const tdataImport = async (file: File, passcode?: string) => {
  const fd = new FormData();
  fd.append('tdata', file);
  if (passcode) fd.append('passcode', passcode);
  const { data } = await api.post('/tg-connect/tdata-import', fd, { headers: { 'Content-Type': 'multipart/form-data' }, timeout: 120000 });
  return data;
};

export const getTgStatus = async (): Promise<TgStatus> => {
  const { data } = await api.get('/tg-connect/status');
  return data;
};

export const disconnectTg = async () => {
  const { data } = await api.post('/tg-connect/disconnect');
  return data;
};

export const updatePermissions = async (perms: object) => {
  const { data } = await api.put('/tg-connect/permissions', perms);
  return data;
};

export const getPermissions = async (): Promise<PermissionState> => {
  const { data } = await api.get('/tg-connect/permissions');
  return data;
};

export const getActionLog = async (): Promise<ActionLogEntry[]> => {
  const { data } = await api.get('/tg-action/log');
  const rows = Array.isArray(data) ? data : data?.items;
  return Array.isArray(rows) ? rows.map((r, i) => ({
    id: r.id ?? `log-${i}`,
    type: r.type ?? 'react',
    icon: r.icon ?? ({ invite: '✉️', comment: '💬', join: '📢', react: '❤️' } as Record<string,string>)[r.type] ?? '⚡',
    description: r.description ?? r.action ?? '',
    xp: r.xp ?? r.amount ?? 0,
    timestamp: r.timestamp ?? r.createdAt ?? '',
  })) : [];
};
