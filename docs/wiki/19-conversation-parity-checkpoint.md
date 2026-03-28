# Conversation Parity Checkpoint

Last Updated: 2026-03-28

This page is the freeze-frame for the current Ultima VI conversation port.

It exists to preserve exactly what has been achieved, what is still not canonical yet, and where to resume when conversation work starts again after a pause.

## Current Status

Conversation is no longer a browser-local approximation.

The modern stack now has a server-authoritative conversation path that is close enough to evaluate real branch behavior for key castle NPCs, especially Lord British, Nystul, and Dupre. This is a major architectural milestone because dialogue state, branch selection, and talk-flag mutation are no longer split between client guesses and server state.

What is true today:

- `talk` is accepted on the authoritative net path.
- the server owns conversation sessions, cursor advancement, and talk-flag mutation.
- the client renders server-sourced opening and response lines.
- early-story castle dialogue can be switched between `pre_intro` and `post_intro` using a bounded server-side bridge.
- the browser no longer depends on client-owned intro shortcut flags.

What is not true yet:

- the full intro/start-game sequence is not the source of early-story dialogue state yet.
- transcript-level presentation parity is not finished.
- conversation authority still lives in extracted JS runtime code, not sim-core/C/WASM.
- coverage is strongest for the early castle cluster and weaker for the long tail of NPC scripts.

## What We Achieved

### 1. Server-Authoritative Conversation Sessions

The net server now owns the canonical talk flow:

- `POST /api/world/objects/interact` with `verb: "talk"` starts a conversation session.
- `POST /api/world/conversation/respond` advances the same session.
- the server returns canonical response lines plus `next_pc` and `stop_opcode`.
- server runtime state persists NPC `talkFlags` mutation instead of relying on client-local topic booleans.

This closed the prior split-authority problem where the browser could appear correct visually while still making its own branch decisions.

Primary implementation files:

- `modern/net/server.ts`
- `modern/net/conversation_runtime.ts`
- `modern/client-web/app.ts`

### 2. NPC Talk State Is Now Authoritative

Legacy-derived NPC runtime arrays needed by dialogue were brought into the authoritative runtime boundary, especially talk flags.

That matters because branch correctness in Ultima VI is not just about text lookup. It depends on mutable per-NPC state.

Primary implementation files:

- `modern/net/npc_runtime.ts`
- `modern/net/server.ts`

### 3. Bounded Intro Bridge For Early Castle Dialogue

The repo now has an explicit authoritative intro compatibility bridge:

- `GET /api/world/intro-state`
- `PUT /api/world/intro-state`
- accepted phases: `pre_intro`, `post_intro`

This bridge exists because the canonical start-game flow is not fully implemented yet. It gives Lord British, Nystul, and Dupre the correct early-story branch family without reintroducing client-side fake flags.

This was the right tradeoff:

- not canonical final state
- but authoritative, explicit, testable, and removable later

### 4. Browser Conversation Flow Uses Server Results

When authenticated, the client now:

- starts talks through the server,
- tracks `session_id`,
- submits typed topics back to the server,
- renders authoritative opening/response lines,
- resets cleanly when the session ends or auth expires.

This keeps the browser as projection/input UI instead of conversation authority.

### 5. Major Fidelity Bugs Were Fixed

Two important script/runtime bugs were fixed during this pass:

- reply cursor advancement now handles `GOTO`-terminated branches correctly instead of bleeding into later branches
- legacy `*` control markers are stripped from rendered text so they do not leak into user-facing dialogue

Those fixes materially improved Lord British and Dupre topic responses and removed one class of obvious non-canonical text leakage.

### 6. User-Facing Failure Mode Is Better

Conversation no longer falls through to user-visible `Not implemented:` leaks in the normal browser talk path.

Fallback behavior is now closer to canonical expectations:

- invalid or unresolved paths degrade into normal conversation shell behavior
- unresolved replies use canonical-style `No response.` behavior instead of debug text

### 7. The Work Is Covered By Real Regression Tests

The conversation stack now has much better test protection than before.

Coverage added or expanded during this phase includes:

- server contract coverage for authoritative `talk`
- server contract coverage for `intro_state`
- conversation dialog runtime tests
- conversation VM runtime tests
- authoritative conversation runtime tests
- conversation suite integration via `modern/tools/test_client_web_conversation.sh`

This is important institutional progress: we are no longer relying only on manual live chat checks to detect drift.

## What Is Still Missing For Canonical Parity

### 1. The Intro Bridge Must Eventually Be Replaced

Current state:

- `pre_intro` / `post_intro` is a deliberate compatibility bridge

Canonical end state:

- the original intro/start-game sequence, including the mechanics that mutate world and talk state, must produce those branches naturally

Practical implication:

- full combat is not required to preserve progress now
- but full parity eventually requires the actual sequence to own the resulting state

### 2. Transcript-Level Presentation Fidelity Is Not Finished

The chat tree is much more correct now, but the player-facing message log is still not transcript-perfect.

Known remaining areas:

- line wrapping
- blank-line insertion
- prompt timing
- pagination boundaries
- exact `No response.` placement and fallback policy
- edge-case opener/response formatting differences for key castle NPCs

This is the most obvious remaining player-visible conversation mismatch.

### 3. NPC Coverage Is Not Yet Broad

The current work is strongest around the castle cluster used to validate early-story state:

- Lord British
- Nystul
- Dupre

That does not yet imply broad canonical confidence across all NPC conversation scripts. More golden cases are still needed for the wider population.

### 4. Conversation Authority Is Still In Extracted JS, Not Sim-Core

The architecture is now correct in shape, but the final canonical destination has not been reached.

Current state:

- server-authoritative
- deterministic enough for net/client integration
- powered by extracted JS runtime

Target state:

- conversation authority moved behind the same sim-core/C/WASM boundary expected for other canonical gameplay systems

This is an implementation-boundary gap, not a design-direction gap.

### 5. Long-Tail Opcode and Script Behavior Confidence Is Incomplete

The main known path is much stronger, but parity confidence is not yet exhaustive for all script constructs and NPC-specific edge cases.

That means:

- do not claim full conversation parity yet
- do treat the current stack as a validated, high-value intermediate milestone

## Canonical Risks To Remember

If conversation work pauses for a while, these are the easiest truths to lose:

- server authority was the critical breakthrough; do not move branch logic back into the browser
- the intro bridge is temporary and should not silently become permanent canon
- transcript polish should happen after authority, not instead of authority
- Lord British/Nystul/Dupre are the correct anchor set for early-story verification
- fixes must be transcript- and branch-based, not “looks close enough” UI tuning

## Recommended Resume Order

When conversation work resumes, the highest-value order is:

1. finish transcript-quality message-log fidelity for Lord British, Nystul, and Dupre
2. add more golden conversation regressions for `pre_intro` and `post_intro`
3. widen confidence across more NPC scripts
4. replace the intro bridge by implementing the canonical intro/start-game state mutations
5. move conversation authority from extracted JS runtime into the final sim-core boundary

This preserves the architectural gains already made and avoids backsliding into browser-local branch logic.

## Verification Surface To Reuse Later

When resuming, start with the existing checks before changing code:

- `bun run typecheck`
- `bun modern/net/tests/server_contract_test.ts`
- `./modern/tools/test_client_web_conversation.sh`

Useful live controls already present in the browser:

- `Intro Phase` selector for `pre_intro` / `post_intro`
- pause/resume loop control for freezing live state while inspecting dialogue behavior

## Bottom Line

This was a major milestone.

Conversation moved from a decent-looking browser approximation to an authoritative, testable gameplay path. The remaining work is real, especially transcript polish and eventual intro-sequence replacement, but the hardest architectural mistake has already been corrected.
