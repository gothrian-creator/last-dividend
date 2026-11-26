#!/usr/bin/env node
"use strict";
/* Summit Lounge (concierge key rack) screenshot tour. SHOT_DIR, ONLY=800x1280|1280x800|390x844 */
const fs = require("fs"), http = require("http"), path = require("path");
const ROOT = path.resolve(__dirname, ".."), DIST = path.join(ROOT, "dist");
const OUT = process.env.SHOT_DIR || "/workspace/last-dividend/test-output/lounge-shots";
const puppeteer = require(process.env.PPTR || "/workspace/tools/node_modules/puppeteer-core");
const MIME = { ".html": "text/html; charset=utf-8", ".webp": "image/webp", ".png": "image/png", ".mp4": "video/mp4", ".js": "text/javascript", ".css": "text/css" };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const ONLY = process.env.ONLY || "";
(async () => {
  const server = http.createServer((req, res) => {
    let url = decodeURIComponent((req.url || "/").split("?")[0]); if (url === "/") url = "/index.html";
    const file = path.normalize(path.join(DIST, url));
    fs.readFile(file, (err, data) => { if (err) { res.writeHead(404); res.end(); return; } res.writeHead(200, { "Content-Type": MIME[path.extname(file)] || "application/octet-stream" }); res.end(data); });
  });
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  const origin = "http://127.0.0.1:" + server.address().port + "/";
  const browser = await puppeteer.launch({ executablePath: "/usr/bin/google-chrome", headless: "new", args: ["--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage"] });
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
  const hidePenny = () => page.evaluate(() => { const p = document.getElementById("penny"); if (p) p.hidden = true; });
  const META = { penny: { offered: true, done: true, tipsOff: true, tips: {} }, audioOff: true, seenTutorial: true, dividends: 240, finished: 3, wins: 1,
    owned: ["perk:golden", "cos:light:golden", "pack:esg"], equipped: ["golden"], cosmetics: { light: "golden" }, lifetime: { dividends: 420, runs: 3, wins: 1, quarters: 21 }, history: [] };
  for (const [vw, vh] of (process.env.VPS || "360x800,412x915,800x1280,1280x800").split(",").map((s) => s.split("x").map(Number))) {
    const vp = vw + "x" + vh;
    if (ONLY && ONLY !== vp) continue;
    await page.setViewport({ width: vw, height: vh, deviceScaleFactor: 1 });
    await page.goto(origin, { waitUntil: "networkidle0" });
    await page.evaluate((m) => { localStorage.clear(); localStorage.setItem("lastDividend.audio", "off"); localStorage.setItem("lastDividend.v1", JSON.stringify(m)); }, META);
    await page.reload({ waitUntil: "networkidle0" }); await ready(); await sleep(400);
    await click("#btn-boardroom"); await page.waitForSelector("#screen-boardroom.on .lg-rack"); await ready(); await sleep(1500); await hidePenny();
    const st = await page.evaluate(() => ({ tags: document.querySelectorAll("#screen-boardroom [data-lt]").length, act: document.querySelectorAll("#screen-boardroom .lt.ld-act").length, afford: document.querySelectorAll("#screen-boardroom .lt.lt-afford").length,
      board: /Boardroom/.test(document.getElementById("screen-boardroom").innerText) }));
    if (st.act !== st.afford || !st.afford) errors.push(vp + " highlight mismatch " + JSON.stringify(st));
    if (st.board) errors.push(vp + " Boardroom text still visible");
    await shot(vp, "01-lounge"); await noScroll(vp + " lounge");
    await click('[data-lt="perk:media"]'); await sleep(500); await hidePenny(); await shot(vp, "02-ledger-media");
    await sleep(1600); await hidePenny(); await shot(vp, "02b-ledger-hand");
    await click("#lg-sign"); await sleep(180); await shot(vp, "03-signing-thunk"); await sleep(700); await shot(vp, "04-after-purchase");
    const bal = await page.evaluate(() => JSON.parse(localStorage.getItem("lastDividend.v1")).dividends);
    if (bal !== 140) errors.push(vp + " balance after purchase " + bal);
    await click('[data-lt="exec:cassius"]'); await sleep(400); await shot(vp, "05-ledger-short-seat");
    await click('[data-lt="pack:esg"]'); await sleep(300); await click("[data-pack-toggle]"); await sleep(300); await shot(vp, "06-pack-toggle");
    const off = await page.evaluate(() => JSON.parse(localStorage.getItem("lastDividend.v1")).packsOff);
    if (!off || off.indexOf("esg") === -1) errors.push(vp + " pack toggle did not save " + JSON.stringify(off));
    await click('[data-lt="rolodex"]'); await sleep(300); await page.evaluate(() => { const h = document.querySelector('[data-hooks="decor"]'); if (h) h.scrollLeft = 9999; const r = document.getElementById("lg-rack"); if (r) r.scrollTop = 9999; }); await sleep(200);
    await shot(vp, "07-rolodex-decor-scrolled");
    await click('[data-lt="cos:light:sunrise"]'); await sleep(250); await click("[data-equip]"); await sleep(300);
    const cos = await page.evaluate(() => JSON.parse(localStorage.getItem("lastDividend.v1")).cosmetics.light);
    if (cos !== "sunrise") errors.push(vp + " equip failed " + cos);
    await click("#btn-br-back"); await sleep(300);
    if (!(await page.$("#screen-title.on"))) errors.push(vp + " back did not return to title");
  }
  await browser.close(); server.close();
  if (errors.length) { console.log("ERRORS\n" + errors.join("\n")); process.exit(1); }
  console.log("lounge-shots OK");
})();
