# Official Package Compatibility

This file records the most recent Microsoft Azure Architecture Icons package that has been explicitly verified against the project.

Only the most recently recorded **successful** verification is officially supported. Older or newer packages may work when structurally compatible, but they are not guaranteed until verified.

## Current official package observation

As of 2026-09-06, the official Microsoft Learn page links to:

- Package: `Azure_Public_Service_Icons_V24.zip`
- Official page: https://learn.microsoft.com/en-us/azure/architecture/icons/
- Microsoft Learn page last updated: 2026-07-09
- Manual compatibility verification: **Pending**

Release gate: PENDING

The project must not claim `V24` as formally supported until the actual ZIP has been downloaded by the maintainer and successfully processed by the release verification command. The npm release gate rejects an activated public release unless this exact line is changed to `Release gate: PASS` after a successful verification.

## Last successful verification

No official package has been formally verified yet. This remains a required pre-release action for `v0.1.0`.

## Verification procedure

Before a release that claims compatibility:

1. Download the latest official ZIP directly from the Microsoft Learn page.
2. Do not add the ZIP to this repository.
3. Run the development-only verifier, which reuses the production `IconPackageSession` parser/validator:

   ```bash
   npm run verify:official -- /path/to/latest-official.zip
   ```

4. Record at least:
   - verification date,
   - official ZIP filename,
   - Microsoft page update date/package observation,
   - browsable SVG/icon count,
   - category count,
   - naming-convention match rate,
   - validation result,
   - any compatibility notes.
5. When the current official ZIP passes and the recorded metadata is accurate, change `Release gate: PENDING` to `Release gate: PASS`.
6. Commit only the metadata in this file, never Microsoft icon assets.

## Verification record template

```text
Verification date: YYYY-MM-DD
Package: Azure_Public_Service_Icons_VNN.zip
Result: PASS | FAIL
Browsable SVG icons: N
Categories: N
Naming-convention match: NN.N%
Hidden packaging root: ...
Notes: ...
```

## Weekly source watcher

`.github/workflows/microsoft-icons-watch.yml` checks the Microsoft Learn HTML page weekly. It compares only the reviewed package URL/filename and fingerprints of the `General guidelines` and `Icon terms` sections stored in `.github/microsoft-icons-watch.json`.

A change opens or updates a maintenance issue for human review. The watcher does **not** download the Microsoft icon ZIP, store SVG assets, alter legal guidance, change compatibility claims, or modify runtime code.

## Compatibility philosophy

The runtime does not hard-code the package version. It validates structure and behavior instead. Version filenames are release metadata, not a runtime gate.
