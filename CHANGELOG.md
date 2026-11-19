# Changelog

## 0.1.1

- Bounded scenes now use native absolute positioning for positioned and transformed roots, so fast scrolling and ancestor transforms move the canvas with its host in the same paint.
- Whole-document overlays synchronise on both window and captured document scroll, including paused geometry reads.
- 2D affine viewport-to-canvas mapping keeps perch and feed coordinates consistent through rotated/scaled ancestors without changing host styles.
- Paused geometry updates schedule no animation frames. Added transformed-root and paused-RAF browser regressions.

## 0.1.0

- Introduces an original articulated dragon with a brief automatic egg hatch.
- Adds grounded walking/eating, anticipatory flight/landing, tiny fire sneezes and sleeping.
- Adds bounded and whole-page modes with scroll-synchronised real DOM perches.
- Includes validated options, three palettes, lifecycle controls, reduced motion, hidden/offscreen pausing and SSR-safe imports.
