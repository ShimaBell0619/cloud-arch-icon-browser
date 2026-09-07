# Product Contract

Status: current approved product baseline.

`PRODUCT.md` is authoritative for **what Cloud Arch Icon Browser is, what it must do, and what it deliberately does not do**. UI/UX rules belong in `DESIGN.md`; implementation architecture belongs in `docs/ARCHITECTURE.md`; security, compatibility, release, and UI-review details remain authoritative in their specialist documents.

## 1. Purpose

Cloud Arch Icon Browser is an independent local tool for browsing a user-downloaded Microsoft Azure Architecture Icons ZIP and quickly finding, previewing, collecting, copying, and downloading icons for use in PowerPoint, Excel, and other compatible applications.

The project is not affiliated with, endorsed by, or sponsored by Microsoft. Microsoft Azure Architecture Icons are not bundled with this repository or npm package.

## 2. Users and primary jobs

The primary users are people creating cloud-architecture material who need to:

- load an official Azure Architecture Icons package they downloaded themselves,
- find icons quickly by name, filename, or category,
- copy a single icon as an Office-friendly transparent PNG,
- preserve and download the original SVG when needed,
- collect repeated selections in Favorites, Tray, and Saved Sets,
- reuse recent/frequent selections without uploading package content anywhere.

## 3. Core behaviors

### Local package and data boundary

- The user explicitly selects the Microsoft ZIP; the application never bundles or automatically downloads it.
- ZIP/SVG processing stays local. Selected package bytes, extracted SVG bodies, generated image data, and package-session resources are never uploaded by the application.
- Package bytes, SVG/generated image bytes, readers, Blob/Object URLs, and other package-session resources are not persisted by application storage.
- On supported browsers, one `FileSystemFileHandle` for a successfully validated package may be persisted separately in IndexedDB so the user can explicitly reopen the same local file later. The application must not trigger a file-permission prompt during passive startup.
- The running application makes no automatic external network requests for package content, telemetry, analytics, crash reporting, or update/package checks. User-clicked documentation links are allowed.

### Original asset integrity

- Original SVG bytes, original paths, case, and filenames are immutable for download.
- Do not rewrite, optimize, recolor, resize, sanitize-for-download, or rename the source SVG.
- Preview and clipboard safety processing may refuse or derive transient representations without changing the original downloadable bytes.

### Identity, runtime, and distribution

- Repository: `cloud-arch-icon-browser`.
- npm package: `@shimabell06/cloud-arch-icon-browser`.
- CLI binary: `cloud-arch-icon-browser`.
- Supported distribution is npm/npx:

  ```bash
  npx @shimabell06/cloud-arch-icon-browser
  ```

- The package contains the CLI and prebuilt Web UI. App/package branding must not use `Azure` or `Microsoft` as the product name or app logo.
- Node support is defined by `package.json`; development and CI use `.node-version`. The package manager is npm and the package is ESM-only.
- Supported operating systems are Windows, macOS, and Linux.
- The packaged CLI uses the canonical local origin `http://127.0.0.1:41731/`. It does not silently fall back to a random port. A matching existing instance may be reused; an unrelated process on the port produces an actionable failure.
- Public CLI options remain no arguments, `-h`/`--help`, and `-v`/`--version` unless an explicit product decision changes that contract.
- GitHub Pages is development/review infrastructure only and is not a supported product distribution channel.

### Package lifecycle

- Reload returns to package selection unless a remembered validated local file reference is available.
- Permission prompts for remembered files occur only from an explicit user gesture such as `Open previous ZIP`.
- Denied, stale, moved/deleted, malformed, or inaccessible remembered files fall back safely to normal package selection.
- Users can forget the remembered file reference without deleting Favorites or other persisted UI metadata.
- Package replacement is explicit. A replacement candidate is validated before becoming active; invalid replacement preserves the current session.
- Successful replacement conservatively re-matches active Tray entries, preserves uniquely matched quantity/order, reports dropped unmatched active entries, and disposes the previous package session.

### Persistence and durable icon identity

The persisted application root key is `cloud-arch-icon-browser:state`. Persisted input is untrusted and schema-versioned; malformed, unsupported-future, or unavailable persistence must fail safely without blocking package loading.

Approved persisted UI metadata includes:

- theme preference: `system | light | dark`,
- view preference: `grid | compact`,
- sidebar collapsed state,
- Favorite icon references,
- recently used icon references,
- recent search strings,
- user-defined Saved Sets containing durable icon references, quantity, order, identity/name, and timestamps,
- bounded local usage counters/recency metadata used only for shortcuts.

There is exactly one active Tray. Tray contents are session state and are not persisted; reload/restart clears them.

Durable icon matching is conservative:

1. exact match on canonical visible path (`categoryPath + originalFilename`, excluding one hidden packaging root),
2. if exact matching fails, a fallback may ignore only the known numeric `NNNNN-icon-service-` filename prefix and is accepted only when exactly one current icon matches.

Fuzzy similarity must never migrate persisted icon identity. Ambiguous or missing records remain stored but hidden for the active package; a unique fallback match may self-heal the stored reference.

Limits remain:

- Recent icons: 50, newest first, de-duplicated by durable identity. Recent means meaningful use such as successful Copy or Tray add; merely opening details is not usage.
- Recent searches: 10, trimmed and case-insensitively de-duplicated.
- Usage-stat records: 200 maximum and never used to change search ranking.
- Saved Set names: 80 characters maximum; members preserve durable identity, quantity, and order.
- Favorites: no automatic count limit.

Persistence schema v2 intentionally starts Recent clean when migrating v1 details-open history while preserving Favorites, preferences, and recent searches.

### ZIP compatibility and icon model

Compatibility is structural rather than hard-coded to a Microsoft package version. Only the latest package explicitly recorded as successfully verified in `COMPATIBILITY.md` is formally supported.

Package behavior must:

- enumerate entry metadata before extracting all SVG bodies,
- reject unsafe or ambiguous paths, duplicate normalized paths, encrypted entries, symbolic links, invalid metadata, and structurally implausible archives,
- ignore non-SVG files for browsing/search,
- use the ZIP folder hierarchy as the category hierarchy without inventing Microsoft categories,
- support recursive folders and parent-category subtree selection,
- hide exactly one common packaging-root folder when every browsable icon shares it,
- preserve original paths, case, filenames, and SVG bytes,
- extract/render icons lazily and release package-scoped resources deterministically.

For filenames matching `^\d+-icon-service-(.+)\.svg$`, the display name removes that convention prefix/suffix, replaces hyphens with spaces, and preserves original casing so acronyms such as SQL, AI, and IoT remain intact. Nonmatching SVG filenames use the extension/hyphen fallback; the original filename never changes.

### Search

Search covers display name, original filename, and visible category path. Category selection scopes search to that category subtree without clearing the query.

Ranking priority is deterministic:

1. normalized exact match,
2. prefix match,
3. substring match,
4. Fuse fuzzy fallback.

Normalization should make forms such as `app service`, `app-service`, and `appservice` behave similarly. Strong deterministic matches always outrank fuzzy matches. Search is real-time with a short debounce, weak fuzzy matches are omitted, and results are not arbitrarily capped.

The current Fuse weighting target is display name `0.7`, filename `0.2`, category path `0.1`. Tuning may change when justified by measured package behavior without changing the ranking tiers above.

### User-visible workflows

- Favorites are explicit user-curated single-icon shortcuts.
- Recent records meaningful icon use, not details-open history.
- Frequently used shortcuts may be derived from bounded local usage statistics but never alter search ranking.
- Duplicate durable icons in Tray merge into one ordered row with quantity `×N`.
- Saved Sets are persisted lightweight metadata and support create, rename, update, delete, inspect, `Add to Tray`, and `Replace Tray`; unresolved members remain stored and are reported rather than silently deleted.
- Saved Set sharing uses a versioned Clipboard text payload (`cloud-arch-icon-browser/saved-set`, schema version 1). Clipboard input is untrusted; no ZIP/SVG/generated bytes are included.
- Single-icon `Copy image` produces a transient transparent 512×512 PNG with preserved aspect ratio and centered content.
- `Copy SVG source` copies original SVG markup text where supported; it is not vector-image clipboard copy.
- `Download SVG` preserves exact original bytes and filename.
- Clipboard failures are actionable and never remove the original download path.
- The product does not invent Azure resource descriptions or Microsoft Learn mappings.

### Experimental Windows PowerPoint Copy all

The packaged Windows npx runtime may expose the approved Experimental, default-enabled Tray `Copy all` workflow on the canonical local runtime.

- It expands Tray quantities into at most 36 independent picture-shape candidates in Tray order.
- It uses the narrowly scoped local PowerPoint bridge defined by `SECURITY.md` and `docs/ARCHITECTURE.md`; it is not a general backend/API.
- The first use requires an explicit Experimental warning.
- The feature flag is `cloud-arch-icon-browser:feature:powerpoint-copy-all`; a local `off` override disables the UI.
- Success currently means the local bridge prepared PowerPoint's clipboard operation; formal independent-shape support remains blocked on the real Windows 11 + current Chromium + desktop Microsoft 365 PowerPoint validation tracked in Issue #57.
- If validation fails, disable/remove the capability. Never replace it with a flattened combined-image fallback.
- True vector-image clipboard copy and direct browser-to-PowerPoint drag remain deferred. `Copy SVG source` remains source-text copy only.

## 4. Product constraints

- Microsoft Azure Architecture Icons are governed by Microsoft's terms. The current Microsoft Learn Azure Architecture Icons page is the authoritative package/terms source.
- Security-sensitive ZIP, SVG, localhost, Origin/Host, PowerPoint automation, temporary-file, CSP, and dependency boundaries are defined in `SECURITY.md` and must not be weakened by product implementation.
- Package compatibility evidence is defined in `COMPATIBILITY.md`.
- Release/publication behavior is defined in `docs/RELEASE.md`.
- Primary flows must remain keyboard-operable with visible focus and meaningful accessible semantics; detailed UI behavior belongs in `DESIGN.md`.

## 5. Non-goals

The following require an explicit product decision before implementation:

- a supported hosted service, backend, database, account system, cloud sync, or telemetry,
- automatic package download or runtime package/version checking,
- persistence of selected ZIP bytes, SVG bodies, generated image data, or package-session state beyond the explicitly approved file-handle reference boundary,
- SVG editing or a diagram-canvas/project-management product,
- raster file export beyond transient clipboard PNG workflows,
- PWA/service-worker behavior or a multi-page/router architecture,
- additional distribution channels such as native apps, Homebrew, Chocolatey, winget, or Docker,
- generic multi-cloud abstraction,
- flattened-image fallback for the Experimental multi-object PowerPoint workflow.

## 6. Acceptance boundaries

A capability is formally supported only when its required evidence exists:

- official Microsoft package support requires successful maintainer verification recorded in `COMPATIBILITY.md`,
- browser UI changes require the rendered/interactive evidence defined in `docs/UI_REVIEW.md`,
- release publication requires the validation and identity checks in `docs/RELEASE.md`,
- Experimental PowerPoint `Copy all` remains Experimental until Issue #57's real-machine acceptance evidence succeeds,
- no test, review, CI, or release artifact may introduce Microsoft ZIP/SVG assets.

## 7. Evolution rules

- Do not silently change this contract while implementing a feature.
- If implementation pressure conflicts with `PRODUCT.md`, raise the conflict and obtain an explicit product decision.
- Update this file when approved product behavior, compatibility promises, supported distribution, persistence boundaries, or non-goals change.
- Keep detailed decision history in Issues/PRs/releases/CHANGELOG/Git history; keep currently approved behavior here.
