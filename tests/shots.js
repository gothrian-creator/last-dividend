#!/usr/bin/env node
"use strict";
/* Screenshot tour for the matte fight overhaul: office hub, home fight, away fight, boss fight, mid-animation, win. */
const fs = require("fs"), http = require("http"), path = require("path");
const ROOT = path.resolve(__dirname, ".."), DIST = path.join(ROOT, "dist");
const OUT = process.env.SHOT_DIR || "/workspace/last-dividend/test-output/shots";
const puppeteer = require(process.env.PPTR || "/workspace/tools/node_modules/puppeteer-core");
const MIME = { ".html": "text/html; charset=utf-8", ".webp": "image/webp", ".png": "image/png", ".js": "text/javascript", ".css": "text/css" };
function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }
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
  page.on("requestfailed", (r) => errors.push("reqfail " + r.url()));
  page.on("response", (r) => { if (r.status() >= 400) errors.push("http " + r.status() + " " + r.url()); });
  fs.mkdirSync(OUT, { recursive: true });
  const shot = async (vp, name) => { const f = path.join(OUT, vp + "-" + name + ".png"); await page.screenshot({ path: f }); console.log("shot", f); };
  const click = (sel) => page.evaluate((s) => { const n = document.querySelector(s); if (!n) return false; n.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true, view: window })); return true; }, sel);
  const noScroll = async (label) => { const i = await page.evaluate(() => ({ sc: document.documentElement.scrollHeight, cl: window.innerHeight, w: document.documentElement.scrollWidth, cw: window.innerWidth })); if (i.sc > i.cl + 2 || i.w > i.cw + 2) errors.push("scroll " + label + " " + JSON.stringify(i)); };
  const imagesReady = () => page.evaluate(() => Promise.all([...document.images].filter((i) => !i.complete).map((i) => new Promise((r) => { i.onload = i.onerror = r; })))).then(() => sleep(120));

  for (const [vw, vh] of [[800, 1280], [1280, 800]]) {
    const vp = vw + "x" + vh;
    if (ONLY && ONLY !== vp) continue;
    await page.setViewport({ width: vw, height: vh, deviceScaleFactor: 1 });
    await page.goto(origin, { waitUntil: "networkidle0" });
    await page.evaluate(() => {
      localStorage.clear();
      localStorage.setItem("lastDividend.audio", "off");
      const KEY = "lastDividend.v1";
      localStorage.setItem(KEY, JSON.stringify({ penny: { offered: true, done: true, tipsOff: true, tips: {} }, audioOff: true, seenTutorial: true }));
    });
    await page.reload({ waitUntil: "networkidle0" });
    await click("#btn-new"); await page.waitForSelector("#btn-start"); await click("#btn-start");
    await page.waitForSelector("#screen-desk.on"); await sleep(500);
    if (await page.$("#fy-boss-ok")) { await click("#fy-boss-ok"); await sleep(500); }
    await page.evaluate(() => { const p = document.getElementById("penny"); if (p) p.hidden = true; });
    await imagesReady();
    await shot(vp, "01-office-hub"); await noScroll(vp + " hub");
    await page.waitForSelector(".desk .pin[data-deal]");
    await click(".desk .pin[data-deal]"); await sleep(400);
    if (!(await click("#btn-sign:not([disabled])"))) await click("#dossier .dz-choice:not([disabled])");
    await page.waitForFunction(() => { const d = document.getElementById("door"); return d && !d.hidden && d.classList.contains("on"); }, { timeout: 15000 });
    await sleep(900); await imagesReady();
    await page.evaluate(() => { const p = document.getElementById("penny"); if (p) p.hidden = true; });
    await shot(vp, "02-home-fight"); await noScroll(vp + " home fight");
    const saved = await page.evaluate(() => JSON.parse(localStorage.getItem("lastDividend.v1")).midRun);
    // mid-animation frames
    await page.evaluate(() => { const c = document.querySelector(".df-hand .dc:not(.no)"); if (c) c.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true, view: window })); });
    await sleep(140); await shot(vp, "03-anim-card-flying");
    await sleep(230); await shot(vp, "04-anim-hit");
    // play until done
    for (let i = 0; i < 20; i++) {
      const st = await page.evaluate(() => {
        const d = document.getElementById("door"); if (!d || d.hidden) return "gone";
        if (d.querySelector("#df-close")) return "done";
        const c = d.querySelector(".df-hand .dc:not(.no)"); if (c) { c.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true, view: window })); return "play"; }
        const e = d.querySelector("#df-end"); if (e) { e.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true, view: window })); return "end"; }
        return "wait";
      });
      if (st === "end") { await sleep(240); await shot(vp, "05-anim-attack"); }
      await sleep(650);
      if (st === "done" || st === "gone") break;
    }
    await sleep(500); await shot(vp, "06-fight-result"); await noScroll(vp + " result");
    // constructed fights from the saved Q1 fight
    const variants = [
      ["07-away-regulator", { enc: "regulator", name: "The Regulator", sub: "On loan from industry", venue: "away" }],
      ["08-boss-shortseller", { enc: "shortseller", name: "Short-Seller Report", sub: "Act I boss", venue: "away", boss: "shortseller", q: 4 }],
      ["09-boss-crash", { enc: "crash", name: "Market Crash", sub: "Act II boss", venue: "away", boss: "crash", q: 8 }],
      ["10-boss-earnings", { enc: "earnings", name: "The Earnings Call", sub: "Act I boss", venue: "away", boss: "earnings", q: 4 }],
      ["11-elite-hearing", { enc: "hearing", name: "Senate Hearing", sub: "Elite", venue: "away", elite: true, q: 6 }],
      ["12-boss-strike", { enc: "strike", name: "General Strike", sub: "Act II boss", venue: "away", boss: "strike", q: 8 }],
      ["13-lobby-protest", { enc: "protest", name: "The Protest", sub: "They brought a drum", venue: "lobby", q: 3 }],
      ["14-away-journalist", { enc: "journalist", name: "The Journalist", sub: "Has your old emails", venue: "away", q: 2 }],
      ["15-away-holdout", { enc: "rival", name: "The Holdout", sub: "The owner won't sell", venue: "away", q: 2 }],
      ["16-boss-bid", { enc: "bid", name: "Hostile Takeover Bid", sub: "Act II boss", venue: "away", boss: "bid", q: 8 }]
    ];
    for (const [name, patch] of variants) {
      await page.evaluate((saved, patch) => {
        const st = JSON.parse(JSON.stringify(saved));
        Object.assign(st.fy.fight, patch);
        const KEY = "lastDividend.v1"; const m = JSON.parse(localStorage.getItem(KEY)); m.midRun = st; localStorage.setItem(KEY, JSON.stringify(m));
      }, saved, patch);
      await page.goto(origin, { waitUntil: "networkidle0" });
      await click("#btn-continue");
      await page.waitForFunction(() => { const d = document.getElementById("door"); return d && !d.hidden && d.classList.contains("on"); }, { timeout: 15000 });
      await page.evaluate(() => { const p = document.getElementById("penny"); if (p) p.hidden = true; });
      await sleep(900); await imagesReady();
      await shot(vp, name); await noScroll(vp + " " + name);
      if (name.startsWith("07")) { await click("#df-end"); await sleep(250); await shot(vp, "05-anim-attack"); await sleep(1000); }
    }
  }
  await browser.close(); server.close();
  const u = [...new Set(errors)];
  if (u.length) { console.error("ISSUES\n" + u.join("\n")); process.exit(1); }
  console.log("SHOTS OK");
})().catch((e) => { console.error(e); process.exit(1); });
