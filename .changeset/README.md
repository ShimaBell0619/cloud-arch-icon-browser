# Changesets

Release-relevant pull requests should normally include a Changeset created with:

```bash
npm run changeset
```

Choose the package, select the appropriate SemVer bump, and describe the user-visible change. The Changesets GitHub Action aggregates pending entries into a release pull request on `main`.

The initial `v0.1.0` is a bootstrap exception: `package.json` is already at `0.1.0` while the final npm scope and Trusted Publisher setup are intentionally completed immediately before the first publication. This release-readiness pull request therefore does not add a version-bumping Changeset.
