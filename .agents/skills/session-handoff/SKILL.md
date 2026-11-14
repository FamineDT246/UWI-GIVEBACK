---
name: session-handoff
description: Executes pre-handoff code quality gates, strips debugging artifacts, and updates HANDOFF.md for sequential transitions between ZCode (GLM-5.3 / Flash) and Google Antigravity (Gemini 4 Argon / Hydrogen). Use when finishing a coding phase, switching harnesses, or when the user invokes $session-handoff or /session-handoff.
---

# Session Handoff Protocol

When triggered at the end of a work session or phase, execute these steps in exact sequence:

1. **Audit Modified Files:**
   - Run `git status -s` and `git diff --name-only` to list every touched file.
   - Scan modified files and remove any leftover `console.log` statements, commented-out trial code, inline `style={{...}}` attributes, or `any` types.
2. **Run Verification Gates:**
   - Execute the repository's typecheck and lint commands (e.g., `npx tsc --noEmit`).
   - If the session goal was implementation, fix errors before proceeding. If handing off a specific bug for a higher-tier model to debug, record the exact error trace.
3. **Rewrite `HANDOFF.md`:**
   - Overwrite `HANDOFF.md` concisely (under 80 lines to protect prompt cache efficiency).
   - Record:
     - **Last Active Harness & Model**
     - **Next Baton Target** (recommend exact harness, model, and effort level based on `AGENTS.md` Matrix—e.g., `ZCode: GLM-5.3 @ high` for heavy feature build, `ZCode: GLM-5.3-Flash @ low` for boilerplate, or `Antigravity: Argon @ high` for architecture/diff review)
     - **Touched Files** (exact relative paths so the incoming agent reads only what matters)
     - **Verification Gate Status** (exact command run + PASS/FAIL output)
     - **Next Immediate Tasks** (numbered, verifiable checklist for the incoming agent)
