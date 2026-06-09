# @tbot/shared

Shared TypeScript types and constants used by both `@tbot/bot` and `@tbot/web`.

## Contents

- **Types** — `Task`, `User`, `Group`, API request/response shapes.
- **Constants** — task status & priority enums, labels, ordering, defaults
  (`TASK_STATUS_LABELS`, `TASK_PRIORITY_LABELS`, `TASK_STATUS_ORDER`, `TASK_PRIORITY_ORDER`, …).

## Usage

```ts
import { TaskStatus, TASK_PRIORITY_LABELS } from '@tbot/shared';
```

## Scripts

```bash
pnpm build        # tsc -> dist/
pnpm dev          # tsc --watch
pnpm check-types  # tsc --noEmit
```

## Consumption notes

- The **bot** (Node/CommonJS) imports the compiled `dist/` (`main: ./dist/index.js`).
- The **web** app (Vite/ESM) imports the **TS source** directly via a Vite alias, because the
  CommonJS `dist` (with `__exportStar` re-exports) doesn't expose named exports to ESM consumers.

Keep this package free of runtime dependencies — types and plain constants only.
