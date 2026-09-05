# Third-Party Notices

This project depends on third-party open-source software. Dependency licenses remain the property of their respective copyright holders and are not replaced by this project's MIT License.

## Bundled notices and assets

### Geist

The application bundles Geist Sans Variable through the exact-pinned `@fontsource-variable/geist` 5.3.0 dependency. Vite emits the font files into the local build; no font CDN is used at runtime.

Geist is distributed under the SIL Open Font License 1.1 (OFL-1.1). The font files are third-party assets and are not licensed under this project's MIT License. The upstream copyright notice and full OFL text are retained verbatim in [`public/licenses/Geist-OFL-1.1.txt`](./public/licenses/Geist-OFL-1.1.txt) and copied by Vite to `dist/licenses/Geist-OFL-1.1.txt`, which is included in the npm package.

### shadcn/ui-derived component

`src/components/ui/button.tsx` is derived from the official shadcn/ui Base UI Rhea registry. Copyright (c) 2023 shadcn. The upstream MIT license is retained in [`public/licenses/shadcn-MIT.txt`](./public/licenses/shadcn-MIT.txt) and copied into `dist/licenses/` by Vite.

### ZIP processing and search

`@zip.js/zip.js` 2.11.1 is distributed under BSD-3-Clause. Its unmodified license is retained in [`public/licenses/zip.js-BSD-3-Clause.txt`](./public/licenses/zip.js-BSD-3-Clause.txt) and copied into `dist/licenses/`.

Fuse.js 7.5.0 is distributed under Apache-2.0. Its unmodified license is retained in [`public/licenses/Fuse-Apache-2.0.txt`](./public/licenses/Fuse-Apache-2.0.txt) and copied into `dist/licenses/`.

The core uses zip.js with its local JavaScript compression fallback. No remote worker, WASM resource, or search service is fetched at runtime.

## Direct runtime dependency inventory

The `v0.1.0` release line uses exact-pinned direct runtime dependencies:

- `@base-ui/react` 1.8.0
- `@fontsource-variable/geist` 5.3.0
- `@zip.js/zip.js` 2.11.1
- `class-variance-authority` 0.7.1
- `clsx` 2.1.1
- `fuse.js` 7.5.0
- `lucide-react` 1.41.0
- `open` 11.0.2
- `react` 19.2.8
- `react-dom` 19.2.8
- `tailwind-merge` 3.6.0

`open` is used only by the local CLI to ask the operating system to open the generated `127.0.0.1` URL in the user's default browser. It does not add an automatic external runtime network request.

## Development and release tooling

Development-only tooling is not intentionally shipped in the npm tarball. Direct tooling includes Biome, TypeScript, Vite/Tailwind, Vitest and Testing Library, Playwright 1.62.1, `@axe-core/playwright` 4.13.0, and `@changesets/cli` 2.29.7.

`npm run verify:package` inspects `npm pack --dry-run --json` and fails if development/test directories, ZIP files, SVG assets, or non-allowlisted top-level paths would be published. Release CI also runs `npm audit --audit-level=high` before publication.

When a bundled dependency is changed, refresh any copied upstream license text required by that dependency and update this notice when the distribution obligations change.

## Microsoft Azure Architecture Icons

Microsoft Azure Architecture Icons are **not third-party assets distributed by this project**. They are intentionally excluded from the repository, test fixtures, screenshots, and npm package.

Users obtain the icon package directly from Microsoft:

https://learn.microsoft.com/en-us/azure/architecture/icons/

Those icons are Microsoft assets governed by Microsoft's published terms. This project's MIT License does not grant rights to Microsoft icons. The weekly maintenance watcher fetches only the Microsoft Learn HTML page and never downloads or republishes the icon ZIP/SVG assets.
