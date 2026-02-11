# AGENTS.md instructions for /home/bstar/projects/ULTIMA6/ultima6-modern

## Sandbox and Escalation

- This project relies on Nix-based tooling that may be blocked in restricted sandboxes.
- If a required command fails due to permission/sandbox restrictions, rerun with escalated permissions.
- Treat this as default workflow behavior, not a special exception.
- Prefer verifying build/test commands in this order:
  1. `nix develop`
  2. `cmake -S . -B build -G Ninja`
  3. `cmake --build build`
  4. `ctest --test-dir build --output-on-failure`

See also: `docs/policies/sandbox-escalation-policy.md`
