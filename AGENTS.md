## Writing tips

- Keep files <~500 LOC; split/refactor as needed.
- Bugs: add regression test when it fits.
- Prefer end-to-end verify; if blocked, say what’s missing.
- New deps: quick health check (recent releases/commits, adoption).
- Web: search early; quote exact errors; prefer 2024–2025 sources.
- Style: telegraph. Drop filler/grammar. Min tokens (global AGENTS + replies).
- Before handoff: run full gate (lint/typecheck/tests/docs).
- Update documentation after each change to keep it relevant

## Critical Thinking

- Fix root cause (not band-aid).
- Unsure: read more code; if still stuck, ask w/ short options.
- Conflicts: call out; pick safer path.
- Unrecognized changes: assume other agent; keep going; focus your changes. If it causes issues, stop + ask user.
- Leave breadcrumb notes in thread.

## Frontend Aesthetics

Avoid “AI slop” UI. Be opinionated + distinctive.

Do:

- Typography: pick a real font; avoid Inter/Roboto/Arial/system defaults.
- Theme: commit to a palette; use CSS vars; bold accents > timid gradients.
- Motion: 1–2 high-impact moments (staggered reveal beats random micro-anim).
- Background: add depth (gradients/patterns), not flat default.

Avoid:

- purple-on-white clichés
- generic component grids
- predictable layouts
- too many gradients
