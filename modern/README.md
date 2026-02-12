# Modern Port Workspace

All new implementation work goes here.

## Directories

- `sim-core/`: authoritative gameplay simulation
- `platform/`: platform abstraction and adapters
- `client-web/`: renderer/UI/web runtime
- `net/`: multiplayer/auth/persistence backend seed
- `tools/`: migration, replay, diagnostics tools

## One-Command Dev Stack

Run both the web client server and net API server together:

```bash
./modern/tools/dev_stack.sh
```

Config via env vars:

- `DEV_WEB_BIND` (default `0.0.0.0`)
- `DEV_WEB_PORT` (default `8080`)
- `VM_NET_HOST` (default `127.0.0.1`)
- `VM_NET_PORT` (default `8081`)

## Constraint

Do not modify `legacy/u6-decompiled/SRC/` during normal development.
Use the submodule as reference input and preserve it as baseline.
