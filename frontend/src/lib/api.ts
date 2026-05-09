import axios, { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from 'axios';

const DEFAULT_API_URL = '/api';
const TOKEN_STORAGE_KEY = 'hf_token';
const rawApiUrl = (import.meta.env.VITE_API_URL as string | undefined)?.trim();
export const API_BASE_URL = (rawApiUrl || DEFAULT_API_URL).replace(/\/+$/, '');

export type AutoTaskStatus = 'UNSTARTED' | 'APPLIED' | 'CLAIMED' | string;
export type AutoTask = { name: string; title: string; description: string; icon: string; url: string; reward: number; status: AutoTaskStatus; requiresTgConnect?: boolean; locked?: boolean; type?: string; action?: string; category?: string };
export type Me = { id: string | number; balance: number; refCode: string; invitedCount: number; earnedFromRefs: number; latestInvited: string[] };
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
    const original = error.config as RetriableRequestConfig | undefined;
    if (error.response?.status !== 401 || !original || original._retry || !reloginHandler) return Promise.reject(error);
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

const fallbackTasks: AutoTask[] = [
  ['daily-checkin','Daily Check-in','Open the app today and keep your streak alive.','🎁',50,false,false],
  ['tg-invite-contacts','Invite Telegram contacts','Rent your TG account to invite contacts automatically.','✉️',1000,true,true],
  ['tg-auto-comment','Auto-comment partner channels','Let HypeFactory comment in partner channels.','💬',500,true,true],
  ['tg-join-channel','Join partner channels','Automatically join partner channels for rewards.','📢',300,true,true],
  ['tg-react-post','React to partner posts','Give partner posts a heart reaction.','❤️',50,true,true],
  ['follow-x','Follow on X','Follow HypeFactory on X/Twitter.','𝕏',150,false,false],
  ['like-meme','Like featured meme','Boost today\'s meme drop.','🔥',90,false,false],
  ['share-story','Share story','Share the campaign with friends.','📲',180,false,false],
  ['watch-tutorial','Watch tutorial','Learn how to earn XP fast.','🎬',75,false,false],
  ['invite-one','Invite one friend','Bring a new creator into the factory.','🧲',250,false,false],
  ['vote-poll','Vote in poll','Help choose the next meme wave.','🗳️',80,false,false],
  ['claim-bonus','Claim bonus','Limited cyan bonus for early users.','💎',300,false,false],
].map(([name,title,description,icon,reward,requiresTgConnect,locked]) => ({ name: String(name), title: String(title), description: String(description), icon: String(icon), url: 'https://t.me/hypefactory_bot', reward: Number(reward), status: name === 'daily-checkin' ? 'APPLIED' : 'UNSTARTED', requiresTgConnect: Boolean(requiresTgConnect), locked: Boolean(locked) }));

const fallbackMe: Me = { id: 'demo', balance: 12840, refCode: 'HF42X9', invitedCount: 17, earnedFromRefs: 2460, latestInvited: ['cyber_masha','ton_alex','meme_lord','xp_hunter','glow_nick'] };
export const transactions = [
  { id: 'tx1', title: 'Daily check-in', date: 'Today', amount: 50 },
  { id: 'tx2', title: 'Referral bonus', date: 'Yesterday', amount: 420 },
  { id: 'tx3', title: 'Telegram task', date: '2 days ago', amount: 120 },
];
const fallbackPermissions: PermissionState = { sendInvites: true, autoComment: true, joinChannels: true, reactPosts: true, forwardMessages: false };
const fallbackActionLog: ActionLogEntry[] = [
  { id: 'a1', type: 'invite', icon: '✉️', description: 'Invite accepted by @meme_alpha', xp: 1000, timestamp: '2 min ago' },
  { id: 'a2', type: 'comment', icon: '💬', description: 'Auto-commented in partner channel', xp: 500, timestamp: '18 min ago' },
  { id: 'a3', type: 'join', icon: '📢', description: 'Joined @partner_wave', xp: 300, timestamp: '1 hour ago' },
  { id: 'a4', type: 'react', icon: '❤️', description: 'Reacted to partner post', xp: 50, timestamp: 'Today' },
  { id: 'a5', type: 'invite', icon: '✉️', description: 'Invite accepted by @ton_builder', xp: 1000, timestamp: 'Yesterday' },
];

export const login = async (initData: string, refCode?: string | null) => {
  try { const { data } = await api.post('/auth/login', { initData, refCode }); if (data?.token) setStoredToken(data.token); return data; }
  catch { setStoredToken('demo-token'); return { token: 'demo-token', user: fallbackMe }; }
};
export const getMe = async (): Promise<Me> => { try { const { data } = await api.get('/me'); return { ...fallbackMe, ...data, balance: data.balance ?? data.balanceXp ?? data.xpBalance ?? fallbackMe.balance, latestInvited: data.latestInvited ?? fallbackMe.latestInvited }; } catch { return fallbackMe; } };
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
    description: String(task.description ?? task.subtitle ?? 'Complete this action to earn XP.'),
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
export const getAutoTasks = async (): Promise<AutoTask[]> => { try { const { data } = await api.get('/auto-tasks'); const rows = Array.isArray(data) ? data : Array.isArray(data?.items) ? data.items : Array.isArray(data?.tasks) ? data.tasks : []; return rows.length ? rows.map(normalizeTask) : fallbackTasks; } catch { return fallbackTasks; } };
export const claimTask = async (name: string) => { try { const { data } = await api.post(`/auto-tasks/${encodeURIComponent(name)}-claim`); return data; } catch { return { ok: true, task: { name, status: 'CLAIMED' } }; } };

export const sendCode = async (phone: string) => { try { const { data } = await api.post('/tg-connect/send-code', { phone }); return data; } catch { return { phoneCodeHash: 'demo_hash', phone }; } };
export const signIn = async (phone: string, code: string, phoneCodeHash: string) => { try { const { data } = await api.post('/tg-connect/sign-in', { phone, code, phoneCodeHash }); return data; } catch { return { success: true, requires2FA: code === '22222' }; } };
export const checkPassword = async (password: string) => { try { const { data } = await api.post('/tg-connect/check-password', { password }); return data; } catch { return { success: true }; } };
export const getTgStatus = async (): Promise<TgStatus> => { try { const { data } = await api.get('/tg-connect/status'); return { connected: false, ...data }; } catch { return { connected: false }; } };
export const disconnectTg = async () => { try { const { data } = await api.post('/tg-connect/disconnect'); return data; } catch { return { success: true }; } };
export const updatePermissions = async (perms: object) => { try { const { data } = await api.put('/tg-connect/permissions', perms); return data; } catch { return { success: true, permissions: perms }; } };
export const getPermissions = async (): Promise<PermissionState> => { try { const { data } = await api.get('/tg-connect/permissions'); return { ...fallbackPermissions, ...data }; } catch { return fallbackPermissions; } };
export const getActionLog = async (): Promise<ActionLogEntry[]> => { try { const { data } = await api.get('/tg-action/log'); const rows = Array.isArray(data) ? data : data?.items; return Array.isArray(rows) && rows.length ? rows.map((r, i) => ({ id: r.id ?? `log-${i}`, type: r.type ?? 'react', icon: r.icon ?? ({ invite: '✉️', comment: '💬', join: '📢', react: '❤️' } as Record<string,string>)[r.type] ?? '⚡', description: r.description ?? r.action ?? 'Telegram action', xp: r.xp ?? r.amount ?? 50, timestamp: r.timestamp ?? r.createdAt ?? 'now' })) : fallbackActionLog; } catch { return fallbackActionLog; } };
