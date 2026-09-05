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

## Local development and checks

Use the Node version pinned in `.node-version`, then run `npm ci`. Start the
minimal shell with `npm run dev`. Before opening a PR, run:

```bash
npm run check
npm run typecheck
npm test
npm run build
```

Use `npm run check:fix` for formatting/import fixes and `npm run test:watch` for
interactive tests. Direct dependencies must stay exact-pinned; `.npmrc` sets
`save-exact=true` and enforces the Node engine requirement.

UI primitives live in `src/components/ui`; application composition lives outside
that directory. `components.json` selects the Base UI-backed `base-rhea` style.
The initial Button comes from the official Rhea registry with the local `cn`
helper and semantic hover token. Keep future primitive additions thin and retain
upstream notices. Theme tokens and system-driven dark mode live in `src/index.css`.

Vitest uses jsdom, React Testing Library, and the cleanup setup in `src/test`.
Foundation CI runs the commands above on Linux; CodeQL scans JavaScript/TypeScript.
Core coverage gates belong to Issue #2. Playwright, accessibility/visual checks,
cross-platform CLI smoke checks, package validation, and Changesets/release
automation follow in the later implementation issues.

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
