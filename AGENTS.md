# Multi-Harness Engineering & Execution Protocol

## 1. Sequential Baton-Pass Rule (No Concurrent Execution)
This repository is developed sequentially across **ZCode** (GLM-5.3 / GLM-5.3-Flash) and **Google Antigravity** (Gemini 4 Argon / Gemini 4 Hydrogen / Gemini 3.8 Flash).
- **On Session Start:** Always read `HANDOFF.md` before scanning the wider codebase. Verify the "Next Baton Target" matches your harness and active model role.
- **Before Session Close:** Never leave uncommitted mystery state. When asked to wrap up or hand off, execute the `session-handoff` skill to validate builds and update `HANDOFF.md`.

## 2. Model Roles & Effort Matrix
Operate strictly within your assigned lane and warn the user if the task falls outside your optimal tier:
- **GLM-5.3 (ZCode):**
  - *Sweet Spot:* `high` effort for multi-file feature implementation, backend logic, and root-cause debugging.
  - *Escalation:* Use `max` effort ONLY for greenfield system architecture or blockers that failed a prior verification pass. (Text-only; delegate visual tasks).
- **GLM-5.3-Flash (ZCode):**
  - *Sweet Spot:* `low` effort for file exploration, boilerplate generation, and repetitive tool calls; `high` effort for bounded UI components and screenshot/visual debugging.
  - *Constraint:* Do not solo-architect multi-service backend transactions without a locked spec in `HANDOFF.md`.
- **Gemini 4 Argon (Antigravity):**
  - *Sweet Spot:* `high` effort when acting as Orchestrator, writing system specs, decomposing phases into `HANDOFF.md`, and auditing diffs; `medium` effort for general synthesis.
  - *Constraint:* Delegate high-volume file implementation to Gemini 4 Hydrogen or GLM-5.3.
- **Gemini 4 Hydrogen (Antigravity):**
  - *Sweet Spot:* `high` effort (default) for multi-file implementation, test-loop execution, and live browser verification; `medium` or `low` effort when executing locked templates. Use `xhigh` only for isolated edge-case failures.
- **Gemini 3.8 Flash (Antigravity):**
  - *Sweet Spot:* `low` effort for fast classification and transcript/doc search; `medium` effort for long-video or dense PDF extraction. Never use for multi-file coding loops.

## 3. Codebase & Architecture Invariants
- **Type Safety:** Strictly avoid the `any` type across all files, especially in `catch` blocks. Always implement explicit error narrowing (e.g., `error instanceof Error`).
- **Separation of Concerns:** Keep `.tsx`/`.jsx` files strictly focused on layout and local UI state. Extract all data fetching, database mutations, and complex business logic into `lib/`, `services/`, or custom `hooks/` directories.
- **Styling:** Never use inline CSS (`style={{...}}`). Strictly use Tailwind CSS utility classes, global stylesheets, or CSS modules.
- **Comments & Cleanliness:** Write comments for future maintainers explaining the *why* behind complex business logic or database transactions, not the *what*. Remove all debugging artifacts (`console.log`, commented-out trial code) before completing any task.
