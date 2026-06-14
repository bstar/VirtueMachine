# Net Prototype (M5 Seed)

This directory contains the first multiplayer backend seed focused on:

- authenticated user login (stub)
- remote character persistence
- authoritative world snapshot save/load endpoint
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
bun modern/net/server.ts
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
- `VM_NET_RUNTIME_DIR` (default auto-detect in `dev_stack.sh`: `../ultima6` if present, else `modern/assets/runtime`; source for map/tile files)
- `VM_NET_OBJECT_BASELINE_DIR` (default `modern/assets/pristine/savegame`; required immutable object baseline source)
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
- `VM_SIM_CORE_INTERACT_BIN` (path to `sim_core_world_interact_bridge`; required unless `VM_SIM_CORE_INTERACT_REQUIRED=off`)
- `VM_SIM_CORE_INTERACT_REQUIRED` (`on`/`off`, default `on`; when `on`, server startup fails if bridge binary is unavailable)
- `VM_SIM_CORE_ASSOC_BIN` (path to `sim_core_assoc_chain_bridge`; required unless `VM_SIM_CORE_ASSOC_REQUIRED=off`)
- `VM_SIM_CORE_ASSOC_BATCH_BIN` (path to `sim_core_assoc_chain_batch_bridge`; required unless `VM_SIM_CORE_ASSOC_REQUIRED=off`)
- `VM_SIM_CORE_ASSOC_REQUIRED` (`on`/`off`, default `on`; when `on`, server startup fails if assoc-chain bridge binary is unavailable)
- `VM_SIM_CORE_WORLD_QUERY_BIN` (path to `sim_core_world_objects_query_bridge`; required unless `VM_SIM_CORE_WORLD_QUERY_REQUIRED=off`)
- `VM_SIM_CORE_WORLD_QUERY_REQUIRED` (`on`/`off`, default `on`; when `on`, server startup fails if world-query bridge binary is unavailable)

Example (Resend):

```bash
VM_EMAIL_MODE=resend \
VM_EMAIL_FROM=no-reply@yourdomain.com \
VM_EMAIL_RESEND_API_KEY=re_xxxxxxxxxxxxx \
bun modern/net/server.ts
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
bun modern/net/server.ts
```

## API (Current)

Public:

- `GET /health`
- `GET /api/runtime/contract`
- `POST /api/auth/login`
- `POST /api/auth/change-password`
- `GET /api/auth/recover-password?username=<name>&email=<addr>`

Authenticated (Bearer token):

- `POST /api/auth/set-email`
- `POST /api/auth/send-email-verification`
- `POST /api/auth/verify-email`
- `GET /api/characters`
- `POST /api/characters`
- `GET /api/world/snapshot`
- `PUT /api/world/snapshot`
- `POST /api/world/presence/heartbeat`
- `POST /api/world/presence/leave`
- `GET /api/world/presence`
- `GET /api/world/clock`
- `GET /api/world/intro-state`
- `PUT /api/world/intro-state`
- `GET /api/world/critical-items/policy`
- `PUT /api/world/critical-items/policy`
- `POST /api/world/critical-items/maintenance`
- `GET /api/world/objects` (server-authoritative world object query; supports `x,y,z,radius,limit,projection,include_footprint`; includes containment diagnostics: `assoc_chain`, `root_anchor_key`, `blocked_by`)
- `POST /api/world/objects/interact` (authoritative object interaction mutations: `take`, `drop`, `put`, `equip`, `talk`; `talk` returns a server-owned `conversation_session`)
- `POST /api/world/conversation/respond` (authoritative conversation topic submission for an active `conversation_session`)
- `POST /api/world/objects/reset` (reset world object deltas to baseline)
- `POST /api/world/objects/reload-baseline` (reload immutable baseline from `VM_NET_OBJECT_BASELINE_DIR` and clear deltas)

Runtime contract headers (optional, forward-compatibility):

- `x-vm-runtime-profile`: `canonical_strict` or `canonical_plus`
- `x-vm-runtime-extensions`: comma-separated extension ids, or `none`

Current behavior:

- If omitted/invalid, server defaults to `canonical_strict` with no extensions.
- `GET /api/world/clock`, `GET /api/world/objects`, and `POST /api/world/objects/interact` echo normalized runtime metadata as `runtime_contract`.
- `POST /api/world/presence/heartbeat` echoes normalized runtime metadata as `runtime_contract`.
- `GET /api/world/presence` includes per-player `runtime_profile` and `runtime_extensions`.
- `GET /api/runtime/contract` exposes server-supported profile ids and default/fallback behavior.

Clock note:
- `/api/world/clock` is authoritative server time/tick.
- connected clients are expected to sync local world time/date from this endpoint.
- `/api/world/clock` includes `intro_state` so clients/debug tools can see whether early-story conversation bridging is in `pre_intro` or `post_intro`.
- `/api/world/clock` now carries `npc_states` for server-owned scheduled NPC positions and activity metadata; `npc_overrides` remains as a compatibility alias for older browser code.
- Scheduled NPC clock cadence is configurable with `VM_NET_TICK_MS`, `VM_NET_TICKS_PER_MINUTE`, and `VM_NET_CLOCK_CATCHUP_MAX_MS`. Defaults follow the Ultima VI Online reference cadence of one in-game day per real hour and cap restart catch-up so NPCs do not leap through schedule transitions after server downtime.

World object authority note:
- server loads baseline world objects from `VM_NET_OBJECT_BASELINE_DIR` (`objblk??` + `objlist`) and uses runtime `basetile` for tile mapping
- deltas are persisted in `modern/net/data/world_object_deltas.json`
- use `/api/world/objects` for explicit server truth during parity debugging
- interaction responses include `interaction_checkpoint` (`seq`, `hash`) so repeated command streams can be replay-checked for determinism
- contained-item `take` operations enforce chain accessibility via sim-core assoc-chain traversal (cycle/missing-parent/parent-owned blocks reported via `blocked_by`)
- `GET /api/world/objects` containment diagnostics (`assoc_chain`, `root_anchor_key`, `blocked_by`) are produced by sim-core batch assoc-chain analysis (no net-side JS chain walker)
- `GET /api/world/objects` query selection (`projection`, `radius`, `limit`, canonical ordering) is produced by sim-core world-query bridge (no net-side JS selector)
 - `projection=anchor` filters by legacy anchor cells
 - `projection=footprint` filters by occupied footprint cells (double-width/height expansion)

Conversation authority note:
- `talk` no longer relies on client-owned topic flags or browser-side branch authority.
- the server loads conversation archives, opens a session keyed by `session_id`, and owns `talkFlags` mutation for the active save/runtime state.
- `POST /api/world/conversation/respond` advances the same session cursor and returns canonical response lines plus the next cursor metadata.
- `PUT /api/world/intro-state` provides the bounded early-story compatibility bridge: `pre_intro` forces Lord British/Nystul/Dupre conversation sessions to read intro-compatible talk state without mutating the persisted save talk flags; `post_intro` resumes the normal saved-world branch.

NPC runtime note:
- the server now loads legacy NPC runtime arrays from `savegame/objlist` and the original `schedule` asset.
- current schedule coverage includes all valid scheduled NPCs with deterministic target stepping and safe render poses.
- unsupported schedule actions such as thief/brawl are reported in metadata and do not trigger side effects until the corresponding gameplay systems have parity coverage.

## Contracts

Machine-readable schema stubs are in `modern/net/contracts/`.

## Test

```bash
bun modern/net/tests/server_contract_test.ts
```

Or via tooling wrapper:

```bash
./modern/tools/test_net_contracts.sh
```
Reset canonical world save (clears shared world snapshot + active presence):

```bash
./modern/tools/reset_world_save.sh
```
