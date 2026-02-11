# Sandbox and Escalation Policy

## Purpose

This project is developed with tooling that may run in restricted execution sandboxes (including AI coding assistants). Some required commands (notably Nix daemon operations) can fail under default sandbox permissions.

## Standing Rule

When a required build/test/tooling command fails due to sandbox restrictions, rerun it with escalated execution permission.

## Applies To

- `nix develop`
- `nix build`
- `nix flake lock`
- CMake/Ninja/CTest invocations that depend on Nix-provided toolchains
- Other commands blocked by sandbox permission boundaries

## Required Behavior

1. Attempt command normally first.
2. If failure indicates sandbox/permission restriction, rerun with escalation request.
3. Use concise justification tied to build/test needs.
4. Record noteworthy environment constraints in PR/notes when relevant.

## Contributor Note

This is a workflow policy, not a one-off exception. Contributors and assistants should assume this behavior by default for blocked commands.
