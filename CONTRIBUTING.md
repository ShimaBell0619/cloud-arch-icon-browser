# Contributing

Contributions are welcome. The project is intentionally small and design-driven, so changes should stay aligned with the current contract in `DESIGN.md`.

## Before contributing

Read:

- `DESIGN.md`
- `AGENTS.md` if using a coding agent
- `SECURITY.md` for security-sensitive changes
- `docs/UI_REVIEW.md` for browser UI or visual-review changes
- `docs/RELEASE.md` for release, compatibility, or npm-distribution changes

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

Use project-owned minimal SVG/ZIP fixtures for tests. The maintainer-only `npm run verify:official -- <zip>` command reads an official ZIP from a local path and must never make that ZIP part of a commit or artifact.

## Development principles

- Prefer focused changes over broad refactors.
- Do not implement unrelated future ideas opportunistically.
- Keep core domain logic independent from React.
- Preserve the local-only/no-automatic-runtime-network contract.
- Preserve original SVG bytes and filenames for download.
- Prefer existing shadcn primitives for UI building blocks.
- Keep accessibility and keyboard behavior intact.

## Local development and checks

`package.json` defines the supported Node.js ranges as `^22.22.2 || ^24.15.0 || >=26.0.0`; Node 25.x is unsupported by the current dependency set. For reproducible development and CI, use the version pinned in `.node-version`, currently Node 24.20.0, then run `npm ci`. With nvm:

```bash
nvm install 24.20.0
nvm use 24.20.0
npm ci
npm run dev
```

Before opening a PR, run the checks relevant to the change. The complete release-readiness set is:

```bash
npm run check
npm run typecheck
npm test
npm run build
npm run test:cli-package-smoke
npm run verify:package
npm run verify:release-ready
```

For browser behavior, generate only the project-owned dummy fixture and run Playwright:

```bash
python3 scripts/ui-review/create_fixture.py /tmp/cloud-arch-icon-browser-e2e-fixture.zip
npx playwright install chromium
E2E_FIXTURE=/tmp/cloud-arch-icon-browser-e2e-fixture.zip npm run test:e2e
```

Use `npm run check:fix` for formatting/import fixes and `npm run test:watch` for interactive tests. Direct dependencies must stay exact-pinned; `.npmrc` sets `save-exact=true` and `engine-strict=true`, so unsupported Node versions fail installation instead of being accepted silently.

UI primitives live in `src/components/ui`; application composition lives outside that directory. `components.json` selects the Base UI-backed `base-rhea` style. Keep future primitive additions thin and retain upstream notices. Theme tokens and system-driven dark mode live in `src/index.css`.

Vitest uses jsdom, React Testing Library, and the cleanup setup in `src/test`. Foundation CI measures every production module in `src/core` and enforces 90% lines/functions/statements and 85% branches. Reports are written to the ignored `coverage/` directory. Core fixtures are generated in memory from project-owned shapes; do not replace them with Microsoft assets.

## UI visual review

Browser UI changes use the repository-standard workflow described in [`docs/UI_REVIEW.md`](./docs/UI_REVIEW.md).

For UI-affecting pull requests, CI runs the Playwright golden path, automated WCAG A/AA checks through axe, and the deliberately small Linux visual regression set for the initial picker, loaded grid, and details dialog. The separate `UI Review` workflow also uploads a broader six-image screenshot artifact for human visual review.

Only update committed Playwright screenshots with `npm run test:e2e:update` after confirming that the visual change is intentional. Never use Microsoft assets to create a visual baseline.

When an interactive cross-device check is useful, run `Publish Pages Preview` manually and explicitly choose the branch, tag, or commit SHA to publish. GitHub Pages is development-only preview infrastructure. It is not a supported hosted product mode or release/distribution channel, and pull requests do not automatically overwrite the shared Pages preview.

## Changesets

User-visible or package-relevant changes should normally include a Changeset:

```bash
npm run changeset
```

Select the appropriate SemVer bump and write the release-facing summary. Documentation-only/internal maintenance may use `Changeset: not required` when no package version should change. See `docs/RELEASE.md` for the initial `v0.1.0` bootstrap exception and the steady-state release flow.

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
- Changeset status,
- whether security/runtime-network behavior changed,
- confirmation that no Microsoft assets were added.

For browser UI changes, also inspect the `UI Review` artifact and mention any intentional visual-baseline change in the PR description.

The project uses squash merge.

## Design conflicts

If the existing design makes an implementation unnecessarily difficult, do not silently redesign around it. Explain the conflict in an Issue/PR and propose a concrete alternative.

`DESIGN.md` represents the current approved design until changed explicitly.
