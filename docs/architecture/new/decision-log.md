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
