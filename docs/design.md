# HypeFactory Mini App — Error Handling Design Doc

**Status:** source of truth for implementation  
**Kind:** `mini_app`  
**Workspace:** `/workspace`  
**Artifact:** Telegram Mini App SPA frontend  
**API base:** `VITE_API_URL=https://hypefactory-backend-v2.proj.agentflow.website/api`  
**Bot:** `VITE_BOT_USERNAME=hypefactory_bot`  
**Focus:** typed, localized, Telegram-native error handling for auth, API, task claims, referral actions, navigation, and offline states.

---

## 1. Boilerplate Baseline and Constraints

Implementation starts from the curated mini-app boilerplate: `mini-app-fullstack` id `6`, repository `https://github.com/lnlockly/agentflow-boilerplate-mini-app`, branch `main`. The mandated first actions were executed: `find_boilerplate(kind='mini_app')` then `apply_boilerplate`. The apply step returned a platform copy-permission error (`cp: preserving times ... Operation not permitted`), but the workspace already contains the expected `frontend/` and `backend/` structure.

Protected files that must not be edited for this task:
- `frontend/index.html` — keep Telegram SDK CDN, viewport meta, title.
- `frontend/vite.config.ts` — keep Tailwind v4 Vite plugin.
- Boilerplate meta files unrelated to app logic.

Primary allowed customization:
- `frontend/src/App.tsx`
- `frontend/src/components/**`
- `frontend/src/lib/api.ts`

Additional app-logic files are allowed when needed: `lib/errors.ts`, `lib/auth.ts`, `lib/telegram.ts`, `lib/queryClient.ts`, `hooks/**`, `shared/consts/local-text.ts`, `i18n.ts`, `public/locales/{ru,en}.json`.

---

## 2. Scope

HypeFactory Mini App is a dark cyberpunk Telegram Mini App SPA. It authenticates using Telegram `initData`, exchanges it for a JWT, shows XP balance, task lists, task detail bottom sheets, referral stats, wallet placeholder, tutorial, and unauthorized fallback.

This document defines error handling for all six screens:
1. `/profile`
2. `/all-tasks`
3. `/friends`
4. `/wallet`
5. `/tutorial`
6. `/unauthorized`

Goals:
- No raw backend/Axios/JWT/initData errors in UI.
- Every expected failure maps to a typed `AppError`.
- All user-visible errors are localized in ru/en.
- Retriable failures expose retry actions.
- Stale cached data may be shown with clear warning.
- Task claim flow remains consistent after network, auth, and conflict failures.

Out of scope: video upload, post-meme creation, advertiser system, Bybit verification, Apple/Solana auth, real TON minting.

---

## 3. Visual/Error UX Rules

Severity levels:

| Severity | Use case | UI treatment |
|---|---|---|
| `info` | Disabled feature, TON placeholder | muted card, cyan icon |
| `warning` | offline, timeout, stale cache | top banner or toast, retry |
| `error` | failed API operation | inline card/sheet error, retry if safe |
| `fatal` | no Telegram context, auth loop | full-screen state or `/unauthorized` |

Tone: short cyberpunk copy, no technical jargon. Examples:
- `Signal lost. Check connection and retry.`
- `Factory is cooling down. Try again in a minute.`
- `Task already claimed. Balance is syncing.`

All text must be keyed via `LOCAL_TEXT` and translated in `ru.json` and `en.json`.

---

## 4. File Tree

```text
/workspace
├── docs/
│   └── design.md
├── frontend/
│   ├── index.html                         # protected
│   ├── vite.config.ts                     # protected
│   ├── src/
│   │   ├── App.tsx                        # routes, ProtectedRoute, ErrorBoundary
│   │   ├── components/
│   │   │   ├── AppErrorBoundary.tsx       # render crash fallback
│   │   │   ├── ErrorState.tsx             # full/section error UI
│   │   │   ├── OfflineBanner.tsx          # navigator.onLine warning
│   │   │   ├── RetryButton.tsx            # shared retry CTA
│   │   │   ├── ToastHost.tsx              # app notifications
│   │   │   ├── BalanceCard.tsx            # loading/error fallback
│   │   │   ├── BottomNav.tsx              # safe active route fallback
│   │   │   ├── TaskDetailSheet.tsx        # claim inline errors
│   │   │   └── TaskRow.tsx                # status/error rendering
│   │   ├── hooks/
│   │   │   ├── useAuthMe.ts
│   │   │   ├── useAutoTasks.ts
│   │   │   ├── useTaskClaimFlow.ts
│   │   │   ├── useReferral.ts
│   │   │   └── useTelegramBackButton.ts
│   │   ├── lib/
│   │   │   ├── api.ts                     # axios, interceptors
│   │   │   ├── auth.ts                    # login/token/re-login guard
│   │   │   ├── errors.ts                  # AppError model/mappers
│   │   │   ├── queryClient.ts             # retry policy
│   │   │   └── telegram.ts                # safe TG wrappers
│   │   ├── shared/consts/local-text.ts    # LOCAL_TEXT enum
│   │   └── i18n.ts                        # language detection/fallbacks
│   └── public/locales/
│       ├── en.json
│       └── ru.json
└── backend/                               # unchanged for this design
```

---

## 5. Runtime Architecture

Error handling layers:
1. `lib/api.ts`: catches Axios/network/timeout failures.
2. `lib/auth.ts`: login, token storage, guarded 401 re-login.
3. `lib/errors.ts`: converts unknown errors into `AppError`.
4. React Query hooks: retry, stale cache, invalidation.
5. Components: localized banners, cards, bottom-sheet inline errors.
6. `AppErrorBoundary`: catches render-time crashes.

### Required `AppError` contract

```ts
export type AppErrorCode =
  | 'NO_TELEGRAM_INIT_DATA'
  | 'AUTH_LOGIN_FAILED'
  | 'AUTH_RETRY_EXHAUSTED'
  | 'UNAUTHORIZED'
  | 'NETWORK_OFFLINE'
  | 'NETWORK_TIMEOUT'
  | 'SERVER_UNAVAILABLE'
  | 'VALIDATION_FAILED'
  | 'TASK_ALREADY_CLAIMED'
  | 'TASK_NOT_READY_TO_CLAIM'
  | 'TASK_CLAIM_FAILED'
  | 'REFERRAL_COPY_FAILED'
  | 'TELEGRAM_SHARE_FAILED'
  | 'I18N_LOAD_FAILED'
  | 'UNKNOWN_ERROR';

export type AppErrorSeverity = 'info' | 'warning' | 'error' | 'fatal';

export interface AppError {
  code: AppErrorCode;
  severity: AppErrorSeverity;
  messageKey: string;
  status?: number;
  retryable: boolean;
  correlationId?: string;
  safeDetails?: string;
  cause?: unknown;
}
```

Sanitization rules:
- Never log/render `Authorization`, JWT, Telegram `initData`, `hash`, raw user JSON, or request bodies containing secrets.
- Console logs may include only `AppError.code`, `status`, `correlationId`, and sanitized `safeDetails`.
- Do not persist error payloads to `localStorage`.

---

## 6. API Contracts and Error Mapping

### 6.1 Environment contract
Required env values:
```text
VITE_API_URL=https://hypefactory-backend-v2.proj.agentflow.website/api
VITE_BOT_USERNAME=hypefactory_bot
```
If `VITE_API_URL` is missing, render fatal localized config error; do not silently call relative endpoints.

### 6.2 Auth login
`POST /api/auth/login`

Request:
```ts
interface LoginRequest { initData: string; refCode?: string }
```
Response:
```ts
interface LoginResponse { token: string; user: Me }
```
Error mapping:
| Condition | AppError | UI |
|---|---|---|
| no initData | `NO_TELEGRAM_INIT_DATA` | redirect `/unauthorized` |
| 400/403 invalid initData | `AUTH_LOGIN_FAILED` | unauthorized state |
| network/timeout | `NETWORK_TIMEOUT` | protected-route retry |
| 5xx | `SERVER_UNAVAILABLE` | retry card |
| repeated 401 after re-login | `AUTH_RETRY_EXHAUSTED` | clear token, unauthorized/retry |

### 6.3 Current user
`GET /api/me` with `Authorization: Bearer <hf_token>`.

```ts
interface Me {
  id: string;
  telegramId: string;
  username?: string;
  firstName?: string;
  languageCode?: string;
  balanceXp: number;
  refCode: string;
  invitedCount: number;
  earnedFromRefs: number;
}
```
401 behavior: interceptor performs exactly one guarded re-login using current Telegram `initData`, then retries original request once. If it fails, clear `hf_token` and emit `AUTH_RETRY_EXHAUSTED`.

### 6.4 Auto tasks
`GET /api/auto-tasks`

```ts
interface AutoTask {
  name: string;
  title: string;
  description?: string;
  icon?: string;
  rewardXp: number;
  status: 'UNSTARTED' | 'APPLIED' | 'CLAIMED';
  goUrl?: string;
}
type AutoTasksResponse = AutoTask[];
```
Error behavior:
- Network/5xx: use cached list if present plus warning; otherwise `ErrorState` with retry.
- Empty list: render empty state, not an error.
- Invalid row: skip row and log sanitized warning.
- Production acceptance requires 10+ valid rows.

### 6.5 Claim task
`POST /api/auto-tasks/{name}-claim`

Response:
```ts
interface ClaimResponse { task: AutoTask; balanceXp: number; transaction?: Transaction }
```
State machine:
```text
idle -> opened -> go_clicked -> waiting_5s -> claim_enabled -> claiming -> claimed
                                                └-> claim_error
```
Rules:
- Encode `{name}` path segment.
- `Go` opens `goUrl` through Telegram-safe wrapper if available, then starts 5 second timer.
- Claim disabled until timer completes and while request is in flight.
- Success: invalidate `['auto-tasks']` and `['me']`; update balance from response if present.
- 409: `TASK_ALREADY_CLAIMED`, mark claimed, invalidate queries.
- 400/not ready: `TASK_NOT_READY_TO_CLAIM`, keep sheet open.
- Network/5xx: `TASK_CLAIM_FAILED`, keep Claim enabled for retry.

### 6.6 Referral
Frontend-composed link:
```ts
const refLink = `https://t.me/${VITE_BOT_USERNAME}?startapp=ref_${me.refCode}`;
```
Copy uses `navigator.clipboard.writeText`; on failure show `REFERRAL_COPY_FAILED` and visible text field. Share uses Telegram `openTelegramLink` when available; fallback to `window.open(refLink, '_blank')`; if unavailable show `TELEGRAM_SHARE_FAILED`.

### 6.7 Wallet transactions
```ts
interface Transaction {
  id: string;
  type: 'TASK_REWARD' | 'REFERRAL_REWARD' | 'PURCHASE' | 'SYSTEM';
  amountXp: number;
  createdAt: string;
  title?: string;
}
```
Transactions failure must not block balance rendering. TON and buy-token buttons are `info` stubs with localized `TON integration coming` message.

---

## 7. Data Schema

No frontend database. Browser persistence only:

| Key | Type | Sensitive | Rule |
|---|---|---|---|
| `hf_token` | JWT string | yes | set after login, remove on auth exhaustion |
| `onboardCompleted` | `'true'` | no | set on Skip/Done |
| `i18nextLng` | language code | no | i18next-managed fallback |

React Query keys:
| Key | Source | Stale time | Retry |
|---|---|---:|---:|
| `['me']` | `GET /api/me` | 30s | 1 except 401/403 |
| `['auto-tasks']` | `GET /api/auto-tasks` | 30s | 2 for network/5xx |
| `['transactions']` | optional future endpoint | 60s | 1 |

---

## 8. Screen-Level Error Handling

### `/unauthorized`
Shown when `initData` is absent/invalid. UI: centered illustration, localized title, `Open from Telegram`, bot link using `VITE_BOT_USERNAME`. No JWT, no retry loop.

### `/profile`
`BalanceCard` shows skeleton while `me` loads. If `me` fails and no cache: section `ErrorState` with retry. If cached: show stale balance plus warning. Quick actions and NFT placeholders remain visible when safe.

### `/all-tasks`
Task list uses cached tasks on transient failures. Task detail bottom sheet renders inline claim errors and never closes automatically on failure. Status badges: `UNSTARTED`, `APPLIED`, `CLAIMED`. Disabled Post-Meme card is info, not error.

### `/friends`
If `me` unavailable, referral link area shows retry state. Clipboard/share errors use toast + manual copy fallback. Stats default to skeleton/loading, not zero, until data is known.

### `/wallet`
Balance is primary; transaction failures render local empty/error state only in transaction section. TON placeholder shows info toast/alert.

### `/tutorial`
Carousel must work offline. Skip/Done writes `onboardCompleted`; if localStorage write fails, keep UI navigable and show warning toast.

### Navigation and BackButton
BottomNav active route fallback: unknown route redirects to `/profile` if authorized, `/unauthorized` otherwise. Telegram BackButton visible on `/all-tasks` task detail and `/tutorial`, hidden on `/profile`; wrapper must no-op outside Telegram.

---

## 9. I18N Contract

`LOCAL_TEXT` must include at least:
- `error.noTelegramInitData`
- `error.authLoginFailed`
- `error.authRetryExhausted`
- `error.networkOffline`
- `error.networkTimeout`
- `error.serverUnavailable`
- `error.taskAlreadyClaimed`
- `error.taskNotReadyToClaim`
- `error.taskClaimFailed`
- `error.referralCopyFailed`
- `error.telegramShareFailed`
- `error.unknown`
- `action.retry`
- `action.openFromTelegram`
- `action.copyManually`

Language detection order:
1. `WebApp.initDataUnsafe.user.language_code`
2. existing `i18nextLng`
3. browser language
4. `en`

If locale JSON fails to load, fallback to bundled English strings and emit `I18N_LOAD_FAILED` warning, not fatal.

---

## 10. React Query and Retry Policy

Default query policy:
```ts
retry: (failureCount, error) => {
  const appError = toAppError(error);
  if (['UNAUTHORIZED', 'AUTH_RETRY_EXHAUSTED', 'NO_TELEGRAM_INIT_DATA'].includes(appError.code)) return false;
  if (appError.status && appError.status >= 400 && appError.status < 500) return false;
  return failureCount < 2;
}
```
Mutations:
- Claim mutation has no automatic retry; user retries manually to prevent duplicate claims.
- Login mutation may be retried once for network/5xx only.

---

## 11. Observability and Debugging

Frontend-only observability:
- `console.warn('[HF_ERROR]', { code, status, correlationId })` in development.
- No raw payloads or secrets.
- If backend returns `x-correlation-id`, store it in `AppError.correlationId` and show short support text only for fatal errors.

Recommended manual QA toggles (dev only): mock offline, mock 401 once, mock claim 409, mock 500. These must not be enabled in production by default.

---

## 12. Risk Register with Fallbacks

| Risk | Impact | Fallback |
|---|---|---|
| Backend stub unavailable | Profile/tasks fail | Show cached data if available; otherwise localized retry cards; allow tutorial/wallet placeholders |
| Telegram `initData` absent in browser preview | Protected routes inaccessible | `/unauthorized` page validates fallback; QA can mock Telegram only in dev builds |
| 401 interceptor loops | Battery/network drain, bad UX | Single-flight re-login, `_retry` flag per request, max one retry then clear token |
| Claim request duplicated by double tap | Duplicate backend operations | Disable Claim while `claiming`; backend conflict maps to `TASK_ALREADY_CLAIMED` |
| Clipboard API blocked | Referral copy broken | Show manual copy text field and toast |
| Telegram share API unavailable | Share button broken | Fallback to `window.open(refLink)`; if blocked show manual link |
| Locale file fails | Blank/error copy | Bundled English fallback and `I18N_LOAD_FAILED` warning |
| Stale balance after claim | User distrust | Invalidate `['me']`; optimistically use `balanceXp` from claim response |
| Protected meta files accidentally edited | Acceptance failure | Code review/gate checks `git diff -- frontend/index.html frontend/vite.config.ts` must be empty |
| Tailwind bundle/theme broken | Visual acceptance failure | Do not edit meta files; verify bundled CSS size >5KB in final UI task |

---

## 13. Measurable Acceptance Criteria

1. Without Telegram `initData`, opening `/profile` redirects to `/unauthorized` and shows localized `Open from Telegram`; no login POST is attempted.
2. With valid mocked Telegram `initData`, first protected route performs exactly one `POST /api/auth/login`, stores `localStorage.hf_token`, then `GET /api/me` includes `Authorization: Bearer ...`.
3. When `GET /api/me` returns 401 once, interceptor performs one re-login and retries the original request once; if the retry also returns 401, token is cleared and `AUTH_RETRY_EXHAUSTED` is shown.
4. When `GET /api/auto-tasks` returns 500 and cached tasks exist, `/all-tasks` still renders cached rows plus a warning banner; with no cache it renders `ErrorState` with Retry.
5. Task claim button remains disabled for the first 5 seconds after `Go`; during claim request it is ` disabled and cannot double-submit.
6. A successful task claim invalidates both `['auto-tasks']` and `['me']`, updates visible XP balance from `ClaimResponse.balanceXp` when present, and closes or marks the sheet as claimed.
7. A 409 claim response maps to `TASK_ALREADY_CLAIMED`, marks the task as claimed, and does not show a fatal error.
8. Clipboard failure on `/friends` shows `REFERRAL_COPY_FAILED` toast and a visible manual-copy referral link.
9. All `AppErrorCode` values have ru and en translations; no user-facing error string is hardcoded in task/auth components.
10. Offline mode (`navigator.onLine=false` or failed network) shows `OfflineBanner` within 1 second and keeps bottom navigation usable.
11. `frontend/index.html` and `frontend/vite.config.ts` remain unchanged by the error-handling implementation.
12. No console log or rendered text contains JWT, `initData`, `Authorization`, or Telegram `hash` values in normal error flows.
13. `/tutorial` remains usable without network and persists `onboardCompleted` on Skip/Done; localStorage write failure shows warning but does not block navigation.
14. `AppErrorBoundary` catches a forced render error and displays localized full-screen retry/reset UI instead of a blank page.

---

## 14. Eliza-Native Usage Section

This project is implemented inside AgentFlow/Eliza-style multi-agent workflow. The design is the single source of truth for planner, coder, tester, critic, and auditor agents.

Agent rules:
- Coder agents must read this document before changing frontend error handling.
- Use MCP/code-exec operations in `/workspace`; do not create a new project pod.
- Keep secrets out of files and commits. `VITE_API_URL` and `VITE_BOT_USERNAME` may be documented; tokens/JWT/initData must never be committed.
- Before editing shared repo: run `cd /workspace && git pull --ff-only`.
- After edits: add only task-owned files, commit with agent slug, and push.
- If implementing UI, do not touch protected meta files from the boilerplate.
- Tester agents should verify acceptance criteria through build, preview, mocked network responses, and Telegram/no-Telegram scenarios.
- Auditor agents should check this design sections: file tree, API contracts, data schema, measurable acceptance criteria, risk register with fallbacks, and Eliza-native usage.

Recommended implementation order:
1. Add `lib/errors.ts` and `LOCAL_TEXT` keys/translations.
2. Harden `lib/api.ts` and `lib/auth.ts` with typed mapping and guarded 401 retry.
3. Add ErrorBoundary, ErrorState, OfflineBanner, RetryButton.
4. Wire React Query retry policy.
5. Apply screen-level handling to profile/tasks/friends/wallet/tutorial/unauthorized.
6. Add tests/manual QA scripts for no initData, 401 retry, 500 tasks, claim 409, clipboard failure, offline.

---

## 15. Validation Checklist for Future Coders

Before marking implementation complete, verify:
- `npm run build` succeeds.
- Preview HTML keeps Telegram SDK CDN and viewport meta.
- Bundled CSS is greater than 5KB and dark theme is default.
- `/unauthorized` works in a normal browser without Telegram.
- Mocked Telegram initData path logs in and renders `/profile` balance.
- `/all-tasks` renders 10+ task rows in happy path.
- Claim flow follows Go -> 5 second delay -> Claim -> invalidate queries.
- ru/en language switch or Telegram language auto-detect changes error strings.
- No protected meta files changed.
- No secrets appear in git diff or console output.
