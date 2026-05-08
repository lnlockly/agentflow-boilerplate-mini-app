import { useEffect, useMemo, useState } from 'react';
import { Theme } from '@radix-ui/themes';
import '@radix-ui/themes/styles.css';
import { QueryClient, QueryClientProvider, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { BackButton, WebAppProvider, useExpand, useInitData, useWebApp } from '@vkruglikov/react-telegram-web-app';
import { Sheet } from 'react-modal-sheet';
import { I18nextProvider, useTranslation } from 'react-i18next';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { CheckCircle2, ChevronRight, Copy, Gift, HelpCircle, Home, Languages, Lock, Share2, Sparkles, Target, Users, Wallet } from 'lucide-react';
import { AutoTask, claimTask, getAutoTasks, getMe, login, setRelogin, transactions } from './lib/api';

const BOT_USERNAME = import.meta.env.VITE_BOT_USERNAME || 'hypefactory_bot';
const queryClient = new QueryClient();

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: { balance: 'XP Balance', quickActions: 'Quick actions', dailyCheckin: 'Daily check-in', inviteFriends: 'Invite friends', fastTasks: 'Featured FAST TASKS', comingSoon: 'Coming Soon', allTasks: 'All tasks', friends: 'Friends', wallet: 'Wallet', tutorial: 'Help', profile: 'Home', openTelegram: 'Open from Telegram', whatXp: 'What is XP?', whatXpText: 'XP is your meme-factory energy: earn it from social actions, referrals and streaks, then unlock drops.', copy: 'Copy', share: 'Share', claim: 'Claim', go: 'Go', next: 'Next', skip: 'Skip', done: 'Done' } },
    ru: { translation: { balance: 'XP Баланс', quickActions: 'Быстрые действия', dailyCheckin: 'Ежедневный вход', inviteFriends: 'Пригласить друзей', fastTasks: 'Избранные FAST TASKS', comingSoon: 'Скоро', allTasks: 'Все задания', friends: 'Друзья', wallet: 'Кошелёк', tutorial: 'Помощь', profile: 'Главная', openTelegram: 'Откройте из Telegram', whatXp: 'Что такое XP?', whatXpText: 'XP — энергия meme-factory: зарабатывайте её за соцдействия, рефералов и серии, затем открывайте дропы.', copy: 'Копировать', share: 'Поделиться', claim: 'Забрать', go: 'Перейти', next: 'Далее', skip: 'Пропустить', done: 'Готово' } },
  },
  fallbackLng: 'en', interpolation: { escapeValue: false },
});

const cx = (...v: Array<string | false | undefined>) => v.filter(Boolean).join(' ');
const isTgEnv = () => Boolean(window.Telegram?.WebApp?.initData);

declare global { interface Window { Telegram?: any } }

function usePath() {
  const [path, setPath] = useState(location.pathname === '/' ? '/profile' : location.pathname);
  useEffect(() => {
    const onPop = () => setPath(location.pathname === '/' ? '/profile' : location.pathname);
    addEventListener('popstate', onPop); return () => removeEventListener('popstate', onPop);
  }, []);
  const nav = (to: string) => { history.pushState(null, '', to); setPath(to); };
  return [path, nav] as const;
}

function useAuthMe() { return useQuery({ queryKey: ['me'], queryFn: getMe, staleTime: 30_000 }); }

function AuthGate({ children, path, nav }: { children: React.ReactNode; path: string; nav: (to: string) => void }) {
  const [initUnsafe, initData] = useInitData();
  const webApp = useWebApp();
  const [, expand] = useExpand();
  useEffect(() => { expand(); }, [expand]);
  useEffect(() => {
    const lang = initUnsafe?.user?.language_code?.startsWith('ru') ? 'ru' : 'en';
    i18n.changeLanguage(lang);
  }, [initUnsafe?.user?.language_code]);
  useEffect(() => {
    const runLogin = () => login(initData || '', webApp?.initDataUnsafe?.start_param);
    setRelogin(runLogin);
    if (initData) runLogin();
  }, [initData, webApp]);
  useEffect(() => { if (!initData && !isTgEnv() && path !== '/unauthorized') nav('/unauthorized'); }, [initData, path, nav]);
  return <>{children}</>;
}

function Header({ nav }: { nav: (to: string) => void }) {
  const { t } = useTranslation();
  const { data: me } = useAuthMe();
  return <header className="fixed left-0 right-0 top-0 z-30 px-4 pt-[10vh] pb-3 bg-gradient-to-b from-[#0B0B0B] via-[#0B0B0B]/95 to-transparent">
    <div className="flex items-center justify-between">
      <button onClick={() => nav('/wallet')} className="rounded-2xl border border-[#38DBFF]/40 bg-[#090909]/90 px-4 py-2 shadow-[0_0_18px_rgba(56,219,255,.2)]">
        <span className="text-xs text-[#A8A8A8]">{t('balance')}</span><b className="ml-2 text-[#38DBFF]">{(me?.balance ?? 12840).toLocaleString()} XP</b>
      </button>
      <button onClick={() => i18n.changeLanguage(i18n.language === 'ru' ? 'en' : 'ru')} className="rounded-2xl border border-white/10 bg-[#181818] p-3 text-[#38DBFF]"><Languages size={18}/></button>
    </div>
  </header>;
}

function BalanceCard({ big = false }: { big?: boolean }) { const { t } = useTranslation(); const { data: me } = useAuthMe(); return <div className={cx('rounded-[28px] border border-[#38DBFF]/55 bg-[#090909] p-5 shadow-[0_0_24px_rgba(56,219,255,.28)] animate-[glow_3s_ease-in-out_infinite_alternate]', big && 'p-7')}><div className="flex items-center justify-between"><div><p className="text-[#A8A8A8] text-sm">{t('balance')}</p><h2 className={cx('font-black text-white', big ? 'text-5xl' : 'text-4xl')}>{(me?.balance ?? 12840).toLocaleString()}</h2><p className="text-[#38DBFF] font-semibold">Hype XP</p></div><div className="grid h-16 w-16 place-items-center rounded-3xl bg-[#38DBFF]/15 text-3xl">⚡</div></div></div>; }
function Card({ children, onClick, className }: { children: React.ReactNode; onClick?: () => void; className?: string }) { return <button onClick={onClick} className={cx('w-full rounded-3xl border border-white/10 bg-[#181818]/80 p-4 text-left backdrop-blur transition active:scale-[.98]', className)}>{children}</button>; }
function SectionTitle({ children }: { children: React.ReactNode }) { return <h3 className="mb-3 mt-6 text-sm font-black uppercase tracking-[.18em] text-[#38DBFF]">{children}</h3>; }

function Profile({ nav }: { nav: (to: string) => void }) { const { t } = useTranslation(); const [open, setOpen] = useState(false); return <><BalanceCard/><button onClick={() => setOpen(!open)} className="mt-4 flex w-full items-center justify-between rounded-2xl bg-[#181818] p-4"><span>{t('whatXp')}</span><ChevronRight className={cx('transition', open && 'rotate-90')}/></button>{open && <p className="px-2 pt-3 text-sm text-[#A8A8A8]">{t('whatXpText')}</p>}<SectionTitle>{t('quickActions')}</SectionTitle><div className="grid grid-cols-2 gap-3"><Card onClick={() => nav('/all-tasks')}><Gift className="text-[#36D0A1]"/><b>{t('dailyCheckin')}</b><p className="text-xs text-[#A8A8A8]">+50 XP streak</p></Card><Card onClick={() => nav('/friends')}><Users className="text-[#38DBFF]"/><b>{t('inviteFriends')}</b><p className="text-xs text-[#A8A8A8]">20% referral XP</p></Card></div><SectionTitle>{t('fastTasks')}</SectionTitle><Card onClick={() => nav('/all-tasks')} className="border-[#38DBFF]/50 shadow-[0_0_18px_rgba(56,219,255,.18)]"><div className="flex items-center justify-between"><div><b>FAST TASKS</b><p className="text-sm text-[#A8A8A8]">12 social actions ready</p></div><Sparkles className="text-[#38DBFF]"/></div></Card><SectionTitle>NFT</SectionTitle><div className="grid grid-cols-3 gap-3">{['CYAN APE','MEME CHIP','XP PASS'].map(x=><div key={x} className="rounded-2xl border border-dashed border-white/15 bg-[#090909] p-3 text-center"><div className="mb-2 text-3xl">🧬</div><b className="text-xs">{x}</b><p className="text-[10px] text-[#A8A8A8]">{t('comingSoon')}</p></div>)}</div></>; }

function Tasks() { const [selected, setSelected] = useState<AutoTask | null>(null); const { data: tasks = [] } = useQuery({ queryKey: ['tasks'], queryFn: getAutoTasks }); return <><div className="grid grid-cols-2 gap-3"><Card className="opacity-50"><Lock/><b>Post-Meme</b><p className="text-xs text-[#A8A8A8]">Disabled placeholder</p></Card><Card onClick={() => setSelected(tasks.find(t=>t.name==='daily-checkin') || tasks[0])}><Gift className="text-[#36D0A1]"/><b>Daily</b><p className="text-xs text-[#A8A8A8]">Claim today</p></Card></div><SectionTitle>AutoTaskList</SectionTitle><div className="space-y-3">{tasks.map(task=><button key={task.name} onClick={() => setSelected(task)} className="flex w-full items-center gap-3 rounded-2xl border border-white/10 bg-[#181818] p-3 text-left"><span className="grid h-9 w-9 place-items-center rounded-xl bg-[#38DBFF]/10 text-xl">{task.icon}</span><span className="min-w-0 flex-1"><b>{task.title}</b><p className="truncate text-xs text-[#A8A8A8]">{task.description}</p></span><span className="rounded-full bg-[#38DBFF]/15 px-3 py-1 text-xs font-bold text-[#38DBFF]">+{task.reward} XP</span>{task.status==='CLAIMED'?<CheckCircle2 className="text-[#36D0A1]"/>:<ChevronRight className="text-[#A8A8A8]"/>}</button>)}</div><TaskSheet task={selected} onClose={() => setSelected(null)}/></>; }
function TaskSheet({ task, onClose }: { task: AutoTask | null; onClose: () => void }) { const { t } = useTranslation(); const qc = useQueryClient(); const [canClaim, setCanClaim] = useState(false); const mut = useMutation({ mutationFn: () => claimTask(task!.name), onSuccess: () => { qc.invalidateQueries({ queryKey: ['tasks'] }); qc.invalidateQueries({ queryKey: ['me'] }); onClose(); } }); useEffect(()=>{setCanClaim(false)},[task?.name]); if (!task) return null; const go = () => { window.open(task.url, '_blank'); setTimeout(()=>setCanClaim(true), 5000); }; return <Sheet isOpen={!!task} onClose={onClose} detent="content"><Sheet.Backdrop onTap={onClose} style={{background:'rgba(0,0,0,.68)'}}/><Sheet.Container style={{background:'#090909', borderTopLeftRadius:28, borderTopRightRadius:28, border:'1px solid rgba(56,219,255,.35)'}}><Sheet.Header/><Sheet.Content><div className="px-5 pb-8 text-white"><div className="mx-auto mb-4 grid h-20 w-20 place-items-center rounded-3xl bg-[#38DBFF]/15 text-5xl">{task.icon}</div><h2 className="text-center text-2xl font-black">{task.title}</h2><div className="mt-3 flex justify-center gap-2"><span className="rounded-full bg-[#38DBFF]/15 px-3 py-1 text-[#38DBFF]">+{task.reward} XP</span><span className="rounded-full bg-white/10 px-3 py-1">{task.status}</span></div><p className="mt-4 text-center text-[#A8A8A8]">{task.description}</p><button onClick={canClaim ? () => mut.mutate() : go} disabled={mut.isPending} className="mt-6 w-full rounded-2xl bg-[#38DBFF] py-4 font-black text-black shadow-[0_0_22px_rgba(56,219,255,.45)]">{canClaim ? t('claim') : t('go')}</button><p className="mt-2 text-center text-xs text-[#A8A8A8]">Go opens link, Claim unlocks after 5 sec.</p></div></Sheet.Content></Sheet.Container></Sheet>; }

function Friends() { const { t } = useTranslation(); const { data: me } = useAuthMe(); const ref = `https://t.me/${BOT_USERNAME}?startapp=ref_${me?.refCode ?? 'HF42X9'}`; const webApp = useWebApp(); return <><Card className="border-[#38DBFF]/40"><p className="text-xs text-[#A8A8A8]">Referral link</p><b className="break-all text-[#38DBFF]">{ref}</b><div className="mt-4 grid grid-cols-2 gap-3"><button className="rounded-2xl bg-white/10 py-3" onClick={() => navigator.clipboard?.writeText(ref)}><Copy className="mx-auto mb-1"/> {t('copy')}</button><button className="rounded-2xl bg-[#38DBFF] py-3 text-black" onClick={() => webApp?.openTelegramLink?.(`https://t.me/share/url?url=${encodeURIComponent(ref)}`)}><Share2 className="mx-auto mb-1"/> {t('share')}</button></div></Card><div className="mt-4 grid grid-cols-2 gap-3"><Card><b className="text-3xl">{me?.invitedCount ?? 17}</b><p className="text-[#A8A8A8]">Invited</p></Card><Card><b className="text-3xl">{me?.earnedFromRefs ?? 2460}</b><p className="text-[#A8A8A8]">XP earned</p></Card></div><SectionTitle>Latest invited</SectionTitle>{(me?.latestInvited ?? []).slice(0,5).map((name,i)=><div key={name} className="mb-2 flex items-center gap-3 rounded-2xl bg-[#181818] p-3"><span className="grid h-9 w-9 place-items-center rounded-full bg-[#38DBFF]/15">{i+1}</span><b>{name}</b></div>)}</>; }
function WalletPage() { return <><BalanceCard big/><button onClick={() => alert('TON integration coming')} className="mt-4 w-full rounded-2xl border border-[#38DBFF]/40 bg-[#181818] py-4 font-bold text-[#38DBFF]">TonConnect placeholder</button><button disabled className="mt-3 w-full rounded-2xl bg-white/5 py-4 text-[#A8A8A8]">Buy tokens — coming soon</button><SectionTitle>Recent transactions</SectionTitle>{transactions.map(tx=><div key={tx.id} className="mb-2 flex items-center justify-between rounded-2xl bg-[#181818] p-3"><div><b>{tx.title}</b><p className="text-xs text-[#A8A8A8]">{tx.date}</p></div><span className="text-[#36D0A1]">+{tx.amount} XP</span></div>)}</>; }
function Tutorial({ nav }: { nav: (to: string) => void }) { const { t } = useTranslation(); const slides = [{t:'Welcome',d:'Dark meme factory is live.',e:'👋'}, {t:'Earn XP',d:'Finish fast tasks and claim rewards.',e:'⚡'}, {t:'Invite friends',d:'Share your ref link for bonus XP.',e:'🧲'}]; const [i,setI]=useState(0); const done=()=>{localStorage.setItem('onboardCompleted','1'); nav('/profile')}; return <div className="flex min-h-[58vh] flex-col items-center justify-center text-center"><div className="text-7xl">{slides[i].e}</div><h1 className="mt-5 text-3xl font-black">{slides[i].t}</h1><p className="mt-2 text-[#A8A8A8]">{slides[i].d}</p><div className="mt-8 flex gap-2">{slides.map((_,n)=><span key={n} className={cx('h-2 rounded-full transition-all', n===i?'w-8 bg-[#38DBFF]':'w-2 bg-white/20')}/>)}</div><div className="mt-8 grid w-full grid-cols-2 gap-3"><button onClick={done} className="rounded-2xl bg-white/10 py-4">{t('skip')}</button><button onClick={() => i===2?done():setI(i+1)} className="rounded-2xl bg-[#38DBFF] py-4 font-black text-black">{i===2?t('done'):t('next')}</button></div></div>; }
function Unauthorized() { const { t } = useTranslation(); return <main className="grid h-[100dvh] place-items-center bg-[#0B0B0B] px-6 text-center text-white"><div><div className="mx-auto grid h-28 w-28 place-items-center rounded-[2rem] border border-[#38DBFF]/40 bg-[#38DBFF]/10 text-6xl">🤖</div><h1 className="mt-6 text-3xl font-black">{t('openTelegram')}</h1><p className="mt-3 text-[#A8A8A8]">This Mini App requires Telegram WebApp initData.</p></div></main>; }

const tabs = [['/profile', Home, 'profile'], ['/all-tasks', Target, 'allTasks'], ['/friends', Users, 'friends'], ['/wallet', Wallet, 'wallet'], ['/tutorial', HelpCircle, 'tutorial']] as const;
function BottomNav({ path, nav }: { path: string; nav: (to:string)=>void }) { const { t } = useTranslation(); if (path==='/unauthorized') return null; return <nav className="fixed bottom-0 left-0 right-0 z-30 grid h-[10vh] grid-cols-5 border-t border-white/10 bg-[#090909]/95 px-2 backdrop-blur">{tabs.map(([to,Icon,label])=>{const active=path===to; return <button key={to} onClick={()=>nav(to)} className={cx('flex flex-col items-center justify-center gap-1 text-xs transition', active?'scale-105 text-[#38DBFF]':'text-[#A8A8A8]')}><Icon size={20}/>{t(label)}</button>})}</nav>; }

function Shell() {
  const [path, nav] = usePath();
  const showBack = path === '/tutorial' || path === '/all-tasks';
  const screen = useMemo(() => {
    if (path === '/all-tasks') return <Tasks />;
    if (path === '/friends') return <Friends />;
    if (path === '/wallet') return <WalletPage />;
    if (path === '/tutorial') return <Tutorial nav={nav} />;
    if (path === '/unauthorized') return <Unauthorized />;
    return <Profile nav={nav} />;
  }, [path, nav]);

  if (path === '/unauthorized') return screen;
  return <AuthGate path={path} nav={nav}>
    {showBack && <BackButton onClick={() => nav('/profile')} />}
    <div id="app-shell" className="relative flex h-[100dvh] flex-col overflow-hidden bg-[#0B0B0B] text-white">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(56,219,255,.18),transparent_35%),radial-gradient(circle_at_85%_30%,rgba(54,208,161,.1),transparent_30%)]" />
      <Header nav={nav} />
      <main className="relative z-10 flex-1 overflow-y-auto px-4 pb-[12vh] pt-[19vh]">{screen}</main>
      <BottomNav path={path} nav={nav} />
    </div>
  </AuthGate>;
}

export default function App() {
  return <WebAppProvider options={{ smoothButtonsTransition: true }}>
    <QueryClientProvider client={queryClient}>
      <I18nextProvider i18n={i18n}>
        <Theme appearance="dark" accentColor="cyan" grayColor="slate" radius="large">
          <Shell />
        </Theme>
      </I18nextProvider>
    </QueryClientProvider>
  </WebAppProvider>;
}
