# Cloud Arch Icon Browser

> Pre-release: `v0.1.0` is in development.

A local, browser-based viewer for Microsoft Azure Architecture Icons.

Cloud Arch Icon Browser is an independent open-source project. It is not affiliated with, endorsed by, or sponsored by Microsoft.

Microsoft Azure Architecture Icons are **not included** in this repository or npm package. Users download the latest official icon package directly from Microsoft and use those icons in accordance with Microsoft's terms.

## Planned usage

```bash
npx @<npm-scope>/cloud-arch-icon-browser
```

The command starts a temporary HTTP server bound to `127.0.0.1` on an available port and opens the local web UI in the default browser. The ZIP selected by the user is processed locally and is not uploaded or persisted by the application.

## MVP goals

- Load a user-selected official Azure Architecture Icons ZIP.
- Preserve and browse the ZIP folder hierarchy as categories.
- Search icons with exact, prefix, substring, normalized, and fuzzy matching.
- Preview SVG icons without modifying the original SVG.
- Download individual original SVG files with their official filenames unchanged.
- Run locally through `npx` with no automatic runtime network access.

## Official icon package

Download the latest package from Microsoft Learn:

https://learn.microsoft.com/en-us/azure/architecture/icons/

The app may provide manual links to Microsoft documentation, but it does not automatically download the icon package or contact Microsoft at runtime.

## Project status

The project includes a minimal local development shell and a React-independent
core for ZIP validation, metadata/categories, search, and lazy SVG package
sessions. The shell does not yet expose these operations; the browser UI,
production CLI, and release automation are still pending. The npm package remains
private until publication setup resolves the scope and packaging requirements.

See the [core integration notes](./docs/icon-package-core.md) for its API and
validation boundaries. Official-package verification remains pending as recorded
in [`COMPATIBILITY.md`](./COMPATIBILITY.md).

## Development

Supported Node.js versions are defined by `package.json`:

```text
^22.22.2 || ^24.15.0 || >=26.0.0
```

Node 25.x is intentionally unsupported by the current dependency set. For
reproducible local development and CI, use the exact version in
[`.node-version`](./.node-version), currently Node 24.20.0.

With nvm:

```bash
nvm install 24.20.0
nvm use 24.20.0
npm ci
npm run dev
```

Open the URL printed by Vite. Development and preview servers bind to `127.0.0.1`.
Geist Sans Variable and all UI dependencies are bundled locally; the only external
link in the shell opens Microsoft Learn when clicked.

```bash
npm run check
npm run typecheck
npm test
npm run build
npm run preview
```

`check:fix` applies Biome fixes; `test:watch` runs Vitest interactively. `build`
typechecks the project and writes the web UI to `dist/`. `preview` is a development
tool for inspecting that build, not the planned production CLI/server.

## Project documents

See:

- [`DESIGN.md`](./DESIGN.md) — product and architecture source of truth.
- [`AGENTS.md`](./AGENTS.md) — repository instructions for coding agents.
- [`COMPATIBILITY.md`](./COMPATIBILITY.md) — official package compatibility and verification status.
- [`CONTRIBUTING.md`](./CONTRIBUTING.md) — contribution workflow.
- [`SECURITY.md`](./SECURITY.md) — vulnerability reporting policy.

## License

The source code for this project is licensed under the MIT License. See [`LICENSE`](./LICENSE).

Third-party software and assets retain their own licenses. See [`THIRD_PARTY_NOTICES.md`](./THIRD_PARTY_NOTICES.md).

Microsoft Azure Architecture Icons are Microsoft assets and are not covered by this project's MIT License.
