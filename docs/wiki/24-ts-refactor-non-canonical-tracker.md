# TS Refactor Non-Canonical Tracker

## Purpose

This tracker captures **temporary, non-canonical implementation decisions** introduced during the TypeScript/runtime extraction work.

Rule: if a refactor slice introduces an abstraction that changes structure, timing risk, or ownership boundaries, it must be listed here until verified against legacy behavior.

## Status Legend

- `temporary`: accepted for refactor velocity; must be reviewed before canonical sign-off
- `verified`: reviewed and confirmed equivalent behavior
- `retire`: remove or replace with canonical implementation

## Active Items

### 1) Large `app.ts` orchestration shell

- Status: `temporary`
- Location: `modern/client-web/app.ts`
- Note: logic has been partially extracted to `net/*`, `sim/*`, `ui/*` runtime modules, but `app.ts` still centrally orchestrates many canonical flows.
- Risk: hidden coupling/order-of-operations drift during future slices.
- Exit criteria: move remaining pure logic into typed runtimes and keep `app.ts` as composition/bootstrap only.

### 2) Net panel event wiring split

- Status: `temporary`
- Location: `modern/client-web/net/panel_bindings_runtime.ts`
- Note: repetitive localStorage/listener wiring extracted from `initNetPanel`.
- Risk: UI event timing parity (especially auto-login and maintenance toggle side effects) can drift if bindings are reordered.
- Exit criteria: verify panel behavior sequence against intended canonical UX flow and lock with tests.

### 3) Runtime adapter wrappers in `app.ts`

- Status: `temporary`
- Location examples: `door*`, `inventory*`, `queue*`, `range*`, `target*` wrappers
- Note: `app.ts` currently keeps thin wrapper functions delegating to typed runtime modules.
- Risk: duplicate naming can obscure true source-of-truth if wrappers diverge.
- Exit criteria: either remove wrappers (direct imports at call sites) or enforce wrappers as strict pass-through with tests.

### 4) Type looseness across runtime modules

- Status: `temporary`
- Location: multiple `modern/client-web/net/*.ts`, `modern/client-web/sim/*.ts`
- Note: many runtime signatures still use broad object typing to keep slices moving.
- Risk: silent shape drift and late runtime failures.
- Exit criteria: define shared interfaces for `state.net`, `sim`, object/entity records; increase strictness incrementally.

### 5) Net panel action wrapper abstraction

- Status: `temporary`
- Location: `modern/client-web/net/panel_actions_runtime.ts`
- Note: repetitive account-action `try/catch` blocks now route through a generic action wrapper.
- Risk: generic success/error formatting can accidentally override flow-specific messaging if used on paths that already produce canonicalized diagnostics.
- Exit criteria: keep wrapper scoped to simple account actions only, or replace with per-action typed controllers once full UI canonicalization is complete.

### 6) Saved-account profile UX remains modern-only

- Status: `temporary`
- Location: `modern/client-web/net/profile_runtime.ts`
- Note: account profile select/apply/upsert helpers were moved into typed runtime helpers for TS extraction speed.
- Risk: this area is not a legacy U6 canonical system, so behavior could drift from intended modern UX if we later fold profile state into broader auth/session orchestration.
- Exit criteria: decide final ownership boundary for auth/profile UX (panel runtime vs app orchestrator) and lock with integration tests.

### 7) Net status render orchestration split

- Status: `temporary`
- Location: `modern/client-web/net/status_runtime.ts`
- Note: session/auth/status label rendering and indicator pulse now run through typed helpers, while `app.ts` still owns status timing/call order.
- Risk: status text/indicator update ordering may drift if future slices bypass `setNetStatus`.
- Exit criteria: centralize all status writes through one path and add UI integration coverage for login/logout/error transitions.

## Canonical Guardrails

For every new extraction slice:

1. Preserve canonical behavior first, structure second.
2. Keep special-case legacy rules explicit (example: chair behavior for `0x147 frame 2`).
3. Add/adjust tests for any behavior-sensitive code path.
4. If equivalence is assumed but not proven, add an entry here.

## Related Docs

- `docs/wiki/08-deviation-ledger.md`
- `docs/wiki/17-ui-canonical-legacy-matrix.md`
- `docs/wiki/12-canonical-completion-roadmap.md`
