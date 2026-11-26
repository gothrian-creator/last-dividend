#!/usr/bin/env node
"use strict";
/* Journey title + menus + resource bar screenshot tour. SHOT_DIR, ONLY=800x1280|1280x800 */
const fs = require("fs"), http = require("http"), path = require("path");
const ROOT = path.resolve(__dirname, ".."), DIST = path.join(ROOT, "dist");
const OUT = process.env.SHOT_DIR || "/workspace/last-dividend/test-output/journey-shots";
const puppeteer = require(process.env.PPTR || "/workspace/tools/node_modules/puppeteer-core");
const MIME = { ".html": "text/html; charset=utf-8", ".webp": "image/webp", ".png": "image/png", ".mp4": "video/mp4", ".js": "text/javascript", ".css": "text/css" };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const ONLY = process.env.ONLY || "";
const SKIP = (process.env.SKIP || "").split(",");
(async () => {
  const server = http.createServer((req, res) => {
    let url = decodeURIComponent((req.url || "/").split("?")[0]); if (url === "/") url = "/index.html";
    const file = path.normalize(path.join(DIST, url));
    fs.readFile(file, (err, data) => { if (err) { res.writeHead(404); res.end(); return; } res.writeHead(200, { "Content-Type": MIME[path.extname(file)] || "application/octet-stream" }); res.end(data); });
  });
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  const origin = "http://127.0.0.1:" + server.address().port + "/";
  const browser = await puppeteer.launch({ executablePath: "/usr/bin/google-chrome", headless: "new", args: ["--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage", "--autoplay-policy=no-user-gesture-required"] });
  const page = await browser.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push("pageerror " + e.message));
  page.on("console", (m) => { if (m.type() === "error") errors.push("console " + m.text()); });
  page.on("response", (r) => { if (r.status() >= 400) errors.push("http " + r.status() + " " + r.url()); });
  fs.mkdirSync(OUT, { recursive: true });
  const shot = async (vp, name) => { const f = path.join(OUT, vp + "-" + name + ".png"); await page.screenshot({ path: f }); console.log("shot", f); };
  const click = (sel) => page.evaluate((s) => { const n = document.querySelector(s); if (!n) return false; n.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true, view: window })); return true; }, sel);
  const noScroll = async (label) => { const i = await page.evaluate(() => ({ sc: document.documentElement.scrollHeight, cl: window.innerHeight, w: document.documentElement.scrollWidth, cw: window.innerWidth })); if (i.sc > i.cl + 2 || i.w > i.cw + 2) errors.push("scroll " + label + " " + JSON.stringify(i)); };
  const ready = () => page.evaluate(() => Promise.all([...document.images].filter((i) => !i.complete).map((i) => new Promise((r) => { i.onload = i.onerror = r; })))).then(() => sleep(250));
  const META = (extra) => Object.assign({ penny: { offered: true, done: true, tipsOff: true, tips: {} }, audioOff: true, seenTutorial: true, dividends: 240, finished: 3, wins: 1,
    history: [
      { at: 1, seed: "481516", executiveId: "mara", result: "win", reason: "evac", title: "The hatch closed behind you", turn: 12, cash: 40, rating: 0, dividends: 120 },
      { at: 2, seed: "230942", executiveId: "reid", result: "lose", reason: "unrest", title: "The street came for the office", turn: 6, cash: 3, rating: 0, dividends: 30 },
      { at: 3, seed: "777001", executiveId: "mara", result: "lose", reason: "collapse", title: "The lights went out early", turn: 3, cash: 1, rating: 0, dividends: 12 }
    ] }, extra || {});
  for (const [vw, vh] of [[800, 1280], [1280, 800]]) {
    const vp = vw + "x" + vh;
    if (ONLY && ONLY !== vp) continue;
    await page.setViewport({ width: vw, height: vh, deviceScaleFactor: 1 });
    await page.goto(origin, { waitUntil: "networkidle0" });
    await page.evaluate((m) => { localStorage.clear(); localStorage.setItem("lastDividend.audio", "off"); localStorage.setItem("lastDividend.v1", JSON.stringify(m)); }, META());
    await page.reload({ waitUntil: "networkidle0" }); await ready(); await sleep(600);
    await shot(vp, "01-title"); await noScroll(vp + " title");
    if (await page.$(".jy-stop")) { await click(".jy-stop[data-era='2']"); await sleep(300); await shot(vp, "01b-title-postcard"); await click(".jy-stop[data-era='2']"); await sleep(150); }
    await click("#btn-how"); await sleep(400); await shot(vp, "02-howto"); await noScroll(vp + " howto");
    await click("#ht-rules"); await sleep(300); await shot(vp, "02b-rulebook"); await noScroll(vp + " rulebook");
    await click("#btn-skip"); await sleep(200); await click("#btn-done"); await sleep(300);
    await click("#btn-history"); await sleep(300); await shot(vp, "03-history"); await noScroll(vp + " history");
    await click("#btn-h-back"); await sleep(200);
    await click("#btn-prosp"); await sleep(400); await shot(vp, "04-prospectus"); await noScroll(vp + " prospectus");
    await click("#pr-close"); await sleep(200);
    await click("#btn-boardroom"); await sleep(400); await shot(vp, "05-boardroom"); await noScroll(vp + " boardroom");
    await click("#btn-br-back"); await sleep(300);
    await click("#btn-new"); await page.waitForSelector("#btn-start"); await sleep(500); await shot(vp, "06-exec"); await noScroll(vp + " exec");
    await click("#btn-start");
    for (const t of [120, 330, 600]) { await sleep(t === 120 ? 120 : t - 120); if (!SKIP.includes("fx")) await shot(vp, "07-transition-" + t); }
    await page.waitForSelector("#screen-desk.on"); await sleep(900);
    if (await page.$("#fy-boss-ok")) { await shot(vp, "08a-act-intro"); await click("#fy-boss-ok"); await sleep(500); }
    await page.evaluate(() => { const p = document.getElementById("penny"); if (p) p.hidden = true; });
    await ready(); await shot(vp, "08-hub"); await noScroll(vp + " hub");
    await page.waitForSelector(".desk .pin[data-deal]");
    await click(".desk .pin[data-deal]"); await sleep(400);
    await shot(vp, "09-dossier");
    if (!(await click("#btn-sign:not([disabled])"))) await click("#dossier .dz-choice:not([disabled])");
    await page.waitForFunction(() => { const d = document.getElementById("door"); return d && !d.hidden && d.classList.contains("on"); }, { timeout: 15000 }).catch(() => errors.push("no fight " + vp));
    await sleep(900); await ready();
    await page.evaluate(() => { const p = document.getElementById("penny"); if (p) p.hidden = true; });
    await shot(vp, "10-fight"); await noScroll(vp + " fight");
    await page.evaluate(() => { const c = document.querySelector(".df-hand .dc:not(.no)"); if (c) c.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true, view: window })); });
    await sleep(450); await shot(vp, "11-fight-delta");
  }
  // narrow phone check of hub chrome
  if (!ONLY) {
    await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 1 });
    await page.goto(origin, { waitUntil: "networkidle0" });
    await page.evaluate((m) => { localStorage.clear(); localStorage.setItem("lastDividend.v1", JSON.stringify(m)); }, META());
    await page.reload({ waitUntil: "networkidle0" }); await ready(); await sleep(400);
    await shot("390x844", "01-title"); await noScroll("390 title");
    await click("#btn-new"); await page.waitForSelector("#btn-start"); await sleep(300); await shot("390x844", "06-exec");
    await click("#btn-start"); await page.waitForSelector("#screen-desk.on"); await sleep(1000);
    if (await page.$("#fy-boss-ok")) { await click("#fy-boss-ok"); await sleep(500); }
    await page.evaluate(() => { const p = document.getElementById("penny"); if (p) p.hidden = true; });
    await shot("390x844", "08-hub");
  }
  await browser.close(); server.close();
  console.log(errors.length ? "ERRORS\n" + errors.join("\n") : "NO ERRORS");
  process.exit(errors.length ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(2); });
