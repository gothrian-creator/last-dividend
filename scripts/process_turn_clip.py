#!/usr/bin/env python3
"""Process a generated Mara chair-turn clip into the game's turn clips (no alpha, real frames only, no in-betweens invented).
usage: process_turn_clip.py <era 1978|2008|now> <raw.mp4> <stills_dir> <out_dir> [--fps 30]   (--fps = the settle frames' rate)
stills_dir holds <era>-start-720x1280.png and <era>-end-720x1280.png (the plates the game shows before and after the turn).
Frame 1 = the exact start still. Then every real raw frame (no in-betweens), paced by how long each is held (see speed(); laid on a 60 fps grid). The generator's last frame lands a pixel or two
off the end still, so the last 8 frames are eased onto it by an affine fit (ECC on the room), then 2 frames settle into the exact end
still and 3 hold it. The game plays it over the start plate and fades it out over the end plate.
Writes <out_dir>/turn-<era>.mp4 (H.264 yuv420p bt709 faststart, Safari/iOS) and turn-<era>.webm (VP9)."""
import sys, os, math, subprocess, tempfile, shutil, cv2, numpy as np
era, raw, stills, out = sys.argv[1:5]
fps = int(sys.argv[sys.argv.index("--fps") + 1]) if "--fps" in sys.argv else 30
os.makedirs(out, exist_ok=True)
tmp = tempfile.mkdtemp()
subprocess.check_call(["ffmpeg", "-v", "error", "-i", raw, "-map", "0:v:0", tmp + "/r%03d.png"])
rf = sorted(f for f in os.listdir(tmp) if f.startswith("r"))
R = [cv2.imread(os.path.join(tmp, f)) for f in rf]
n = len(R)
start = cv2.imread(os.path.join(stills, era + "-start-720x1280.png")); end = cv2.imread(os.path.join(stills, era + "-end-720x1280.png"))
assert start.shape[:2] == (1280, 720) and end.shape[:2] == (1280, 720) and R[0].shape[:2] == (1280, 720)
# every real frame after the static lead-in, none blended. The pacing is in the frame times instead
# (held for more or fewer 60 fps ticks): 1.8x the generator's speed in, 2.5x through the swing (one tick a frame), 1.2x for the stop
lead = 1
while lead < 3 and float(np.abs(R[lead].astype(np.float32) - R[lead - 1].astype(np.float32)).mean()) < 2.0: lead += 1
idx = list(range(lead, n))  # skip only a static lead-in (frames that barely move), at most the first 3
def speed(j, N):
    u = j / max(1, N - 1); b = 1.8 + (1.2 - 1.8) * u; return b + (2.5 - b) * math.sin(math.pi * u) ** 2  # 1.8x in, 2.5x swing, 1.2x out
g = lambda im: cv2.cvtColor(im, cv2.COLOR_BGR2GRAY).astype(np.float32)
warp = np.eye(2, 3, dtype=np.float32)
try:
    _, warp = cv2.findTransformECC(g(end), g(R[-1]), warp, cv2.MOTION_AFFINE, (cv2.TERM_CRITERIA_EPS | cv2.TERM_CRITERIA_COUNT, 200, 1e-6), None, 5)
except cv2.error:
    pass
eye = np.eye(2, 3, dtype=np.float32)
seq = [start]
TAIL = 8
for j, i in enumerate(idx):
    f = R[i]
    a = (j - (len(idx) - TAIL)) / (TAIL - 1.0) if j >= len(idx) - TAIL else 0.0
    if a > 0:
        a = a * a * (3 - 2 * a)
        W = eye + (warp - eye) * a
        f = cv2.warpAffine(f, W, (720, 1280), flags=cv2.INTER_LINEAR | cv2.WARP_INVERSE_MAP, borderMode=cv2.BORDER_REPLICATE)
    seq.append(f)
last = seq[-1].astype(np.float32)
for a in (0.35, 0.7):
    seq.append((last * (1 - a) + end.astype(np.float32) * a).round().astype(np.uint8))
seq += [end, end, end]
os.makedirs(tmp + "/s")
raw_dt = 1.0 / float(os.environ.get("RAW_FPS", "24"))
dur = [1.0 / fps] + [raw_dt / speed(j, len(idx)) for j in range(len(idx))] + [1.0 / fps] * (len(seq) - 1 - len(idx))
for j, im in enumerate(seq):
    cv2.imwrite(tmp + "/s/f%03d.png" % j, im)
# laid out on a 60 fps grid (what a 60 Hz screen shows anyway): tick k shows the frame whose slot covers k/60
TICK = 60; total = sum(dur); t0 = [sum(dur[:j]) for j in range(len(dur))]
ticks = int(round(total * TICK)); j = 0
for k in range(ticks):
    while j + 1 < len(dur) and t0[j + 1] <= (k + 0.5) / TICK: j += 1
    os.link(tmp + "/s/f%03d.png" % j, tmp + "/s/%04d.png" % k)
vf = "scale=in_range=full:out_range=tv:out_color_matrix=bt709:flags=accurate_rnd+full_chroma_int,format=yuv420p"
tags = ["-colorspace", "bt709", "-color_primaries", "bt709", "-color_trc", "bt709", "-color_range", "tv"]
inp = ["-v", "error", "-y", "-framerate", str(TICK), "-i", tmp + "/s/%04d.png", "-vf", vf]
crf = os.environ.get("CRF", "24"); vcrf = os.environ.get("VCRF", "36")
mp4 = os.path.join(out, "turn-" + era + ".mp4"); webm = os.path.join(out, "turn-" + era + ".webm")
subprocess.check_call(["ffmpeg"] + inp + ["-c:v", "libx264", "-preset", "veryslow", "-crf", crf, "-profile:v", "high", "-level", "4.0", "-g", "999", "-bf", "2",
    "-pix_fmt", "yuv420p"] + tags + ["-movflags", "+faststart", "-an", mp4])
subprocess.check_call(["ffmpeg"] + inp + ["-c:v", "libvpx-vp9", "-b:v", "0", "-crf", vcrf, "-row-mt", "1", "-deadline", "good", "-cpu-used", "1",
    "-pix_fmt", "yuv420p", "-g", "999"] + tags + ["-an", webm])
for p in (mp4, webm):
    print(era, os.path.basename(p), os.path.getsize(p), "bytes,", len(seq), "frames, VFR, total", round(total, 3), "s; raw", n, "frames; tail fit", warp.round(4).tolist())
shutil.rmtree(tmp)
