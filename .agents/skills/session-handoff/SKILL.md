---
name: session-handoff
description: Auto-triggers before executing any request or roadmap phase that falls outside the active harness and model lane defined in AGENTS.md (visual/browser QA on text-only models, sustained multi-file coding on orchestrator tiers, open-ended architecture on flash tiers), unless the prompt includes [OVERRIDE], in addition to manual $session-handoff or /session-handoff calls. Runs debug-artifact cleanup and typecheck/lint verification gates, rewrites HANDOFF.md with the Trigger Reason and Next Baton Target, then halts with the Harness Switch Banner directing the switch to the correct ZCode (GLM-5.3 / GLM-5.3-Flash) or Antigravity (Gemini 4 Argon / Hydrogen) model and effort level.
---

# Session Handoff Protocol

**Trigger conditions:** Auto-triggered whenever an incoming prompt or next roadmap phase falls outside the active model/harness lane defined in the Model Roles & Effort Matrix of `AGENTS.md` — unless the prompt contains `[OVERRIDE]` — and on manual `$session-handoff` / `/session-handoff` invocation. When triggered, execute these steps in exact sequence:

1. **Confirm the Trigger:**
   - If the prompt contains `[OVERRIDE]`, do NOT run this skill — bypass the auto-handoff and execute the task in the current harness.
   - Otherwise, do not begin the out-of-scope work; proceed with the steps below.
2. **Audit Modified Files:**
   - Run `git status -s` and `git diff --name-only` to list every touched file.
   - Scan modified files and remove any leftover `console.log` statements, commented-out trial code, inline `style={{...}}` attributes, or `any` types.
3. **Run Verification Gates:**
   - Execute the repository's typecheck and lint commands (e.g., `npx tsc --noEmit`).
   - If the session goal was implementation, fix errors before proceeding. If handing off a specific bug for a higher-tier model to debug, record the exact error trace.
4. **Rewrite `HANDOFF.md`:**
   - Overwrite `HANDOFF.md` concisely (under 80 lines to protect prompt cache efficiency).
   - Record:
     - **Last Active Harness & Model**
     - **Trigger Reason** (the specific lane/quota mismatch that fired the auto-handoff, or "manual invocation")
     - **Next Baton Target** (recommend exact harness, model, and effort level based on `AGENTS.md` Matrix—e.g., `ZCode: GLM-5.3 @ high` for heavy feature build, `ZCode: GLM-5.3-Flash @ low` for boilerplate, or `Antigravity: Argon @ high` for architecture/diff review)
     - **Touched Files** (exact relative paths so the incoming agent reads only what matters)
     - **Verification Gate Status** (exact command run + PASS/FAIL output)
     - **Next Immediate Tasks** (numbered, verifiable checklist for the incoming agent)
5. **Halt with the Harness Switch Banner:** Emit exactly this banner (replacing the bracketed placeholders with the actual reason, harness, model, and effort level), then stop. Do not execute the out-of-scope work.

```
### AUTO-HANDOFF TRIGGERED — SWITCH HARNESS / MODEL
- **Why I Stopped:** [1-sentence lane/quota mismatch reason]
- **State Saved:** `HANDOFF.md` updated and verification gates checked.
- **Switch To:** **[ZCode / Antigravity]** → Model: **`[Exact Model]`** → Effort: **`[Exact Effort Level]`**
- **Next Prompt to Paste:** `Read @AGENTS.md and @HANDOFF.md and execute the Next Immediate Tasks.`
*(To force me to run this here anyway, reply with `[OVERRIDE]`.)*
```
