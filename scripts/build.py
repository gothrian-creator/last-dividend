#!/usr/bin/env python3
"""Build the standalone Last Dividend index.html from split source files.

Usage (from the repo root or anywhere):
    python3 /workspace/last-dividend-v3/scripts/build.py
    python3 /workspace/last-dividend-v3/scripts/build.py --out /path/to/index.html

The default output is /workspace/last-dividend-v3/dist/index.html.
Pass --pages to also copy into /workspace/last-dividend-pages/index.html
(does not commit or push).
"""
from __future__ import annotations

import argparse
import json
import shutil
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "src"
DIST = ROOT / "dist"
JS_NAMES = [
    "viewport.js",
    "rng.js",
    "data.js",
    "game.js",
    "world.js",
    "meta.js",
    "rivals.js",
    "fy.js",
    "eras.js",
    "lore.js",
    "missions.js",
    "worldmap-data.js",
    "assets.js",
    "render.js",
    "desk.js",
    "bunker.js",
    "fy-render.js",
    "office-data.js",
    "office.js",
    "recap.js",
    "ui.js",
]
PAGES = Path("/workspace/last-dividend-pages/index.html")


def build(out: Path) -> Path:
    parts = json.loads((ROOT / "scripts" / "shell-parts.json").read_text(encoding="utf-8"))
    css = (SRC / "css" / "style.css").read_text(encoding="utf-8")
    chunks = [parts["before_style"], "<style>", css, "</style>"]
    chunks.append(parts["between_style_and_first_script"])
    betweens = parts["between_scripts"]
    for i, name in enumerate(JS_NAMES):
        js = (SRC / "js" / name).read_text(encoding="utf-8")
        chunks.append("<script>")
        chunks.append(js)
        chunks.append("</script>")
        if i < len(betweens):
            chunks.append(betweens[i])
    chunks.append(parts["after_last_script"])
    html = "".join(chunks)
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(html, encoding="utf-8")
    # Keep assets next to the built file when writing to dist/
    assets_src = ROOT / "assets"
    assets_dst = out.parent / "assets"
    if assets_src.exists() and assets_dst.resolve() != assets_src.resolve():
        if assets_dst.is_symlink() or assets_dst.exists():
            pass
        else:
            try:
                assets_dst.symlink_to(assets_src)
            except OSError:
                shutil.copytree(assets_src, assets_dst)
    return out


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", type=Path, default=DIST / "index.html")
    ap.add_argument("--pages", action="store_true", help="also write last-dividend-pages/index.html")
    args = ap.parse_args()
    path = build(args.out)
    print("wrote", path, "bytes", path.stat().st_size)
    if args.pages:
        shutil.copy2(path, PAGES)
        print("copied to", PAGES)
    return 0


if __name__ == "__main__":
    sys.exit(main())
