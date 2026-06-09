# TBot — Telegram Task Management Bot + Mini App

## Overview

Monorepo for a Telegram bot + Mini App that manages tasks from group chats. Based on migrated ebot infrastructure.

## Structure

- `apps/bot` — Telegraf bot + Express REST API (webhook mode)
- `apps/web` — React + Vite + Tailwind Mini App
- `packages/shared` — Shared TypeScript types and constants

## Commands

```bash
pnpm dev          # Run all apps
pnpm dev:bot      # Run bot only
pnpm dev:web      # Run web only
pnpm build        # Build all packages
pnpm lint         # Lint all packages
pnpm check-types  # Type check all packages
```

## Architecture

### Bot (apps/bot)
- Telegraf.js for Telegram Bot API
- Express for REST API (serves Mini App API + webhook)
- MongoDB (Mongoose) for persistent data
- Redis for sessions, rate limiting, callback data
- Bull for scheduled jobs (reminders, digests)
- AI service abstraction (Gemini/Fuse providers)

### Web (apps/web)
- React + Vite + TypeScript
- Tailwind CSS v4
- TanStack Router (file-based routing)
- TanStack Query + React Query Kit
- @telegram-apps/sdk-react for Mini App integration
- Architecture: pages → container → content → components

### Shared (packages/shared)
- TypeScript types shared between bot and web
- Constants (task statuses, priorities)
- Import as `@tbot/shared`

## Patterns

### Bot command registration
Commands register via `.register()` returning `Map<string, handler>`. Added to command maps in `src/bot/index.ts`.

### Data flow
- Redis sessions — ephemeral per-user state
- MongoDB — persistent data (tasks, users, groups)
- Bull — scheduled jobs (cron-based)

### Multi-tenancy
Data is group-scoped. Each Telegram group = one workspace. All queries filter by `groupId`.

### Mini App auth
Telegram `initData` validated via HMAC against BOT_TOKEN. No separate auth system.
