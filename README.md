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

The design baseline is established before implementation. See:

- [`DESIGN.md`](./DESIGN.md) — product and architecture source of truth.
- [`AGENTS.md`](./AGENTS.md) — repository instructions for coding agents.
- [`COMPATIBILITY.md`](./COMPATIBILITY.md) — last manually verified official icon package.
- [`CONTRIBUTING.md`](./CONTRIBUTING.md) — contribution workflow.
- [`SECURITY.md`](./SECURITY.md) — vulnerability reporting policy.

## License

The source code for this project is licensed under the MIT License. See [`LICENSE`](./LICENSE).

Third-party software and assets retain their own licenses. See [`THIRD_PARTY_NOTICES.md`](./THIRD_PARTY_NOTICES.md).

Microsoft Azure Architecture Icons are Microsoft assets and are not covered by this project's MIT License.
