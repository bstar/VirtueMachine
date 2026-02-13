# Net Prototype (M5 Seed)

This directory contains the first multiplayer backend seed focused on:

- authenticated user login (stub)
- remote character persistence
- authoritative snapshot save/load endpoints
- critical quest-item recovery policy scaffold

Authentication note (intentional for this project): passwords are stored in plaintext
to prioritize password recovery over security hardening in the current prototype.
Password recovery now requires:
- a verified recovery email on the account
- username + matching email

Email delivery modes:
- `resend` (default): delivers via Resend API and logs delivery records to `modern/net/data/email_outbox.log`
- `smtp`: delivers via real SMTP and logs delivery records to `modern/net/data/email_outbox.log`
- `log`: writes verification/recovery mail payloads to `modern/net/data/email_outbox.log` (test/dev fallback)

## Run

```bash
node modern/net/server.js
```

With dev stack + local secrets file:

```bash
cp .env.local.example .env.local
# edit .env.local with your Resend key/from address
./modern/tools/dev_stack.sh
```

Environment variables:

- `VM_NET_HOST` (default `127.0.0.1`)
- `VM_NET_PORT` (default `8081`)
- `VM_NET_DATA_DIR` (default `modern/net/data`)
- `VM_NET_PRESENCE_TTL_MS` (default `10000`, stale presence reap window)
- `VM_EMAIL_MODE` (`resend`, `smtp`, or `log`, default `resend`)
- `VM_EMAIL_FROM` (default `no-reply@virtuemachine.local`)
- `VM_EMAIL_SMTP_HOST` (default `127.0.0.1`)
- `VM_EMAIL_SMTP_PORT` (default `25`)
- `VM_EMAIL_SMTP_SECURE` (`on`/`off`, default `off`)
- `VM_EMAIL_SMTP_USER` (optional, used with AUTH LOGIN)
- `VM_EMAIL_SMTP_PASS` (optional, used with AUTH LOGIN)
- `VM_EMAIL_SMTP_HELO` (default `localhost`)
- `VM_EMAIL_SMTP_TIMEOUT_MS` (default `10000`)
- `VM_EMAIL_SMTP_REJECT_UNAUTHORIZED` (`on`/`off`, default `on`)
- `VM_EMAIL_RESEND_API_KEY` (required for `resend` mode)
- `VM_EMAIL_RESEND_BASE_URL` (default `https://api.resend.com/emails`)

Example (Resend):

```bash
VM_EMAIL_MODE=resend \
VM_EMAIL_FROM=no-reply@yourdomain.com \
VM_EMAIL_RESEND_API_KEY=re_xxxxxxxxxxxxx \
node modern/net/server.js
```

Example (real SMTP):

```bash
VM_EMAIL_MODE=smtp \
VM_EMAIL_FROM=no-reply@yourdomain.com \
VM_EMAIL_SMTP_HOST=smtp.yourprovider.com \
VM_EMAIL_SMTP_PORT=465 \
VM_EMAIL_SMTP_SECURE=on \
VM_EMAIL_SMTP_USER=your_smtp_user \
VM_EMAIL_SMTP_PASS=your_smtp_password \
node modern/net/server.js
```

## API (Current)

Public:

- `GET /health`
- `POST /api/auth/login`
- `POST /api/auth/change-password`
- `GET /api/auth/recover-password?username=<name>&email=<addr>`

Authenticated (Bearer token):

- `POST /api/auth/set-email`
- `POST /api/auth/send-email-verification`
- `POST /api/auth/verify-email`
- `GET /api/characters`
- `POST /api/characters`
- `GET /api/characters/:id/snapshot`
- `PUT /api/characters/:id/snapshot`
- `POST /api/world/presence/heartbeat`
- `POST /api/world/presence/leave`
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
