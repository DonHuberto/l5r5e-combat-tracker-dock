# Repository instructions

## Release contract

For every publishable change, run the full CI and release validators, bump `module.json`, update `CHANGELOG.md`, build and inspect the archive, commit intentionally, push, and create a draft GitHub Release.

Attach `module.json` and exactly the ZIP basename from `download`. Keep `manifest` at the stable latest-release asset, keep `download` versioned to the release tag, and expose a public changelog. Publish only after all tests, links, archive contents and versions pass; then verify both public asset URLs.
