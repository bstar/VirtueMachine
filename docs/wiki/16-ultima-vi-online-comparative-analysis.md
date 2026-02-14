# Ultima VI Online Comparative Analysis

Target reference project: [CearDragon/ultima-vi-online](https://github.com/CearDragon/ultima-vi-online)

This chapter compares that project to VirtueMachine with one goal: identify where it diverges from a canonical Ultima VI parity program and why that matters for your current direction.

## Executive Summary

`ultima-vi-online` is a historically significant MMO adaptation of Ultima VI, built around Win32-era client/host networking and gameplay loops.

VirtueMachine is a canonical-parity-first reconstruction program that is intentionally separating:

- legacy behavior recovery,
- deterministic simulation boundaries,
- modern API/UI runtime contracts.

Both projects are valuable, but they optimize for different outcomes:

- `ultima-vi-online`: playable online experience and custom multiplayer behavior.
- VirtueMachine: faithful legacy semantics first, then modern operability.

## Evidence Anchors (Reference Project)

Representative evidence from `legacy/ultima-vi-online`:

- Monolithic build toggles:
  - `legacy/ultima-vi-online/u6o7.cpp` (`#define CLIENT`, `#define HOST` comments and shared include tree)
- Message/protocol constants:
  - `legacy/ultima-vi-online/define_both.h` (`MSG_*`)
- Host/client global data partitions:
  - `legacy/ultima-vi-online/data_both.h`
  - `legacy/ultima-vi-online/data_host.h`
  - `legacy/ultima-vi-online/data_client.h`
- Socket threading and framing:
  - `legacy/ultima-vi-online/function_both.cpp` (`sockets_send`, `sockets_receive`, `BITSadd`, `BITSget`)
  - `legacy/ultima-vi-online/function_host.h` (`sockets_accept`)
- Render hot paths and asm:
  - `legacy/ultima-vi-online/function_client.h` (`inline_asm/*.asm` includes)
  - `legacy/ultima-vi-online/inline_asm/fast.asm`
- Platform stack:
  - `legacy/ultima-vi-online/u6o7.cpp` (WinSock, WinInet, WinReg, DirectX-era includes)
  - `legacy/ultima-vi-online/myddraw.cpp`
  - `legacy/ultima-vi-online/dmusic.cpp`
- Very large loop-centric gameplay cores:
  - `legacy/ultima-vi-online/loop_host.cpp`
  - `legacy/ultima-vi-online/loop_client.cpp`

## Architecture Delta: What It Is Doing Differently

## 1) Runtime Topology

`ultima-vi-online`:

- Single C/C++ codebase with compile-time host/client mode switching.
- Heavy macro + include driven composition.
- Large global state surface shared across gameplay, rendering, and networking.

VirtueMachine:

- Deliberate subsystem split (`sim-core`, `net`, `client-web`, tooling).
- Clear runtime boundaries between simulation, transport/API, and UI composition.
- More explicit contracts to isolate parity defects to the correct layer.

Impact:

- `ultima-vi-online` moves fast for integrated behavior changes.
- VirtueMachine is better for proving canonical correctness per subsystem without accidental cross-coupling.

## 2) Networking Model

`ultima-vi-online`:

- Custom socket pipeline with manual message framing and bit packing (`BITSadd` / `BITSget`).
- Hand-rolled thread lifecycle and disconnect handling.
- Protocol semantics coupled tightly to game loop internals.

VirtueMachine:

- Server-authoritative API layer with explicit endpoint semantics and testable contracts.
- Diagnostics (hover/parity/status metadata) are surfaced as first-class debug interfaces.
- Easier to version and reason about from outside the rendering loop.

Impact:

- `ultima-vi-online` protocol is efficient and era-appropriate, but harder to externally introspect.
- VirtueMachine trades some low-level compactness for observability and deterministic auditing.

## 3) Canonicality Strategy

`ultima-vi-online`:

- Pragmatic MMO adaptation choices; gameplay/network goals drive behavior.
- Not organized as a strict “legacy routine parity proof” program.

VirtueMachine:

- Canonical evidence ladder is explicit (decompiled source + original data + instrumentation).
- Deviations are tracked, tested, and documented rather than folded silently into implementation.

Impact:

- If your objective is “faithful Ultima VI semantics first,” VirtueMachine’s process model is closer to your target.
- If your objective is “playable online reinterpretation,” `ultima-vi-online` is closer to that target.

## 4) Data Provenance and Object Truth

`ultima-vi-online`:

- Uses real assets and substantial custom runtime logic, but does not expose a modern provenance/debug contract comparable to current VirtueMachine parity tooling.

VirtueMachine:

- Treats world object provenance as a hard contract (`objblk`/`lzobjblk`/ordering diagnostics).
- Invests heavily in proving source, order, spill, suppression, and assoc behavior at runtime.

Impact:

- VirtueMachine can explain “why this cell is wrong” with structured evidence.
- `ultima-vi-online` can absolutely be behaviorally correct in many places, but the proof pipeline is less formalized for parity triage.

## 5) Rendering Pipeline Philosophy

`ultima-vi-online`:

- DirectDraw-era rendering path, plus inline assembly acceleration hooks.
- Tight coupling between scene processing and runtime behavior.

VirtueMachine:

- Browser/UI renderer with explicit overlay composition phases, source typing, and debug introspection.
- Theme-aware debugging and documentation UX for iteration speed.

Impact:

- `ultima-vi-online` prioritizes practical frame-era performance characteristics.
- VirtueMachine prioritizes inspectability and parity debugging throughput.

## 6) Build and Operational Shape

`ultima-vi-online`:

- Visual Studio project artifacts and Windows-native dependencies.
- Repo includes build-era artifacts and tightly platform-specific assumptions.

VirtueMachine:

- Cross-platform development workflow centered around modern toolchains and test scripts.
- Runtime diagnostics and docs are integrated into daily parity workflow.

Impact:

- `ultima-vi-online` is historically authentic to its implementation era.
- VirtueMachine is easier to run in contemporary multi-platform contributor environments.

## Canonical Gap Framing for Your Current Goal

Given your stated goal ("original source is canonical"):

- `ultima-vi-online` is not the canonical target implementation.
- It is an inspiration and proof that rich online Ultima VI experiences are possible.
- It is best used as a comparative signal for design ideas, not as final behavior authority.

Canonical authority should remain:

1. `legacy/u6-decompiled` routines,
2. original game data semantics,
3. verified parity instrumentation in VirtueMachine.

## Practical Reuse Opportunities From Ultima VI Online

Even with different goals, there are reusable ideas:

- message taxonomy discipline (`MSG_*` families),
- host/client separation concepts (translated into modern service boundaries),
- battle-tested MMO feature instincts (respawn, persistence, social loops).

Use those as design references, but keep canonical behavior validation anchored to legacy evidence.

## What To Avoid Importing Directly

For VirtueMachine’s parity-first scope, avoid importing these patterns directly:

- compile-time host/client identity switching for core runtime,
- broad global mutable state as cross-layer dependency glue,
- protocol/gameplay coupling that bypasses deterministic contract tests.

These patterns increase parity triage cost when behavior deviates.

## Recommended Comparative Workflow

When evaluating future differences:

1. classify each behavior as canonical requirement vs MMO extension,
2. anchor canonical requirements to `legacy/u6-decompiled`,
3. implement with explicit contracts in `sim-core`/`net`/`client-web`,
4. document deviation or extension intent in the ledger/wiki,
5. validate with parity snapshot + hover diagnostics + contract tests.

This keeps inspiration from `ultima-vi-online` while preserving canonical discipline.
