# Multiplayer State Contract (Draft)

Last Updated: 2026-02-12
Status: Draft (M5 prework)

## Objective

Define the authoritative multiplayer persistence model:

- users authenticate
- characters/world state are stored remotely
- server owns canonical simulation state

This aligns with DEC-0002 in `docs/architecture/new/decision-log.md`.

## Core Principles

1. Server authority:
   - client never directly commits authoritative world state.
   - client submits commands; server validates and applies.
2. Durable progression:
   - character and world snapshots are stored server-side.
   - reconnect restores from latest committed server snapshot.
3. Deterministic compatibility:
   - persisted snapshots include sim-core version + hash metadata.
   - replay/hash checks can detect desync/corruption.
4. Explicit identity:
   - every character belongs to one user account.
   - session access requires authenticated token + character ownership.
5. Quest continuity safety:
   - critical progression items must be recoverable.
   - long-lived multiplayer worlds must not become unwinnable due to lost/destroyed key items.

## Data Model (High-Level)

- `User`
  - `user_id` (stable UUID)
  - login identity + auth metadata
- `Character`
  - `character_id` (stable UUID)
  - `user_id` owner
  - display metadata (`name`, optional portrait/mode choices)
  - canonical `world_snapshot`
- `WorldSnapshot`
  - serialization payload (sim-core snapshot)
  - deterministic hash/checkpoint metadata
  - schema/version metadata for migration
- `Session`
  - session id + active character list
  - current authoritative tick
  - accepted command stream metadata

Machine-readable schema stubs live in:

- `modern/net/contracts/`

## Authentication Contract

Minimum required behavior:

1. Login exchange returns signed access token.
2. Token identifies `user_id`.
3. Character CRUD endpoints require valid token.
4. Session join requires token + ownership check.

Auth provider strategy is intentionally decoupled (password/OAuth/etc. can vary) as long as `user_id` is stable and verifiable.

## Persistence Contract

### Save

Server accepts only:

- authenticated request
- command stream or explicit checkpoint boundary
- valid snapshot envelope (versioned + checksum-valid)

Server writes:

- latest snapshot blob
- snapshot hash
- tick metadata
- updated timestamp

### Load

Server returns:

- latest accepted snapshot for `character_id`
- snapshot metadata (`schema_version`, `sim_core_version`, `hash`, `saved_tick`)

Client then hydrates local runtime from this server-authoritative state.

## Critical Item Respawn/Recovery Contract

### Requirement

The server must guarantee that critical quest items remain obtainable, even if previously:

- dropped in inaccessible locations
- destroyed/consumed by bugged flow
- lost due to crash/rollback edge cases
- held by inactive/offline characters beyond configured timeout policy

### Policy Model

Maintain a server-owned `critical_item_policy` table with, at minimum:

- `item_id` (legacy-compatible object/type identifier mapping)
- `policy_type`
  - `unique_persistent` (exactly one active instance, recoverable)
  - `regenerative_unique` (one canonical active instance, can respawn at anchor)
  - `instance_quota` (minimum available count enforced)
- `anchor_locations` (canonical spawn/recovery coordinates)
- `cooldown_ticks` (minimum delay before automated recovery)
- `quest_gate` (optional: only recover after relevant quest phase)

### Recovery Triggers

Server evaluates recovery at deterministic maintenance boundaries (tick-based, not wall-clock based):

1. missing canonical item instance
2. item flagged unreachable/invalid container
3. item ownership timeout exceeded for blocked progression

### Determinism and Audit

- recovery decisions must be deterministic from authoritative state + policy table.
- each recovery event writes an audit record:
  - `tick`
  - `item_id`
  - trigger reason
  - old location/owner (if any)
  - new location

## Migration and Compatibility

Required metadata on stored snapshots:

- `schema_version`
- `sim_core_version`
- `snapshot_hash`

When versions diverge:

- server runs migration or rejects with explicit compatibility error.
- no silent state mutation.

## Security/Integrity Baseline

- reject commands with stale/invalid auth token.
- reject session join if character owner mismatches token user.
- reject malformed snapshot payloads and checksum failures.
- maintain append-only audit trail for save checkpoints (at least recent window).
- maintain append-only audit trail for critical-item recovery/respawn events.

## Implementation Slices

### M5.1 (Current Slice): Contracts + Planning

- define auth/persistence JSON schemas
- document request/response/error model
- wire tasks into mutable checklist

### M5.2: Minimal Backend Prototype

- token auth stub
- character create/list/load/save endpoints
- filesystem or sqlite snapshot storage
- critical item policy table + maintenance pass scaffold

### M5.3: Determinism Safety

- server-side replay/hash validation on save boundary
- checkpoint comparison endpoint/tooling
- deterministic critical-item recovery test fixtures

### M5.4: Live Multiplayer

- tick-synchronized command ingest
- multi-client session loop
- reconnect/load from persisted authoritative snapshot
