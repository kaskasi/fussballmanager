@AGENTS.md

# CLAUDE.md — Claude-specific additions

Project rules live in `AGENTS.md` (imported above). With a `CLAUDE.md` present, Claude Code reads `AGENTS.md` only through that import.

## Workspace Scope (Token Savings)
- DO NOT read full repository trees or run background test runners unless explicitly requested.
- Focus ONLY on the files explicitly mentioned in the prompt or direct UI components.
- Bypass strict Hexagonal abstraction layer boundaries for UI component/styling files to keep code lean.

## Stack & Architecture
- Frontend: React (Functional Components, TypeScript). Plain CSS with design tokens (`src/ui/design/design-tokens.css`, per-screen files in `src/ui/design/surfaces/`). No Tailwind.
- State: Keep state close to the UI. Do not generate complex Redux/Zustand boilerplate for simple UI tweaks.
- Styling Strategy: High-fidelity, data-dense layout (similar to Football Manager). Maximize screen real estate using tables, grids, and collapsible panels for player attributes.

## Design Pass Rules (UI/CSS-only tasks, Fast Execution)
- Batch UI changes: Write complete layout modifications in a single pass instead of incremental, conversational adjustments.
- Skip global linting/formatting checks on every file touch. Only run formatting at the very end of the task if asked.
- Omit writing new test files or updating CI configs during active design/CSS passes.

## Communication
- Give concise, direct answers. Skip lengthy architecture explanations or alternatives unless "Lernmodus" is explicitly invoked.
- Provide the exact code diff or full component directly without lecturing on SOLID principles unless requested.
