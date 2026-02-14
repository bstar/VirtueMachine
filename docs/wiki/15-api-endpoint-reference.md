# API Endpoint Reference (OpenAPI-Style, Human Readable)

This page is the canonical HTTP API reference for `modern/net/server.js`.

It is intentionally written like an OpenAPI handbook, but in markdown:

- route-by-route behavior
- auth requirements
- request/response shapes
- error contracts
- side effects and persistence behavior

## Service Overview

- Base URL: `http://127.0.0.1:8081` (default in client)
- Transport: HTTP/1.1 JSON
- CORS: enabled (`*` origin, `GET,POST,PUT,OPTIONS`)
- Auth: bearer token in `Authorization: Bearer <token>`
- Error envelope: `{"error":{"code":"...","message":"..."}}`

## Authentication Model

- Account identity is username-based.
- First login with unknown username auto-creates a user.
- Passwords are plain-text in this prototype (intentionally insecure).
- Token issuance occurs at login and is required for almost all `/api/*` routes except login + recover.
- Re-login prunes prior presence rows for that account to prevent ghost sessions.

## Shared Data and Persistence Files

- `modern/net/data/users.json`
- `modern/net/data/tokens.json`
- `modern/net/data/characters.json`
- `modern/net/data/world_snapshot.json`
- `modern/net/data/world_clock.json`
- `modern/net/data/presence.json`
- `modern/net/data/critical_item_policy.json`
- `modern/net/data/world_object_deltas.json`

Most successful mutating routes call `persistState(state)` and commit changes to disk immediately.

## Conventions

### Content Types

- Request: `application/json` for body-bearing endpoints.
- Response: `application/json; charset=utf-8`.

### Error Semantics

- `400`: malformed input / missing required fields / invalid json.
- `401`: auth failure or credential mismatch.
- `403`: forbidden business rule (for example unverified email recovery).
- `404`: missing record/route.
- `409`: state conflict.
- `410`: expired verification code.
- `502`: upstream email delivery failure.

### Auth Guard

Routes behind auth use `requireUser(state, req, res)` and return:

- `401 auth_required`: missing bearer token.
- `401 auth_invalid`: expired/invalid token or token user missing.

## Schemas (Contracts Directory)

Primary schema files live under `modern/net/contracts/`:

- `api_error.schema.json`
- `auth_login_request.schema.json`
- `auth_login_response.schema.json`
- `character_record.schema.json`
- `world_snapshot_meta.schema.json`
- `world_clock_response.schema.json`
- `world_presence_heartbeat_request.schema.json`
- `world_presence_response.schema.json`
- `critical_item_policy.schema.json`

Note: server responses can include fields beyond some schema files because implementation evolved; server behavior in `modern/net/server.js` is the final source of truth.

## Endpoint Catalog

## `GET /health`

- Auth: no
- Purpose: service liveness + world clock/object baseline meta.

Response:

- `ok` boolean
- `service`
- `now`
- `tick`
- `email_mode`
- `world_objects` metadata

Side effects:

- advances authoritative clock and persists state.

---

## `POST /api/auth/login`

- Auth: no
- Purpose: login or implicit account creation.

Request body:

- `username` string (min length 2)
- `password` string (required)

Behavior:

- creates user if username not found.
- validates plaintext password for existing user.
- issues bearer token.
- prunes old presence entries for same user.

Success response:

- `token`
- `user.user_id`
- `user.username`
- `user.email`
- `user.email_verified`

Errors:

- `400 bad_json`
- `400 bad_username`
- `400 bad_password`
- `401 auth_invalid`

---

## `POST /api/auth/set-email`

- Auth: yes
- Purpose: set or replace recovery email.

Request body:

- `email` valid email string

Behavior:

- changing email clears verified state and pending verification.

Success response:

- `user.user_id`
- `user.username`
- `user.email`
- `user.email_verified`

Errors:

- `400 bad_json`
- `400 bad_email`
- `401 auth_required/auth_invalid`

---

## `POST /api/auth/send-email-verification`

- Auth: yes
- Purpose: send verification code to account recovery email.

Request body:

- empty object allowed

Success response:

- `ok`
- `delivery_id`
- `email`
- `expires_at_ms`

Errors:

- `400 bad_email` (no valid email set)
- `502 email_delivery_failed`
- `401 auth_required/auth_invalid`

---

## `POST /api/auth/verify-email`

- Auth: yes
- Purpose: verify recovery email with short-lived numeric code.

Request body:

- `code` string

Success response:

- `ok`
- `user.user_id`
- `user.username`
- `user.email`
- `user.email_verified` true

Errors:

- `400 bad_json`
- `400 bad_code`
- `409 no_pending_verification`
- `410 verification_expired`
- `401 verification_invalid`
- `401 auth_required/auth_invalid`

---

## `POST /api/auth/change-password`

- Auth: yes
- Purpose: rotate account password.

Request body:

- `old_password` string
- `new_password` string

Success response:

- `ok`
- `user.user_id`
- `user.username`

Errors:

- `400 bad_json`
- `400 bad_old_password`
- `400 bad_new_password`
- `401 auth_invalid` (wrong old password)
- `409 password_unchanged`

---

## `GET /api/auth/recover-password`

- Auth: no
- Purpose: deliver stored plaintext password to verified recovery email.

Query params:

- `username` required
- `email` required and must match verified account email

Success response:

- `user` object
- `delivered` true
- `delivery_id`

Errors:

- `400 bad_username`
- `400 bad_email`
- `404 user_not_found`
- `403 email_unverified`
- `401 email_mismatch`
- `502 email_delivery_failed`

---

## `GET /api/characters`

- Auth: yes
- Purpose: list characters owned by authenticated user.

Success response:

- `characters[]`

Each character includes:

- `character_id`
- `user_id`
- `name`
- `snapshot_meta`

Errors:

- `401 auth_required/auth_invalid`

---

## `POST /api/characters`

- Auth: yes
- Purpose: create a character for authenticated user.

Request body:

- `name` string, min length 2

Success response (`201`):

- `character_id`
- `name`
- `user_id`
- `snapshot_meta`

Errors:

- `400 bad_json`
- `400 bad_character_name`
- `401 auth_required/auth_invalid`

---

## `GET /api/world/critical-items/policy`

- Auth: yes
- Purpose: read critical item maintenance policy.

Success response:

- `critical_item_policy[]`

Errors:

- `401 auth_required/auth_invalid`

---

## `PUT /api/world/critical-items/policy`

- Auth: yes
- Purpose: replace entire critical item policy list.

Request body:

- `critical_item_policy[]`

Success response:

- echoed `critical_item_policy[]`

Errors:

- `400 bad_json`
- `400 bad_policy`
- `401 auth_required/auth_invalid`

---

## `POST /api/world/critical-items/maintenance`

- Auth: yes
- Purpose: execute maintenance pass and emit recovery events.

Request body:

- flexible object; typically includes current tick and world items.

Success response:

- `events[]` (can be empty)

Errors:

- `400 bad_json`
- `401 auth_required/auth_invalid`

---

## `POST /api/world/presence/heartbeat`

- Auth: yes
- Purpose: upsert active session presence row.

Request body:

- `session_id` required (len >= 8)
- `character_name`
- `map_x`, `map_y`, `map_z`
- `facing_dx`, `facing_dy`
- `tick` (client-supplied, server clock still authoritative)
- `mode`

Success response:

- `ok`
- `now`
- `tick` (server authoritative tick)

Side effects:

- updates authoritative clock.
- upserts presence row keyed by `(user_id, session_id)`.
- prunes expired presence rows by TTL.

Errors:

- `400 bad_json`
- `400 bad_session_id`
- `401 auth_required/auth_invalid`

---

## `POST /api/world/presence/leave`

- Auth: yes
- Purpose: explicitly remove active presence row for a session.

Request body:

- `session_id` required

Success response:

- `ok`
- `removed` composite key string (`user_id:session_id`)

Errors:

- `400 bad_json`
- `400 bad_session_id`
- `401 auth_required/auth_invalid`

---

## `GET /api/world/clock`

- Auth: yes
- Purpose: fetch authoritative world clock.

Success response:

- `tick`
- `time_m`
- `time_h`
- `date_d`
- `date_m`
- `date_y`

Side effects:

- advances clock based on wall time and persists.

Errors:

- `401 auth_required/auth_invalid`

---

## `GET /api/world/presence`

- Auth: yes
- Purpose: list currently active presence rows.

Success response:

- `players[]`

Each player entry includes:

- `user_id`
- `username`
- `session_id`
- `character_name`
- `map_x`, `map_y`, `map_z`
- `facing_dx`, `facing_dy`
- `tick`
- `mode`
- `updated_at_ms`

Side effects:

- prunes expired presence rows, then persists.

Errors:

- `401 auth_required/auth_invalid`

---

## `GET /api/world/objects`

- Auth: yes
- Purpose: query active world objects from baseline + deltas.

Query params:

- `x` optional int
- `y` optional int
- `z` optional int
- `radius` optional int clamped `0..16`
- `limit` optional int clamped `1..200000`
- `projection` optional `anchor|footprint` (default `anchor`)
- `include_footprint` optional boolean-like (`1,true,on`)

Success response:

- `meta` object baseline/delta summary
- `query` normalized query values
- `objects[]` matching objects (with optional `footprint[]`)

Errors:

- `401 auth_required/auth_invalid`

---

## `POST /api/world/objects/reset`

- Auth: yes
- Purpose: discard object deltas and rebuild from pristine baseline.

Success response:

- `ok`
- `reset_at`
- `meta`

Errors:

- `401 auth_required/auth_invalid`

---

## `POST /api/world/objects/reload-baseline`

- Auth: yes
- Purpose: reload object baseline and clear deltas (same operational outcome as reset path).

Success response:

- `ok`
- `reloaded_at`
- `meta`

Errors:

- `401 auth_required/auth_invalid`

---

## `GET /api/world/snapshot`

- Auth: yes
- Purpose: get global world snapshot payload + metadata.

Success response:

- `snapshot_meta`
- `snapshot_base64` (nullable)
- `updated_at`

Errors:

- `401 auth_required/auth_invalid`

---

## `PUT /api/world/snapshot`

- Auth: yes
- Purpose: set global world snapshot payload.

Request body:

- `snapshot_base64` required
- `schema_version` optional (default 1)
- `sim_core_version` optional
- `saved_tick` optional

Success response:

- `snapshot_meta` (includes computed hash)
- `updated_at`

Errors:

- `400 bad_json`
- `400 bad_snapshot`
- `401 auth_required/auth_invalid`

---

## `GET /api/characters/{character_id}/snapshot`

- Auth: yes
- Purpose: get per-character snapshot payload + metadata.

Path params:

- `character_id` UUID-like string.

Success response:

- `character_id`
- `snapshot_meta`
- `snapshot_base64`

Errors:

- `404 character_not_found`
- `401 auth_required/auth_invalid`

---

## `PUT /api/characters/{character_id}/snapshot`

- Auth: yes
- Purpose: set per-character snapshot payload.

Path params:

- `character_id`

Request body:

- `snapshot_base64` required
- `schema_version` optional
- `sim_core_version` optional
- `saved_tick` optional

Success response:

- `character_id`
- `snapshot_meta`

Errors:

- `400 bad_json`
- `400 bad_snapshot`
- `404 character_not_found`
- `401 auth_required/auth_invalid`

---

## Route Not Found

Any unmatched route returns:

- `404 not_found`

## Client Mapping (Where UI Calls These)

Primary call sites in `modern/client-web/app.js`:

- `netRequest(...)` common fetch wrapper
- `netLogin()`
- `netSaveSnapshot()`
- `netLoadSnapshot()`
- `netPollWorldClock()`
- `netPollPresence()`
- `netSendPresenceHeartbeat()`
- `netRunCriticalMaintenance()`
- account management helpers (`netSetEmail`, `netVerifyEmail`, etc.)

## Operational Notes

- Realtime is tick-scheduled polling + heartbeat, not websocket push.
- The server can advance world clock on read paths (`/health`, `/api/world/clock`, heartbeat path).
- Presence freshness depends on heartbeat cadence and server-side TTL pruning.
- Snapshot payloads are opaque base64 full-state blobs; metadata hash is SHA-256 of payload text.

## Security Caveat (Prototype)

This service intentionally uses insecure password handling during architecture work.

- Do not use real credentials.
- Do not expose this service publicly without hardening.
