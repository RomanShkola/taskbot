# TBot — Telegram Task Management Bot + Mini App

Manage tasks straight from Telegram group chats — via bot commands **and** a Telegram Mini App (Kanban/list board). Each Telegram group is its own workspace (data is group-scoped).

## Monorepo layout

| Package | Description |
|---------|-------------|
| [`apps/bot`](apps/bot) | Telegraf bot + Express REST API (MongoDB, Redis, Bull jobs) |
| [`apps/web`](apps/web) | React + Vite + Tailwind Mini App (TanStack Router/Query) |
| [`packages/shared`](packages/shared) | Shared TypeScript types & constants (`@tbot/shared`) |

Tooling: **pnpm workspaces** + **Turborepo**. Requires **Node ≥ 20** and **pnpm 10** (`packageManager` is pinned in `package.json`).

## Quick start (local dev)

```bash
# 1. Install dependencies
pnpm install

# 2. Start MongoDB + Redis (Docker)
docker compose -f docker-compose.dev.yml up -d
#    Already have a Redis container on :6379? Start only Mongo:
#    docker compose -f docker-compose.dev.yml up -d mongodb

# 3. Configure env (see "Environment" below)
cp .env.example apps/bot/.env   # then set BOT_TOKEN

# 4. Run everything
pnpm dev
```

- Bot + REST API → `http://localhost:3000` (polling mode unless `WEBHOOK_URL` is set)
- Mini App → `http://localhost:5173`

Then message your bot `/start` in Telegram.

## Scripts (root)

```bash
pnpm dev          # run all apps (turbo)
pnpm dev:bot      # bot only
pnpm dev:web      # web only
pnpm build        # build all packages
pnpm check-types  # type-check all packages
pnpm lint         # lint all packages (see Known issues)
pnpm format       # prettier --write across the repo
```

## Environment

Env files are **per app** (no combined root file for local dev):

- **`apps/bot/.env`** — bot/API config. Start from [`.env.example`](.env.example).
- **`apps/web/.env`** — only `VITE_`-prefixed vars are exposed to the client. See [`apps/web/README.md`](apps/web/README.md).

The root [`.env.example`](.env.example) documents every bot variable. The root `.env` is **only** used by the production `docker-compose.yml` (`env_file: .env`).

Key bot variables:

| Var | Notes |
|-----|-------|
| `BOT_TOKEN` | from [@BotFather](https://t.me/BotFather) — **required** |
| `MONGODB_URI` | `mongodb://localhost:27017/tbot` (local) / `mongodb://mongodb:27017/tbot` (compose) |
| `REDIS_HOST` / `REDIS_PORT` | `localhost` / `6379` (local) — `redis` in compose |
| `WEBAPP_URL` | Mini App URL — **must be HTTPS** for the menu button / deep links |
| `WEBHOOK_URL` | if set, the bot uses webhook mode instead of polling |

## Running the Mini App inside Telegram

The Mini App must be served over **HTTPS** and reachable from your phone, so use a tunnel in dev:

```bash
ngrok http 5173   # or: cloudflared tunnel --url http://localhost:5173
```

Then set `WEBAPP_URL` (bot) and `VITE_API_URL` (web) to the tunnel(s) and restart `pnpm dev`. See [`apps/web/README.md`](apps/web/README.md) for the API-URL details.

### Telegram launch-point cheat sheet (learned the hard way)

| Where | Button type | Requirement |
|-------|-------------|-------------|
| **Private chat** (DM with bot) | `web_app` inline button / chat menu button | HTTPS URL only — works without BotFather |
| **Group** (task card) | `url` button → `t.me/<bot>?startapp=…` | Needs a **Main Mini App** configured in BotFather |

- `web_app` inline buttons are **private-chat only** — using one in a group returns `BUTTON_TYPE_INVALID`.
- A `t.me/<bot>?startapp=` button is rejected until the bot has a Main Mini App. The bot detects this via `getMe().has_main_web_app` and only shows the group "Open in App" button when it's configured.
- **Enable the group button:** @BotFather → `/mybots` → your bot → **Bot Settings → Configure Mini App** → set the URL to your HTTPS `WEBAPP_URL`, then restart the bot.
- **ngrok free** shows a browser interstitial; XHR calls bypass it via the `ngrok-skip-browser-warning` header, but the top-level page load may show "Visit Site". `cloudflared` has no interstitial.

## Docker (production-style)

The root [`Dockerfile`](Dockerfile) builds and runs **the bot only**; [`docker-compose.yml`](docker-compose.yml) adds Mongo + Redis on an internal network.

```bash
cp .env.example .env          # root .env; set BOT_TOKEN, and use compose hostnames:
                              # REDIS_HOST=redis, MONGODB_URI=mongodb://mongodb:27017/tbot
docker compose up -d --build
```

## Testing

```bash
cd apps/bot && pnpm test      # Jest (unit tests for commands, controllers, services)
```

## Architecture notes

- **Multi-tenancy:** every query is scoped by `groupId` (one Telegram group = one workspace).
- **Mini App auth:** Telegram `initData` is validated server-side via `@telegram-apps/init-data-node` (no separate auth system).
- **Bidirectional sync:** task changes in the Mini App edit the task card in the group chat, and vice-versa.
- **Scheduled jobs (Bull):** hourly due-date reminders, daily group digest.

See [`CLAUDE.md`](CLAUDE.md) for deeper conventions.

## Known issues

- **`pnpm lint` is not functional yet.** ESLint 9 is installed but the apps still use legacy `.eslintrc` files (ignored by v9), and `eslint-import-resolver-typescript` is incompatible with v9. Needs a migration to flat config (`eslint.config.js`). Type-checking (`pnpm check-types`) and tests work.
