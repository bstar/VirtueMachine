# Legacy Keyboard Parity Matrix

Last Updated: 2026-02-13

## Source Baseline

Primary legacy source:

- `legacy/u6-decompiled/SRC/seg_0A33.c` (`C_0A33_1CB4` main input loop)

Key evidence:

- command letters (`A,C,T,L,G,D,M,U,R,B`) and save (`Ctrl+S`) are mapped in the switch at `seg_0A33.c:1033+`.
- command-target flow uses select mode + aimed cursor (`AimX/AimY`, `SelectMode`, `SelectRange`) before action dispatch (`CMD_8E` path).
- control keys include restore (`Ctrl+R`), sound (`Ctrl+Z`), help (`Ctrl+H`), version (`Ctrl+V`).

## VirtueMachine Mapping (Current)

### World Mode

- `Arrow Keys`: movement (primary)
- `W/A/S/D`, `H/J/K/L`: movement fallbacks
- `A C T L G D M U`: enter legacy target mode with verb-specific label
- `R`: rest key recognized (stub)
- `B`: begin/break combat key recognized (currently toggles `in_combat` flag)
- `I`: inventory key recognized (stub)
- `0-9`: party/solo command keys recognized (stub)
- `Space` / `Esc`: pass-turn key recognized

### Target Mode (legacy select-box style)

- `Arrow Keys`: move target
- `Numpad 1/3/7/9`: diagonal target movement
- `Enter` / `U` / `Space`: confirm current target
- `Esc`: cancel target mode

`Use` target currently executes live interaction (`door/chair/bed`) at target tile.
Other verbs are wired as parity-recognized stubs pending gameplay-system implementation.

### Debug/Net Hotkeys (moved off plain legacy letters)

- `Shift+I`: net login/logout
- `Shift+Y`: world snapshot save
- `Shift+U`: world snapshot load
- `Shift+N`: maintenance run
- `Shift+P`: viewport capture
- `Shift+Alt+P`: world+HUD capture
- `Shift+O/F/B/M/G/R/V`: debug toggles
- `Ctrl+S/Ctrl+R/Ctrl+Z/Ctrl+H/Ctrl+V`: kept on legacy-style control combos

## Known Gaps

- verb backends for `Attack/Cast/Talk/Look/Get/Drop/Move` are not fully connected to legacy game logic yet.
- party/solo command mode switching (`0-9`) is key-recognized but not behavior-complete.
- explicit cursor graphic mode-switching by command is still pending (`docs/architecture/legacy/startup-menu-parity.md`).

## Compatibility Rules

1. Plain letter keys are reserved for legacy gameplay verbs first.
2. Modern debug/net controls must use modified combos (`Shift+...` or `Ctrl+...`) to avoid keyspace collisions.
3. Target-mode input semantics must stay stable: move, confirm, cancel.
4. Movement primary remains arrow keys as a QoL default, while legacy fallbacks remain available.
