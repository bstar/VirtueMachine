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
- Note: logic has been partially extracted to `net/*`, `sim/*`, `ui/*` runtime modules, but `app.ts` still centrally orchestrates many canonical flows. Local app state view casts now use direct structural casts rather than `unknown` double-casts, and animated-object helper inputs now use fixed tile/object fields.
- Risk: hidden coupling/order-of-operations drift during future slices.
- Exit criteria: move remaining pure logic into typed runtimes and keep `app.ts` as composition/bootstrap only.

### 2) Net panel event wiring split

- Status: `verified`
- Location: `modern/client-web/net/panel_bindings_runtime.ts`
- Note: repetitive localStorage/listener wiring is extracted from `initNetPanel`, and the runtime test now covers preference application, password visibility persistence, auto-login status messaging, maintenance toggle persistence, and profile-change application.
- Risk: broader account modal orchestration still lives in `app.ts` and is covered by the app-shell tracker items.
- Exit criteria: satisfied for extracted event bindings.

### 3) Runtime adapter wrappers in `app.ts`

- Status: `temporary`
- Location examples: remaining verb side-effect wrappers
- Note: queue command mutation now lives in `sim/queue_runtime.ts`, door toggle lookup/mutation now lives in `sim/door_runtime.ts`, inventory anchor resolution now lives in `sim/inventory_runtime.ts`, target cursor state transitions now live in `sim/target_cursor_runtime.ts`, and range/object/actor target resolution for look/talk/get/attack now lives in `sim/target_runtime.ts`; `app.ts` still keeps some thin wrapper functions delegating to other typed runtime modules.
- Risk: duplicate naming can obscure true source-of-truth if wrappers diverge.
- Exit criteria: either remove wrappers (direct imports at call sites) or enforce wrappers as strict pass-through with tests.

### 4) Type looseness across runtime modules

- Status: `temporary`
- Location: multiple `modern/client-web/net/*.ts`, `modern/client-web/sim/*.ts`
- Note: many runtime signatures still use broad object typing to keep slices moving. World object take keys and inventory projection now use typed net-runtime boundary sources, with unknown server inventory JSON decoded before projection; take-response inventory items now normalize to known identity fields, world response envelopes now declare known object/intro/event/take fields, snapshot spawned-world-object rows now use fixed persisted fields, world-object delta JSON now uses named moved/spawned/respawn source contracts, authenticated pickup keys now derive canonical `aXXiYYY` object IDs with server compatibility for old `objblk` keys, object-layer and entity-layer parsed entries now expose fixed field sets, net presence remote-player and authoritative-NPC rows now use explicit JSON decoders before projection/application, authoritative NPC application now uses numeric entity IDs, castle-pilot NPC override compatibility rows now use a named source contract, presence poll/clock responses now use concrete players/clock envelopes, character-list request responses now use concrete list/created-character envelopes, character-list rows decode before selection, saved-account profile rows decode before sanitize/storage, actor-frame direction inputs now use numeric contracts, UI probe inventory inputs now use explicit count-map contracts, UI probe runtime-extension inputs share the typed runtime-extension contract, conversation macro/dialog boundaries now use named VM-context and opcode contracts, authoritative conversation sessions now use typed server-side session maps with focused lifecycle coverage, panel scope validation now treats panel payloads as key-only object maps, queue commands now use the fixed packed wire shape, target resolution now passes typed removed-object sim state, sim hash maps, decoded door-open snapshots, and removed-world-prop expiration now use explicit numeric/boolean map contracts, account action responses now use concrete ok/user envelopes, account user payload reads use typed accessors, login responses now use concrete token/user/snapshot envelopes, message-log raw entries decode before windowing/snapshot normalization, snapshot responses now use concrete saved-tick/base64 envelopes, background failure messages use a tested formatter, server snapshot/interaction/presence heartbeat sources now use named endpoint source contracts, server request bodies and email delivery metadata now use named field contracts, the shared net request layer now models JSON scalars/arrays explicitly, session state now uses the typed remote-player shape, and login state application plus snapshot resume reads share auth-runtime payload accessors.
- Risk: silent shape drift and late runtime failures.
- Exit criteria: define shared interfaces for `state.net`, `sim`, object/entity records; increase strictness incrementally.

### 5) Net panel action wrapper abstraction

- Status: `verified`
- Location: `modern/client-web/net/panel_actions_runtime.ts`
- Note: repetitive account-action `try/catch` blocks route through a generic action wrapper scoped to simple account actions, and runtime tests cover success callback formatting plus error status/diagnostic prefixes.
- Risk: paths with already-canonicalized diagnostics should still avoid this wrapper unless they match the simple account-action contract.
- Exit criteria: satisfied for current wrapper scope.

### 6) Saved-account profile UX remains modern-only

- Status: `verified`
- Location: `modern/client-web/net/profile_runtime.ts`
- Note: account profile select/apply/upsert helpers remain owned by the net profile runtime, and tests now cover sanitize/upsert, storage filtering, selected-key persistence, select population, profile application, and control-driven upsert.
- Risk: this remains a modern UX surface, so future auth/session orchestration changes should keep profile ownership in the net runtime or introduce an explicit replacement controller.
- Exit criteria: satisfied for the current profile-runtime ownership boundary.

### 7) Net status render orchestration split

- Status: `verified`
- Location: `modern/client-web/net/status_runtime.ts`
- Note: session/auth/status label rendering now runs through one typed status-view renderer, status writes flow through `applyNetStatusRuntime`, and the runtime test covers signed-in plus signed-out error rendering.
- Risk: broader login/logout sequencing is still owned by the large `app.ts` shell and is tracked by the app-shell orchestration items.
- Exit criteria: satisfied for status-view rendering; retain normal app-shell guardrails for flow sequencing.

### 8) Transitional `app.ts` orchestration typing

- Status: `temporary`
- Location: `modern/client-web/app.ts`
- Note: `app.ts` now has an explicit local `AppState` contract and is covered by `tsconfig.client-app-shell.strict.json`; required DOM/canvas startup lookups now fail explicitly instead of using loose double-casts, but the shell still owns too many render, input, net, and asset-loading orchestration paths.
- Risk: compile-time shape drift is guarded, but hidden ordering/coupling regressions can still occur while behavior remains concentrated in the shell.
- Exit criteria: move remaining pure logic into typed runtime modules, keep `app.ts` as composition/bootstrap, and retain strict app-shell coverage in `npm run typecheck`.

### 9) Party roster authority fallback remains client-local

- Status: `temporary`
- Location: `modern/client-web/app.ts`, `modern/client-web/ui/party_message_runtime.ts`, `modern/client-web/ui_probe_contract.ts`
- Note: U3 harness now has canonical party ordering/selection runtime logic, live snapshots persist `sim.partyMembers`, render/probe/input paths read the sim-owned roster directly, party member JSON rows decode to scalar ID sources before normalization, and party member ID normalization is shared through `sim/party_runtime.ts`.
- Risk: party roster mutations are still not server/sim-core authored, so roster composition may drift once recruit/dismiss workflows exist.
- Exit criteria: bridge party membership mutation from sim-core/net payloads and retire this tracker item.

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
