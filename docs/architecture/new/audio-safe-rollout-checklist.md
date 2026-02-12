# Audio Safe Rollout Checklist

Last Updated: 2026-02-12
Branch: `feature/audio-opl-safe`

## Goal

Add faithful legacy-style audio without ever regressing core interaction stability
(mouse, keyboard, world render loop, startup menu flow).

Primary fidelity target: match ScummVM/Nuvie playback behavior for Ultima VI
music/SFX as closely as practical in browser constraints.

## Non-Negotiable Guardrails

- Audio code must never throw into `tickLoop`.
- If audio backend fails, auto-disable audio and continue running UI/render.
- Audio backend initialization must be lazy (no load/init at page startup).
- Each slice must be reversible and independently testable.
- Keep changes isolated to `modern/client-web/*` unless explicitly required.

## Slice Plan

### Slice A: Safety Foundation (No Audio Behavior Change)

- [ ] Add `AudioBackend` interface + `NullAudioBackend` implementation.
- [ ] Add feature flag plumbing (`audioBackendMode=off|opl_spike`) with default `off`.
- [ ] Add diagnostics field for backend mode/status.
- [ ] Ensure no new startup-time script loads.

Acceptance:

- [ ] UI/mouse/keyboard behavior identical to baseline.
- [ ] `ctest` parity suite remains green.

### Slice B: OPL Spike Behind Hard Gate

- [ ] Lazy-load OPL runtime only after explicit music enable.
- [ ] Route register writes through backend adapter.
- [ ] Keep legacy parser and timing on main thread (initial spike).
- [ ] Add hard failover to `off` mode on any backend exception.

Acceptance:

- [ ] Backend failures never impact world input/render.
- [ ] Diagnostic status clearly reports fallback condition.

### Slice C: Fidelity Tuning and Validation

- [ ] Verify song decode + command execution against known `intro.m` behavior.
- [ ] Match sample-rate behavior to browser output rate.
- [ ] Add A/B notes against ScummVM/Nuvie reference capture.
- [ ] Tune mixer gain/headroom (avoid clipping/noise floor artifacts).
- [ ] Validate pitch/key against reference (no transposition drift).
- [ ] Validate tempo/tick cadence against reference (no timing drift).
- [ ] Validate envelope/timbre class per instrument family against reference.

Acceptance:

- [ ] Title theme pitch and timing are within defined parity tolerances.
- [ ] Instrument character is subjectively aligned with ScummVM/Nuvie reference.
- [ ] No interaction regressions under extended runtime.

## Parity Criteria (ScummVM/Nuvie)

- Pitch parity: sustained-note cent error should remain small and stable (no key shift).
- Tempo parity: phrase timing drift should not accumulate perceptibly over 30s.
- Structural parity: same note on/off and phrase boundaries for `intro.m` and `ultima.m`.
- Mix parity: relative channel balance should avoid dominant/flattened instruments.
- Stability parity: enabling/disabling audio must never impact controls or render loop.

### Slice D: Runtime Hardening

- [ ] Move OPL rendering into `AudioWorklet` or equivalent isolated path.
- [ ] Add reconnect/re-init logic on context suspend/resume.
- [ ] Add bounded watchdog metrics for underruns/errors.
- [ ] Document dependency/license implications clearly.

Acceptance:

- [ ] Stable across tab focus changes and long sessions.
- [ ] No recurring error loops.

## Rollback Policy

If any slice causes interaction instability:

1. Revert that slice immediately on `feature/audio-opl-safe`.
2. Keep prior stable slice as branch tip.
3. Document failure mode and reproduction notes before retrying.
