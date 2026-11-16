#!/usr/bin/env node
"use strict";
/* Fight start: the hub office strip plays the arrival (visitor walks in / you leave by the back door), then the fight
   opens directly; there is no full-screen intro card any more. Frames at the 4 test viewports + mp4s; skip test. */
const fs = require("fs"), http = require("http"), path = require("path"), cp = require("child_process");
const ROOT = path.resolve(__dirname, "..");
const DIST = process.env.DIST || path.join(ROOT, "dist");
const OUT = process.env.SHOT_DIR || "/workspace/last-dividend/mockups/no-intro-2026-11-16";
const LIVE = process.env.LIVE || "";
const puppeteer = require(process.env.PPTR || "/workspace/tools/node_modules/puppeteer-core");
const MIME = { ".html": "text/html; charset=utf-8", ".webp": "image/webp", ".png": "image/png", ".js": "text/javascript", ".css": "text/css", ".jpg": "image/jpeg" };
const DRIVER = fs.readFileSync(path.join(__dirname, "era-driver.js"), "utf8");
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const SCENES = JSON.parse(process.env.SCENES || "null") || [
  ["visitor-1978-dunn", { seed: "eras-0", exec: "mara", style: "any", stop: "fight:dunn", strip: true }],
  ["away-2008-gray", { seed: "eras-0", exec: "mara", style: "any", stop: "fight:gray", strip: true }]
];
const VPS = (process.env.VPS || "360x800,412x915,800x1280,1280x800").split(",").map((s) => s.split("x").map(Number));
const VIDEO = (process.env.VIDEO || "412x915,1280x800").split(",");
const RM = !!process.env.RM;
(async () => {
  let origin = LIVE, server = null;
  if (!LIVE) {
    server = http.createServer((req, res) => {
      let url = decodeURIComponent((req.url || "/").split("?")[0]); if (url === "/") url = "/index.html";
      let file = path.normalize(path.join(DIST, url));
      if (!fs.existsSync(file) && url.startsWith("/assets/")) file = path.join("/workspace/last-dividend-pages", url);
      fs.readFile(file, (err, data) => { if (err) { res.writeHead(404); res.end(); return; } res.writeHead(200, { "Content-Type": MIME[path.extname(file)] || "application/octet-stream" }); res.end(data); });
    });
    await new Promise((r) => server.listen(0, "127.0.0.1", r));
    origin = "http://127.0.0.1:" + server.address().port + "/";
  }
  const browser = await puppeteer.launch({ executablePath: "/usr/bin/google-chrome", headless: "new", args: ["--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage"] });
  const page = await browser.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push("pageerror " + e.message));
  page.on("console", (m) => { if (m.type() === "error") errors.push("console " + m.text()); });
  page.on("response", (r) => { if (r.status() >= 400) errors.push("http " + r.status() + " " + r.url()); });
  if (RM) await page.emulateMediaFeatures([{ name: "prefers-reduced-motion", value: "reduce" }]);
  fs.mkdirSync(OUT, { recursive: true });
  const click = (sel) => page.evaluate((s) => { const n = document.querySelector(s); if (!n) return false; n.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true, view: window })); return true; }, sel);
  for (const [vw, vh] of VPS) {
    const vp = vw + "x" + vh;
    await page.setViewport({ width: vw, height: vh, deviceScaleFactor: 1 });
    for (const [name, opts] of SCENES) {
      await page.goto(origin + (LIVE ? "?cb=" + Date.now() : ""), { waitUntil: "networkidle0" });
      const ok = await page.evaluate((DRIVER, opts) => {
        localStorage.clear();
        const eraDrive = new Function("module", DRIVER + "; return eraDrive;")(undefined);
        const st = eraDrive(window.LD, opts);
        if (!st || !st.fy || (!opts.hub && !st.fy.fight)) return false;
        if (opts.forceOpp && st.fy.fight) { st.fy.fight.opp = opts.forceOpp; st.fy.fight.venue = "away"; }
        localStorage.setItem("lastDividend.v1", JSON.stringify({ penny: { offered: true, done: true, tipsOff: true, tips: {} }, audioOff: true, seenTutorial: true, coachDone: true, midRun: st }));
        return st.turn + " " + (st.fy.fight ? st.fy.fight.opp + " " + window.LD.fightVenue(st.fy.fight) : "desk");
      }, DRIVER, opts);
      if (!ok) { errors.push("no state " + name); continue; }
      await page.goto(origin + (LIVE ? "?cb=" + Date.now() : ""), { waitUntil: "networkidle0" });
      const rec = VIDEO.includes(vp) && !RM; let frames = [], cdp = null, t0 = 0;
      if (rec) {
        cdp = await page.target().createCDPSession();
        cdp.on("Page.screencastFrame", async (f) => { frames.push({ d: f.data, t: f.metadata.timestamp }); try { await cdp.send("Page.screencastFrameAck", { sessionId: f.sessionId }); } catch (e) {} });
        await cdp.send("Page.startScreencast", { format: "jpeg", quality: 88, everyNthFrame: 1 });
      }
      await click("#btn-continue");
      if (await page.waitForSelector("#fy-boss-ok", { timeout: 900 }).catch(() => null)) await click("#fy-boss-ok");
      if (opts.hub) {
        await page.waitForSelector(".desk .pin[data-deal]", { timeout: 6000 }); await sleep(600);
        await page.screenshot({ path: path.join(OUT, vp + "-" + name + "-hub.png") });
        await click(".desk .pin[data-deal]"); await sleep(500);
        if (!(await click("#btn-sign:not([disabled])"))) await click("#dossier .dz-choice:not([disabled])");
      }
      // watch for any full-screen intro card (must never appear) and time the strip end → fight open gap
      await page.evaluate(() => { window.__fiSeen = false; window.__stripEnd = 0; window.__doorOn = 0;
        const mo = new MutationObserver(() => { if (document.getElementById("fi") || document.querySelector(".fi")) window.__fiSeen = true;
          const strip = document.querySelector(".of-room.ofx-go"); if (strip) window.__stripOn = 1; else if (window.__stripOn && !window.__stripEnd) window.__stripEnd = performance.now();
          const d = document.getElementById("door"); if (d && d.classList.contains("on") && !window.__doorOn) window.__doorOn = performance.now(); });
        mo.observe(document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ["class"] });
        /* frame poll too: the observer alone can miss the strip when it mounts and unmounts inside one batch */
        (function poll() { const strip = document.querySelector(".of-room.ofx-go"); if (strip) window.__stripOn = 1; else if (window.__stripOn && !window.__stripEnd) window.__stripEnd = performance.now();
          const d = document.getElementById("door"); if (d && d.classList.contains("on") && !window.__doorOn) window.__doorOn = performance.now(); if (!window.__doorOn) requestAnimationFrame(poll); })(); });
      const seen = RM ? true : await page.waitForSelector(".of-room.ofx-go", { timeout: opts.hub ? 8000 : 4000 }).then(() => true).catch(() => false);
      if (!seen) errors.push("no strip entrance " + vp + " " + name);
      t0 = Date.now();
      const marks = RM ? [300] : (opts.hub || opts.strip) ? [150, 600, 1100, 1600, 2050, 2600, 3200] : [150, 700, 1300, 2000, 2700];
      for (const m of marks) { const w = m - (Date.now() - t0); if (w > 0) await sleep(w); await page.screenshot({ path: path.join(OUT, vp + "-" + name + (RM ? "-reduced" : "") + "-t" + m + ".png") }); }
      await page.waitForFunction(() => document.getElementById("door").classList.contains("on"), { timeout: 6000 }).catch(() => errors.push("fight never opened " + vp + " " + name));
      const dt = Date.now() - t0;
      const chk = await page.evaluate(() => ({ fi: window.__fiSeen || !!document.getElementById("fi"), gap: window.__stripEnd && window.__doorOn ? Math.round(window.__doorOn - window.__stripEnd) : null, opener: (document.querySelector("#sc-why span") || {}).textContent || "", bubble: !!document.getElementById("sc-bubble"), cb: !!document.getElementById("sc-cb") }));
      if (chk.fi) errors.push("intro card appeared " + vp + " " + name);
      if (!chk.opener && !chk.cb) errors.push("no opener caption " + vp + " " + name);
      if (!RM && (chk.gap == null || chk.gap > 400)) errors.push("strip→fight gap " + chk.gap + " " + vp + " " + name);
      const who = await page.evaluate(() => { const w = document.querySelector("#door .df-title b"); return w ? w.textContent.trim().slice(0, 40) : "?"; });
      await sleep(900);
      await page.screenshot({ path: path.join(OUT, vp + "-" + name + (RM ? "-reduced" : "") + "-fight.png") });
      if (rec) {
        await sleep(400);
        await cdp.send("Page.stopScreencast");
        const dir = fs.mkdtempSync("/tmp/fi-"); let list = "";
        frames.forEach((f, i) => { const fn = path.join(dir, String(i).padStart(4, "0") + ".jpg"); fs.writeFileSync(fn, Buffer.from(f.d, "base64")); const nx = frames[i + 1]; list += "file '" + fn + "'\nduration " + (nx ? Math.max(0.001, nx.t - f.t) : 0.5).toFixed(3) + "\n"; });
        list += "file '" + path.join(dir, String(frames.length - 1).padStart(4, "0") + ".jpg") + "'\n";
        fs.writeFileSync(path.join(dir, "list.txt"), list);
        const mp4 = path.join(OUT, vp + "-" + name + ".mp4");
        cp.execSync("ffmpeg -y -loglevel error -f concat -safe 0 -i " + dir + "/list.txt -vf \"scale=trunc(iw/2)*2:trunc(ih/2)*2,fps=30\" -pix_fmt yuv420p -c:v libx264 -crf 20 " + mp4);
        console.log("mp4", mp4, frames.length + " frames");
      }
      console.log(vp, name, ok, "→ fought:", who, "| strip start→fight " + dt + "ms | strip end→fight " + chk.gap + "ms | opener:", chk.opener.slice(0, 60), "| bubble:", chk.bubble);
    }
    // skip test: tap during the strip entrance opens the fight at once, and only once
    if (vp === "412x915" && !RM && !SCENES[0][1].hub) {
      const [name, opts] = SCENES[0];
      await page.goto(origin, { waitUntil: "networkidle0" });
      await page.evaluate((DRIVER, opts) => { localStorage.clear(); const st = new Function("module", DRIVER + "; return eraDrive;")(undefined)(window.LD, opts); localStorage.setItem("lastDividend.v1", JSON.stringify({ penny: { offered: true, done: true, tipsOff: true, tips: {} }, audioOff: true, seenTutorial: true, coachDone: true, midRun: st })); }, DRIVER, opts);
      await page.goto(origin, { waitUntil: "networkidle0" });
      await click("#btn-continue");
      await page.waitForSelector(".of-room.ofx-go", { timeout: 4000 });
      await sleep(300);
      const t = Date.now();
      await page.mouse.click(vw / 2, vh / 2); await page.mouse.click(vw / 2, vh / 2);
      await page.waitForFunction(() => document.getElementById("door").classList.contains("on"), { timeout: 2000 }).catch(() => errors.push("skip failed"));
      await sleep(600);
      const n = await page.evaluate(() => ({ fi: !!document.getElementById("fi"), strip: !!document.querySelector(".of-room.ofx, #ofx-shield"), stages: document.querySelectorAll("#door .df-stage").length }));
      console.log("skip → fight in", Date.now() - t, "ms", JSON.stringify(n));
      if (n.fi || n.strip || n.stages !== 1) errors.push("skip state " + JSON.stringify(n));
    }
  }
  await browser.close(); if (server) server.close();
  console.log(errors.length ? "ERRORS\n" + errors.join("\n") : "no errors"); if (errors.length) process.exitCode = 1;
})().catch((e) => { console.error(e); process.exit(1); });
