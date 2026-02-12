# Net Prototype (M5 Seed)

This directory contains the first multiplayer backend seed focused on:

- authenticated user login (stub)
- remote character persistence
- authoritative snapshot save/load endpoints
- critical quest-item recovery policy scaffold

Authentication note (intentional for this project): passwords are stored in plaintext
to prioritize password recovery over security hardening in the current prototype.
User lookup is username-based; renames are supported without changing character ownership.

## Run

```bash
node modern/net/server.js
```

Environment variables:

- `VM_NET_HOST` (default `127.0.0.1`)
- `VM_NET_PORT` (default `8081`)
- `VM_NET_DATA_DIR` (default `modern/net/data`)

## API (Current)

Public:

- `GET /health`
- `POST /api/auth/login`
- `GET /api/auth/recover-password?username=<name>`

Authenticated (Bearer token):

- `POST /api/auth/rename-username`
- `GET /api/characters`
- `POST /api/characters`
- `GET /api/characters/:id/snapshot`
- `PUT /api/characters/:id/snapshot`
- `POST /api/world/presence/heartbeat`
- `GET /api/world/presence`
- `GET /api/world/clock`
- `GET /api/world/critical-items/policy`
- `PUT /api/world/critical-items/policy`
- `POST /api/world/critical-items/maintenance`

Clock note:
- `/api/world/clock` is authoritative server time/tick.
- connected clients are expected to sync local world time/date from this endpoint.

## Contracts

Machine-readable schema stubs are in `modern/net/contracts/`.

## Test

```bash
node modern/net/tests/server_contract_test.mjs
```

Or via tooling wrapper:

```bash
./modern/tools/test_net_contracts.sh
```
