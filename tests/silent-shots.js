#!/usr/bin/env node
"use strict";
/* A door fight with new faces: silent cards (caption + reaction), a pressure card (react line + Gallery), and the outcome ending. */
const fs = require("fs"), http = require("http"), path = require("path"), cp = require("child_process");
const ROOT = path.resolve(__dirname, "..");
const DIST = process.env.DIST || path.join(ROOT, "dist");
const OUT = process.env.SHOT_DIR || "/workspace/last-dividend/mockups/lore-2026-11-16";
const LIVE = process.env.LIVE || "";
const puppeteer = require(process.env.PPTR || "/workspace/tools/node_modules/puppeteer-core");
const MIME = { ".html": "text/html; charset=utf-8", ".webp": "image/webp", ".png": "image/png", ".js": "text/javascript", ".css": "text/css", ".jpg": "image/jpeg" };
const DRIVER = fs.readFileSync(path.join(__dirname, "era-driver.js"), "utf8");
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const SCENES = JSON.parse(process.env.SCENES || "null") || [
  ["benny-1978", { seed: "eras-0", exec: "mara", style: "any", stop: "fight:benny", hand: ["glance", "smirk", "stoop", "frontpage", "talking"] }],
  ["honoria-now", { seed: "eras-2", exec: "reid", style: "any", stop: "fight:honoria", hand: ["played", "watch", "ratio", "deepfake", "talking"] }]
];
const VPS = (process.env.VPS || "360x800,412x915,800x1280,1280x800").split(",").map((s) => s.split("x").map(Number));
const VIDEO = (process.env.VIDEO || "412x915").split(",");
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
  fs.mkdirSync(OUT, { recursive: true });
  const click = (sel) => page.evaluate((s) => { const n = document.querySelector(s); if (!n) return false; n.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true, view: window })); return true; }, sel);
  const shot = (vp, name, tag) => page.screenshot({ path: path.join(OUT, vp + "-" + name + "-" + tag + ".png") });
  for (const [vw, vh] of VPS) {
    const vp = vw + "x" + vh;
    await page.setViewport({ width: vw, height: vh, deviceScaleFactor: 1 });
    for (const [name, opts] of SCENES) {
      await page.goto(origin + (LIVE ? "?cb=" + Date.now() : ""), { waitUntil: "networkidle0" });
      const ok = await page.evaluate((DRIVER, opts) => {
        localStorage.clear();
        const st = new Function("module", DRIVER + "; return eraDrive;")(undefined)(window.LD, opts);
        if (!st || !st.fy || !st.fy.fight) return false;
        const fg = st.fy.fight, f = st.fy; let u = 9000;
        fg.hand = opts.hand.map((id) => { u++; f.deck.push({ u: u, id: id, up: false }); return u; });
        fg.inf = 6; fg.cb = null;
        localStorage.setItem("lastDividend.v1", JSON.stringify({ penny: { offered: true, done: true, tipsOff: true, tips: {} }, audioOff: true, seenTutorial: true, coachDone: true, midRun: st }));
        return st.turn + " " + fg.opp;
      }, DRIVER, opts);
      if (!ok) { errors.push("no state " + name); continue; }
      await page.goto(origin + (LIVE ? "?cb=" + Date.now() : ""), { waitUntil: "networkidle0" });
      const rec = VIDEO.includes(vp); let frames = [], cdp = null;
      if (rec) {
        cdp = await page.target().createCDPSession();
        cdp.on("Page.screencastFrame", async (f) => { frames.push({ d: f.data, t: f.metadata.timestamp }); try { await cdp.send("Page.screencastFrameAck", { sessionId: f.sessionId }); } catch (e) {} });
        await cdp.send("Page.startScreencast", { format: "jpeg", quality: 88, everyNthFrame: 1 });
      }
      await click("#btn-continue");
      if (await page.waitForSelector("#fy-boss-ok", { timeout: 900 }).catch(() => null)) await click("#fy-boss-ok");
      await page.waitForFunction(() => !document.getElementById("fi") && document.getElementById("door").classList.contains("on") && document.querySelector("#door .df-hand"), { timeout: 9000 }).catch(() => errors.push("fight never opened " + vp + " " + name));
      await sleep(1300);
      await shot(vp, name, "1-open");
      const playId = async (id) => {
        const u = await page.evaluate((id) => { const b = [...document.querySelectorAll(".df-hand [data-u]")].find((n) => +n.getAttribute("data-u") > 9000 && n.querySelector(".dc-art") && n.outerHTML.indexOf("card-" + id + ".webp") !== -1); return b ? b.getAttribute("data-u") : null; }, id);
        if (!u) { errors.push("card not in hand " + id + " " + vp); return false; }
        await click('.df-hand [data-u="' + u + '"]'); return true;
      };
      await playId(opts.hand[0]); await sleep(650); await shot(vp, name, "2-silent");
      const cap = await page.evaluate(() => { const c = document.getElementById("sc-cap"); return c ? c.className + " | " + c.textContent : null; });
      if (!cap) errors.push("no caption " + vp + " " + name);
      await playId(opts.hand[2]); await sleep(700); await shot(vp, name, "3-react");
      const bub = await page.evaluate(() => { const b = document.getElementById("sc-bubble"), g = document.querySelector(".df-gal"); return (b ? b.textContent : "-") + " | gal " + (g ? g.getAttribute("aria-valuenow") : "?"); });
      await playId(opts.hand[1]); await sleep(650); await shot(vp, name, "4-silent2");
      /* finish: knock Scrutiny down and end the round so the outcome ending shows */
      await page.evaluate(() => { });
      await click("#df-end"); await sleep(1200);
      for (let i = 0; i < 4; i++) { const done = await page.evaluate(() => !!document.querySelector(".df-result")); if (done) break; for (let k = 0; k < 5; k++) { const b = await page.$(".df-hand .dc:not(.no)"); if (!b) break; await b.evaluate((n) => n.dispatchEvent(new MouseEvent("click", { bubbles: true }))); await sleep(350); if (await page.evaluate(() => !!document.querySelector(".df-result"))) break; } if (await page.evaluate(() => !!document.querySelector(".df-result"))) break; await click("#df-end"); await sleep(1100); }
      await sleep(900); await shot(vp, name, "5-end");
      const end = await page.evaluate(() => { const r = document.querySelector(".sc-ending"), s = document.querySelector(".sc-stamp"), b = document.getElementById("sc-bubble"); return (s ? s.textContent : "-") + " | " + (r ? r.textContent : "-") + " | " + (b ? b.textContent : "-"); });
      if (rec) {
        await sleep(300); await cdp.send("Page.stopScreencast");
        const dir = fs.mkdtempSync("/tmp/ss-"); let list = "";
        frames.forEach((f, i) => { const fn = path.join(dir, String(i).padStart(4, "0") + ".jpg"); fs.writeFileSync(fn, Buffer.from(f.d, "base64")); const nx = frames[i + 1]; list += "file '" + fn + "'\nduration " + (nx ? Math.max(0.001, nx.t - f.t) : 0.5).toFixed(3) + "\n"; });
        list += "file '" + path.join(dir, String(frames.length - 1).padStart(4, "0") + ".jpg") + "'\n";
        fs.writeFileSync(path.join(dir, "list.txt"), list);
        const mp4 = path.join(OUT, vp + "-" + name + ".mp4");
        cp.execSync("ffmpeg -y -loglevel error -f concat -safe 0 -i " + dir + "/list.txt -vf \"scale=trunc(iw/2)*2:trunc(ih/2)*2,fps=30\" -pix_fmt yuv420p -c:v libx264 -crf 20 " + mp4);
        console.log("mp4", mp4, frames.length + " frames");
      }
      console.log(vp, name, ok, "\n  cap:", cap, "\n  react:", bub, "\n  end:", end);
    }
  }
  await browser.close(); if (server) server.close();
  console.log(errors.length ? "ERRORS\n" + errors.join("\n") : "no errors");
})().catch((e) => { console.error(e); process.exit(1); });
