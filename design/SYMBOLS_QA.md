# Symbols chapter verification

The preview preparation runs `revise-symbols-hierarchy.py` twice and compares its output. It must be idempotent. Original files in `public/identidade/` must remain unchanged.

`public/manual-symbols.js` uses the installed GSAP MorphSVGPlugin to normalize Bezier contours. It does not sample an entire compound path into a polygon. The first and last frames use exact original path strings with a uniform scale; intermediate correspondence remains automatically generated, not an art-directed final motion specification.

Before preview deployment, `scripts/smoke-symbols-browser.mjs` checks the built page in Chromium at 1920, 1440, 1024, 768, 390, 375 and 320 pixels. It validates official fonts, two signature illustrations, all nine endpoints, 45 timeline positions, play/pause/resume/reset, keyboard control, rapid selection and sticky navigation. Screenshots and JSON reports are retained as workflow artifacts.

After deployment the same tests run against the actual preview URL and also open the original matrix editor, check its ten states and exercise its playback controls. The production domain is never a deployment target.
