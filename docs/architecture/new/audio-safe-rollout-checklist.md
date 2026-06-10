# Audio Safe Rollout Checklist

Last Updated: 2026-06-10
Branch: `main`

## Goal

Add faithful legacy-style audio without ever regressing core interaction stability
(mouse, keyboard, world render loop, startup menu flow).

Primary fidelity target: match ScummVM/Nuvie playback behavior for Ultima VI
music/SFX as closely as practical in browser constraints.

## Current Status

Audio fidelity work has resumed with a browser-local safe runtime:

- `modern/client-web/audio/audio_runtime.ts` owns lazy Web Audio initialization and fail-closed playback.
- `modern/client-web/audio/sfx_ids_runtime.ts` records the Nuvie `NUVIE_SFX_*` numeric surface.
- `modern/client-web/audio/pc_speaker_sfx_runtime.ts` implements the Nuvie-style procedural PC speaker SFX generator.
- Ambient object SFX now use a separate parameterized path based on the original `MUS_0525` routine instead of static cached clips.
- `modern/client-web/audio/u6m_music_runtime.ts` decodes original LZW-compressed `.m` songs and emits Nuvie-style AdLib register writes.
- `Ctrl+Z` now toggles the audio runtime in addition to the legacy `sound_enabled` world flag.
- The runtime debug panel now exposes backend/mute/error state and ambient trigger counters.
- The boot intro calls `playMusic("intro.m")` through the audio facade, but the AdLib music backend is still pending.

Nuvie finding: Ultima VI `native` SFX maps to PC speaker in Nuvie. AdLib is primarily the music fidelity path for U6; Nuvie's AdLib SFX manager only wires tick and explosion. Nuvie's PC speaker SFX manager does not synthesize U6 fountain/fire/clock/protection/water-wheel as fixed one-shots, so browser ambient playback should follow the original queued object routine in `seg_2F1A.c::MUS_0525`.

## Non-Negotiable Guardrails

- Audio code must never throw into `tickLoop`.
- If audio backend fails, auto-disable audio and continue running UI/render.
- Audio backend initialization must be lazy and must require a user gesture.
- Each slice must be reversible and independently testable.
- Keep browser audio changes isolated to `modern/client-web/*` unless the contained GPL-derived AdLib component requires a dedicated source boundary.

## Slice Plan

### Slice A: Safety Foundation

- [x] Add lazy browser audio facade with runtime status.
- [x] Keep Web Audio initialization behind user gesture.
- [x] Ensure backend failures disable audio instead of throwing into caller code.
- [x] Preserve no startup-time external script loads.
- [x] TypeScript typecheck passes.
- [x] Add visible audio diagnostics for backend/status/last error.
- [x] `ctest` parity suite remains green.

### Slice B: PC Speaker SFX

- [x] Port Nuvie SFX constants.
- [x] Port core PC speaker tone, sweep, random, stutter, and queued composite generators.
- [x] Wire initial events: blocked movement, attack swing, casting stub, bell, and rubber duck.
- [ ] Wire remaining original event sites as gameplay systems come online: hit, glass, death, missile/explosion, corpsers, slug dissolve, Kal Lor, hail stone, earthquake.
- [x] Add ambient object SFX for clock/fire/fountain/protection field/water wheel from visible map objects.
- [x] Replace static ambient approximations with original-style distance/tick-dependent generation:
  clock tick/tack phases, random-gated fire/protection, and distance-attenuated fountain/water-wheel noise.
- [x] Add project-native automated test runner coverage for the audio test file.

### Slice C: OPL / AdLib Port Behind Hard Gate

- [ ] Create contained GPL-derived Nuvie audio component for `OplClass`, `Cu6mPlayer`, and AdLib SFX stream behavior.
- [ ] Lazy-load OPL runtime only after explicit music enable.
- [x] Decode `.m` song command streams and emit register writes at Nuvie's 60 Hz cadence.
- [ ] Route `.m` song register writes through an OPL backend adapter.
- [ ] Implement `playMusic("intro.m")`, `stopMusic`, and group song selection.
- [ ] Implement Nuvie's limited AdLib SFX tick/explosion path.
- [ ] Add hard failover to disabled audio on any backend exception.

### Slice D: Fidelity Tuning and Validation

- [ ] Verify song decode + command execution against known `intro.m` behavior.
- [ ] Match sample-rate behavior to browser output rate.
- [ ] Add A/B notes against ScummVM/Nuvie reference capture.
- [ ] Tune PC speaker ambient timing/gain against captured reference; current formulas follow original control flow but still need ear-level capture comparison.
- [ ] Tune mixer gain/headroom (avoid clipping/noise floor artifacts).
- [ ] Validate pitch/key against reference (no transposition drift).
- [ ] Validate tempo/tick cadence against reference (no timing drift).
- [ ] Validate envelope/timbre class per instrument family against reference.

## Parity Criteria (ScummVM/Nuvie)

- Pitch parity: sustained-note cent error should remain small and stable (no key shift).
- Tempo parity: phrase timing drift should not accumulate perceptibly over 30s.
- Structural parity: same note on/off and phrase boundaries for `intro.m` and `ultima.m`.
- Mix parity: relative channel balance should avoid dominant/flattened instruments.
- Stability parity: enabling/disabling audio must never impact controls or render loop.

### Slice E: Runtime Hardening

- [ ] Move OPL rendering into `AudioWorklet` or equivalent isolated path.
- [ ] Add reconnect/re-init logic on context suspend/resume.
- [ ] Add bounded watchdog metrics for underruns/errors.
- [ ] Document dependency/license implications clearly.

Acceptance:

- [ ] Stable across tab focus changes and long sessions.
- [ ] No recurring error loops.

## Rollback Policy

If any slice causes interaction instability:

1. Revert that slice immediately on current working branch.
2. Keep prior stable slice as branch tip.
3. Document failure mode and reproduction notes before retrying.
