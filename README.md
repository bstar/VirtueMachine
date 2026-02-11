# Ultima6 Modern

Modern browser-port workspace for Ultima VI, with legacy provenance preserved via read-only submodule.

## Layout

- `legacy/u6-decompiled/`: decompiled source mirror (read-only baseline)
- `docs/`: architecture, findings, and development plan
- `modern/`: all new implementation code and tooling

## Legacy Source Provenance

The legacy submodule tracks the original decompiled project:

- `https://github.com/ergonomy-joe/u6-decompiled`

Keep this source immutable in day-to-day work and implement all new behavior under `modern/`.

## Workflow

1. Analyze legacy behavior in `legacy/u6-decompiled/SRC/`.
2. Record findings and symbol meaning in `docs/`.
3. Implement modern systems only under `modern/`.
4. Run policy checks to ensure legacy remains pristine.
