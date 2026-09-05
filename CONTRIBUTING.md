# Contributing

Contributions are welcome. The project is intentionally small and design-driven, so changes should stay aligned with the current contract in `DESIGN.md`.

## Before contributing

Read:

- `DESIGN.md`
- `AGENTS.md` if using a coding agent
- `SECURITY.md` for security-sensitive changes
- `docs/UI_REVIEW.md` for browser UI or visual-review changes

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

`package.json` defines the supported Node.js ranges as
`^22.22.2 || ^24.15.0 || >=26.0.0`; Node 25.x is unsupported by the current
dependency set. For reproducible development and CI, use the version pinned in
`.node-version`, currently Node 24.20.0, then run `npm ci`. With nvm:

```bash
nvm install 24.20.0
nvm use 24.20.0
npm ci
npm run dev
```

Before opening a PR, run:

```bash
npm run check
npm run typecheck
npm test
npm run build
```

Use `npm run check:fix` for formatting/import fixes and `npm run test:watch` for
interactive tests. Direct dependencies must stay exact-pinned; `.npmrc` sets
`save-exact=true` and `engine-strict=true`, so unsupported Node versions fail
installation instead of being accepted silently.

UI primitives live in `src/components/ui`; application composition lives outside
that directory. `components.json` selects the Base UI-backed `base-rhea` style.
The initial Button comes from the official Rhea registry with the local `cn`
helper and semantic hover token. Keep future primitive additions thin and retain
upstream notices. Theme tokens and system-driven dark mode live in `src/index.css`.

Vitest uses jsdom, React Testing Library, and the cleanup setup in `src/test`.
Foundation CI runs the commands above on Linux using `.node-version`; CodeQL scans
JavaScript/TypeScript. `npm test` also measures every production module in
`src/core` and enforces 90% lines/functions/statements and 85% branches. Reports
are written to the ignored `coverage/` directory. Core fixtures are generated in
memory from project-owned shapes; do not replace them with Microsoft assets. See
the [core integration notes](./docs/icon-package-core.md).

## UI visual review

Browser UI changes use the repository-standard workflow described in
[`docs/UI_REVIEW.md`](./docs/UI_REVIEW.md).

For UI-affecting pull requests, the `UI Review` GitHub Actions workflow runs a real
Chromium browser with a project-owned dummy icon ZIP and uploads a stable six-image
baseline as an Actions artifact. Review the screenshots themselves before merging;
source review and jsdom tests are not substitutes for visual QA.

When an interactive cross-device check is useful, run `Publish Pages Preview`
manually and explicitly choose the branch, tag, or commit SHA to publish. GitHub
Pages is development-only preview infrastructure. It is not a supported hosted
product mode or release/distribution channel, and pull requests do not
automatically overwrite the shared Pages preview.

Playwright installation for UI review is workflow-only and must not cause
Microsoft assets to be stored, uploaded, or published.

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

For browser UI changes, also inspect the `UI Review` artifact and mention any
intentional visual-baseline change in the PR description.

The project uses squash merge.

## Design conflicts

If the existing design makes an implementation unnecessarily difficult, do not silently redesign around it. Explain the conflict in an Issue/PR and propose a concrete alternative.

`DESIGN.md` represents the current approved design until changed explicitly.
