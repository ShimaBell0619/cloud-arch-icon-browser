# UI review workflow

This document defines the repository-standard visual review flow for UI changes.
It is development infrastructure only. It does not add a supported hosted product
mode or change the local-only runtime contract in `DESIGN.md`.

## Default review path: Playwright screenshots

For pull requests that touch browser UI inputs, `.github/workflows/ui-review.yml`
runs a real Chromium browser against the PR code. It:

1. installs the repository dependencies using `.node-version`,
2. installs a pinned Playwright version for the workflow only,
3. generates a project-owned dummy Azure-shaped icon ZIP,
4. starts Vite on `127.0.0.1`,
5. loads the ZIP through the real file input,
6. captures the fixed visual baseline, and
7. uploads the screenshots as a GitHub Actions artifact for 14 days.

The fixture contains only simple project-owned SVG shapes. Microsoft Azure
Architecture Icon ZIPs/SVGs must never be used by this workflow, committed to the
repository, or uploaded as review artifacts.

### Fixed baseline

The capture set is intentionally stable so PRs can be compared consistently:

| Capture | Viewport / mode |
| --- | --- |
| `01-unloaded-desktop.png` | 1440 x 1000, light |
| `02-loaded-desktop.png` | 1440 x 1000, light |
| `03-details-dialog-desktop.png` | 1440 x 1000, light |
| `04-loaded-mobile.png` | 390 x 844, light |
| `05-categories-mobile.png` | 390 x 844, light |
| `06-loaded-desktop-dark.png` | 1440 x 1000, dark |

The workflow deliberately uses the real package session and browser file input.
The screenshot fixture is synthetic, but the ZIP parsing, category construction,
preview Blob URLs, responsive UI, and dialogs use the application's real code
path.

### Manual capture

After the workflow is present on `main`, it can also be run from **Actions > UI
Review > Run workflow**. Supply a branch, tag, or commit SHA in `ref`.

For ChatGPT-assisted review, the preferred request is simply:

> Review the actual UI for PR #<number>.

The reviewer should inspect the PR's `UI Review` run, download the screenshot
artifact, and review the images themselves rather than inferring appearance from
source code alone.

## Interactive review path: GitHub Pages

Use `.github/workflows/pages-preview.yml` only when a human reviewer needs to
interact with the application from another device, such as a phone.

Pages deployment is **manual only**. A pull request must never automatically
replace the currently shared preview. The selected branch, tag, or commit SHA is
explicitly supplied when the workflow is run.

The Pages site represents one current review build at a time. Publishing another
ref intentionally replaces the previous preview.

### One-time repository setup

A repository administrator must configure GitHub Pages once:

1. Open **Settings > Pages**.
2. Under **Build and deployment**, set **Source** to **GitHub Actions**.

GitHub's Pages custom-workflow model uses `configure-pages`,
`upload-pages-artifact`, and `deploy-pages`. The deploy job uses the protected
`github-pages` environment and exposes the deployment URL from the workflow run.

### Publish a ref

1. Open **Actions > Publish Pages Preview**.
2. Choose **Run workflow**.
3. Enter the branch, tag, or commit SHA to review, for example
   `feat/issue-3-icon-browser-ui`.
4. Run the workflow.
5. Open the deployment URL shown by the `github-pages` environment.

The build uses the Pages base path reported by GitHub, so Vite's generated asset
URLs work under the repository project-site path.

## Security and product boundaries

The two review paths have different roles:

- **Actions artifact screenshots** are the normal visual QA mechanism.
- **GitHub Pages** is an optional, temporary, development-only interactive preview.

Neither path changes the product architecture. In particular:

- no Microsoft icon asset is stored or published,
- no selected user ZIP is persisted by the app,
- no backend, database, account, or hosted-service feature is introduced,
- no automatic application runtime API call is introduced,
- the Pages build is not a supported distribution/release channel,
- production/release decisions remain governed by `DESIGN.md`.

## Maintenance

Keep the screenshot names and viewports stable unless a deliberate review-policy
change is needed. If navigation or accessibility names change legitimately, update
`scripts/ui-review/capture.mjs` in the same PR so a failed visual workflow remains
a meaningful signal rather than being silently skipped.

The `src/components/icon-details-dialog.tsx` presence check exists only so this
infrastructure PR can land before the browser UI implementation. Once the browser
UI is on `main`, missing or changed runtime selectors in the capture script should
fail the workflow rather than skip individual screenshots.
