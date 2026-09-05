# GitHub Pages UI preview

GitHub Pages is an optional UI-verification surface for maintainers. It is not a replacement for the supported npm/npx distribution.

## Purpose

The Pages site makes it easy to inspect the current `main` UI from phones, tablets, and other browsers without starting a local server.

## Security and asset boundary

- The Pages deployment contains only the built application assets from this repository.
- Microsoft Azure Architecture Icon ZIP/SVG assets are not included in the repository or Pages artifact.
- A ZIP selected in the browser is processed client-side for the current session.
- The application does not upload the selected ZIP or SVG contents to GitHub Pages or another backend.
- File handles and package contents are not persisted or silently reopened.
- No telemetry or analytics are added for the Pages preview.

## Repository setup

GitHub Pages must be enabled once in repository settings:

1. Open **Settings → Pages**.
2. Under **Build and deployment**, set **Source** to **GitHub Actions**.

After that, `.github/workflows/pages.yml` deploys the current `main` build after each merge and also supports manual workflow dispatch.

The project Pages URL is expected to be:

`https://shimabell0619.github.io/cloud-arch-icon-browser/`

## Build base

The normal npm/npx build keeps Vite's `/` base. The Pages workflow invokes Vite with `/cloud-arch-icon-browser/` only for the Pages artifact so repository-subpath asset URLs resolve correctly.

## Mobile ZIP selection

The application uses a ZIP-filtered browser file input. Android file-provider behavior can vary: some providers may browse ZIP contents instead of returning the archive file. This is a browser/OS picker behavior rather than a requirement to upload the ZIP.

If this remains reproducible on the target Android browser, the preferred compatibility improvement is to use `showOpenFilePicker()` when supported and keep the existing file input as the fallback. The handle must remain transient and must not be persisted.
