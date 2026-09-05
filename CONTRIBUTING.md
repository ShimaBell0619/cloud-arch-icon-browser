# Contributing

Contributions are welcome. The project is intentionally small and design-driven, so changes should stay aligned with the current contract in `DESIGN.md`.

## Before contributing

Read:

- `DESIGN.md`
- `AGENTS.md` if using a coding agent
- `SECURITY.md` for security-sensitive changes

## Issue-first changes

Open an Issue before implementing changes that affect any of the following:

- major/new product features,
- architecture or state model,
- ZIP/SVG security behavior,
- runtime network policy,
- supported operating systems/runtime baseline,
- distribution channel,
- foundational dependencies,
- major UX/navigation policy,
- npm/release model,
- Microsoft asset/licensing handling.

Small bug fixes, documentation corrections, and clearly scoped maintenance changes may be proposed directly as PRs.

## Microsoft assets

Do not commit, attach, or package Microsoft Azure Architecture Icon ZIPs or SVGs as repository content, fixtures, screenshots, or release artifacts.

Use project-owned minimal SVG/ZIP fixtures for tests.

## Development principles

- Prefer focused changes over broad refactors.
- Do not implement unrelated future ideas opportunistically.
- Keep core domain logic independent from React.
- Preserve the local-only/no-automatic-runtime-network contract.
- Preserve original SVG bytes and filenames for download.
- Prefer existing shadcn primitives for UI building blocks.
- Keep accessibility and keyboard behavior intact.

## Pull requests

Use a short-lived branch and open a PR to `main`.

PR titles should follow Conventional Commits, for example:

```text
feat: add package dropzone
fix: preserve acronym casing in icon names
docs: clarify compatibility policy
```

A PR should explain:

- what changed and why,
- whether `DESIGN.md` is affected,
- validation/tests performed,
- Changeset status once Changesets is configured,
- whether security/runtime-network behavior changed,
- confirmation that no Microsoft assets were added.

The project uses squash merge.

## Design conflicts

If the existing design makes an implementation unnecessarily difficult, do not silently redesign around it. Explain the conflict in an Issue/PR and propose a concrete alternative.

`DESIGN.md` represents the current approved design until changed explicitly.
