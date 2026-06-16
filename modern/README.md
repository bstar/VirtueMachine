# Modern Port Workspace

All new implementation work goes here.

## Directories

- `sim-core/`: authoritative gameplay simulation
- `platform/`: platform abstraction and adapters
- `client-web/`: renderer/UI/web runtime
- `net/`: multiplayer/auth/persistence backend seed
- `tools/`: migration, replay, diagnostics tools

## One-Command Dev Stack

Run both the web client (Vite HMR) and net API server together in one process:

```bash
./modern/tools/dev_stack.sh
```

`dev_stack.sh` now auto-stops existing listeners on the configured web/net ports before startup, so rerunning the command does not fail on stale processes.

`dev_stack.sh` auto-loads env overrides from `.env.local` at repo root (or `VM_DEV_ENV_FILE`), so you can keep local secrets/config out of git.

Config via env vars:

- `DEV_WEB_BIND` (default `0.0.0.0`)
- `DEV_WEB_PORT` (default `8080`)
- `DEV_WEB_SERVER` (default `vite`, alternative `secure`)
- `VM_NET_HOST` (default `127.0.0.1`)
- `VM_NET_PORT` (default `8081`)
- `VM_NET_RUNTIME_DIR` (default auto-detect: `../ultima6` if present, else `modern/assets/runtime`)
- `VM_NET_OBJECT_BASELINE_DIR` (default `modern/assets/pristine/savegame`, immutable object baseline)
- `VM_NET_API_BASE` (default `http://127.0.0.1:8081`, used by tooling scripts)
- `VM_NET_USER`, `VM_NET_PASS` (defaults `avatar` / `boob`, used by tooling scripts)
- `VM_EMAIL_MODE` (`resend` default, `smtp` alternative, `log` fallback)
- `VM_EMAIL_FROM`, `VM_EMAIL_RESEND_API_KEY` (for Resend mode)
- `VM_EMAIL_SMTP_HOST`, `VM_EMAIL_SMTP_PORT`, `VM_EMAIL_SMTP_USER`, `VM_EMAIL_SMTP_PASS` (for SMTP mode)

## TypeScript Migration Scaffold (Incremental)

The repo now includes Bun+Vite+TypeScript scaffolding for gradual migration:

```bash
bun install
bun run dev:web
bun run typecheck
bun run test
bun run test:ci-required
bun run smoke:browser:movement
bun run release:check
```

Notes:

- `typecheck` runs broad app/net/test TypeScript checks plus strict checks for the release/probe tooling lane.
- `test` runs the project quality gate: typecheck, type-safety lint gates, broad TypeScript tests, UI fixture drift, legacy UI anchors, and net contracts.
- `test:ci-required` runs the heavier CI wrapper for sim-core, parity, strict contracts, and focused client checks.
- `smoke:browser:movement` is an optional live-browser probe for the local dev stack; it skips when Chrome/Chromium or the web client is unavailable, and strict mode requires active walk presentation plus repeated landed movement.
- `release:check` runs `test`, `test:ci-required`, and strict browser movement smoke when a local web/net stack is already running. Use `./modern/tools/release_check.sh --browser-smoke` after starting `dev_stack.sh` to require browser coverage.
- Runtime behavior remains JS-first while abstractions are moved into typed modules slice by slice.

## Baseline Profiles

Import a candidate object baseline profile:

```bash
./modern/tools/import_baseline_profile.sh <profile_name> /path/to/ultima6 --activate
```

Activate a previously imported profile:

```bash
./modern/tools/activate_baseline_profile.sh <profile_name> --reload-net
```

Run one-command Lord British bedroom diff report:

```bash
./modern/tools/check_lb_bedroom.sh
```

## Constraint

Do not modify `legacy/u6-decompiled/SRC/` during normal development.
Use the submodule as reference input and preserve it as baseline.
