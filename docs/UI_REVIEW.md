# UI review and Pages preview

This document defines maintainer-facing browser UI review and GitHub Pages preview workflows. Both are development infrastructure; neither changes the local-only product/runtime contract in `DESIGN.md`.

## Automated browser review

Browser UI changes use Playwright with project-owned synthetic ZIP/SVG fixtures. Microsoft Azure Architecture Icon ZIPs/SVGs must never be committed, used as test baselines, or uploaded as workflow artifacts.

`.github/workflows/ui-review.yml` runs for browser-UI-affecting pull requests and can also be started manually for a branch, tag, or commit SHA. It starts the real Vite app, loads the synthetic ZIP through the browser, captures screenshots, and uploads them as a 14-day Actions artifact.

The capture set is intentionally stable:

| Capture | Viewport / mode |
| --- | --- |
| `01-unloaded-desktop.png` | 1440 × 1000, light |
| `02-loaded-desktop.png` | 1440 × 1000, light |
| `03-details-dialog-desktop.png` | 1440 × 1000, light |
| `04-loaded-mobile.png` | 390 × 844, light |
| `05-categories-mobile.png` | 390 × 844, light |
| `06-loaded-desktop-dark.png` | 1440 × 1000, dark |

Normal CI separately runs the Playwright golden path, automated WCAG A/AA checks through axe, and the committed visual-regression baselines. Update committed Playwright screenshots with `npm run test:e2e:update` only after confirming that a visual change is intentional.

When reviewing a UI PR, inspect the actual screenshots rather than inferring visual correctness from source code or unit tests alone.

## GitHub Pages preview

GitHub Pages is an optional interactive review surface for phones, tablets, and other browsers. It is not a supported distribution channel; npm/npx remains the supported product distribution.

### Automatic main and PR previews

`.github/workflows/pages.yml` maintains the normal preview site:

- `main` publishes to `https://shimabell0619.github.io/cloud-arch-icon-browser/`.
- Same-repository PR `#N` publishes to `https://shimabell0619.github.io/cloud-arch-icon-browser/pr-N/`.
- Fork PRs are build-validated but are not published because untrusted fork code must not receive write-capable repository or Pages credentials.
- Closing or merging a same-repository PR removes its `pr-N` preview.

The workflow stores generated site content on the automation-owned `pages-content` branch so `main` and active PR previews can coexist. Do not edit that branch manually. Main publication uses the `github-pages` environment; same-repository PR publish/cleanup uses `github-pages-preview`.

Pages builds use target-specific Vite bases: `/cloud-arch-icon-browser/` for `main` and `/cloud-arch-icon-browser/pr-N/` for PR previews. The normal npm/npx build continues to use `/`.

### Manual selected-ref preview

`.github/workflows/pages-preview.yml` (`Publish Pages Preview`) can publish an explicitly selected branch, tag, or commit SHA for ad-hoc interactive review. This deploys the selected ref as the main Pages site, so use it only when intentionally replacing the current root preview.

### One-time repository setup

GitHub Pages must use GitHub Actions as its source:

1. Open **Settings → Pages**.
2. Under **Build and deployment**, set **Source** to **GitHub Actions**.

## Security and asset boundary

All preview paths preserve the same product boundaries:

- deploy only repository-owned built application assets,
- never publish or persist Microsoft ZIP/SVG assets,
- process a user-selected ZIP only in the current browser session,
- do not upload selected ZIP/SVG content to GitHub or another backend,
- do not add telemetry, analytics, account state, cloud sync, or runtime package/update APIs,
- do not persist file handles or silently reopen a package.

The application may use the browser File System Access picker transiently when available, but the resulting handle is not persisted. Unsupported browsers and picker failures fall back to the normal ZIP file input.

## Maintenance

Keep screenshot names and viewports stable unless the review policy intentionally changes. If navigation, accessibility names, or review flows change, update the relevant Playwright/UI-review scripts in the same PR so failures remain meaningful rather than being silently skipped.
