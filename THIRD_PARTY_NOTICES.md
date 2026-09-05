# Third-Party Notices

This project depends on third-party open-source software. Dependency licenses remain the property of their respective copyright holders and are not replaced by this project's MIT License.

The final dependency/license inventory must be reviewed before the first npm release.

## Geist

The application bundles Geist Sans Variable through the exact-pinned
`@fontsource-variable/geist` npm dependency. Vite emits the font files into the
local build; no font CDN is used at runtime.

Geist is distributed under the SIL Open Font License 1.1 (OFL-1.1). The upstream license text and required notices must be retained in the distributed npm package as required by that license.

The font files are third-party assets and are not licensed under this project's MIT License.

The upstream copyright notice and full OFL text are retained verbatim in
[`public/licenses/Geist-OFL-1.1.txt`](./public/licenses/Geist-OFL-1.1.txt), copied
from the installed font package's `LICENSE`. Vite copies this file to
`dist/licenses/Geist-OFL-1.1.txt`. When updating the font dependency, refresh this
copy from the installed package and retain it in future npm package contents.

## shadcn/ui

`src/components/ui/button.tsx` is derived from the official shadcn/ui
[Base UI Rhea registry](https://ui.shadcn.com/r/styles/base-rhea/button.json).
It uses the project's local class-name helper and semantic hover token.
Copyright (c) 2023 shadcn. The upstream MIT license is retained in
[`public/licenses/shadcn-MIT.txt`](./public/licenses/shadcn-MIT.txt) and copied
into `dist/licenses/` by Vite.

## ZIP processing and search

`@zip.js/zip.js` 2.11.1 is distributed under BSD-3-Clause. Its unmodified license
is retained in [`public/licenses/zip.js-BSD-3-Clause.txt`](./public/licenses/zip.js-BSD-3-Clause.txt).
The core uses the package's native entry point with its bundled JavaScript
compression fallback; no remote worker or WASM resource is fetched.

Fuse.js 7.5.0 is copyright (c) 2026 Kiro Risk and distributed under Apache-2.0.
Its unmodified license is retained in
[`public/licenses/Fuse-Apache-2.0.txt`](./public/licenses/Fuse-Apache-2.0.txt).
Vite copies both license files into `dist/licenses/`; refresh them from the
installed packages when updating these dependencies.

## CLI browser launch

`open` 11.0.2 is distributed under the MIT License and is used only by the local
CLI to ask the operating system to open the generated `127.0.0.1` URL in the
user's default browser. It is not used by the Web UI and does not introduce an
automatic external network request.

## Runtime and development dependencies

Planned major open-source dependencies/tooling include, subject to implementation-time version selection and license verification:

- React
- Vite
- TypeScript
- Tailwind CSS
- shadcn/ui and its underlying UI primitives
- Zustand
- Fuse.js
- `@zip.js/zip.js`
- `open`
- Lucide
- Sonner
- Biome
- Vitest
- React Testing Library
- Playwright
- axe-core integration
- Changesets

Before `v0.1.0` publication:

1. Generate/review the actual installed dependency license inventory.
2. Ensure all direct dependencies are compatible with the project's distribution model.
3. Retain any attribution or license files required in the npm package.
4. Update this notice if a dependency requires explicit attribution beyond its normal license file.

## Microsoft Azure Architecture Icons

Microsoft Azure Architecture Icons are **not third-party assets distributed by this project**. They are intentionally excluded from the repository and npm package.

Users obtain the icon package directly from Microsoft:

https://learn.microsoft.com/en-us/azure/architecture/icons/

Those icons are Microsoft assets governed by Microsoft's published terms. This project's MIT License does not grant rights to Microsoft icons.
