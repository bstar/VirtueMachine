# Retro Font Assets

This directory now contains the active local font set used by the web client.

Current files:

- `GothicByte.ttf` (project heading font)
- `BlockBlueprint.ttf` (body option)
- `Kaijuz.ttf` (body option)
- `Orange Kid.otf` (body option)

Runtime mapping is defined in `modern/client-web/styles.css` and selected via
the `Body Font` dropdown in the client UI.

Notes:

- Keep licenses for any added/replaced font files.
- If you replace files, keep filenames stable or update `@font-face` rules.
