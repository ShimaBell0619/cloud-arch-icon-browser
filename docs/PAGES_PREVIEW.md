# GitHub Pages UI preview

GitHub Pages is an optional UI-verification surface for maintainers. It is not a replacement for the supported npm/npx distribution.

## Purpose

The Pages site makes it easy to inspect both the current `main` UI and active development PRs from phones, tablets, and other browsers without starting a local server.

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

The workflow keeps a generated `pages-content` branch as persistent build storage. GitHub Pages itself remains configured to deploy through GitHub Actions; the generated branch is not the Pages publishing source.

## URLs

Current `main`:

`https://shimabell0619.github.io/cloud-arch-icon-browser/`

Active pull request `#N`:

`https://shimabell0619.github.io/cloud-arch-icon-browser/pr-N/`

For same-repository PRs, `.github/workflows/pages.yml` publishes the PR head after open/reopen/update and upserts a comment containing the stable preview URL. Further pushes refresh the same path. Closing or merging the PR removes that `pr-N` directory and updates the comment.

Fork PRs are build-validated but are not published because pull-request code from external repositories must not receive write-capable repository or Pages credentials.

## Build base

The normal npm/npx build keeps Vite's `/` base.

Pages builds use target-specific bases:

- `main`: `/cloud-arch-icon-browser/`
- PR `#N`: `/cloud-arch-icon-browser/pr-N/`

The workflow serializes writes to the generated Pages content so concurrent PR updates do not delete another active preview. A `main` publish replaces only the root application files while preserving active `pr-*` directories.

If the generated `pages-content` branch does not exist yet, the first PR publication bootstraps the site root from the current `main` build before adding the PR directory. This prevents enabling PR previews from temporarily breaking the normal main URL.

## Mobile ZIP selection

The application retains the ZIP-filtered `<input type="file">` picker as its compatibility fallback. On secure contexts where `showOpenFilePicker()` is available, the UI instead prefers the File System Access picker with a `.zip` filter. This helps Android/Chromium paths that otherwise browse an archive as a folder rather than returning the ZIP file itself.

The selected `FileSystemFileHandle` is transient: the application immediately reads the selected `File`, passes that file into the existing package-session flow, and does not persist the handle. User cancellation is silent. Unsupported browsers, insecure contexts, and unexpected picker failures fall back to the existing file input.
