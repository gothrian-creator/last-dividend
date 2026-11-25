#!/usr/bin/env python3
"""House-rules seated desk (B): export the B-final layers as game assets and calibrate the seated opponents.
  python3 scripts/seated_assets.py export   -> assets/house/1978/sd-*.webp
  python3 scripts/seated_assets.py sheet    -> /tmp/seat-sheet.png (all 26 opponents in the visitor chair)
  python3 scripts/seated_assets.py params   -> prints the LD.SEAT_OPP table for src/js/seated.js
Plate space is the v6 turn plate, 720x1280."""
import sys, json, glob, math
from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter
import numpy as np
ROOT = Path(__file__).resolve().parent.parent
BF = Path("/workspace/last-dividend/mockups/desk-seated-2026-11-25/B-final/layers")
OUT = ROOT / "assets/house/1978"
FIGHT = ROOT / "assets/fight"
# far rim of the round table (plate coords): an ellipse, top at (380,547)
RIM_CX, RIM_TOP, RIM_A, RIM_B = 380, 547, 340, 100
def rim_y(x):
    u = (x - RIM_CX) / RIM_A
    return RIM_TOP + RIM_B * (1 - math.sqrt(max(0.0, 1 - u * u))) if abs(u) < 1 else RIM_TOP + RIM_B
CHAIR_X = 350          # visitor chair centre
HEAD_Y = 284           # head top of a seated visitor (pip-seated: 276)
WAIST_Y = 560          # waist just under the rim, hidden by the table
# per-opponent tweaks found from the sheet: (waist fraction of the sprite's figure, dx, dy, scale)
FULL = {"benny", "dana", "gil", "grace", "honoria", "pip", "pops", "theo"}
# seated repaints (opp-<art>-seat-*): generated seated, head to lap; the belt sits at this fraction of the figure
TWEAK = {"mina-seat": (0.68, -14, 0, 1.0), "pops-seat": (0.64, 0, 0, 1.0)}
def table_front():
    room = Image.open(BF / "room-clean.png").convert("RGBA")
    W, H = room.size
    m = np.zeros((H, W), np.float32)
    ys = np.arange(H)[:, None].astype(np.float32)
    r = np.array([rim_y(x) for x in range(W)], np.float32)[None, :]
    m = np.clip((ys - (r - 1.0)) / 2.0, 0, 1)     # 2px feather on the rim line
    a = np.array(room); a[..., 3] = (m * 255).astype(np.uint8)
    im = Image.fromarray(a)
    top = int(RIM_TOP - 2); bottom = 1142          # below the hands the plate is never visible behind a visitor
    return im.crop((0, top, W, bottom)), top
def figure(art):
    im = Image.open(FIGHT / f"opp-{art}-idle.webp").convert("RGBA")
    a = np.array(im)[..., 3]
    ys, xs = np.nonzero(a > 40)
    top = ys.min(); bot = ys.max()
    head = a[top: top + max(8, int((bot - top) * 0.12))] > 40
    hx = np.nonzero(head.any(0))[0]; hcx = (hx.min() + hx.max()) / 2
    return im, top, bot, hcx
def seat(art):
    im, top, bot, hcx = figure(art)
    wf, dx, dy, k = TWEAK.get(art, (0.43 if art in FULL else 0.60, 0, 0, 1.0))
    waist = top + (bot - top) * wf
    s = (WAIST_Y - HEAD_Y) / (waist - top) * k
    h = im.height * s; w = im.width * s
    x = CHAIR_X + dx - hcx * s; y = HEAD_Y + dy - top * s
    return dict(x=round(x, 1), y=round(y, 1), w=round(w, 1), h=round(h, 1))
def arts():
    return sorted(p.name[4:-10] for p in FIGHT.glob("opp-*-idle.webp"))
def export():
    OUT.mkdir(parents=True, exist_ok=True)
    room = Image.open(BF / "room-clean.png").convert("RGB")
    room.save(OUT / "sd-room.webp", quality=86, method=6)
    tf, top = table_front(); tf.save(OUT / "sd-table.webp", quality=88, method=6)
    meta = {"table": [0, top, tf.width, tf.height]}
    for n, src in (("hands-rest", "hands-rest-mara.png"), ("hands-dip", "hands-dipped-mara.png"), ("mara", "mara-ots.png")):
        im = Image.open(BF / src).convert("RGBA"); bb = im.getchannel("A").getbbox()
        im.crop(bb).save(OUT / f"sd-{n}-mara.webp" if n != "mara" else OUT / "sd-mara-ots.webp", quality=88, method=6)
        meta[n] = [bb[0], bb[1], bb[2] - bb[0], bb[3] - bb[1]]
    print(json.dumps(meta))
def sheet():
    room = Image.open(BF / "room-clean.png").convert("RGBA")
    tf, top = table_front()
    tiles = []
    for art in arts():
        c = room.copy()
        p = seat(art)
        for pose in ("idle", "attack"):
            pass
        im = Image.open(FIGHT / f"opp-{art}-idle.webp").convert("RGBA").resize((round(p["w"]), round(p["h"])), Image.Resampling.LANCZOS)
        c.alpha_composite(im, (round(p["x"]), round(p["y"])))
        c.alpha_composite(tf, (0, top))
        t = c.crop((150, 230, 570, 720)).convert("RGB")
        ImageDraw.Draw(t).text((6, 6), art, fill=(255, 255, 255))
        tiles.append(t)
    cols = 7; tw, th = tiles[0].size
    out = Image.new("RGB", (cols * tw, math.ceil(len(tiles) / cols) * th), "black")
    for i, t in enumerate(tiles): out.paste(t, ((i % cols) * tw, (i // cols) * th))
    pass
    out.save("/tmp/seat-sheet.png"); print("/tmp/seat-sheet.png", out.size)
def params():
    print(json.dumps({a: [seat(a)[k] for k in ("x", "y", "w", "h")] for a in arts()}, separators=(",", ":")))
if __name__ == "__main__":
    {"export": export, "sheet": sheet, "params": params}[sys.argv[1]]()
