#!/usr/bin/env python3
"""Process a generated Mara chair-turn clip into the game's turn clips (no alpha, real frames only, no interpolation).
usage: process_turn_clip.py <era 1978|2008|now> <raw.mp4> <stills_dir> <out_dir> [--fps 32]
Frame 1 = the exact start still, then raw frames 5,7,...,69 (every second real frame, skipping the static lead-in),
last 2 frames = the exact era end still. Encodes H.264 (yuv420p, bt709, faststart) + VP9 WebM."""
import sys, os, subprocess, tempfile, shutil, cv2
era, raw, stills, out = sys.argv[1:5]
fps = int(sys.argv[sys.argv.index("--fps") + 1]) if "--fps" in sys.argv else 32
os.makedirs(out, exist_ok=True)
tmp = tempfile.mkdtemp()
subprocess.check_call(["ffmpeg", "-v", "error", "-i", raw, "-map", "0:v:0", tmp + "/r%02d.png"])
start = os.path.join(stills, era + "-start-720x1280.png"); end = os.path.join(stills, era + "-end-720x1280.png")
seq = [start] + [tmp + "/r%02d.png" % i for i in range(5, 70, 2)] + [end, end]
os.makedirs(tmp + "/s")
for n, p in enumerate(seq):
    im = cv2.imread(p); assert im.shape[:2] == (1280, 720), p
    cv2.imwrite(tmp + "/s/%03d.png" % n, im)
vf = "scale=in_range=full:out_range=tv:out_color_matrix=bt709:flags=accurate_rnd+full_chroma_int,format=yuv420p"
tags = ["-colorspace", "bt709", "-color_primaries", "bt709", "-color_trc", "bt709", "-color_range", "tv"]
inp = ["-v", "error", "-y", "-framerate", str(fps), "-i", tmp + "/s/%03d.png", "-vf", vf]
crf = os.environ.get("CRF", "27"); vcrf = os.environ.get("VCRF", "41")
subprocess.check_call(["ffmpeg"] + inp + ["-c:v", "libx264", "-preset", "veryslow", "-crf", crf, "-profile:v", "high", "-g", "999", "-bf", "2",
    "-pix_fmt", "yuv420p"] + tags + ["-movflags", "+faststart", "-an", os.path.join(out, era + ".mp4")])
subprocess.check_call(["ffmpeg"] + inp + ["-c:v", "libvpx-vp9", "-b:v", "0", "-crf", vcrf, "-row-mt", "1", "-deadline", "good", "-cpu-used", "0",
    "-pix_fmt", "yuv420p", "-g", "999"] + tags + ["-an", os.path.join(out, era + ".webm")])
for e in ("mp4", "webm"):
    print(era, e, os.path.getsize(os.path.join(out, era + "." + e)), "bytes,", len(seq), "frames @", fps, "fps =", round(len(seq) / fps, 3), "s")
shutil.rmtree(tmp)
