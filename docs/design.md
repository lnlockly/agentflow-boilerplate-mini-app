# HypeFactory Mini App v2 — Design Doc

**Status:** source of truth for implementation  
**Kind:** `mini_app`  
**Workspace:** `/workspace`  
**Frontend role:** Telegram Mini App SPA for HypeFactory backend  
**Backend base URL:** `VITE_API_URL=https://hypefactory-backend-v2.proj.agentflow.website/api` (temporary stub, must remain environment-driven)  
**Bot username:** `VITE_BOT_USERNAME=hypefactory_bot`

---

## 1. Boilerplate Baseline and Non-Negotiable Constraints

### 1.1 Required boilerplate
The project starts from the curated boilerplate found via `find_boilerplate(kind='mini_app')`:

- **ID:** `6`
- **Name:** `mini-app-fullstack`
- **Repo:** `https://github.com/lnlockly/agentflow-boilerplate-mini-app`
- **Branch:** `main`
- **Title:** `Telegram Mini App — React + aiogram`
- **Relevant guarantees:** Vite + React + TypeScript + Tailwind v4, `@tailwindcss/vite` plugin, Telegram WebApp SDK CDN in `index.html`, correct mobile viewport meta, app title, Tailwind import in `index.css`.

`apply_boilerplate` was invoked first as required. The platform copy step returned `cp: preserving times ... Operation not permitted`, but the workspace already contains the expected boilerplate structure (`frontend`, `backend`, `.env.example`, `docker-compose.yml`, `README.md`). Implementation must treat these meta files as protected.

### 1.2 Files implementers may customize
Per project brief, coders must customize only:

- `frontend/src/App.tsx`
- `frontend/src/components/**`
- `frontend/src/lib/api.ts`
- additional frontend feature files required by this design, such as hooks, shared constants, i18n setup, route/page components, provided they do **not** alter protected meta files.

### 1.3 Protected files / do not touch
Do **not** modify unless explicitly approved in a later design update:

- `frontend/index.html` — must keep Telegram SDK CDN, viewport meta, title.
- `frontend/vite.config.ts` — must keep `@tailwindcss/vite` plugin.
- Existing boilerplate meta/scaffold files that are not required for app logic.

### 1.4 Required stack
Frontend must use:

- React 18 + TypeScript + Vite
- Tailwind CSS v4 through `@tailwindcss/vite`
- Radix UI Themes in dark mode
- `@vkruglikov/react-telegram-web-app` for `useInitData`, `useExpand`, `BackButton`, Telegram WebApp helpers
- TanStack React Query for server cache
- `react-modal-sheet` for bottom sheets
- `react-i18next` for ru/en localization
- `axios` for HTTP

---

## 2. Product Scope

HypeFactory Mini App v2 is a dark cyberpunk Telegram Mini App where users authenticate via Telegram `initData`, receive an app JWT, view XP balance, complete fast tasks, invite friends, inspect wallet placeholders, and complete onboarding/tutorial.

### 2.1 In scope
- Telegram Mini App SPA with 6 routes: `/profile`, `/all-tasks`, `/friends`, `/wallet`, `/tutorial`, `/unauthorized`.
- Protected auth flow: Telegram `initData` → backend login → JWT in `localStorage.hf_token` → authorized API requests.
- Task list and bottom-sheet task detail with Go → 5 second delay → Claim flow.
- Referral link generation and clipboard/share actions.
- i18n ru/en with Telegram language auto-detect.
- Fixed bottom navigation with 5 tabs.
- Dark cyberpunk design with cyan glow.

### 2.2 Out of scope
- Video upload
- Post-meme creation flow
- Advertiser/project management system
- Bybit verification
- Apple/Solana auth
- Real TON jetton minting or TonConnect integration beyond placeholder

---

## 3. Visual Design System

### 3.1 Theme tokens
Tailwind v4 theme tokens in `frontend/src/index.css` must expose the following semantic tokens. If boilerplate already contains theme configuration, implementers should extend it without changing protected meta assumptions.

| Token | Hex | Purpose |
| --- | --- | --- |
| `color-bg-primary` | `#0B0B0B` | App root background |
| `color-bg-secondary` | `#181818` | Elevated sections/sheets |
| `color-bg-card` | `#090909` | Cards |
| `color-brand` | `#38DBFF` | Cyan brand, active nav, highlights |
| `color-success` | `#36D0A1` | Success/claim states |
| `color-text-primary` | `#FFFFFF` | Primary text |
| `color-text-muted` | `#A8A8A8` | Secondary text |

### 3.2 Glow animation
Required Tailwind keyframes:

```css
@keyframes glow {
  from { box-shadow: 0 0 8px rgb(56 219 255 / 0.4); }
  to { box-shadow: 0 0 16px rgb(56 219 255 / 0.8); }
}
```

Required utility/token:

```css
--animate-glow: glow 3s ease-in-out infinite alternate;
```

Cards that must use glow styling:
- `BalanceCard` on `/profile`
- Big `BalanceCard` on `/wallet`
- Featured FAST TASKS `GlowingCard` on `/profile`
- Selected/highlighted task affordances where useful without harming readability

### 3.3 Layout primitives
- Root app shell: `h-[100dvh] bg-bg-primary text-text-primary flex flex-col overflow-hidden` (or Tailwind token equivalent `h-100dvh` if available).
- Header: fixed top, mobile top padding roughly `pt-[10vh]`, XP balance left, language switcher right.
- Main content: `flex-1 overflow-y-auto px-4`, padded to avoid fixed header and bottom nav overlap.
- Bottom nav: fixed bottom, `h-[10vh]`, 5-column grid.
- Modal sheet: `react-modal-sheet`, dark background, rounded top corners, safe-area bottom padding.
- Radix Themes provider: dark appearance globally.

---

## 4. Information Architecture and Routes

### 4.1 Route table

| Route | Protection | Purpose | BackButton behavior |
| --- | --- | --- | --- |
| `/profile` | Protected | Dashboard/home | Hidden |
| `/all-tasks` | Protected | Task list and detail sheet | Shown when task detail sheet is open; otherwise optional hidden |
| `/friends` | Protected | Referral link, stats, latest invited | Hidden by default |
| `/wallet` | Protected | XP wallet and transaction history | Hidden by default |
| `/tutorial` | Protected | 3-slide onboarding/help carousel | Shown; goes previous/close depending slide |
| `/unauthorized` | Public | Fallback when no Telegram initData | Hidden |
| `*` | Protected redirect | Redirect to `/profile` | N/A |

### 4.2 BottomNav tabs
Exactly 5 tabs:

1. `/profile` — Home
2. `/all-tasks` — Tasks
3. `/friends` — Friends
4. `/wallet` — Wallet
5. `/tutorial` — Help

Active tab visual state:
- Text/icon color `text-brand`
- `scale-105`
- Smooth transform transition
- Inactive tabs use muted color

---

## 5. Screen Specifications

### 5.1 `/profile` — Dashboard
Required components/content:

- `BalanceCard` with current XP balance from `GET /api/me` or related auth-me response.
  - Glow border.
  - Click/tap navigates to `/wallet`.
- Collapsible “What’s XP?” explainer.
  - Starts collapsed by default.
  - Explains XP is earned from tasks and referrals.
- Quick actions grid, 2 columns:
  - Daily check-in action; navigates to `/all-tasks` and highlights/opens daily task if supported.
  - Invite friends action; navigates to `/friends`.
- Featured FAST TASKS `GlowingCard`:
  - Click/tap navigates to `/all-tasks`.
- NFT placeholder section:
  - Exactly 3 cards.
  - Each shows “Coming Soon” / localized equivalent.

### 5.2 `/all-tasks` — Task list
Top feature cards, 2 columns:

- `Post-Meme` placeholder card:
  - Disabled state.
  - Shows Coming Soon.
- `Daily` card:
  - Links to check-in/daily task flow if present in auto tasks; otherwise links to task list top.

Auto task list:

- Fetch `GET /api/auto-tasks` through React Query.
- Render at least 10 task rows when backend returns 10+; in dev fallback/mock mode, render 10 default rows only if backend is unavailable and clearly isolate fallback.
- Row component: `AutotaskCardDefaults`.
- Row layout:
  - Icon box: 36px square.
  - Title.
  - Reward badge: `+N XP` pill.
  - Status icon/badge.
- Clicking row opens `TaskDetailSheet` bottom sheet.

Task detail sheet:

- Uses `react-modal-sheet`.
- Contains large icon, title, description if available, reward, status badge.
- Status values: `UNSTARTED`, `APPLIED`, `CLAIMED`.
- Action behavior:
  1. Initial `UNSTARTED`: show `Go` button.
  2. On `Go`, open task URL if present or simulate navigation intent, set local in-sheet timer.
  3. Wait 5 seconds.
  4. Enable `Claim` button.
  5. On claim, call `POST /api/auto-tasks/{name}-claim`.
  6. Invalidate React Query caches for `auto-tasks` and `me` so status/balance update.
- BackButton closes sheet while open.

### 5.3 `/friends` — Referrals
Required content:

- Referral link:
  - Format: `https://t.me/${VITE_BOT_USERNAME}?startapp=ref_${refCode}` or Telegram-compatible equivalent required by backend.
  - `refCode` comes from `GET /api/me`.
- Copy button:
  - Writes referral link to Clipboard API.
  - Shows success toast/state.
- Share button:
  - Uses Telegram WebApp `openTelegramLink` with share/inline-query link where supported.
  - Fallback: copy link and show message.
- Stats:
  - `invitedCount`
  - `earnedFromRefs`
- Latest invited list:
  - Show up to 5 latest invited users.
  - Empty state if none.

### 5.4 `/wallet` — Wallet
Required content:

- Big `BalanceCard` with XP and glow.
- TonConnect placeholder button:
  - On click: `alert('TON integration coming')` or localized equivalent.
  - Must not implement real wallet connection.
- Buy tokens disabled stub.
- Recent transactions list from API if available; otherwise empty state.

### 5.5 `/tutorial` — Help/onboarding carousel
Required behavior:

- 3 slides:
  1. Welcome
  2. Earn XP
  3. Invite friends
- Buttons:
  - `Skip` always available until completed.
  - `Next` on slides 1–2.
  - `Done` on slide 3.
- Persistence:
  - On `Skip` or `Done`, write `localStorage.onboardCompleted = 'true'`.
  - Navigate to `/profile` after completion.
- BackButton:
  - If slide index > 0, go to previous slide.
  - Else navigate to `/profile`.

### 5.6 `/unauthorized`
Public fallback when Telegram `initData` is absent.

Required content:
- Centered illustration/icon.
- Clear message: “Open from Telegram” / localized text.
- Optional helper text explaining the app must be launched from the Telegram bot.
- No protected API requests.

---

## 6. Authentication and Authorization Flow

### 6.1 ProtectedRoute algorithm
`ProtectedRoute` lives at App/router layer.

1. Call `useInitData()` from `@vkruglikov/react-telegram-web-app`.
2. Also read `window.Telegram?.WebApp?.initData` if library returns delayed/empty value.
3. If no `initData`, redirect to `/unauthorized`.
4. Extract referral code from `window.Telegram?.WebApp?.initDataUnsafe?.start_param`:
   - Expected example: `ref_ABC123`.
   - Normalize before sending: backend contract accepts raw `start_param` or parsed `refCode`; see API contract.
5. `POST /api/auth/login` with `{ initData, refCode }`.
6. Save returned JWT in `localStorage.hf_token`.
7. Render protected route only after login succeeds or a valid token already exists and `GET /api/me` passes.
8. On login failure: show retry UI; do not route to `/unauthorized` unless initData is missing.

### 6.2 Axios interceptor
`frontend/src/lib/api.ts` owns an `axios` instance:

- Base URL: `import.meta.env.VITE_API_URL`.
- Request interceptor:
  - Adds `Authorization: Bearer ${localStorage.hf_token}` when token exists.
- Response interceptor:
  - On 401 once per failed request:
    1. Try re-login using current Telegram `initData`.
    2. Store fresh token.
    3. Retry original request.
  - Prevent infinite loops with `_retry` flag.
  - If no initData during 401, clear token and navigate/signal unauthorized.

### 6.3 React Query hooks
Recommended hooks:

- `useAuthLogin()` mutation or internal auth service.
- `useAuthMe()` query: `GET /api/me`, enabled only after token exists.
- `useAutoTasks()` query.
- `useClaimAutoTask(name)` mutation with invalidation of `['auto-tasks']` and `['me']`.
- `useTransactions()` query for wallet.

---

## 7. API Contracts

All paths below are relative to `VITE_API_URL`, currently `https://hypefactory-backend-v2.proj.agentflow.website/api`.

### 7.1 `POST /api/auth/login`
Purpose: validate Telegram initData and issue app JWT.

Request:

```json
{
  "initData": "query_id=...&user=...&hash=...",
  "refCode": "ABC123",
  "startParam": "ref_ABC123"
}
```

Implementation note: frontend may send both `refCode` and `startParam` for compatibility; backend should ignore unknown fields.

Success response:

```json
{
  "token": "jwt-token",
  "user": {
    "id": 123,
    "telegramId": "777000",
    "username": "alice",
    "firstName": "Alice",
    "languageCode": "en",
    "xpBalance": 1250,
    "refCode": "ABC123",
    "invitedCount": 4,
    "earnedFromRefs": 200
  }
}
```

Errors:
- `400` invalid payload
- `401` invalid Telegram signature/initData
- `500` backend error

### 7.2 `GET /api/me`
Headers: `Authorization: Bearer <token>`

Success response:

```json
{
  "id": 123,
  "telegramId": "777000",
  "username": "alice",
  "firstName": "Alice",
  "lastName": "Factory",
  "languageCode": "en",
  "xpBalance": 1250,
  "refCode": "ABC123",
  "invitedCount": 4,
  "earnedFromRefs": 200,
  "latestInvited": [
    { "id": 456, "username": "bob", "firstName": "Bob", "joinedAt": "2026-05-08T12:00:00.000Z" }
  ]
}
```

### 7.3 `GET /api/auto-tasks`
Headers: `Authorization: Bearer <token>`

Success response:

```json
[
  {
    "name": "join_telegram_channel",
    "title": "Join Telegram channel",
    "description": "Subscribe to the HypeFactory channel.",
    "icon": "telegram",
    "url": "https://t.me/hypefactory",
    "rewardXp": 50,
    "status": "UNSTARTED"
  }
]
```

Frontend requirements:
- `name` is used for claim endpoint path.
- `status` must be treated as enum: `UNSTARTED | APPLIED | CLAIMED`.
- Unknown statuses render as muted/disabled with safe fallback text.

### 7.4 `POST /api/auto-tasks/{name}-claim`
Example: `POST /api/auto-tasks/join_telegram_channel-claim`

Headers: `Authorization: Bearer <token>`

Request body: `{}` unless backend later requires proof payload.

Success response:

```json
{
  "ok": true,
  "task": {
    "name": "join_telegram_channel",
    "status": "CLAIMED",
    "rewardXp": 50
  },
  "xpBalance": 1300
}
```

Errors:
- `400` task cannot be claimed yet
- `404` unknown task
- `409` already claimed
- `401` unauthorized; interceptor retries login once

### 7.5 `GET /api/transactions`
Headers: `Authorization: Bearer <token>`

Success response:

```json
[
  {
    "id": "tx_1",
    "type": "TASK_REWARD",
    "amountXp": 50,
    "title": "Task reward",
    "createdAt": "2026-05-08T12:00:00.000Z"
  }
]
```

If backend does not support this endpoint yet, wallet must show a safe empty state and log no noisy errors to users.

---

## 8. Data Schema / Frontend Types

### 8.1 TypeScript domain types

```ts
export type TaskStatus = 'UNSTARTED' | 'APPLIED' | 'CLAIMED';

export interface AuthLoginRequest {
  initData: string;
  refCode?: string | null;
  startParam?: string | null;
}

export interface AuthLoginResponse {
  token: string;
  user: User;
}

export interface User {
  id: number;
  telegramId: string;
  username?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  languageCode?: 'ru' | 'en' | string | null;
  xpBalance: number;
  refCode: string;
  invitedCount: number;
  earnedFromRefs: number;
  latestInvited?: InvitedUser[];
}

export interface InvitedUser {
  id: number;
  username?: string | null;
  firstName?: string | null;
  joinedAt: string;
}

export interface AutoTask {
  name: string;
  title: string;
  description?: string | null;
  icon?: string | null;
  url?: string | null;
  rewardXp: number;
  status: TaskStatus;
}

export interface ClaimTaskResponse {
  ok: boolean;
  task: Pick<AutoTask, 'name' | 'status' | 'rewardXp'>;
  xpBalance: number;
}

export interface Transaction {
  id: string;
  type: 'TASK_REWARD' | 'REF_REWARD' | 'PURCHASE' | 'ADJUSTMENT' | string;
  amountXp: number;
  title: string;
  createdAt: string;
}
```

### 8.2 Local storage keys

| Key | Type | Owner | Purpose |
| --- | --- | --- | --- |
| `hf_token` | string| App auth | JWT for Authorization header |
| `onboardCompleted` | `'true'` | Tutorial | Marks tutorial as completed |
| `i18nextLng` | string | i18next | Selected language if user switches manually |

### 8.3 Derived/referral data

Referral URL is derived, not stored:

```ts
const refLink = `https://t.me/${botUsername}?startapp=ref_${user.refCode}`;
```

`start_param` parsing rules:
- `ref_ABC123` → `refCode = 'ABC123'`
- missing/unknown format → `refCode = null`, still send raw `startParam` for backend compatibility

---

## 9. File Tree Preset

Target frontend tree. Existing boilerplate may contain additional files; do not delete useful scaffold files unless implementation requires cleanup.

```txt
/workspace
├── docs/
│   └── design.md
├── frontend/
│   ├── index.html                 # protected boilerplate meta: do not edit
│   ├── vite.config.ts             # protected: must keep @tailwindcss/vite
│   ├── src/
│   │   ├── App.tsx                # app providers, router, ProtectedRoute
│   │   ├── index.css              # Tailwind v4 import + theme tokens + glow
│   │   ├── main.tsx
│   │   ├── components/
│   │   │   ├── app-shell/
│   │   │   │   ├── AppShell.tsx
│   │   │   │   ├── Header.tsx
│   │   │   │   └── BottomNav.tsx
│   │   │   ├── cards/
│   │   │   │   ├── BalanceCard.tsx
│   │   │   │   ├── GlowingCard.tsx
│   │   │   │   └── NftPlaceholderCard.tsx
│   │   │   ├── tasks/
│   │   │   │   ├── AutoTaskList.tsx
│   │   │   │   ├── AutotaskCardDefaults.tsx
│   │   │   │   └── TaskDetailSheet.tsx
│   │   │   └── ui/
│   │   │       ├── Button.tsx
│   │   │       ├── Badge.tsx
│   │   │       ├── Collapse.tsx
│   │   │       └── EmptyState.tsx
│   │   ├── hooks/
│   │   │   ├── useAuth.ts
│   │   │   ├── useBackButton.ts
│   │   │   ├── useTelegramLanguage.ts
│   │   │   └── useToastState.ts
│   │   ├── lib/
│   │   │   ├── api.ts             # axios instance, interceptors, API methods
│   │   │   ├── queryClient.ts
│   │   │   └── telegram.ts
│   │   ├── pages/
│   │   │   ├── ProfilePage.tsx
│   │   │   ├── AllTasksPage.tsx
│   │   │   ├── FriendsPage.tsx
│   │   │   ├── WalletPage.tsx
│   │   │   ├── TutorialPage.tsx
│   │   │   └── UnauthorizedPage.tsx
│   │   ├── shared/
│   │   │   ├── consts/
│   │   │   │   └── local-text.ts  # LOCAL_TEXT enum
│   │   │   └── types.ts
│   │   └── i18n.ts
│   └── public/
│       └── locales/
│           ├── en.json
│           └── ru.json
└── backend/                       # boilerplate backend/bot area; not part of SPA scope
```

---

## 10. I18N Design

### 10.1 Required files
- `frontend/src/shared/consts/local-text.ts` exports `LOCAL_TEXT` enum/object of translation keys.
- `frontend/public/locales/ru.json`
- `frontend/public/locales/en.json`
- `frontend/src/i18n.ts` initializes `react-i18next`.

### 10.2 Language detection order
1. Manual language selection stored by i18next/localStorage.
2. `window.Telegram.WebApp.initDataUnsafe.user.language_code`.
3. Browser language.
4. Fallback: `en`.

Supported final languages:
- `ru`
- `en`

Any other Telegram language maps to `en`.

### 10.3 Language switcher
Header right-side control toggles `ru`/`en`. UI must update without reload.

---

## 11. State, Cache, and Error Handling

### 11.1 React Query keys
Recommended keys:

```ts
['me']
['auto-tasks']
['transactions']
```

Claim mutation invalidates:
- `['auto-tasks']`
- `['me']`
- optionally `['transactions']`

### 11.2 Loading states
- App boot/auth: full-screen dark loader with cyan accent.
- Task list loading: skeleton rows.
- Balance loading: skeleton pulse card.

### 11.3 Error states
- Auth login failure: retry button and small diagnostic text, no token leakage.
- API 401: interceptor relogin once.
- API unavailable: show user-safe retry state; for tasks only, optional local demo tasks can appear if explicitly labelled fallback in dev/preview.
- Clipboard failure: show manual link text and “select/copy” hint.

---

## 12. Telegram Mini App Integration

### 12.1 Startup
- Call `useExpand()` once at app shell startup to maximize viewport.
- Respect `100dvh` for mobile viewport.
- Use safe-area padding near bottom nav and modal sheet.

### 12.2 BackButton
- Hidden on `/profile`.
- Hidden on `/unauthorized`.
- On `/tutorial`: previous slide or route to `/profile`.
- On `/all-tasks` with open task detail sheet: close sheet.
- Avoid double handlers; centralize in `useBackButton`.

### 12.3 Telegram links/share
- Referral share should prefer Telegram WebApp/openTelegramLink.
- External task `Go` may use `window.Telegram.WebApp.openLink(url)` or `window.open(url, '_blank')` fallback.

---

## 13. Measurable Acceptance Criteria

Implementation is acceptable only if all relevant criteria below pass:

1. **Auth:** In Telegram context with non-empty `initData`, first protected route calls `POST /api/auth/login`, stores JWT in `localStorage.hf_token`, and `GET /api/me` renders XP balance on `/profile`.
2. **Unauthorized fallback:** Without Telegram `initData`, visiting `/profile` redirects to `/unauthorized` and shows centered “Open from Telegram” content with no protected API requests.
3. **Profile UI:** `/profile` shows a glowing XP `BalanceCard`, collapsible “What’s XP?”, 2 quick-action cards, featured FAST TASKS glowing card, and exactly 3 NFT placeholder cards.
4. **Tasks list:** `/all-tasks` renders 10+ task rows when backend returns 10+ tasks; each row has a 36px icon box, title, `+N XP` reward pill, and status indicator.
5. **Claim flow:** Clicking a task opens a bottom sheet; `Go` starts a 5 second delay; `Claim` then calls `POST /api/auto-tasks/{name}-claim` and invalidates/refetches `auto-tasks` plus `me`, updating balance/status.
6. **Friends:** `/friends` renders `https://t.me/hypefactory_bot?startapp=ref_<refCode>`, copy button writes to clipboard, share button invokes Telegram link/share fallback, and stats show `invitedCount` and `earnedFromRefs`.
7. **Wallet:** `/wallet` shows big glowing XP `BalanceCard`, TonConnect placeholder alert, disabled Buy tokens stub, and recent transactions/empty state.
8. **Tutorial:** `/tutorial` has exactly 3 slides (Welcome, Earn XP, Invite friends); Skip and Done set `localStorage.onboardCompleted = 'true'` and navigate to `/profile`.
9. **Navigation:** BottomNav has exactly 5 tabs mapped to `/profile`, `/all-tasks`, `/friends`, `/wallet`, `/tutorial`; active tab is cyan and `scale-105` with transition.
10. **HTML/meta:** Preview HTML keeps boilerplate head: Telegram SDK CDN, mobile viewport meta, and title are present.
11. **CSS bundle:** Production build includes Tailwind v4 bundled CSS over 5 KB and contains dark theme defaults/tokens.
12. **I18N:** When Telegram user language is `en`, initial UI text is English; language switcher can toggle to Russian without reload.
13. **Performance:** Lighthouse mobile score on `/profile` is 85+ in preview, assuming backend latency is normal or mocked for audit.
14. **No scope creep:** No real TON minting, video upload, post-meme creation, advertiser system, Bybit verification, or Apple/Solana auth is implemented.

---

## 14. Risk Register and Fallbacks

| Risk | Impact | Likelihood | Fallback / Mitigation |
| --- | --- | --- | --- |
| `apply_boilerplate` copy error due file permissions | Scaffold may be partial | Medium | Workspace already has boilerplate-like tree; verify protected files before coding; do not alter meta files. |
| Telegram `initData` unavailable in browser preview | Protected pages redirect to unauthorized, hard to test | High | Add dev-only documented mock mode only if later approved; otherwise test `/unauthorized` in browser and auth flow in Telegram. |
| Backend stub URL unavailable | Tasks/profile cannot load | Medium | Show retry states; optional clearly labelled local fallback task rows for preview only; never fake successful claim as real backend result. |
| 401 interceptor infinite loop | Bad UX/API storm | Medium | Add `_retry` flag and single-flight relogin guard. |
| React Query stale balance after claim | Acceptance criterion 5 fails | Medium | Always invalidate `['me']`, `['auto-tasks']`, and optionally transactions after claim. |
| Clipboard API blocked | Referral copy fails | Medium | Show ref link in selectable text and fallback toast. |
| Telegram share URL unsupported on some clients | Share button unreliable | Medium | Fallback to copied link and user instruction. |
| Tailwind token naming mismatch | Visual requirements fail | Medium | Centralize classes/constants; build-grep CSS for tokens/glow. |
| Bottom nav overlaps content on mobile | Poor UX | Medium | Add bottom padding equal to nav height plus safe-area; use `100dvh`. |
| i18n files missing keys | Mixed language UI | Medium | Use `LOCAL_TEXT` enum and type/CI grep for key coverage where possible. |
| Lighthouse below 85 due heavy libraries | Acceptance criterion 13 fails | Low/Medium | Lazy-load pages/sheets where reasonable, avoid large images, keep placeholders CSS/SVG. |

---

## 15. Eliza-native Usage Section

This project is implemented by an AgentFlow/Eliza-native team. The following operational rules apply:

1. **Design doc is source of truth.** Coders must read `/workspace/docs/design.md` before modifying frontend code.
2. **Shared workspace discipline.** Before edits: `cd /workspace && git pull --ff-only` (after safe.directory setup if needed). After edits: run checks, `git add`, `git commit -m "<summary> [<agent_slug>]"`, `git push`.
3. **Tooling.** All filesystem/code operations must go through MCP `code-exec` tools against project `proj-4yd1s6x1`.
4. **Protected boilerplate contract.** Do not edit `frontend/index.html` or `frontend/vite.config.ts`; implementation focuses on `App.tsx`, components, hooks, i18n, and `lib/api.ts`.
5. **Secrets/env.** Do not hardcode secrets. `VITE_API_URL` and `VITE_BOT_USERNAME` come from env. JWT is runtime localStorage only.
6. **Validation before handoff.** Coder must run production build, inspect generated HTML/CSS, and provide preview URL/HTTP status when launching service.
7. **Testing roles.** Web tester should verify routes, unauthorized fallback, bottom sheet flow, nav active states, and i18n. Auditor should grep for acceptance-critical strings/endpoints and check no protected meta files were changed.

---

## 16. Implementation Notes for Next Coder

- Start by verifying boilerplate files exist and contain expected protected metadata.
- Install required deps only if not already present:
  - `@radix-ui/themes`
  - `@vkruglikov/react-telegram-web-app`
  - `@tanstack/react-query`
  - `react-modal-sheet`
  - `react-i18next`, `i18next`, optionally `i18next-http-backend` / browser language detector
  - `axios`
  - router package if boilerplate lacks it (`react-router-dom`)
- Keep UI resilient if API responses have extra fields.
- Prefer small SVG/icon components or emoji-style placeholders to avoid asset weight.
- Avoid implementing any out-of-scope flows as real functionality; disabled cards/stubs are enough.

---

## 17. Verification Checklist for Design Handoff

This design document is complete if it contains:

- [x] Boilerplate reference and first-call result
- [x] Protected file constraints
- [x] File tree
- [x] API contracts
- [x] Data schema / frontend types
- [x] Six route/screen specifications
- [x] Auth flow with initData → JWT and 401 relogin retry
- [x] I18N ru/en plan and `LOCAL_TEXT`
- [x] Tailwind v4 tokens and glow animation
- [x] 5-tab BottomNav spec
- [x] ≥5 measurable acceptance criteria
- [x] Risk register with fallbacks
- [x] Eliza-native usage section
