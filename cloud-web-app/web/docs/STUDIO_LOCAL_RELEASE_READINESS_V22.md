# Studio Local Release Readiness V22

No broken download theater. Studio Local can be a serious product advantage only if the UI separates beta access from public signed releases.

## Release matrix

The canonical manifest lives in `lib/studio-local/release-manifest.ts` and tracks:

- Windows installer
- macOS notarized DMG
- Linux AppImage/deb
- signed installers
- auto-updater
- sidecar health
- capability probe
- Cloud Stream handoff

## Product rules

- The primary CTA remains `Request desktop beta` while signed installers are held.
- Public artifact names can be displayed as targets, but they must not be exposed as working downloads without signing and checksum evidence.
- Studio can request native capability probes, but heavy execution remains browser-safe until Studio Local answers with fresh capability evidence.
- Cloud Stream stays held without `NEXT_PUBLIC_AETHEL_PIXEL_STREAM_URL`, backend session management, idle teardown, and visible per-minute cost.
- Signed installers, auto-updater, and rollback are release gates, not marketing copy.

## UI surfaces

- `/download` renders `StudioLocalReleaseReadinessMatrix` near the top so users see Windows, macOS, Linux, updater, signing, sidecars, probe, and Cloud Stream status before any artifact copy.
- Studio Mission Control keeps a compact release readiness summary inside `StudioLocalRuntimeCapsule` so creators understand whether native work is connected, stale, held, or beta.

## Gate

`npm run qa:studio-local-release-readiness` fails if the matrix disappears, if signed installers stop being held without evidence, or if `/download` links directly to unsigned artifacts.
