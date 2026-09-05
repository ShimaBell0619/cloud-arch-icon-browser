# Official Package Compatibility

This file records the most recent Microsoft Azure Architecture Icons package that has been explicitly verified against the project.

Only the most recently recorded **successful** verification is officially supported. Older or newer packages may work when structurally compatible, but they are not guaranteed until verified.

## Current official package observation

As of 2026-09-06, the official Microsoft Learn page links to:

- Package: `Azure_Public_Service_Icons_V24.zip`
- Official page: https://learn.microsoft.com/en-us/azure/architecture/icons/
- Microsoft Learn page last updated: 2026-07-09
- Manual compatibility verification: **PASS**

Release gate: PASS

`Azure_Public_Service_Icons_V24.zip` has been downloaded separately by the maintainer and successfully processed by the development-only release verifier, which reuses the production `IconPackageSession.open` parser/validator. The Microsoft ZIP/SVG assets themselves are not committed or packaged by this project.

## Last successful verification

```text
Verification date (UTC): 2026-09-05
Package: Azure_Public_Service_Icons_V24.zip
Result: PASS
Archive entries: 716
Browsable SVG icons: 714
Categories: 30
Naming-convention match: 99.9%
Hidden packaging root: Azure_Public_Service_Icons
Notes: Successfully processed by the production IconPackageSession parser/validator. Verification was run by the maintainer from the separately downloaded official V24 ZIP; no Microsoft icon assets were added to the repository.
```

The verifier records its date in UTC. This verification was performed during the maintainer's 2026-09-06 JST release-readiness session.

## Verification procedure

Before a future release that claims compatibility with a newer current package:

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
   - archive entry count,
   - browsable SVG/icon count,
   - category count,
   - naming-convention match rate,
   - hidden packaging root,
   - validation result,
   - any compatibility notes.
5. Set the release gate to `PASS` only when the current official ZIP passes and the recorded metadata is accurate.
6. Commit only the metadata in this file, never Microsoft icon assets.

## Verification record template

```text
Verification date (UTC): YYYY-MM-DD
Package: Azure_Public_Service_Icons_VNN.zip
Result: PASS | FAIL
Archive entries: N
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
