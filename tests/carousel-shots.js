#!/usr/bin/env node
"use strict";
/* Executive poster carousel: swipe, locked seat, perk tooltip, rating + perks persist into the run. SHOT_DIR, ONLY=800x1280|1280x800 */
const fs = require("fs"), http = require("http"), path = require("path");
const ROOT = path.resolve(__dirname, ".."), DIST = path.join(ROOT, "dist");
const OUT = process.env.SHOT_DIR || "/workspace/last-dividend/mockups/carousel-2026-11-14";
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
  const ready = () => page.evaluate(() => Promise.all([...document.images].filter((i) => !i.complete).map((i) => new Promise((r) => { i.onload = i.onerror = r; })))).then(() => sleep(250));
  const noScroll = async (label) => { const i = await page.evaluate(() => ({ sh: document.documentElement.scrollHeight, h: window.innerHeight, sw: document.documentElement.scrollWidth, w: window.innerWidth })); if (i.sh > i.h + 1 || i.sw > i.w + 1) errors.push("scroll " + label + " " + JSON.stringify(i)); };
  const sel = () => page.evaluate(() => { const p = document.querySelector(".cx-poster.on"); return p && p.getAttribute("data-id"); });
  /* Nothing important may spill outside its box or the viewport */
  const clipCheck = (label) => page.evaluate((label) => {
    const bad = [];
    const vw = window.innerWidth, vh = window.innerHeight;
    document.querySelectorAll("#screen-exec .cx-side button, #screen-exec .cx-side input, .cx-poster.on .cx-plate, .cx-poster.on .cx-kit, .cx-arrow, .cx-dot").forEach((n) => {
      const r = n.getBoundingClientRect(); if (!r.width) return;
      if (r.left < -1 || r.top < -1 || r.right > vw + 1 || r.bottom > vh + 1) bad.push(label + " offscreen " + (n.id || n.className) + " " + JSON.stringify([r.left, r.top, r.right, r.bottom].map(Math.round)));
    });
    document.querySelectorAll("#screen-exec .cx-side b, #screen-exec .cx-side small, .cx-poster.on .cx-kit b, .cx-poster.on h3").forEach((n) => { if (n.scrollWidth > n.clientWidth + 2 && getComputedStyle(n).textOverflow !== "ellipsis") bad.push(label + " text overflow " + n.textContent.slice(0, 30)); });
    return bad;
  }, label);
  const META = { penny: { offered: true, done: true, tipsOff: true, tips: {} }, audioOff: true, seenTutorial: true, dividends: 240, finished: 3, wins: 1,
    owned: ["perk:golden", "perk:media", "slot:2", "exec:reid", "exec:imani", "exec:julian"], equipped: ["golden"], ratingByExec: { mara: 3, reid: 1 }, xp: { mara: 260, reid: 40 }, bestRating: { mara: 2 }, history: [] };
  for (const [vw, vh] of [[800, 1280], [1280, 800]]) {
    const vp = vw + "x" + vh;
    if (ONLY && ONLY !== vp) continue;
    await page.setViewport({ width: vw, height: vh, deviceScaleFactor: 1 });
    await page.goto(origin, { waitUntil: "networkidle0" });
    await page.evaluate((m) => { localStorage.clear(); localStorage.setItem("lastDividend.audio", "off"); localStorage.setItem("lastDividend.v1", JSON.stringify(m)); }, META);
    await page.reload({ waitUntil: "networkidle0" }); await ready();
    await click("#btn-new"); await page.waitForSelector("#cx-stage"); await ready(); await sleep(1900);
    await page.evaluate(() => { const p = document.getElementById("penny"); if (p) p.hidden = true; });
    const h0 = await page.evaluate(() => ({ posters: document.querySelectorAll(".cx-poster").length, act: !!document.querySelector("#btn-start.ld-act"), hand: !!document.querySelector(".ld-arrow:not([hidden])"), kit: document.querySelectorAll(".cx-poster.on .cx-kit-i .ico").length, tags: document.querySelectorAll(".cx-tag").length, stamp: (document.querySelector(".cx-stamp b") || {}).textContent }));
    if (h0.posters !== 6 || !h0.act || !h0.hand || h0.kit !== 3 || h0.tags !== 7) errors.push(vp + " picker basics " + JSON.stringify(h0));
    console.log(vp, "basics", JSON.stringify(h0));
    await shot(vp, "01-picker"); await noScroll(vp + " picker"); errors.push(...(await clipCheck(vp + " picker")));
    /* Swipe left with a real pointer drag */
    const before = await sel();
    const st = await page.evaluate(() => { const r = document.getElementById("cx-stage").getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; });
    await page.mouse.move(st.x + 120, st.y); await page.mouse.down();
    for (let k = 1; k <= 8; k++) { await page.mouse.move(st.x + 120 - k * 30, st.y + k); await sleep(16); }
    if (vp === "800x1280") await shot(vp, "02a-mid-swipe");
    await page.mouse.up(); await sleep(600);
    const after = await sel();
    if (!before || before === after) errors.push(vp + " swipe did not change exec " + before + " -> " + after);
    console.log(vp, "swipe", before, "->", after);
    await shot(vp, "02-swiped"); await noScroll(vp + " swiped");
    /* Keyboard arrows */
    await page.keyboard.press("ArrowRight"); await sleep(500);
    const kb = await sel(); if (kb === after) errors.push(vp + " keyboard did not move");
    /* Locked exec: Soren */
    await page.evaluate(() => window.LD.selectExec("soren")); await sleep(700); await ready();
    const lk = await page.evaluate(() => ({ id: document.querySelector(".cx-poster.on").getAttribute("data-id"), locked: document.querySelector(".cx-poster.on").classList.contains("locked"), dis: document.getElementById("btn-start").disabled, how: document.querySelector("#btn-start small").textContent, tag: !!document.querySelector(".cx-poster.on .cx-locktag") }));
    if (!lk.locked || !lk.dis || !/350/.test(lk.how) || !lk.tag) errors.push(vp + " locked exec " + JSON.stringify(lk));
    await sleep(1500);
    if (await page.evaluate(() => !!document.querySelector(".ld-arrow:not([hidden])"))) errors.push(vp + " hand shows on a locked exec");
    await shot(vp, "03-locked"); errors.push(...(await clipCheck(vp + " locked")));
    /* Back to Mara: rating + perk tooltip + equip */
    await page.evaluate(() => window.LD.selectExec("mara")); await sleep(600);
    await click('.cx-pip[data-rating="2"]'); await sleep(200);
    await click('.cx-tag[data-perk-tag="media"]'); await sleep(300);
    const tip = await page.evaluate(() => { const t = document.querySelector(".cx-tip"); return t && t.textContent; });
    if (!tip || !/Media Darling/.test(tip) || !/Equip/.test(tip)) errors.push(vp + " perk tooltip " + tip);
    await shot(vp, "04-perk-tip"); errors.push(...(await clipCheck(vp + " tip")));
    await click(".cx-tip-btn[data-perk]"); await sleep(300);
    await click('.cx-tag[data-perk-tag="offshore"]'); await sleep(300);
    const tip2 = await page.evaluate(() => { const t = document.querySelector(".cx-tip"); return t && t.textContent; });
    if (!tip2 || !/140/.test(tip2)) errors.push(vp + " locked perk tooltip " + tip2);
    await shot(vp, "05-perk-locked-tip");
    await click("#cx-tip-x"); await sleep(200);
    const pre = await page.evaluate(() => ({ stamp: document.querySelector(".cx-stamp b").textContent, slots: document.querySelector(".cx-slots").textContent, eq: [...document.querySelectorAll(".cx-tag.on")].map((t) => t.getAttribute("data-perk-tag")) }));
    if (pre.stamp !== "AA" || pre.slots !== "2/2" || pre.eq.join() !== "golden,media") errors.push(vp + " loadout before depart " + JSON.stringify(pre));
    /* Rating step: next is AAA..A unlocked (3); stepping beyond is refused */
    await click("#cx-r-next"); await sleep(150); await click("#cx-r-next"); await sleep(150);
    const capped = await page.evaluate(() => document.querySelector(".cx-stamp b").textContent);
    if (capped !== "A") errors.push(vp + " rating cap " + capped);
    await click("#cx-r-prev"); await sleep(150);
    await sleep(1500); await shot(vp, "06-ready-hand");
    await click("#btn-start");
    await page.waitForSelector("#screen-desk.on", { timeout: 15000 });
    await sleep(500);
    const run = await page.evaluate(() => { const s = JSON.parse(localStorage.getItem("lastDividend.v1")).midRun; return s && { exec: s.executiveId, rating: s.rating, perks: s.perks }; });
    if (!run || run.exec !== "mara" || run.rating !== 2 || (run.perks || []).join() !== "golden,media") errors.push(vp + " run did not keep loadout " + JSON.stringify(run));
    console.log(vp, "run", JSON.stringify(run));
  }
  if (!ONLY) {
    await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 1 });
    await page.goto(origin, { waitUntil: "networkidle0" });
    await page.evaluate((m) => { localStorage.clear(); localStorage.setItem("lastDividend.v1", JSON.stringify(m)); }, META);
    await page.reload({ waitUntil: "networkidle0" }); await ready();
    await click("#btn-new"); await page.waitForSelector("#cx-stage"); await ready(); await sleep(400);
    await shot("390x844", "01-picker"); await noScroll("390 picker");
  }
  await browser.close(); server.close();
  const u = [...new Set(errors)];
  if (u.length) { console.error("ISSUES\n" + u.join("\n")); process.exit(1); }
  console.log("CAROUSEL SHOTS OK");
})().catch((e) => { console.error(e); process.exit(2); });
