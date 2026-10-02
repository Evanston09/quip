# Koala mascot draft

Original vector artwork in `koala.svg`, on a transparent 512 by 512 canvas. No external fonts, images, or filters are required.

This is separated artwork ready for animation setup, not a finished skeletal rig or an animation file. A target animation runtime has not been selected.

## Animation groups

Left and right mean the viewer's left and right. Each movable group has a local origin at its intended pivot. Preserve the existing translation and apply rotation or scale inside it, rather than replacing the translation.

| Group | Intended motion |
| --- | --- |
| `character` | Whole-character bounce; origin at the feet |
| `head` | Head tilt; origin near the neck |
| `ear-left`, `ear-right` | Small ear rotation; nested under head |
| `arm-left`, `arm-right` | Shoulder rotation for a wave |
| `leg-left`, `leg-right` | Hip rotation |
| `eye-left`, `eye-right` | Vertical scaling for a blink |
| `brow-left`, `brow-right` | Small shifts for expression |
| `mouth` | Swap the path for alternate expressions |
| `shadow` | Scale and fade independently during a bounce |

Body parts overlap at their joints for modest movements. Large pose changes may need revised artwork. Keep the head above the arms and body in the drawing order.

Use the mascot on Home and Results only, not during recording. The approved appearance has no scarf and joined shoulders; preserve the separate arm groups for animation.

Rendered with macOS Quick Look and visually inspected. Animation and mobile integration are not yet implemented or tested.
