import axios, {
  AxiosError,
  AxiosInstance,
  AxiosRequestConfig,
  InternalAxiosRequestConfig,
} from 'axios';

const DEFAULT_API_URL = 'https://hypefactory-backend-v2.proj.agentflow.website/api';
const TOKEN_STORAGE_KEY = 'hf_token';

const rawApiUrl = (import.meta.env.VITE_API_URL as string | undefined)?.trim();

export const API_BASE_URL = (rawApiUrl || DEFAULT_API_URL).replace(/\/+$/, '');
export const isPlaceholderApiUrl = API_BASE_URL === DEFAULT_API_URL;

export type AuthLoginPayload = {
  initData: string;
  refCode?: string | null;
};

export type AuthLoginResponse = {
  token: string;
  user?: HypeFactoryUser;
};

export type HypeFactoryUser = {
  id: string | number;
  telegramId?: string | number;
  username?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  languageCode?: string | null;
  refCode?: string | null;
  balanceXp?: number;
  xpBalance?: number;
  balance?: number;
  invitedCount?: number;
  earnedFromRefs?: number;
};

export type AutoTaskStatus = 'UNSTARTED' | 'APPLIED' | 'CLAIMED' | string;

export type AutoTask = {
  name: string;
  title: string;
  description?: string;
  icon?: string;
  url?: string;
  reward: number;
  status: AutoTaskStatus;
};

export type AutoTaskClaimResponse = {
  ok?: boolean;
  task?: AutoTask;
  balanceXp?: number;
  xpBalance?: number;
  balance?: number;
  message?: string;
};

export type Friend = {
  id: string | number;
  username?: string | null;
  firstName?: string | null;
  joinedAt?: string;
  earnedXp?: number;
};

export type FriendsResponse = {
  refCode?: string | null;
  invitedCount: number;
  earnedFromRefs: number;
  latestInvited: Friend[];
};

export type Transaction = {
  id: string | number;
  title: string;
  amount: number;
  type?: string;
  createdAt?: string;
};

type RetriableRequestConfig = InternalAxiosRequestConfig & {
  _retry?: boolean;
};

let initDataProvider: (() => string | undefined | null) | undefined;
let refCodeProvider: (() => string | undefined | null) | undefined;
let refreshPromise: Promise<string | null> | null = null;

export const getStoredToken = () =>
  typeof window === 'undefined' ? null : window.localStorage.getItem(TOKEN_STORAGE_KEY);

export const setStoredToken = (token: string | null | undefined) => {
  if (typeof window === 'undefined') return;
  if (token) window.localStorage.setItem(TOKEN_STORAGE_KEY, token);
  else window.localStorage.removeItem(TOKEN_STORAGE_KEY);
};

export const configureAuthSession = (options: {
  getInitData?: () => string | undefined | null;
  getRefCode?: () => string | undefined | null;
}) => {
  initDataProvider = options.getInitData;
  refCodeProvider = options.getRefCode;
};

const createClient = (): AxiosInstance => {
  const client = axios.create({
    baseURL: API_BASE_URL,
    timeout: 15_000,
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
  });

  client.interceptors.request.use((config) => {
    const token = getStoredToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  });

  client.interceptors.response.use(
    (response) => response,
    async (error: AxiosError) => {
      const responseStatus = error.response?.status;
      const originalRequest = error.config as RetriableRequestConfig | undefined;

      if (responseStatus !== 401 || !originalRequest || originalRequest._retry) {
        return Promise.reject(error);
      }

      originalRequest._retry = true;
      const token = await refreshAuthToken();
      if (!token) return Promise.reject(error);

      originalRequest.headers.Authorization = `Bearer ${token}`;
      return client(originalRequest);
    },
  );

  return client;
};

export const api = createClient();

const unwrap = <T>(request: Promise<{ data: T }>) => request.then((response) => response.data);

export const login = async (payload: AuthLoginPayload): Promise<AuthLoginResponse> => {
  const data = await unwrap<AuthLoginResponse>(api.post('/auth/login', payload));
  if (data.token) setStoredToken(data.token);
  return data;
};

export const refreshAuthToken = async (): Promise<string | null> => {
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    const initData = initDataProvider?.();
    if (!initData) {
      setStoredToken(null);
      return null;
    }

    try {
      const result = await login({ initData, refCode: refCodeProvider?.() ?? null });
      return result.token;
    } catch (error) {
      setStoredToken(null);
      if (isPlaceholderApiUrl) {
        console.warn('HypeFactory API placeholder is not reachable yet.', error);
      }
      return null;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
};

export const authApi = {
  login,
  logout: () => setStoredToken(null),
};

export const userApi = {
  me: (config?: AxiosRequestConfig) => unwrap<HypeFactoryUser>(api.get('/me', config)),
};

export const autoTasksApi = {
  list: (config?: AxiosRequestConfig) => unwrap<AutoTask[]>(api.get('/auto-tasks', config)),
  claim: (name: string, config?: AxiosRequestConfig) =>
    unwrap<AutoTaskClaimResponse>(api.post(`/auto-tasks/${encodeURIComponent(name)}-claim`, undefined, config)),
};

export const friendsApi = {
  getSummary: (config?: AxiosRequestConfig) => unwrap<FriendsResponse>(api.get('/friends', config)),
};

export const walletApi = {
  getTransactions: (config?: AxiosRequestConfig) =>
    unwrap<Transaction[]>(api.get('/wallet/transactions', config)),
};

export const hypeFactoryApi = {
  auth: authApi,
  user: userApi,
  autoTasks: autoTasksApi,
  friends: friendsApi,
  wallet: walletApi,
};

export default hypeFactoryApi;
