# Last Dividend (v3 source)

Maintainable source for the Drop 1 office-hub build of Last Dividend. The playable game is still a single `index.html`.

Do not rebuild or edit `/workspace/last-dividend` — that tree is an older archive.

## Build

```
python3 /workspace/last-dividend-v3/scripts/build.py
```

Writes `dist/index.html`. Add `--pages` to also copy into `/workspace/last-dividend-pages/index.html` (the GitHub Pages repo). That does not commit or push.

## Test

```
node /workspace/last-dividend-v3/tests/run-tests.js
node /workspace/last-dividend-v3/tests/smoke.js
```

`smoke.js` needs headless Chrome and a built `dist/index.html` (it will build if needed).

## Layout

- `src/css/style.css`
- `src/js/` — modules, concatenated in the order listed in `scripts/build.py`
- `scripts/shell-parts.json` — HTML shell around the inlined CSS/JS
- `assets/` — shared media (symlink to the pages repo assets)

## Browser tests: where puppeteer lives

The screenshot/smoke scripts load `puppeteer-core` from `/workspace/tools/node_modules` (durable; `/tmp` gets wiped) and drive `/usr/bin/google-chrome`.
If it's missing: `cd /workspace/tools && npm i puppeteer-core`. Override with `PPTR=/path/to/puppeteer-core`.
Test viewports: 360x800, 412x915, 800x1280, 1280x800 only.

## Source control

This tree is a git repo (local). It is backed up to the GitHub repo's `source` branch (separate history from `main`, which is the Pages build). Normal pushes only.
