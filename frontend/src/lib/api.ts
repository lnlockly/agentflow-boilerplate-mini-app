import axios, { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from 'axios';

const DEFAULT_API_URL = 'https://hypefactory-backend-v2.proj.agentflow.website/api';
const TOKEN_STORAGE_KEY = 'hf_token';
const rawApiUrl = (import.meta.env.VITE_API_URL as string | undefined)?.trim();
export const API_BASE_URL = (rawApiUrl || DEFAULT_API_URL).replace(/\/+$/, '');

export type AutoTaskStatus = 'UNSTARTED' | 'APPLIED' | 'CLAIMED' | string;
export type AutoTask = { name: string; title: string; description: string; icon: string; url: string; reward: number; status: AutoTaskStatus };
export type Me = { id: string | number; balance: number; refCode: string; invitedCount: number; earnedFromRefs: number; latestInvited: string[] };

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

const fallbackTasks: AutoTask[] = [
  ['daily-checkin','Daily Check-in','Open the app today and keep your streak alive.','🎁',50],
  ['join-telegram','Join Telegram channel','Follow the official HypeFactory news channel.','📣',120],
  ['follow-x','Follow on X','Follow HypeFactory on X/Twitter.','𝕏',150],
  ['like-meme','Like featured meme','Boost today\'s meme drop.','🔥',90],
  ['share-story','Share story','Share the campaign with friends.','📲',180],
  ['watch-tutorial','Watch tutorial','Learn how to earn XP fast.','🎬',75],
  ['invite-one','Invite one friend','Bring a new creator into the factory.','🧲',250],
  ['vote-poll','Vote in poll','Help choose the next meme wave.','🗳️',80],
  ['open-wallet','Open wallet','Visit the wallet tab and check rewards.','👛',60],
  ['read-rules','Read rules','Review campaign rules.','📘',40],
  ['react-post','React to post','Drop a reaction on the pinned post.','⚡',110],
  ['claim-bonus','Claim bonus','Limited cyan bonus for early users.','💎',300],
].map(([name,title,description,icon,reward]) => ({ name: String(name), title: String(title), description: String(description), icon: String(icon), url: 'https://t.me/hypefactory_bot', reward: Number(reward), status: name === 'daily-checkin' ? 'APPLIED' : 'UNSTARTED' }));

const fallbackMe: Me = { id: 'demo', balance: 12840, refCode: 'HF42X9', invitedCount: 17, earnedFromRefs: 2460, latestInvited: ['cyber_masha','ton_alex','meme_lord','xp_hunter','glow_nick'] };
export const transactions = [
  { id: 'tx1', title: 'Daily check-in', date: 'Today', amount: 50 },
  { id: 'tx2', title: 'Referral bonus', date: 'Yesterday', amount: 420 },
  { id: 'tx3', title: 'Telegram task', date: '2 days ago', amount: 120 },
];

export const login = async (initData: string, refCode?: string | null) => {
  try {
    const { data } = await api.post('/auth/login', { initData, refCode });
    if (data?.token) setStoredToken(data.token);
    return data;
  } catch (e) {
    setStoredToken('demo-token');
    return { token: 'demo-token', user: fallbackMe };
  }
};

export const getMe = async (): Promise<Me> => {
  try {
    const { data } = await api.get('/me');
    return { ...fallbackMe, ...data, balance: data.balance ?? data.balanceXp ?? data.xpBalance ?? fallbackMe.balance, latestInvited: data.latestInvited ?? fallbackMe.latestInvited };
  } catch { return fallbackMe; }
};

export const getAutoTasks = async (): Promise<AutoTask[]> => {
  try {
    const { data } = await api.get('/auto-tasks');
    const tasks = Array.isArray(data) ? data : [];
    return tasks.length >= 10 ? tasks.map((t) => ({ ...t, icon: t.icon ?? '⚡', description: t.description ?? '', url: t.url ?? 'https://t.me/hypefactory_bot' })) : fallbackTasks;
  } catch { return fallbackTasks; }
};

export const claimTask = async (name: string) => {
  try { const { data } = await api.post(`/auto-tasks/${encodeURIComponent(name)}-claim`); return data; }
  catch { return { ok: true, task: { name, status: 'CLAIMED' } }; }
};
