# Legacy vs Modern Deviation Ledger

## Why This Ledger Matters

Undocumented differences become accidental canon.

This ledger keeps architecture honest: every meaningful divergence is labeled, justified, and visible.

It is also a planning tool: known gaps define where not to overfit visual fixes yet.

Status tags:

- `faithful`: behavior intended to match legacy semantics
- `intentional-divergence`: modern choice with explicit rationale
- `known-gap`: parity work not complete

## Architecture-Level Deviations

### Separation of Concerns

- Status: `intentional-divergence`
- Legacy: tightly coupled runtime loop
- Modern: split into `sim-core`, `client-web`, `net`
- Rationale: determinism, multiplayer, testability

### Persistence Envelope

- Status: `intentional-divergence`
- Legacy: direct DOS-era save structures
- Modern: versioned, checksummed snapshot envelope
- Rationale: corruption detection and migration safety

## Rendering/Object Deviations

### Overlay Source Scan Window

- Status: `faithful`
- Legacy anchor: `SearchArea(MapX - 5, MapY - 5, MapX + 6, MapY + 6)`
- Modern: uses `viewW+1/viewH+1` source window for object streams

### Spill Composition Rules

- Status: `faithful`
- Legacy anchor: `C_1184_35EA`
- Modern: spill-left/up/up-left from tile flags

### Hidden-Source Overlay Suppression

- Status: `known-gap` (needs exhaustive map-wide confirmation)
- Legacy relation: tied to legacy visibility/open-area logic
- Modern: suppression in composition path to avoid hidden decor bleed

### Same-Cell Tie Ordering

- Status: `intentional-divergence` (bounded)
- Legacy anchor: `C_1184_29C4` comparator semantics
- Modern: `C_1184_29C4` primary compare with deterministic tie stabilization (`sourceArea/sourceIndex/order`)
- Remaining risk: full assoc-chain resolution for non-`LOCXYZ` links is still incomplete in client-side render stream modeling

Observed impact archetype:

- support furniture appears correct
- movable items bunch at right or endpoint cells
- introducing/removing one object appears to "shuffle" neighbors

## Data Provenance Deviations

### Object Baseline Source

- Status: `faithful` (current policy)
- Legacy expectation: canonical world object blocks, not arbitrary mutated save snapshots
- Modern policy: root `objblk??` -> `lzobjblk` extraction -> `savegame` fallback
- Notes: this closed major one-cell object parity failures in British’s study / bedroom paths

## Network Authority Deviations

### Server-Authoritative World Objects

- Status: `intentional-divergence`
- Legacy: single-process local authority
- Modern: server baseline + deltas for multi-user environment
- Rationale: consistent multiplayer state

## Open Gaps Requiring Deep Legacy Pass

- full chain-association and contained/inventory relationship effects in render ordering edge cases
- room-wide exhaustive parity sweeps after canonical provenance correction
- complete startup/title flow provenance from `u.exe`/intro path integration

## Deviation Policy

When adding a new deviation entry, include:

1. what differs
2. why it differs
3. why that choice is acceptable now
4. what conditions would retire or revise the deviation

Without this, the ledger becomes a bug graveyard instead of an engineering contract.

## Player-Visible Impact

This page predicts where players may still notice mismatch:

- edge-case stack ordering
- hidden/visible transition artifacts
- startup/flow differences outside room rendering

If a bug appears "new," check this ledger first before assuming regression.

## Current Risk Concentration

Highest remaining parity risk is concentrated in:

- same-cell stack ordering under mixed support/background object states
- edge interactions between legacy obscurity overlays and interactable small items
- residual assumptions inherited from pre-canonical baseline data periods
