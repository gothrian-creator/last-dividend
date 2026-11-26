# The deed's red wax seal sat on a crimson key background, so the original key (key*.py) left the seal and its ribbon
# half transparent (and inpainted their colour). Re-matte from the clean raw renders (no painting): inside the prop's
# outer silhouette, alpha comes from a tighter colour distance to the background, colour = the raw pixel un-mixed from
# the background. Real holes (the key's rings) show the exact background colour and stay transparent.
# Same bug on ledger-open: the green cash on the green key was taken as 'shadow' by key4's hue rule and made 55% clear.
# Inputs: props4/deed.png + raw/deed.jpg, props4/deed-open.png + raw4/deed-open.jpg (kept). Outputs: props6/deed*.png
import numpy as np, cv2
from PIL import Image
from scipy import ndimage
def fix(prop, raw, out):
  P = np.array(Image.open(prop).convert('RGBA')).astype(np.float32); R = cv2.cvtColor(cv2.imread(raw), cv2.COLOR_BGR2RGB).astype(np.float32)
  h, w = P.shape[:2]
  # where the cut sits in the raw: match the solid pixels
  solid = P[..., 3] > 250
  best = None
  g = cv2.cvtColor(R.astype(np.uint8), cv2.COLOR_RGB2GRAY).astype(np.float32); t = cv2.cvtColor(P[..., :3].astype(np.uint8), cv2.COLOR_RGB2GRAY).astype(np.float32)
  res = cv2.matchTemplate(g, t, cv2.TM_SQDIFF, mask=solid.astype(np.float32)); _, _, mn, _ = cv2.minMaxLoc(res); x0, y0 = mn
  C = R[y0:y0 + h, x0:x0 + w]
  print(out, 'offset', (x0, y0), 'solid match err', float(np.abs(C[solid] - P[..., :3][solid]).mean()))
  corners = np.concatenate([R[:20, :20].reshape(-1, 3), R[:20, -20:].reshape(-1, 3), R[-20:, :20].reshape(-1, 3), R[-20:, -20:].reshape(-1, 3)]); bg = np.median(corners, 0)
  lab = cv2.cvtColor(C.astype(np.uint8), cv2.COLOR_RGB2LAB).astype(np.float32); bl = cv2.cvtColor(bg.reshape(1, 1, 3).astype(np.uint8), cv2.COLOR_RGB2LAB).astype(np.float32)[0, 0]
  d = np.linalg.norm(lab - bl, axis=2)
  a2 = np.clip((d - 5) / 9, 0, 1)                      # tighter than the original (d-14)/22
  inside = ndimage.binary_fill_holes(P[..., 3] > 128)    # the prop's outer silhouette
  inside = cv2.erode(inside.astype(np.uint8), np.ones((3, 3), np.uint8)).astype(bool)
  a_old = P[..., 3] / 255; a_new = np.where(inside, np.maximum(a_old, a2), a_old)
  gain = (a_new - a_old) > 0.02
  am = np.maximum(a_new, 1e-3)[..., None]; F = np.clip((C - (1 - a_new)[..., None] * bg) / am, 0, 255)
  rgb = np.where(gain[..., None], F, P[..., :3])
  Image.fromarray(np.dstack([rgb, a_new * 255]).round().astype(np.uint8), 'RGBA').save(out)
  print(' changed px', int(gain.sum()), 'still semi inside', int((inside & (a_new > 0.05) & (a_new < 0.95)).sum()))
fix('props4/deed.png', 'raw/deed.jpg', 'props6/deed.png')
fix('props4/deed-open.png', 'raw4/deed-open.jpg', 'props6/deed-open.png')
fix('props4/ledger-open.png', 'raw4/ledger-open.jpg', 'props6/ledger-open.png')
