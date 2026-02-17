# Project Progress Checklist

Last Updated: 2026-02-17

## Milestone Status

- `[x]` M0: Documentation Foundation
- `[x]` M1: Deterministic Runtime Skeleton
- `[~]` M2: World State and Persistence Slice
- `[~]` M3: Playable Single-Player Vertical Slice (navigation-only)
- `[~]` M4: Gameplay Parity Expansion
- `[ ]` M5: Multiplayer Prototype
- `[ ]` M6: Hosting Readiness and Public Login

Legend:

- `[x]` complete
- `[~]` in progress
- `[ ]` not started

## Planning Flexibility

This checklist is intentionally mutable.

- Add, remove, split, merge, or reorder tasks when new technical evidence appears.
- Prefer momentum and shipped slice outcomes over strict adherence to prior ordering.
- If a task blocks progress, either reduce scope or defer it and continue on an adjacent slice.
- Record material priority/scope changes in this file so reasoning is preserved.

## Completed (Backfilled)

- `[x]` Established modern repo with legacy submodule provenance and policy guardrails (`e30639d`)
- `[x]` Added pinned-legacy workflow and local asset sync tooling (`f8f6b3f`)
- `[x]` Added Nix flake dev shell for reproducible toolchain (`cd72e63`)
- `[x]` Documented sandbox escalation workflow and assistant policy (`5bdc9d6`)
- `[x]` Implemented deterministic `sim-core` bootstrap with replay hash test (`9ea6f61`)
- `[x]` Ported initial `D_2C4A`-mapped world state into `sim-core` with serialization/hash invariants tests (`0ac9cbe`)
- `[x]` Added live project checklist/status board (`875be3a`)
- `[x]` Added legacy `objlist` compatibility boundary + tests (`2af67ea`)
- `[x]` Added one-command test runner + CI build/test workflow (`4919a2b`)
- `[x]` Built markdown-powered architecture wiki web UI with reference atlas, theme sync, and code-overlay links (`8e0e031`)
- `[x]` Added API/UI realtime synchronization architecture chapter with generated topology/sequence diagrams (`7244757`)
- `[x]` Added dedicated render pipeline flow diagram in rendering deep-dive docs (`7244757`)
- `[x]` Added OpenAPI-style human-readable endpoint reference for the net server (`7244757`)

## 90-Day Plan (Status-Reconciled)

### M2 Foundations

- `[x]` Map/chunk read compatibility (read-only)
- `[x]` Deterministic time/calendar semantics
- `[x]` Persistence API hardening
- `[~]` Shared authority boundary cleanup:
  - remove duplicated client-side decode/logic where sim-core should own it
  - keep deterministic replay/checkpoint behavior stable during migration

### M3 Vertical Slice

- `[x]` Command pipeline + core loop integration
- `[x]` Minimal web client scaffolding
- `[x]` Runtime asset validation + fallback diagnostics
- `[x]` Playable deterministic walkaround demo
- `[~]` Object interaction system parity (container/world/use flows)
- `[~]` Inventory/equipment UX and item transfer rules parity
- `[ ]` NPC communication/dialogue system
- `[ ]` Quest mechanics/progression systems
- `[ ]` Magic/casting systems
- `[ ]` Combat systems
- `[ ]` NPC pathing and schedule behavior
- `[ ]` Party control semantics and companion command behaviors
- `[ ]` Character progression/stat effects and status-condition gameplay
- `[ ]` Sleep/rest interactions and world-time side effects
- `[ ]` Day/night cycle gameplay effects and presentation parity
- `[ ]` Music system integration and track-state parity
- `[ ]` Sound effects/event audio parity
- `[ ]` Economy/shop interactions and transaction rules
- `[ ]` Scripted world-state triggers (switches, keyed gates, event flags)
- `[ ]` Dungeon traversal semantics (ladders/stairs/level transitions/constraints)
- `[ ]` Boat and other vehicle interaction/navigation behavior
- `[ ]` Full verb-backend parity beyond movement baseline (`attack/cast/drop/move` completion)

### M4 Gameplay Parity Expansion

- `[x]` Static object layer from legacy save data (`objblk`, `objlist`)
- `[x]` Animated tiles (water/fire/wheels) with deterministic phase control
- `[x]` Interaction baseline (avatar mode, door toggle, collision behavior)
- `[~]` Keyboard parity expansion:
  - legacy verb keys mapped and mode-aware target cursor flow wired
  - first-pass target verb backends landed for `look/talk/get/use`
  - command backend parity (`attack/cast/drop/move`) still pending
- `[x]` NPC render + deterministic movement pilot + occlusion guards
- `[x]` Rendering parity hardening (blackout/wall/corner baseline restored):
  - `nuvie` feature-gated path removed
  - legacy-like blackout/wall behavior restored as default renderer path
  - hidden-room wall-adjacent decor suppression restored by source-cell visibility

### M5 Multiplayer

- `[x]` Network-neutral command envelope groundwork
- `[x]` Peer checkpoint hash comparison utility
- `[~]` Auth + remote character persistence contract defined (`docs/architecture/new/multiplayer-state-contract.md`)
- `[~]` Critical quest-item recovery/respawn policy defined for server authority (DEC-0003)
- `[ ]` Live synchronized multiplayer prototype

### M6 Hosting Readiness

- `[ ]` Security hardening checklist complete (auth/rate limit/secrets)
- `[ ]` Backup + restore drill complete for world/player persistence
- `[ ]` Health checks + structured logging + alerting in place
- `[ ]` C/WASM sim-core authority contract active on backend-critical paths
- `[ ]` Pre-deploy deterministic and canonical regression gates enforced
- `[ ]` Staged rollout plan documented (alpha -> invite -> public)

## Rendering Parity Track

### R1: Static Layer Content

- `[x]` Read and render static world object layer
- `[x]` Deterministic ordering rules and debug telemetry
- `[~]` Canonical parity capture set:
  - web captures are present
  - legacy-reference side-by-side set still incomplete

### R2: Occlusion and Boundary Composition

- `[x]` Composition/overlay model unification for render + interaction probes
- `[x]` Fixture-based regression tests for composition semantics
- `[x]` Blackout/wall/corner parity stabilization pass:
  - retained legacy-like blackout logic as single default path
  - removed `nuvie` runtime mode fork
  - fixed hidden-room wall decor leak in composition model

### R3: Interactive Visual State Determinism

- `[x]` World-state-backed door/open-state visuals
- `[ ]` Replay/hash fixture coverage explicitly validating interaction visual transitions

### R4: Tooling and CI Hardening

- `[ ]` Map-sweep validator for unknown/missing sprite coverage
- `[ ]` CI artifact publishing for parity screenshot/diff reports
- `[ ]` Accepted parity-gap ledger for unresolved legacy ambiguities

### R5: Startup/Menu Recreation

- `[x]` In-engine startup/title flow with journey path into throne room
- `[x]` Keyboard + mouse menu navigation with disabled-option feedback
- `[x]` Startup/title provenance documented against decompiled + ScummVM/Nuvie references
- `[x]` Real `titles.shp` + `mainmenu.shp` decode/render path (palette-highlight behavior)
- `[x]` `Q` return-to-title behavior during gameplay
- `[ ]` Pixel-parity screenshot pair (legacy reference vs current startup/menu frame)

### R6: Legacy Cursor Parity

- `[x]` Decode `u6mcga.ptr` via U6 LZW + libN item parsing path
- `[x]` Engine-rendered custom cursor across title and in-session views
- `[x]` Layer-aware cursor composition (world area vs menu/frame area)
- `[x]` Cursor scaling/aspect tuned for current legacy-frame presentation
- `[~]` Final pointer index/mode mapping:
  - visually correct pointer now selected
  - command/mode-specific cursor switching parity still pending

## Current Sprint Focus

- `[x]` Complete startup/menu art parity implementation pass
- `[x]` Complete in-engine legacy cursor integration pass
- `[x]` Resolve blackout wall-render parity and remove Nuvie mode fork
- `[x]` Lock architectural direction for canonical core + feature-gated extension profiles (`DEC-0004`)
- `[ ]` Lock and document C/WASM sim-core authority contract gate before major stack cleanup:
  - define backend authority boundary for simulation-critical state transitions
  - ensure JS net/client remain transport/projection, not gameplay-rule authority
  - require this contract before large TS/Vite/Bun migration slices and multi-server startup orchestration changes
- `[~]` Add mode-aware legacy keyboard parity matrix + target-cursor flow
- `[~]` Add deterministic interaction/state transition tests:
  - completed: canonical status transition matrix (`LOCXYZ/CONTAINED/INVEN/EQUIP`)
  - completed: server interaction lifecycle contract + deterministic checkpoint hash replay
  - completed: sim-core assoc-chain traversal module + bridge wiring for net authority checks
  - completed: sim-core interaction precondition authority for container-block and container-cycle decisions (net now transport-only for these rules)
  - completed: sim-core batch containment diagnostics for `/api/world/objects` (`assoc_chain`, `root_anchor_key`, `blocked_by`) replacing net-side JS chain walker
  - completed: sim-core world-object query selection bridge for `/api/world/objects` (`projection`, `radius`, `limit`, canonical ordering) replacing net-side JS selector
  - in progress: room hotspot regression corpus anchored to level-0 reference map (`modern/net/tests/fixtures/room_hotspots.level0.json`)
  - completed in corpus: virtue room book/key table, British study bench distribution, virtue room plant downshift guard, British study right-wall trio
  - completed: interaction lifecycle regression now asserts canonical `blocked_by` diagnostics for contained-chain blocks
  - next: broaden nested containment fixtures beyond current Virtue room/British study hotspot set
- `[ ]` Capture and archive startup/menu parity screenshot pair (R5)
- `[~]` Start M5 contracts slice (auth + remote saves + critical item recovery policy)
- `[ ]` Add environmental object collision pass (chairs, beds, tables, furniture)
- `[ ]` Add seated/lying interaction states:
  - avatar can sit in chairs and lie/sleep in beds
  - NPCs can enter sit/sleep states with deterministic pose/state transitions

## UI Parity Harness Program (Mechanics Gate)

Before broad gameplay mechanics expansion, panel/UI parity must be measurable and regression-safe.

Status legend for this section:

- `[x]` complete
- `[~]` in progress
- `[ ]` not started

Slices:

- `[x]` U0: Deterministic UI Parity Mode
  - fixed camera/frame capture mode
  - deterministic sample-state loader (inventory, party, paperdoll, messages)
  - one-command probe runner for panel states (screenshot capture optional)
  - legacy-code-first UI anchor matrix documented and test-guarded (`docs/wiki/17-ui-canonical-legacy-matrix.md`, `modern/tools/extract_legacy_ui_anchors.sh`, `modern/tools/test_legacy_ui_anchors.sh`)
  - canonical avatar probe process added (`Party[active]` with `Party[0]` fallback) in `modern/client-web/ui_probe_contract.ts`
  - deterministic probe fixture committed: `modern/client-web/tests/fixtures/ui_probe.sample.json`
  - one-command parity workflow: `modern/tools/run_ui_parity_workflow.sh` (`--verify`/`--write`)
  - CI-required gate now includes legacy anchor guard + deterministic probe fixture verification
- `[x]` U1: Inventory Panel Canonical Harness
  - slot layout/hitbox baselines wired through shared runtime layout module (`modern/client-web/ui/inventory_paperdoll_layout_runtime.ts`)
  - drag/drop/equip target probe matrix added (inventory<->equip deterministic probe counts)
  - legacy-code-derived structural/layout assertions added in `modern/client-web/tests/ui_inventory_paperdoll_layout_test.ts`
- `[x]` U2: Paperdoll + Equipment Harness
  - canonical slot occupancy semantics extracted to shared runtime (`modern/client-web/ui/paperdoll_equipment_runtime.ts`)
  - pseudo-slot overlap resolution (`SLOT_2HND`, `SLOT_RING`) now renderer/probe/test unified
  - deterministic equipment resolution replay probes added and emitted in `canonical_ui.paperdoll_panel.regression_probe_counts`
  - CI/UI parity workflow now gates paperdoll occupancy via `modern/tools/test_client_web_ui_paperdoll_equipment.sh`
- `[x]` U3: Party Management Harness
  - canonical party ordering/selection extracted to shared runtime (`modern/client-web/ui/party_message_runtime.ts`)
  - digit-key party switch resolution now wired in runtime input path with deterministic rules
  - deterministic party selection replay probes emitted in `canonical_ui.party_panel.regression_probe_counts`
- `[x]` U4: Message Log / Scrollback Harness
  - deterministic message window clipping/order projection extracted to shared runtime (`modern/client-web/ui/message_log_runtime.ts`)
  - explicit scrollback boundary command semantics and replay probes added (`line/page/home/end`)
  - persistence/restore roundtrip probes added and surfaced in `canonical_ui.message_log_panel.regression_probe_counts`
  - canonical-vs-modern formatting boundary documented as canonical ledger text projection + modern debug ledger telemetry separation
- `[x]` U5: Panel Scope Partition (Canonical vs Modern)
  - explicit panel scope contract added (`modern/client-web/ui/panel_scope_runtime.ts`)
  - `ui_probe_contract` now emits `ui_scope` classification metadata
  - user/account management panel remains explicitly `modern_ui` (`account_panel`)
  - CI/parity workflow gate added to fail unclassified or duplicate panel scopes
- `[x]` U6: Canonical Target Resolver Harness
  - overlap-cell world target resolution now uses deterministic order semantics (`legacyOrder/order/index`)
  - talk target overlap selection now excludes avatar and applies deterministic tie-break ordering
  - regression probes/test gate added (`modern/client-web/tests/ui_target_runtime_test.ts`)
  - probe contract now publishes target resolver probe counts under `canonical_runtime.target_resolver`
- `[~]` U7: Mechanics Rollout Harness
  - capability contract baseline added in `modern/client-web/gameplay/mechanics_capability_runtime.ts`
  - probe contract now publishes mechanics capability summary/entries under `canonical_runtime.mechanics_capability`
  - mechanics capability validation now enforces `legacy_anchor` and regression-gate coverage for non-planned entries
  - CI now validates that declared `legacy_anchor` and regression gate paths exist in-repo
  - verb-to-capability contract added in `modern/client-web/gameplay/verb_capability_runtime.ts`
  - probe contract now publishes verb binding summary/entries under `canonical_runtime.mechanics_capability.verb_bindings`
  - probe contract now publishes verb coverage integrity for active interaction capabilities
  - CI gate added for capability matrix invariants (`modern/client-web/tests/ui_mechanics_capability_runtime_test.ts`)
  - CI gate added for verb capability matrix invariants (`modern/client-web/tests/ui_verb_capability_runtime_test.ts`)
  - pending: mechanic-by-mechanic canonical rollout tests (combat, spell resolution, schedule/pathing, quest state progression)

Reference policy for U0-U7:

- canonical authority: legacy decompiled code + verified runtime data semantics
- required evidence: symbol/routine anchors, deterministic probe output, contract assertions
- screenshots are helpful but not required for initial slice completion when source visuals are unavailable

## Known Blockers / Risks

- `[~]` Full canonical title-menu ownership is split across assets/executable paths not entirely represented in released decompiled C source.
- `[x]` Wall/corner/contextual blackout parity hardening pass completed for current default renderer path.
- `[~]` Browser renderer still owns logic that should ultimately be centralized in sim-core authority boundaries.
- `[ ]` Multiplayer remains deferred until rendering/interactions reach stable parity confidence.
- `[~]` Audio parity work is intentionally paused while interaction/collision parity slices are prioritized.

## Deferred Backlog (Intentional Pause)

- `[~]` Audio parity program (paused):
  - OPL backend fidelity work
  - ScummVM/Nuvie reference tuning
  - worklet/runtime hardening after gameplay-interaction slices

## Next Immediate Task

Continue canonical interaction-parity closure before resuming audio:

1. Implement assoc/container-chain traversal semantics for contained items (cycle/missing-parent guards). (`complete`; now sim-core-native + bridged into net interaction authority)
2. Enforce chain-access rules in canonical interaction execution (`take/put/drop/equip`) and expose `blocked_by` diagnostics. (`complete` for server endpoint path)
3. Add deterministic replay/hash fixtures for repeated interaction command streams over nested chains. (`in progress`, lifecycle + reset replay hash checks landed)
4. Add room-level canonical fixture corpus for interaction hotspots (Virtue room / British study stack cases).
5. Only after chain semantics closure: proceed to environmental collision + sit/sleep interaction slice.
6. Add dev-slice spec for LB early-story intro gate (battle-script dependent) but keep it deferred until combat/script compatibility is complete.
6.5. Finalize C/WASM sim-core backend authority contract and make it a prerequisite gate for major architecture cleanup/migration slices.

Then continue R5/R3 closure and M5:

7. Capture startup/title parity screenshots against legacy references.
8. Add deterministic interaction visual-state replay fixtures (doors + sit/sleep states).
9. Continue M5 backend/game-state authority slices.

After these interaction closures, execute UI parity harness slices U0-U5 before major gameplay-system rollout.
