# VirtueMachine Development Plan: Faithful U6 Simulation + Modern Web Client

## Mission

Create a modern, browser-based Ultima VI implementation that:

- preserves core gameplay behavior from the original engine as closely as practical
- supports a larger world viewport and redesigned interface
- enables future multiplayer experiments
- retains strong traceability to the decompiled legacy source

Note: legacy source references such as `SRC/...` are relative to `legacy/u6-decompiled/`.

## Principles

1. Simulation authority first: core rules run in `sim-core`, independent of renderer/UI.
2. Determinism first: no multiplayer work without deterministic single-player stepping.
3. Behavior parity over code parity: preserve outcomes/timing/order where it matters.
4. Explicit provenance: no undocumented renames or inferred mechanics.
5. Phase gates: each milestone requires tests and documentation updates.
6. Authority contract before stack cleanup: do not expand client/server architecture (TS/Vite/Bun consolidation, orchestration refactors, broad module moves) beyond local slices until a documented C/WASM sim-core authority contract is locked and adopted.
7. Canonical core first, extensions second: future MMO-oriented systems (quest abstractions, expanded party mechanics, housing, crafting/farming) must be implemented as opt-in extension slices and never silently replace canonical baseline behavior.

## Workstreams

## 1) Legacy Understanding

- Build module map of decompiled segments and responsibilities.
- Build symbol catalog with confidence and evidence.
- Capture ambiguous logic as hypotheses and validation tasks.

Primary outputs:

- `docs/architecture/legacy/module-map.md`
- `docs/architecture/legacy/symbol-catalog.md`
- `docs/research/legacy-findings.md`

## 2) Simulation Core Port

- Extract gameplay systems into platform-agnostic runtime.
- Replace DOS-era APIs with shims/interfaces.
- Normalize integer/time/RNG behavior for deterministic stepping.
- Define and freeze backend authority boundary for C/WASM execution:
  - backend simulation state transitions must be sourced from sim-core contract surfaces
  - JS net/client layers are transport/projection layers, not rule-authority layers
  - all new gameplay mechanics must target contract APIs first, not ad hoc JS state paths

Primary outputs:

- `docs/architecture/new/sim-core-contract.md`
- replay tests + state hash checks

## 3) Modern Web Client

- New renderer and camera (larger world view).
- New UI shell and QoL features.
- Input mapping to simulation command stream.

Primary outputs:

- `docs/architecture/new/system-overview.md`
- UI behavior specs and parity exceptions

## 4) Multiplayer Foundation

- Deterministic lockstep prototype.
- Host-authoritative command stream.
- Snapshot + replay-tail join flow.

Primary outputs:

- net protocol draft
- determinism and desync diagnostics docs

## Priority Shift (2026-02-11)

Before starting `M5` lockstep implementation, prioritize rendering-layer parity so the web client displays world objects as placed in the original game (doors, fountains, tables, food, and related overlays).

Rationale:

- Multiplayer debugging is materially easier once scene composition is closer to legacy behavior.
- Interaction semantics depend on object-layer coordinates and ordering, not only base terrain tiles.
- Early visual parity reduces rework in UI/QoL work by stabilizing the world presentation contract first.

Multiplayer handling policy during this phase:

- Do not start full multiplayer feature implementation yet.
- Make multiplayer decisions only when an active rendering/simulation slice creates an architectural fork.
- Record each decision as an ADR/decision-log entry and keep interfaces network-neutral where practical.

## Milestones

## M0: Documentation Foundation

- doc structure created
- templates created
- naming/provenance conventions defined

## M1: Deterministic Runtime Skeleton

- `sim-core` tick API exists (`step_sim(ticks)`)
- stable RNG API defined
- replay harness can run scripted command sequences

## M2: World State and Persistence Slice

- object state load/save path ported
- map/chunk streaming path ported
- baseline hash checkpoints established

## M3: Playable Single-Player Vertical Slice

- navigation/core loop playable in web client (current state)
- larger viewport active
- documented parity gaps and accepted deviations
- not yet complete for full single-player gameplay; still pending:
  - object interaction/container semantics
  - inventory/equipment parity
  - NPC communication/dialogue
  - party management semantics
  - quest progression mechanics
  - magic/casting
  - combat rules/flow
  - NPC pathing + schedule routines
  - day/night cycle effects
  - dungeon traversal/transition rules
  - boats/vehicle interaction and navigation
  - music and SFX integration/parity

## M4: Gameplay Parity Expansion

- combat/dialogue/NPC schedule systems integrated
- regression suite expanded to critical scenarios
- C/WASM authority contract adopted for backend simulation-critical paths

## M5: Multiplayer Prototype

- 2-player co-op lockstep over fixed tick rate
- desync detection + debug logs

## Extension Strategy (Forward Plan)

- Keep one authoritative runtime with profile-driven behavior:
  - `canonical_strict` for legacy-faithful play
  - `canonical_plus` for extension-enabled worlds
- Stage future extensions only after canonical subsystem completion for each domain:
  - quest system abstraction layer
  - MMO party mechanics extensions
  - housing ownership/persistence model
  - crafting/farming loops
- Every extension slice must define:
  - enable/disable flag(s)
  - state ownership and persistence contract
  - compatibility behavior when disabled
  - deterministic test coverage in both enabled and disabled profiles

## Traceability Standard

Every significant implementation change must record:

- legacy origin file/segment/function
- modern module/function equivalent
- behavior status: `preserved`, `adapted`, `deferred`, or `unknown`
- rationale and risk
- test coverage evidence

Use:

- `docs/research/legacy-findings.md` for discovery notes
- `docs/architecture/legacy/symbol-catalog.md` for naming/meaning evolution

## Hosting Readiness (Best-Practice Gate)

Before opening public login/hosting, require the following:

1. Security baseline
- secrets and API keys stored outside repo/runtime config files
- authenticated routes validated and rate-limited
- password reset/email flows verified in production-like config
- basic abuse controls (request throttling + account lockout/backoff policy)

2. Data safety baseline
- automated snapshot/database backups with restore drill
- explicit retention policy for player snapshots and logs
- migration/versioning plan for persisted world/player data

3. Operations baseline
- health endpoint + startup readiness checks
- structured logs with request/session correlation ids
- error reporting and alerting for auth/snapshot failures
- deploy/runbook with rollback procedure

4. Gameplay authority baseline
- C/WASM sim-core authority contract active for simulation-critical transitions
- deterministic replay/hash checks run in CI and pre-deploy gate
- canonical conversation/interaction regression suite passing

5. Rollout policy
- staged rollout (private alpha -> limited invite -> wider access)
- clear bug-report channels and incident response owner
- explicit “world reset” and maintenance communication policy

## Risk Register (Initial)

- 16-bit memory assumptions and pointer semantics.
- DOS timer/input behavior affecting update order/timing.
- Graphics/audio drivers intertwined with game flow in some segments.
- Decompiled naming ambiguity causing accidental semantic drift.
- Multiplayer sensitivity to non-deterministic behavior.

## Definition of Done (Per System)

1. Implementation merged.
2. Relevant replay/hash tests pass.
3. Legacy mapping entries updated.
4. Any behavior deviation documented with rationale.
5. Forward-looking extension points identified (UI/QoL/net).
