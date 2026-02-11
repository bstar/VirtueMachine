# Modern System Overview

## Design Objective

Retain original gameplay semantics in an authoritative simulation core while enabling a modern web renderer, larger viewport, improved UI, and future multiplayer.

## Subsystems

## 1) `sim-core` (Authoritative)

- Owns world state and gameplay rule execution.
- Consumes commands and advances fixed ticks.
- Has no dependency on browser/UI APIs.

## 2) `platform` (Abstraction Layer)

- Provides deterministic time, filesystem access, and random source hooks.
- Wraps original-data loading and save persistence.
- Replaces DOS-specific service expectations.

## 3) `client-web` (Presentation)

- Rendering, camera/viewport, HUD/interface, input capture.
- Converts user actions into simulation commands.
- Never mutates authoritative simulation state directly.

## 4) `net` (Multiplayer Transport)

- Tick-synchronized command transport.
- Desync detection and diagnostics.
- Host-authoritative session orchestration.

## Data Flow

1. Input/UI emits command for target tick.
2. `sim-core` applies commands in deterministic order.
3. `sim-core` emits frame/state snapshots for rendering.
4. Client renderer consumes state and draws modern view.

## Compatibility Strategy

- Preserve update order and timing-critical behaviors where validated.
- Keep content formats loadable from original asset files.
- Record all parity exceptions in docs and tests.

## Legacy Links

- Legacy modules: `../legacy/module-map.md`
- Symbol provenance: `../legacy/symbol-catalog.md`
