#!/usr/bin/env python3
"""Take the painted brass map pins out of the chair-turn frames that show the desk map (turn 1 for every exec), as NEW files.
The desk now draws glass pins over sd-table-clean.webp; turn frame 1 must match it or the brass pins pop back mid-turn.
Method: the pin-free plate differs from sd-table.webp only inside soft patches round the five painted pins. Turn 1 is the
desk plate composite (same plate coords), so add that difference (clean - original) back onto each frame, only where the
frame still shows the table there (not covered by the person), with a soft mask. Originals are untouched."""
import numpy as np, cv2, os, sys
from PIL import Image
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
B = os.path.join(ROOT, "assets/house/1978")            # the shipped plates (clean table, -clean frames)
O = os.path.join(ROOT, "art-src/house-originals/1978")  # the originals (sd-table, turn-1-before, exec/*/turn-1): kept, not shipped
T = np.asarray(Image.open(os.path.join(O, "sd-table.webp")).convert("RGB")).astype(np.float32)
C = np.asarray(Image.open(os.path.join(B, "sd-table-clean.webp")).convert("RGB")).astype(np.float32)
Y0 = 545
diff = C - T
m = (np.abs(diff).max(2) > 3).astype(np.float32)
m = cv2.dilate(m, np.ones((7, 7), np.uint8)); m = cv2.GaussianBlur(m, (0, 0), 2.5)
def clean(src, dst):
    F = np.asarray(Image.open(src).convert("RGB")).astype(np.float32)
    reg = F[Y0:Y0 + T.shape[0], :T.shape[1]]
    # where the frame still shows the original table (the person is not over it)
    same = (np.abs(cv2.GaussianBlur(reg, (0, 0), 2) - cv2.GaussianBlur(T, (0, 0), 2)).max(2) < 34).astype(np.float32)
    same = cv2.erode(same, np.ones((5, 5), np.uint8)); same = cv2.GaussianBlur(same, (0, 0), 2)
    k = (m * same)[..., None]
    out = F.copy(); out[Y0:Y0 + T.shape[0], :T.shape[1]] = np.clip(reg + diff * k, 0, 255)
    Image.fromarray(out.astype(np.uint8)).save(dst, quality=90, method=6)
    left = (m > 0.5) & (same < 0.5)
    print(os.path.relpath(dst, ROOT), "patched px", int((m * same > 0.5).sum()), "pin px left under the person", int(left.sum()))
clean(os.path.join(O, "turn-1-before.webp"), os.path.join(B, "turn-1-before-clean.webp"))
for ex in sorted(os.listdir(os.path.join(O, "exec"))):
    f = os.path.join(O, "exec", ex, "turn-1.webp")
    if os.path.exists(f): clean(f, os.path.join(B, "exec", ex, "turn-1-clean.webp"))
