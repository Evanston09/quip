# Quip app identity

Quip is the app; Quippy is its koala speaking coach. The icon uses the original mascot's head inside a pale speech bubble on eucalyptus green. There is no text or baked-in launcher corner mask.

- `quip-icon.png`: opaque 1024 × 1024 iOS and standard Android icon.
- `quip-adaptive-foreground.png`: transparent 1024 × 1024 Android layer, scaled to keep the mark inside the adaptive safe area.
- `quip-adaptive-monochrome.png`: one-tone alpha silhouette with facial cutouts for Android themed icons.
- `quip-splash.png`: transparent splash mark.
- `quip-favicon.png`: web favicon.
- SVG sources retain Quippy's original features and provide editable artwork.

Regenerate with `python3 scripts/create-quip-icons.py` in a Python environment with CairoSVG and Pillow. On Homebrew macOS, Cairo may need `DYLD_FALLBACK_LIBRARY_PATH=/opt/homebrew/lib`.

All assets are wired through `app.json`, following the [Expo SDK 57 app config](https://docs.expo.dev/versions/v57.0.0/config/app/). Native display names, icons, and splash assets require prebuild and a native rebuild. Bundle identifiers and local storage keys remain stable to preserve installed practice data.
