# VirtueMachine Client-Web (M3.2)

Minimal browser client prototype:

- fixed-tick runtime loop
- command-envelope-driven movement input (`W/A/S/D`)
- first visible tile viewport (11x11)
- runtime asset-backed map/chunk tile reads with synthetic fallback

## Run

From repository root:

```bash
./modern/tools/dev_web.sh
```

Then open:

- `http://localhost:8080/modern/client-web/`

The client will try loading:

- `modern/assets/runtime/map`
- `modern/assets/runtime/chunks`

If missing/unavailable, it renders a deterministic synthetic fallback grid.
