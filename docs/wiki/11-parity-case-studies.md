# Parity Case Studies (From Pain To Pattern)

This chapter captures real classes of parity failures and what actually resolved them.

The point is not nostalgia. The point is to preserve hard-won debugging patterns so future work does not repeat avoidable loops.

## Case Study A: "Book/Key/Table Stack Drift"

### Symptom

- a tabletop item appears one cell off
- moving one object makes another vanish or appear under furniture art
- hover report shows object overlays present but wrong support context

### False Hypotheses That Wasted Time

- "just move this specific item one tile"
- "renderer spill math is globally wrong"
- "the object tile id is wrong"

### Actual Root-Cause Pattern

Combination of:

1. baseline provenance ambiguity (`objblk??` source mismatch)
2. same-cell insertion/order behavior sensitivity
3. support-object layering interactions

### Durable Fix Pattern

1. prove canonical baseline source
2. clear/verify network deltas
3. validate insertion semantics at the problematic cell with hover evidence
4. add targeted tests/probes

### What This Taught Us

When a room object "moves" after each attempted fix, the issue is usually not local geometry. It is usually a truth-layer mismatch (data provenance or authority state).

## Case Study B: "Bench Items Shift Right And Endpoint Stack"

### Symptom

- small inventory objects on a bench appear shifted
- rightmost cell accumulates unexpected stack
- support furniture visuals remain mostly stable

### Legacy-Semantics Clue

Items in this class are inventory-capable and tend to stress same-cell ordering + support relationship behavior.

### Root-Cause Pattern

Not one bug, but a composite:

- incorrect or stale source baseline
- tie-break and insertion semantics not fully legacy-faithful in same-cell scenarios
- confusion between background/support overlays and interactable object overlays

### Durable Fix Pattern

- establish canonical baseline first
- isolate same-cell stream ordering in reports
- avoid room-specific coordinate offsets

### What This Taught Us

If endpoint stacking appears, treat it as an ordering and provenance signal, not as a coordinate nudge opportunity.

## Case Study C: "Renderer Patch Breaks Unrelated Doors"

### Symptom

- one room improves
- door/wall behavior regresses elsewhere

### Root-Cause Pattern

Global render-layer behavior was altered to compensate for local data or ordering mismatch.

### Durable Fix Pattern

- revert broad behavioral hacks
- classify problem layer first
- re-implement with legacy anchor evidence

### What This Taught Us

Cross-room regressions are usually classification failures, not implementation failures.

## Cross-Case Pattern Library

When you see this -> suspect this first:

- one-cell object drift in many rooms -> baseline provenance
- no visible change after code change -> network authority/delta state
- object appears but under support art -> insertion/same-cell semantics
- "fix" in one room causes unrelated regressions -> wrong abstraction boundary

## Recommended Incident Report Template

Every parity incident should include:

1. room and cell coordinates
2. hover report excerpt
3. baseline source provenance evidence
4. network delta state at time of reproduction
5. legacy anchor function reference
6. classification (provenance, ordering, spill, visibility, authority)
7. remediation and regression-check scope

This keeps fixes portable and prevents knowledge loss between sessions.
