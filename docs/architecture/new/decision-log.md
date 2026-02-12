# Modern Decision Log

Track significant modernization decisions with links back to legacy evidence.

## Entry Template

```text
Decision ID:
Date:
Status:
Decision:
Legacy References:
Alternatives Considered:
Consequences:
Validation Plan:
```

## Decisions

Decision ID: DEC-0001
Date: 2026-02-11
Status: accepted
Decision: separate authoritative simulation (`sim-core`) from rendering/UI client.
Legacy References: `../legacy/module-map.md` (main loop and gameplay segments), `../legacy/symbol-catalog.md` (state globals)
Alternatives Considered: direct UI-coupled port of legacy flow
Consequences: clearer multiplayer path and easier deterministic testing; higher upfront architecture effort
Validation Plan: implement replay/hash tests before major UI work

Decision ID: DEC-0002
Date: 2026-02-12
Status: accepted
Decision: multiplayer sessions will use server-authoritative state with authenticated user accounts and remotely persisted character/world records.
Legacy References: `../legacy/symbol-catalog.md` (`world_state_globals`, `objlist_world_tail`), `../legacy/startup-menu-parity.md` (startup/load flow context)
Alternatives Considered: peer-to-peer host state, local-only save files, anonymous ephemeral sessions
Consequences: more backend complexity (auth, storage, migrations), but clear trust model, durable progression, and practical anti-cheat baseline.
Validation Plan: define network/storage contracts first, then implement deterministic server replay/hash checks over persisted snapshots before live multiplayer sync.

Decision ID: DEC-0003
Date: 2026-02-12
Status: accepted
Decision: multiplayer world authority must include critical quest-item recovery/respawn rules to prevent permanent progression deadlocks.
Legacy References: `../legacy/module-map.md` (quest/progression flow surfaces), `../legacy/symbol-catalog.md` (`world_runtime_flags`)
Alternatives Considered: no respawn policy, GM-only manual restoration, full world reset
Consequences: requires an explicit item policy table and server-side spawn auditing, but guarantees quest continuity across long-lived worlds.
Validation Plan: implement deterministic recovery rules and add tests ensuring critical items can always be reacquired after loss/destruction.
