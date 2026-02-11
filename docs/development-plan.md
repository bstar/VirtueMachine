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

- movement, interaction, core loop playable in web client
- larger viewport active
- documented parity gaps and accepted deviations

## M4: Gameplay Parity Expansion

- combat/dialogue/NPC schedule systems integrated
- regression suite expanded to critical scenarios

## M5: Multiplayer Prototype

- 2-player co-op lockstep over fixed tick rate
- desync detection + debug logs

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
