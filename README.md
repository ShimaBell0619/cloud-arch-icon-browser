# Cloud Arch Icon Browser

A local, browser-based viewer for Microsoft Azure Architecture Icons.

Cloud Arch Icon Browser is an independent open-source project. It is not affiliated with, endorsed by, or sponsored by Microsoft.

Microsoft Azure Architecture Icons are **not included** in this repository or npm package. Users download the latest official icon package directly from Microsoft and use those icons in accordance with Microsoft's terms.

## Usage

```bash
npx @shimabell06/cloud-arch-icon-browser
```

The command runs the latest published npm release, starts a temporary HTTP server bound to `127.0.0.1` on an available port, and opens the local web UI in the default browser. The ZIP selected by the user is processed locally and is not uploaded or persisted by the application.

## Features

The current product workflow includes:

- Load a user-selected official Azure Architecture Icons ZIP.
- Preserve and browse the ZIP folder hierarchy as categories.
- Search display names, original filenames, and category paths with deterministic exact → prefix → substring ranking ahead of fuzzy matches.
- Keep category scope explicit through a removable filter chip while preserving the active query.
- Use keyboard-operable search autocomplete with icon previews, recent searches, and favorite shortcuts.
- Save Favorites, recently opened icons, recent searches, theme, Grid/Compact preference, and sidebar state as local UI metadata without persisting the ZIP or SVG contents.
- Switch between Grid and Compact icon layouts.
- Copy an icon as a transparent 512×512 PNG for compatible clipboard workflows such as Windows PowerPoint and Excel.
- Open a centered details dialog with real package metadata, Favorite, Copy image, Copy SVG where supported, and original SVG download actions.
- Preserve original SVG bytes and filenames for download.
- Explicitly select System / Light / Dark theme behavior.
- Replace the active package without reloading the application.
- Use responsive desktop and mobile navigation with keyboard and accessibility support.
- Run locally through `npx` with no automatic runtime network access.

`Copy image` depends on browser Clipboard API support and permission. If image clipboard writes are unavailable or denied, the app reports the failure and the original SVG download remains available.

## Official icon package

Download the latest package from Microsoft Learn:

https://learn.microsoft.com/en-us/azure/architecture/icons/

The app may provide manual links to Microsoft documentation, but it does not automatically download the icon package or contact Microsoft at runtime.

The latest package explicitly verified for this project is recorded in [`COMPATIBILITY.md`](./COMPATIBILITY.md). Compatibility is structural rather than tied to a hard-coded Microsoft ZIP version.

## Project status

Public releases are published on npm as `@shimabell06/cloud-arch-icon-browser`; `v0.1.0` was the first public release. Version-specific release history is recorded in [`CHANGELOG.md`](./CHANGELOG.md) and GitHub Releases rather than duplicated as a hard-coded "current version" in this README.

The production package contains the localhost CLI and prebuilt Web UI; Microsoft icon ZIP/SVG assets are never bundled into the package. The application includes a React-independent core for ZIP validation, metadata/categories, search, durable local UI identity, lazy SVG previews, and original-file downloads. The production localhost CLI/static server uses loopback-only binding, Host/path validation, restrictive browser security headers, and clean shutdown behavior.

Release and maintenance automation includes Linux browser E2E/accessibility/visual regression, Linux build/package checks, Windows/macOS packaged CLI smoke tests, npm package leak validation, Changesets release PRs, npm Trusted Publishing through GitHub Actions OIDC with provenance, registry/tarball availability verification, and a weekly Microsoft source-change watcher.

The current official `Azure_Public_Service_Icons_V24.zip` has passed the production-parser compatibility verification recorded in [`COMPATIBILITY.md`](./COMPATIBILITY.md).

See the [core integration notes](./docs/icon-package-core.md) for the core API and validation boundaries and [`docs/RELEASE.md`](./docs/RELEASE.md) for the steady-state release runbook.

## Development

Supported Node.js versions are defined by `package.json`:

```text
^22.22.2 || ^24.15.0 || >=26.0.0
```

Node 25.x is intentionally unsupported by the current dependency set. For reproducible local development and CI, use the exact version in [`.node-version`](./.node-version), currently Node 24.20.0.

With nvm:

```bash
nvm install 24.20.0
nvm use 24.20.0
npm ci
npm run dev
```

Open the URL printed by Vite. Development and preview servers bind to `127.0.0.1`. Geist Sans Variable and all UI dependencies are bundled locally; the only external link in the shell opens Microsoft Learn when clicked.

Core validation commands:

```bash
npm run check
npm run typecheck
npm test
npm run build
npm run test:cli-smoke
npm run test:cli-package-smoke
npm run verify:package
npm run verify:release-ready
```

Browser E2E uses only the project-owned dummy ZIP fixture generated by `scripts/ui-review/create_fixture.py`:

```bash
python3 scripts/ui-review/create_fixture.py /tmp/cloud-arch-icon-browser-e2e-fixture.zip
npx playwright install chromium
E2E_FIXTURE=/tmp/cloud-arch-icon-browser-e2e-fixture.zip npm run test:e2e
```

`npm run test:e2e:update` updates the deliberately small Linux visual baseline set and should only be used when an intentional visual change has been reviewed.

To verify a maintainer-downloaded current official ZIP without committing it:

```bash
npm run verify:official -- /path/to/latest-official.zip
```

`check:fix` applies Biome fixes; `test:watch` runs Vitest interactively. `build` typechecks the project, writes the Web UI to `dist/`, and compiles the production CLI to `cli/`. After a build, `node cli/index.js` exercises the same localhost server path that the package binary uses. `preview` is a Vite development tool for inspecting the Web build and is not the production CLI/server.

## Project documents

See:

- [`DESIGN.md`](./DESIGN.md) — current product and architecture design contract.
- [`AGENTS.md`](./AGENTS.md) — repository instructions for coding agents.
- [`COMPATIBILITY.md`](./COMPATIBILITY.md) — official package compatibility and verification status.
- [`CONTRIBUTING.md`](./CONTRIBUTING.md) — contribution workflow.
- [`docs/RELEASE.md`](./docs/RELEASE.md) — release, Trusted Publishing, compatibility, and watcher runbook.
- [`SECURITY.md`](./SECURITY.md) — vulnerability reporting policy.

## License

The source code for this project is licensed under the MIT License. See [`LICENSE`](./LICENSE).

Third-party software and assets retain their own licenses. See [`THIRD_PARTY_NOTICES.md`](./THIRD_PARTY_NOTICES.md).

Microsoft Azure Architecture Icons are Microsoft assets and are not covered by this project's MIT License.
