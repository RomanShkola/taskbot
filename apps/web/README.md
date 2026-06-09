# @tbot/web

The TBot **Telegram Mini App** — a task board (list + Kanban) rendered inside Telegram.

## Stack

- **React 19** + **Vite** + **TypeScript**
- **Tailwind CSS v4**
- **TanStack Router** (file-based) + **TanStack Query** / React Query Kit
- **@telegram-apps/sdk-react** for Mini App integration
- **axios** API client

## Scripts

```bash
pnpm dev          # vite dev server (http://localhost:5173)
pnpm build        # tsc -b && vite build
pnpm preview      # preview production build
pnpm check-types  # tsc --noEmit
```

## Environment (`apps/web/.env`)

Only `VITE_`-prefixed vars reach the client.

```
# Absolute base URL of the bot REST API (routes live under /api).
# Must be publicly reachable over HTTPS when the app runs inside Telegram.
VITE_API_URL=https://<api-host>/api
```

The API client (`src/lib/api-client.ts`) uses `VITE_API_URL` as its `baseURL` and:
- attaches `Authorization: tma <initData>` from `window.Telegram.WebApp.initData`,
- sends `ngrok-skip-browser-warning: true` so ngrok-free's interstitial doesn't corrupt XHR responses.

> A Vite dev proxy for `/api` exists in `vite.config.ts` as a fallback, but the app calls `VITE_API_URL` directly.

### Tunneling for Telegram

When testing inside Telegram, the page and the API both need public HTTPS URLs:

```bash
ngrok http 5173   # web  -> set bot WEBAPP_URL to this
ngrok http 3000   # api  -> set VITE_API_URL=https://<api-host>/api
```

`vite.config.ts` sets `server.allowedHosts: true` so tunneled hosts can reach the dev server.

## Architecture

`pages → container → content → components`

```
src/
  routes/              # TanStack Router (file-based): /, /$groupId/tasks, /$groupId/tasks/$taskId
  pages/               # tasks, task-detail (each: .page -> .container -> .content + components)
  components/          # shared UI (layout, badges)
  api/                 # React Query hooks (tasks, groups)
  lib/                 # api-client, telegram helpers
```

Deep links: the root route parses the `startapp=<groupId>_<taskId>` param and navigates to the task.

## Notes

- `@tbot/shared` is aliased to its **TS source** in `vite.config.ts` (the package's `dist` is CommonJS, which breaks ESM named imports under Vite).
- Outside Telegram (plain browser), `initData` is empty so API calls won't authenticate — use it inside Telegram for real data.
