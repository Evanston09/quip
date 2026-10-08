# Koala mascot

Original slate-grey vector koala, with its familiar eyes and smile preserved. Six finite motions live in `motions.json`: idle breathing and a blink, hello wave, listening tilt, thinking paw lift, reassuring nod, and practice-complete celebration.

`src/components/koala-mascot.tsx` plays the shared keyframes with Reanimated. Home greets the user; completed feedback acknowledges their effort (a reassuring nod when scientific corrections are present). Tap the koala to replay. The mascot stays on Home and Results, away from the recording screen. Sequences cancel on navigation or backgrounding. System Reduce Motion shows a still pose.

A short, tapered neck sits behind the head and torso, filling the shoulder gap during tilts without lengthening the silhouette. The body, head, arms, eyes, and shadow are separate SVG layers. Arms rotate about shoulders at (196, 287) and (316, 287); the head rotates about (256, 264). The eyes stay attached to the head. Body parts overlap at their joints. Head rotation is limited to 7 degrees and body travel to 5 units on the 512-unit canvas; no gaze tracking or mouth morphing.

Recreate the layers after changing the original artwork:

```sh
python3 scripts/create-koala-layers.py
node scripts/create-koala-gallery.mjs
```

`docs/koala-animations.html` is a standalone, offline gallery embedding all artwork, motion data, and the project's Nunito font. It includes replay, pause, a six-action tour, and a reduced-motion toggle. It uses the same layer placement and easing as the app. No app web build is needed.
