# Legacy Runtime Anatomy (Ultima VI DOS)

## Why Legacy Looks "Weird" But Works

Ultima VI's original runtime is dense and coupled, but that coupling is why the world feels coherent.

- Rendering reads the same object state that interaction logic reads.
- Save/load structures are tightly aligned with in-memory assumptions.
- Visibility, ordering, and spill behavior are all shaped by one historical execution model.

If we model legacy as a set of isolated modern systems without preserving those couplings at boundaries, the game "mostly works" but rooms start lying visually.

## High-Level Runtime Model

Legacy Ultima VI is a tightly coupled DOS-era runtime where simulation, rendering, UI, and IO are interleaved in the same execution flow.

This architecture emerged from late-80s/early-90s constraints:

- strict memory budgets
- disk and decompression latency concerns
- direct framebuffer update patterns
- minimal abstraction overhead

What looks "messy" from a modern perspective was often deliberate performance and determinism engineering for target hardware.

Primary module anchors:

- `legacy/u6-decompiled/SRC/seg_0903.c`: boot/init, resource loading, mode setup
- `legacy/u6-decompiled/SRC/seg_0A33.c`: command/gameflow loop
- `legacy/u6-decompiled/SRC/seg_0C9C.c`: save/load + runtime state plumbing
- `legacy/u6-decompiled/SRC/seg_101C.c`: map/chunk window streaming
- `legacy/u6-decompiled/SRC/seg_1184.c`: object blocks, object render staging, object serialization

## Core Data Structures

### Object State

- `ObjStatus[]`, `ObjPos[]`, `ObjShapeType[]`, `Amount[]` arrays form primary object storage.
- Coord-use semantics (`LOCXYZ`, `CONTAINED`, `INVEN`, `EQUIP`) come from `legacy/u6-decompiled/SRC/u6.h`.
- Packed coordinate layout is bit-encoded in 3 bytes, decoded via `GetCoordX/GetCoordY/GetCoordZ` style macros.

### World State

- Key globals live in the `D_2C4A` region (`legacy/u6-decompiled/SRC/D_2C4A.c`, mapped via `u6.h`).
- `savegame/objlist` includes a fixed tail block with world fields used by modern compatibility boundaries.

Legacy logic assumes these arrays and tails are coherent as one world-model object graph, even though they are physically split across files and globals.

### Map State

- `map` and `chunks` are read in fixed binary formats.
- Chunk indices are packed 12-bit values; chunk data blocks are fixed-length (`0x40` bytes).

## Legacy Object Rendering Path (Critical for Parity)

Core routines in `legacy/u6-decompiled/SRC/seg_1184.c`:

- `ShowObjects()` (`C_1184_36C2`): scans a source area around player and draws object overlays into tile-local composition chains.
- `ShowObject()` (`C_1184_347C`): inserts one overlay tile into per-cell object chain with floor/occluder rules.
- `C_1184_35EA`: applies spill fragments for double-width/double-height tiles.
- `SearchArea(MapX - 5, MapY - 5, MapX + 6, MapY + 6)`: includes an extra right/bottom source row/column so spill-left/up can land in-view.

## Legacy Serialization Paths

- Outdoor object blocks are persisted as `savegame/objblk??` files.
- Object list + world tail are persisted in `savegame/objlist`.
- Object ordering and chain behavior rely on object status/association semantics and comparator behavior (`C_1184_29C4`).

## Practical Takeaway

Legacy behavior is not only “data + sort by x/y”: it is data + status semantics + view-window rules + spill rules + composition insertion policy.

## Legacy Coupling That Matters Most

If you need one mental model, use this:

- coordinates are not just position; they encode containment and equipment semantics
- draw order is not just painter's algorithm; it is status-aware composition behavior
- visibility is not a pure render concern; it is tied to legacy open-area logic

Breaking any of these couplings creates subtle visual lies:

- objects seem selectable where they should be concealed
- floor/background states appear where object overlays should dominate
- same-cell stacks become unstable between ticks or rooms

## Common Misreads Of Decompiled Legacy

1. Mistake: "Comparator is the whole ordering model."  
Reality: comparator + chain insertion + spill rules + status semantics produce final image.

2. Mistake: "If tile id matches, behavior matches."  
Reality: source window and spill origin semantics can still be wrong while tile ids look plausible.

3. Mistake: "Containment logic is unrelated to overworld rendering."  
Reality: status bits and association semantics influence what is eligible, where, and when.

## What To Validate Before Any Rewrite

Before touching modern code for a parity issue:

1. locate legacy anchor function and call path
2. confirm data source provenance for the problematic room/cell
3. confirm whether behavior depends on status semantics (LOCXYZ/CONTAINED/INVEN/EQUIP)
4. confirm edge-window inclusion assumptions (`+1` source row/column behavior)

Skipping step 2 is the most common cause of long debug loops.

## Player-Visible Impact

When this chapter is misunderstood, players see:

- candles, books, and keys shifted on benches/tables
- large objects clipping or splitting incorrectly
- hidden-room decor leaking into visible rooms

When this chapter is implemented faithfully, rooms "read" like Ultima VI immediately, even before polish.
