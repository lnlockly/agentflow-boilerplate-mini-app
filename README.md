# Mini App full-stack boilerplate

React + Vite + Tailwind v4 frontend + aiogram 3 bot with WebApp button.

## What you get
- `frontend/` — Vite 6 + React 18 + TypeScript + Tailwind CSS 4 (via `@tailwindcss/vite` plugin, no PostCSS config). Telegram WebApp SDK loaded in `<head>`. Production build serves from nginx.
- `backend/` — aiogram 3 bot. `/start` replies with InlineKeyboard whose first button opens the Mini App via `WebAppInfo(url=PREVIEW_URL)`.
- `docker-compose.yml` — both services, env from `.env`.

## Local

```bash
cp .env.example .env
# edit .env: real BOT_TOKEN, PREVIEW_URL=https://your-tunnel.ngrok.app
docker compose up --build
```

Frontend at :8080, bot polling Telegram.

## On AgentFlow

Coder agents call `apply_boilerplate({kind: "mini_app"})` — platform clones this repo into `/workspace`, then customizes `frontend/src/App.tsx` and `backend/bot.py` per project brief. `BOT_TOKEN` and `PREVIEW_URL` come from auto-bot + autoCreateTelegramBot (PR-Y).

## Stack pin
- react@^18.3.1, vite@^6.0.7, typescript@^5.7.2
- tailwindcss@^4.0.0, @tailwindcss/vite@^4.0.0
- framer-motion@^11.18.2, lucide-react@^0.468.0, canvas-confetti@^1.9.3
- @twa-dev/sdk@^8.0.2 (Telegram WebApp typed bindings)
- aiogram==3.* (3.x), python-dotenv
