Real-input browser tests (playwright-core from /workspace/tools/node_modules, Chrome at /usr/bin/google-chrome). They serve `dist/` (or `DIST=`), or hit `LIVE=<url>`.

- `node tour.js <outdir> 390x844,1366x1024` : Penny's tour with real taps (box never covers its target, no page scroll, no console errors), the skip path (no tips over fights), the hatch arrow, and Menu → Replay Penny's tour.
- `node sweep.js <outdir> [sizes]` : title, mid-run hubs (shortcut: era-driver seeds Q6/Q10, named), the rail overlays, one real quarter (deal → fight → reward → bunker), rail tap sizes ≥44px, executive bunker icon and its fallback.
- `node oldsave.js` : saves made by an older build (put it in /tmp/oldld) load in the new one.
Sizes: 390x844 375x667 360x740 768x1024 1024x768 1024x1366 1366x1024 1280x720 1920x1080.
