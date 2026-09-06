# Cloud Arch Icon Browser — Design Contract

Status: current design baseline.

This document contains the product and engineering contracts that future changes must preserve. Public usage belongs in `README.md`; contribution, UI-review, compatibility, and release procedures belong in their dedicated documents.

If implementation pressure conflicts with this contract, raise the conflict in an Issue or PR and obtain an explicit design decision instead of silently changing the design.

## 1. Product contract

Cloud Arch Icon Browser is an independent local tool for browsing a user-downloaded Microsoft Azure Architecture Icons ZIP and quickly finding, previewing, copying, and downloading icons.

Core boundaries:

- Microsoft Azure Architecture Icons are not bundled with the repository or npm package.
- The user downloads the official ZIP from Microsoft and selects it explicitly.
- ZIP/SVG processing stays local; selected package bytes, extracted SVGs, generated images, and package-session resources are not uploaded or persisted. On supported browsers, a `FileSystemFileHandle` reference may be persisted separately in IndexedDB after successful package validation so the user can reopen the same local file later.
- Original SVG bytes and filenames are immutable for download. Do not rewrite, optimize, recolor, resize, sanitize-for-download, or rename them.
- The running application makes no automatic external network requests for package content, telemetry, analytics, crash reporting, or update checks. User-clicked documentation links are allowed.
- GitHub Pages is development-only preview infrastructure, not a supported product distribution channel.
- The project must not imply Microsoft affiliation, endorsement, sponsorship, or official status.

Microsoft's current Azure Architecture Icons page is the authoritative source for the icon package and its terms:

https://learn.microsoft.com/en-us/azure/architecture/icons/

### Non-goals

The following require an explicit design decision before implementation:

- a supported hosted service, backend, database, account system, cloud sync, or telemetry,
- automatic package download or runtime package/version checking,
- persistence of the selected ZIP bytes, SVG bodies, generated image data, or package session outside the explicitly approved file-handle metadata boundary,
- SVG editing or bulk operations,
- raster file export beyond the transient clipboard PNG workflow,
- PWA/service-worker behavior or a multi-page/router architecture,
- additional distribution channels such as native apps, Homebrew, Chocolatey, winget, or Docker,
- generic multi-cloud abstraction.

## 2. Identity, distribution, and runtime

- Repository: `cloud-arch-icon-browser`
- npm package: `@shimabell06/cloud-arch-icon-browser`
- CLI binary: `cloud-arch-icon-browser`
- Supported distribution: npm/npx

```bash
npx @shimabell06/cloud-arch-icon-browser
```

The package contains the CLI and prebuilt Web UI. App/package branding must not use `Azure` or `Microsoft` as the product name or app logo.

Runtime policy:

- Node.js support is defined by `package.json`; development and CI use the version pinned in `.node-version`.
- Package manager: npm.
- ESM-only package; `package-lock.json` is committed and CI/release use `npm ci`.
- Supported operating systems: Windows, macOS, and Linux.

The packaged CLI serves the app from the canonical origin `http://127.0.0.1:41731/`. It never falls back to a random port. If that origin already serves a matching Cloud Arch Icon Browser instance, a second invocation reuses/opens it; if another process owns the port, startup fails with an actionable error. The server remains bound only to `127.0.0.1`, supports only static `GET`/`HEAD`, rejects unsafe paths and unexpected Host headers, returns `405` for mutating methods, attempts to open the default browser, and stops on `Ctrl+C` when this invocation owns the server.

Public CLI options are limited to no arguments, `-h`/`--help`, and `-v`/`--version`. Additional host/port/ZIP-path options are not part of the current contract.

GitHub Pages may publish repository-owned static builds for maintainer review. Same-repository PRs may use stable `/pr-N/` previews; fork PRs remain build-only. Pages must preserve the same local ZIP-processing and no-persistence boundaries. See `docs/UI_REVIEW.md`.

## 3. Technology and architecture

Foundation:

- Vite, React, TypeScript, Tailwind CSS v4,
- shadcn/ui with Base UI-backed primitives,
- Fuse.js for search,
- `@zip.js/zip.js` for ZIP processing,
- Node built-in `node:http` plus `open` for the CLI,
- Biome, Vitest, React Testing Library, Playwright, and `@axe-core/playwright` for quality/testing.

Prefer existing primitives and the simplest implementation consistent with this contract. Do not introduce a foundational dependency or architectural layer without a concrete need and explicit approval.

### Core/domain boundary

Core package parsing, validation, path handling, display-name parsing, category construction, search ranking, persistence parsing/migration, and durable icon matching remain React-independent.

A runtime `IconPackageSession`-style object owns package-scoped resources such as the ZIP reader, entry metadata, search index, lazy extracted SVG Blobs, preview URLs, caches, and disposal. This object must not be stored in local persistence or a serializable shared store.

Derived search results should be computed from state/session inputs rather than duplicated into persistent/shared state.

### Package lifecycle

- Reload returns to the package picker unless a previously remembered local file reference is available; package bytes are never restored from application storage.
- Initial selection supports the normal file input/drag-and-drop path. A File System Access picker may be preferred where supported. Its `FileSystemFileHandle` may be persisted in IndexedDB only after the candidate package has passed normal validation.
- A remembered handle with `prompt` permission is reopened only from an explicit `Open previous ZIP` user gesture; the app must not trigger a permission prompt during passive startup. Granted handles may be read only under normal browser permission rules.
- Denied, stale, moved/deleted, malformed, or inaccessible remembered handles fall back safely to normal package selection. Users can explicitly forget the remembered reference without affecting Favorites or other UI metadata.
- Package replacement occurs only through the explicit `Change package` flow.
- Validate a replacement candidate before swapping it into the active session.
- Invalid replacement preserves the current session.
- Successful replacement swaps sessions, then deterministically disposes the previous session and revokes its object URLs.

## 4. Persistence and durable icon identity

The persistence root key is:

```text
cloud-arch-icon-browser:state
```

`localStorage` is untrusted input. The persisted root is schema-versioned; malformed data, unsupported future versions, and read/write failures must fall back safely without blocking package loading.

Approved persisted UI metadata:

- theme preference: `system | light | dark`,
- view preference: `grid | compact`,
- sidebar collapsed state,
- Favorite icon references,
- recently opened icon references,
- recent search strings.

Never persist ZIP bytes, SVG/generated image bytes, Blob/Object URLs, readers, or package-session resources. `localStorage` never contains file handles.

A separate IndexedDB boundary may store one structured-cloneable `FileSystemFileHandle` for the previously validated package. The handle is a local permission-bearing reference, not a copy of the ZIP. Remembering it is best-effort and must never make package loading depend on IndexedDB availability. A replacement handle is committed only after the replacement package validates successfully.

Favorite/Recent matching is conservative:

1. exact match on canonical visible path (`categoryPath + originalFilename`, excluding a hidden packaging root),
2. if exact matching fails, a fallback may ignore only the known numeric `NNNNN-icon-service-` filename prefix and is accepted only when exactly one current icon matches.

Fuzzy similarity must never migrate persisted icon identity. Ambiguous/missing records stay persisted but hidden for the active package; a unique fallback match may self-heal the stored reference.

History limits:

- Recent icons: 50, newest first, de-duplicated by durable identity.
- Recent searches: 10, trimmed and case-insensitively de-duplicated.
- Favorites: no automatic count limit.

## 5. ZIP compatibility and icon model

Compatibility is structural; the runtime does not hard-code a Microsoft package version. Only the latest package explicitly recorded as successfully verified in `COMPATIBILITY.md` is formally supported.

Package handling must:

- enumerate metadata before extracting every SVG body,
- reject unsafe/ambiguous paths, duplicate normalized paths, encrypted entries, symbolic links, invalid metadata, and structurally implausible archives,
- ignore non-SVG files for browsing/search,
- use the ZIP folder hierarchy as the category hierarchy without inventing Microsoft categories,
- support recursive folders and parent-category subtree selection,
- hide exactly one common packaging-root folder when every browsable icon shares it,
- preserve original paths, case, filenames, and SVG bytes for download,
- lazily extract icons and keep session-owned preview URLs/caches disposable.

Preview validation is defense in depth, not a general-purpose hostile-archive or SVG-sanitization product.

### Display names

For filenames matching the current convention, derive the display name conceptually from:

```text
^\d+-icon-service-(.+)\.svg$
```

Strip the convention prefix/suffix, replace hyphens with spaces, and preserve original casing so acronyms such as SQL, AI, and IoT remain intact. Nonmatching SVG filenames use the same extension/hyphen fallback. Original filenames never change.

## 6. Search contract

Search covers display name, original filename, and visible category path. Category selection scopes search to that category subtree while preserving the query.

Ranking priority is deterministic:

1. normalized exact match,
2. prefix match,
3. substring match,
4. Fuse fuzzy fallback.

Normalization should make forms such as `app service`, `app-service`, and `appservice` behave similarly. Strong deterministic matches always outrank fuzzy matches. Search is real-time with a short debounce, weak fuzzy matches are omitted, and results are not arbitrarily capped.

Current Fuse weighting target is display name `0.7`, filename `0.2`, category path `0.1`; tuning may change when justified by measured package behavior without changing the ranking tiers above.

## 7. UX contract

### Visual direction

The UI is calm, dense, modern, and product-focused: neutral surfaces, restrained chrome, and a blue accent. Avoid gradients as a primary motif, glassmorphism, heavy shadows, generic AI-SaaS styling, and Microsoft/Azure brand imitation.

Use semantic design tokens. Geist Sans Variable is bundled locally; do not add runtime font-CDN dependencies.

### Package picker and loaded layout

Before loading, show a focused package picker/dropzone. When a remembered File System Access handle exists, also expose explicit `Open previous ZIP` and `Forget previous ZIP reference` actions. Browser permission prompts must remain user-gesture driven. Loading may report phases such as Reading, Validating, and Indexing without fake percentage progress.

Desktop loaded layout:

- collapsible left sidebar with `All icons`, `Favorites`, `Recent`, and `Categories`,
- search-first sticky toolbar,
- Grid/Compact result presentation,
- package metadata and `Change package` kept visually secondary.

Narrow/mobile layouts replace the desktop sidebar with a Drawer/Sheet and must avoid horizontal overflow. Dialogs must remain within the viewport.

### Category and search interaction

- Single category selection; `All icons` is the default workspace after load.
- Category selection is always visible near search as a removable `Category: …` filter chip.
- Removing the category chip restores global scope without clearing the query.
- Main results remain flat rather than grouped by category.
- Search autocomplete uses the same ranking as results, shows icon/context information, supports Arrow keys/Enter/Escape, and opens the centered details dialog on selection.
- Focused empty search may surface recent searches and matched Favorite shortcuts.
- `/` focuses search when doing so does not interfere with an editable field or modal context.

### Favorites, Recent, and views

- Favorites and recently opened icons use only the durable identity metadata described above.
- Recent means recently opened icon details, not recent search strings.
- Grid is the default; Grid/Compact is persisted.
- Card body opens details; Favorite is a separate accessible control.
- `Copy` is the primary quick action, with touch/keyboard accessibility preserved.

### Details dialog and copy/download actions

The centered details dialog shows only real package/application data: preview, display name, category path, original filename, Favorite control, and copy/download actions.

Action hierarchy:

- primary: `Copy image`, producing a transient transparent 512×512 PNG with preserved aspect ratio and centered content,
- secondary: `Copy SVG` where supported,
- secondary: `Download SVG`, preserving the exact original bytes and filename.

Clipboard failures must produce actionable feedback and must not affect the original SVG download path. Do not invent Azure resource descriptions or Microsoft Learn mappings.

Dialog focus containment, Escape close, and focus restoration are required.

### Theme and accessibility

Theme choices are `System`, `Light`, and `Dark`; the preference persists, while `System` follows live OS color-scheme changes.

Primary flows must support keyboard operation, visible focus, correct button/dialog semantics, useful image alternative text, and non-color-only state communication. Automated axe checks supplement but do not replace accessibility review.

## 8. SVG and browser security

- Preview SVGs only in an image context such as `<img>` backed by a session-owned Blob URL. Never inject untrusted SVG markup into the application DOM with `innerHTML` or equivalent APIs.
- Perform a conservative detached preview check for malformed/active/external content. Unsafe previews may be refused while original bytes remain available for explicit download.
- Clipboard PNG creation is transient; generated Canvas/PNG/Blob data is not persisted.
- The local server must send a restrictive CSP and appropriate browser security headers. Do not enable `unsafe-eval`.
- Runtime dependencies must not require a CDN or external API after static assets are loaded.
- A fatal React error path must dispose the active package session and return to a safe initial state without sending crash data.

`SECURITY.md` contains vulnerability-reporting and security-support policy.

## 9. Testing, dependencies, and package safety

Core/domain logic has the deepest unit coverage. Minimum core coverage gates are:

- Lines: 90%
- Functions: 90%
- Statements: 90%
- Branches: 85%

Playwright covers the representative end-to-end flow, accessibility checks, and a deliberately small stable visual-regression baseline. Tests and review artifacts use only project-owned synthetic ZIP/SVG fixtures; Microsoft icon assets must never become test fixtures or committed visual baselines.

CI includes Linux foundation/browser checks plus packaged CLI smoke validation on Windows and macOS; CodeQL is enabled. See `CONTRIBUTING.md` and `docs/UI_REVIEW.md` for commands and review procedures.

Dependency/package policy:

- direct dependencies and devDependencies are exact-pinned,
- foundational/major dependency changes require explicit review,
- Dependabot monitors npm and GitHub Actions,
- release validation blocks High/Critical `npm audit` findings,
- the npm package uses an explicit `files` allowlist and release validation must prevent Microsoft assets, test fixtures, or unrelated development content from being published.

## 10. Release and compatibility contract

Changesets records release intent and updates versions/CHANGELOG. Publication uses GitHub Actions npm Trusted Publishing/OIDC; do not introduce a long-lived npm publish token.

Version identity must match across `package.json`, npm, immutable `vX.Y.Z` Git tag, and GitHub Release. Before `1.0.0`, compatible fixes are patch releases while features or breaking changes are minor releases; breaking `0.x` changes must be called out clearly.

Official-package verification is maintainer-only:

```bash
npm run verify:official -- /path/to/latest-official.zip
```

Update `COMPATIBILITY.md` only after a successful check against a separately downloaded official ZIP. A scheduled watcher may detect Microsoft package/terms changes and open a maintenance Issue, but it must never download/commit icon assets, make legal decisions, or change compatibility/runtime behavior automatically.

Operational release details belong in `docs/RELEASE.md`.

## 11. Repository governance

Canonical documents:

- `README.md` — public introduction and usage,
- `DESIGN.md` — current product/engineering contract,
- `CONTRIBUTING.md` — human contribution workflow,
- `AGENTS.md` — coding-agent instructions,
- `COMPATIBILITY.md` — last verified official package metadata,
- `SECURITY.md` — vulnerability reporting/support policy,
- `docs/UI_REVIEW.md` — browser visual/Pages review operations,
- `docs/RELEASE.md` — release operations,
- `THIRD_PARTY_NOTICES.md` and `LICENSE` — notices/licensing.

Decision history lives in Issues, PRs, CHANGELOG, releases, and Git history rather than a separate ADR set or historical implementation sections in this file.

Use GitHub Flow: `main` is the only long-lived development branch, changes enter through short-lived PRs, CI must pass, PRs use Conventional Commit titles, and merges are squash-only.

### Design-change rule

Explicit approval and a `DESIGN.md` update are required when changing:

- product purpose/non-goals,
- Microsoft asset handling,
- runtime network or security boundary,
- primary architecture/layering,
- core dependency foundation,
- supported distribution model,
- compatibility/support or release/publication model,
- major UX/navigation behavior.

Implementation details that preserve these contracts may be decided pragmatically by maintainers or coding agents.
