#!/usr/bin/env node
"use strict";
/* Seal bonus shots: the vault footer preview before sealing, and the recap + Shareholder Letter after a Fortress seal. */
const fs = require("fs"), http = require("http"), path = require("path");
const ROOT = path.resolve(__dirname, "..");
const DIST = process.env.DIST || path.join(ROOT, "dist");
const OUT = process.env.SHOT_DIR || "/workspace/last-dividend/mockups/seal-bonus-2026-11-16";
const puppeteer = require(process.env.PPTR || "/workspace/tools/node_modules/puppeteer-core");
const MIME = { ".html": "text/html; charset=utf-8", ".webp": "image/webp", ".png": "image/png", ".js": "text/javascript", ".css": "text/css", ".jpg": "image/jpeg", ".woff2": "font/woff2" };
const DRIVER = fs.readFileSync(path.join(__dirname, "era-driver.js"), "utf8");
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
  const server = http.createServer((req, res) => {
    let url = decodeURIComponent((req.url || "/").split("?")[0]); if (url === "/") url = "/index.html";
    const file = path.normalize(path.join(DIST, url));
    fs.readFile(file, (err, data) => { if (err) { res.writeHead(404); res.end(); return; } res.writeHead(200, { "Content-Type": MIME[path.extname(file)] || "application/octet-stream" }); res.end(data); });
  });
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  const origin = "http://127.0.0.1:" + server.address().port + "/";
  const browser = await puppeteer.launch({ executablePath: "/usr/bin/google-chrome", headless: "new", args: ["--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage"] });
  const page = await browser.newPage(); const errors = [];
  page.on("pageerror", (e) => errors.push("pageerror " + e.message));
  fs.mkdirSync(OUT, { recursive: true });
  const SAVE = { penny: { offered: true, done: true, tipsOff: true, tips: {} }, audioOff: true, seenTutorial: true, coachDone: true };
  for (const [vw, vh] of [[412, 915], [1280, 800]]) {
    const vp = vw + "x" + vh;
    await page.setViewport({ width: vw, height: vh, deviceScaleFactor: 1 });
    /* 1. Vault before sealing: two rooms overbuilt, two at Lv 2. */
    await page.goto(origin, { waitUntil: "networkidle0" });
    const ok = await page.evaluate((DRIVER, SAVE) => {
      localStorage.clear();
      const LD = window.LD, st = new Function("module", DRIVER + "; return eraDrive;")(undefined)(LD, { seed: "seal-7", exec: "cassius", style: "any", stop: "deal:10", build: true });
      if (!st) return false;
      LD.SYSTEMS.forEach((x, i) => { st.bunker[x.id].level = i < 2 ? 3 : 2; st.bunker[x.id].quality = "sound"; });
      /* fixture: the quarter's deal is signed, so the bunker order and the blast door are live */
      const s2 = st; s2.phase = "bunker"; s2.dealPickedThisTurn = true; s2.lastDealId = s2.offered[0];
      localStorage.setItem("lastDividend.v1", JSON.stringify(Object.assign({}, SAVE, { midRun: s2 })));
      return true;
    }, DRIVER, SAVE);
    if (!ok) { errors.push("no state"); continue; }
    await page.goto(origin, { waitUntil: "networkidle0" });
    await page.evaluate(() => { const b = document.getElementById("btn-continue"); if (b) b.click(); });
    await sleep(1200);
    await page.evaluate(() => { const b = [...document.querySelectorAll("button")].find((x) => /^Understood$/.test(x.textContent.trim()) && x.getBoundingClientRect().width > 0); if (b) b.click(); const p = document.getElementById("penny"); if (p) p.hidden = true; });
    await page.evaluate(() => document.getElementById("bunker-card").click()); await sleep(1000);
    await page.screenshot({ path: path.join(OUT, vp + "-vault-footer.png") });
    const foot = await page.evaluate(() => (document.querySelector(".bp-seal-bonus") || {}).textContent || "");
    if (!/Lv 3 rooms/.test(foot)) errors.push("no footer bonus " + vp);
    await page.click('.bk-view [data-spot="seal"]').catch(() => errors.push("no blast door " + vp)); await sleep(800);
    await page.screenshot({ path: path.join(OUT, vp + "-vault-blastdoor.png") });
    const door = await page.evaluate(() => ({ note: (document.querySelector("#bk-panel .bp-seal-bonus") || {}).textContent || "", seal: !!document.getElementById("btn-seal") }));
    console.log(vp, "footer:", foot, "| blast door:", JSON.stringify(door));
    /* 2. After a Fortress seal (all 4 Lv 3) and a partial one (2 rooms): recap final + Shareholder Letter. */
    for (const n of [4, 2]) {
      await page.goto(origin, { waitUntil: "networkidle0" });
      await page.evaluate((SAVE) => { localStorage.clear(); localStorage.setItem("lastDividend.v1", JSON.stringify(SAVE)); }, SAVE);
      await page.goto(origin + "?recap=cassius&end=win&final=1&lv3=" + n, { waitUntil: "networkidle0" }); await sleep(2500);
      const bunk = await page.$(".rc-seal-bonus");
      if (bunk) await page.evaluate(() => document.querySelector(".rc-seal-bonus").scrollIntoView({ block: "center" }));
      await sleep(600);
      await page.screenshot({ path: path.join(OUT, vp + "-recap-lv3x" + n + ".png") });
      const rc = await page.evaluate(() => ({ stamp: (document.querySelector(".rc-seal-bonus") || {}).textContent || "", tag: [...document.querySelectorAll(".rc-tags li")].map((l) => l.textContent).join(" | ") }));
      if (n === 4 && !/Gilded Vault/.test(rc.tag)) errors.push("no Gilded Vault unlock tag " + vp);
      if (!rc.stamp) errors.push("no recap bonus " + vp + " " + n);
      const bl = await page.evaluate(() => { const b = [...document.querySelectorAll("button")].find((x) => /letter/i.test(x.textContent)); if (b) { b.click(); return true; } return false; });
      await sleep(1400);
      const lt = await page.evaluate(() => { const t = [...document.querySelectorAll("#screen-end li, #screen-end tr, #screen-end .sl-line")].map((e) => e.textContent.replace(/\s+/g, " ").trim()).filter((t) => /Overbuilt|Fortress/.test(t)); const h = document.querySelector("#screen-end h1, #screen-end h2"); return { lines: t, head: h ? h.textContent : "" }; });
      await page.evaluate(() => { const e = [...document.querySelectorAll("#screen-end *")].find((x) => /Overbuilt rooms/.test(x.textContent) && x.children.length < 4); if (e) e.scrollIntoView({ block: "center" }); });
      await sleep(400);
      await page.screenshot({ path: path.join(OUT, vp + "-letter-lv3x" + n + ".png") });
      console.log(vp, "lv3x" + n, "recap:", rc.stamp, "| tags:", rc.tag, "| letter button:", bl, JSON.stringify(lt));
    }
  }
  await browser.close(); server.close();
  if (errors.length) { console.error("ERRORS\n" + errors.join("\n")); process.exit(1); }
  console.log("SEAL BONUS SHOTS OK");
})();
