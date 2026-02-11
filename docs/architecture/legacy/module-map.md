# Legacy Module Map (Initial)

Status: working draft.

## Core Runtime and Boot

- `SRC/seg_0903.c`: startup, config parsing, memory allocation, graphics mode init, main loop entry, external executable handoff points.
- `SRC/seg_32C3.c`: disk/floppy management logic and disk confirmation flow.

## Main Loop, UI, Command Processing

- `SRC/seg_0A33.c`: command handling and frame/gameflow behavior.
- `SRC/seg_0C9C.c`: world/game state load/save flow and UI-related status interactions.

## World and Object State

- `SRC/seg_101C.c`: map/chunk loading and local world streaming/cache logic.
- `SRC/seg_1100.c`: world/tile mechanics support.
- `SRC/seg_1184.c`: object block read/write and persistence support.
- `SRC/D_2C4A.c`: key global simulation state variables.

## Gameplay Systems

- `SRC/seg_16E1.c`: gameplay support system (naming still under validation).
- `SRC/seg_1703.c`: conversation/script-like logic and gameplay interactions.
- `SRC/seg_1944.c`: major gameplay logic block (combat/interaction related areas present).
- `SRC/seg_1E0F.c`: pathfinding/tracker-like logic.
- `SRC/seg_2337.c`: gameplay support segment.
- `SRC/seg_27a1.c`: book/text/dialogue-content-related processing.
- `SRC/seg_2E2D.c`: spell/effect/gameplay logic.
- `SRC/seg_2FC1.c`: graphics effects, projectiles, conversations/portraits loading.

## Audio

- `SRC/seg_2F1A.c`: music/sound sequencing and driver loading.
- `SRC/OSILIB/SOUND*.ASM`: hardware-oriented sound routines.

## Low-Level Platform Layer (DOS Era)

- `SRC/OSILIB/OSI_FILE.ASM`: file operations abstraction.
- `SRC/OSILIB/KBD.ASM`: keyboard low-level routines.
- `SRC/OSILIB/MOUSE.ASM`: mouse low-level routines.
- `SRC/OSILIB/LOW.ASM`, `DELAY*.ASM`, `RAND.ASM`: platform/timing/random helpers.
- `SRC/OSILIB/INFLATE.ASM`: compressed data inflate path.

## Data/Constants

- `SRC/seg_3522.c`, `SRC/seg_356A.c`: constants/tables/messages.
- `SRC/BSS.ASM`: large global storage definitions.

## Open Questions

- Need finer-grained function-level map for each segment.
- Need dependency graph by call edges for extraction order.
- Need validation list for functions with currently ambiguous names.
