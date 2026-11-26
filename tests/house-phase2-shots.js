#!/usr/bin/env node
"use strict";
/* Phase 2 chair-turn shots. Flag ON via ?house=1 and localStorage. Live default remains off. */
const fs = require("fs"), http = require("http"), path = require("path");
const { execFileSync } = require("child_process");
const ROOT = path.resolve(__dirname, "..");
const DIST = process.env.DIST || path.join(ROOT, "dist");
const OUT = process.env.SHOT_DIR || "/workspace/last-dividend/test-output/house-phase2-shots";
const puppeteer = require(process.env.PPTR || "/workspace/tools/node_modules/puppeteer-core");
const MIME = { ".html": "text/html; charset=utf-8", ".webp": "image/webp", ".png": "image/png", ".jpg": "image/jpeg", ".woff2": "font/woff2", ".js": "text/javascript", ".css": "text/css" };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const SAVE = { penny: { offered: true, done: true, tipsOff: true, tips: {} }, audioOff: true, seenTutorial: true, coachDone: true };

function makeStates(LD) {
  function base(seed) {
    const st = LD.createRun({ seed: seed || "phase2", executiveId: "mara", rating: 0, perks: [], packs: [], level: 1, ruleset: "house" });
    st.phase = "bunker";
    st.dealPickedThisTurn = true;
    st.turn = 6;
    return st;
  }
  function admitAll(st) {
    ["helen", "tom", "lila", "nia", "eli"].forEach((id) => {
      st.bunkerActedThisTurn = false; st.ap = LD.BUNKER_AP;
      const r = LD.houseAdmit(st, { id: id });
      if (!r.ok) throw new Error("admit " + id + ": " + r.error);
      st = r.state;
    });
    st.bunkerActedThisTurn = true;
    st.house.stores = 6;
    return st;
  }
  const full = admitAll(base("phase2-full"));
  const leave = JSON.parse(JSON.stringify(full));
  leave.bunkerActedThisTurn = false; leave.ap = LD.BUNKER_AP;
  const peek = LD.createRun({ seed: "phase2-peek", executiveId: "mara", rating: 0, perks: [], packs: [], level: 1, ruleset: "house" });
  peek.phase = "deal";
  peek.dealPickedThisTurn = false;
  const arrival = base("phase2-arr");
  arrival.turn = 4;
  arrival.house.arrival = { id: "helen", q: 4 };
  arrival.bunkerActedThisTurn = false;
  let word = admitAll(base("phase2-word"));
  word.bunkerActedThisTurn = false;
  word.ap = LD.BUNKER_AP;
  word.house.promises = [{
    id: "p1", defId: "helen-parts", residentId: "helen",
    text: "The generator gets its bearings by the due quarter. You pay for the crate.",
    sinceQ: 4, dueQ: word.turn, postponed: false, status: "open"
  }];
  const fail = admitAll(base("phase2-fail"));
  fail.house.rooms.power.quality = "cheap";
  fail.house.residents = fail.house.residents.filter((r) => r.id !== "helen");
  fail.house.rooms.power.by = "start";
  fail.bunkerActedThisTurn = true;
  return { full, leave, peek, arrival, word, fail };
}

(async () => {
  let server = null, origin = process.env.ORIGIN;
  if (!origin) {
    server = http.createServer((req, res) => {
      let url = decodeURIComponent((req.url || "/").split("?")[0]); if (url === "/") url = "/index.html";
      const file = path.normalize(path.join(DIST, url));
      if (!file.startsWith(DIST)) { res.writeHead(403); res.end(); return; }
      fs.readFile(file, (err, data) => { if (err) { res.writeHead(404); res.end(); return; } res.writeHead(200, { "Content-Type": MIME[path.extname(file)] || "application/octet-stream" }); res.end(data); });
    });
    await new Promise((r) => server.listen(0, "127.0.0.1", r));
    origin = "http://127.0.0.1:" + server.address().port + "/";
  }
  const browser = await puppeteer.launch({ executablePath: "/usr/bin/google-chrome", headless: "new", args: ["--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage"] });
  const page = await browser.newPage();
  const errors = [], missing = [];
  page.on("pageerror", (e) => errors.push("pageerror " + e.message));
  page.on("console", (m) => { if (m.type() === "error") errors.push("console " + m.text()); });
  page.on("response", (r) => { if (r.status() >= 400 && /assets\//.test(r.url())) missing.push(r.status() + " " + r.url()); });
  fs.mkdirSync(OUT, { recursive: true });

  async function boot(vp, midRun) {
    await page.setViewport({ width: vp[0], height: vp[1], deviceScaleFactor: 1 });
    await page.goto(origin + "?house=1&cb=" + Date.now(), { waitUntil: "networkidle0" });
    await page.evaluate((mid, save) => {
      localStorage.clear();
      if (window.LD && LD.setDevHouseFlag) LD.setDevHouseFlag(true);
      else if (window.LD) LD.HOUSE_RULES = true;
      localStorage.setItem("lastDividend.house.v1", JSON.stringify(Object.assign({}, save, { midRun: mid })));
    }, midRun, SAVE);
    await page.goto(origin + "?house=1&cb=" + Date.now(), { waitUntil: "networkidle0" });
    await page.evaluate(() => {
      const b = document.getElementById("btn-continue");
      if (b) b.click();
    });
    await sleep(800);
    await page.evaluate(() => {
      const b = [...document.querySelectorAll("button")].find((x) => /^Understood$/.test((x.textContent || "").trim()) && x.getBoundingClientRect().width > 0);
      if (b) b.click();
      const p = document.getElementById("penny"); if (p) p.hidden = true;
    });
    await sleep(200);
  }

  const VPS = [[360, 800], [412, 915], [800, 1280], [1280, 800]];

  await page.setViewport({ width: 800, height: 1280, deviceScaleFactor: 1 });
  await page.goto(origin + "?house=1&cb=" + Date.now(), { waitUntil: "networkidle0" });
  const pack = await page.evaluate((src) => {
    if (window.LD && LD.setDevHouseFlag) LD.setDevHouseFlag(true);
    return (new Function("LD", src + "; return makeStates(LD);"))(window.LD);
  }, makeStates.toString());
  if (!pack || !pack.full) errors.push("failed to build house states");

  for (const vp of VPS) {
    const tag = vp[0] + "x" + vp[1];
    await boot(vp, pack.full);
    const rail = await page.evaluate(() => !!document.getElementById("bunker-card"));
    if (rail) errors.push("rail Bunker button still present on house run " + tag);
    await page.evaluate(() => { if (LD.houseUi) LD.houseUi.seek(1); });
    await sleep(280);
    await page.screenshot({ path: path.join(OUT, tag + "-after-full.png") });

    await boot(vp, pack.fail);
    await page.evaluate(() => { if (LD.houseUi) LD.houseUi.seek(1); });
    await sleep(250);
    await page.screenshot({ path: path.join(OUT, tag + "-after-static.png") });

    await boot(vp, pack.leave);
    await page.evaluate(() => {
      if (!LD.houseUi) return;
      LD.houseUi.seek(1);
      const nia = document.querySelector('#house-root [data-leave="nia"]');
      if (nia) nia.click();
    });
    await sleep(250);
    await page.screenshot({ path: path.join(OUT, tag + "-leave-nia.png") });

    await boot(vp, pack.arrival);
    await page.evaluate(() => { if (LD.houseUi) LD.houseUi.seek(1); });
    await sleep(250);
    await page.screenshot({ path: path.join(OUT, tag + "-arrival.png") });

    await boot(vp, pack.word);
    await page.evaluate(() => { if (LD.houseUi) LD.houseUi.seek(1); });
    await sleep(250);
    await page.screenshot({ path: path.join(OUT, tag + "-word.png") });

    await boot(vp, pack.peek);
    const peekOn = await page.evaluate(() => !!document.getElementById("house-peek"));
    if (!peekOn) errors.push("peek glow missing on deal-phase house run " + tag);
    await page.screenshot({ path: path.join(OUT, tag + "-peek.png") });
  }


  // Flow: continue into a signed-deal house run, expect the auto-turn, admit someone, end the quarter.
  {
    await boot([412, 915], pack.arrival);
    await sleep(1800);
    const f1 = await page.evaluate(() => ({ facing: !!(LD.houseUi && LD.houseUi.facing()), admit: !!document.getElementById("hv-admit"), rail: !!document.getElementById("bunker-card") }));
    if (!f1.facing) errors.push("auto-turn did not run on continue (signed deal, no moves left)");
    if (!f1.admit) errors.push("arrival card not shown after auto-turn");
    await page.evaluate(() => document.getElementById("hv-admit") && document.getElementById("hv-admit").click());
    await sleep(300);
    const f2 = await page.evaluate(() => ({ card: !!document.getElementById("hv-admit"), band: /Helen/.test((document.querySelector(".hv-band") || {}).textContent || ""), endq: !!document.getElementById("hv-endq") }));
    if (f2.card || !f2.band) errors.push("admit did not update the set (card " + f2.card + ", band " + f2.band + ")");
    await page.screenshot({ path: path.join(OUT, "412x915-after-admit-helen.png") });
    await page.evaluate(() => document.getElementById("hv-endq") && document.getElementById("hv-endq").click());
    await sleep(2500);
    const f3 = await page.evaluate(() => ({ q: (JSON.parse(localStorage.getItem("lastDividend.house.v1") || "{}").midRun || {}).turn, open: !!document.querySelector("#house-root .hv-root") }));
    if (!(f3.q >= 5)) errors.push("end quarter from the house did not advance (turn " + f3.q + ")");
    if (f3.open) errors.push("house view still open after End quarter");
    console.log("flow", JSON.stringify([f1, f2, f3]));
  }

  await boot([800, 1280], pack.full);
  const frames = [0, 0.14, 0.28, 0.42, 0.56, 0.7, 0.85, 1];
  for (let i = 0; i < frames.length; i++) {
    await page.evaluate((t) => { LD.houseUi.seek(t); }, frames[i]);
    await sleep(80);
    await page.screenshot({ path: path.join(OUT, "strip-f" + (i + 1) + ".png") });
  }

  await browser.close(); if (server) server.close();
  if (missing.length) errors.push.apply(errors, missing.slice(0, 12));

  const stitch = path.join(OUT, "_stitch.py");
  fs.writeFileSync(stitch, [
    "from pathlib import Path",
    "from PIL import Image, ImageDraw",
    "OUT = Path(" + JSON.stringify(OUT) + ")",
    "files = sorted(OUT.glob('strip-f*.png'))",
    "ims = [Image.open(f).convert('RGB') for f in files]",
    "h = 420",
    "scaled = []",
    "for im in ims:",
    "    s = h / im.height",
    "    scaled.append(im.resize((int(im.width * s), h), Image.Resampling.LANCZOS))",
    "gap = 10",
    "w = sum(im.width for im in scaled) + gap * (len(scaled) + 1)",
    "canvas = Image.new('RGB', (w, h + 36), (28, 20, 14))",
    "d = ImageDraw.Draw(canvas)",
    "x = gap",
    "for i, im in enumerate(scaled):",
    "    canvas.paste(im, (x, 28))",
    "    d.rectangle((x, 28, x + im.width - 1, 28 + im.height - 1), outline=(200, 170, 110))",
    "    d.text((x + 6, 8), 'Frame ' + str(i + 1), fill=(232, 210, 170))",
    "    x += im.width + gap",
    "canvas.save(OUT / 'turn-strip.png', 'PNG')",
    "print('strip', canvas.size)",
    ""
  ].join("\n"));
  try { execFileSync("python3", [stitch], { stdio: "inherit" }); }
  catch (e) { errors.push("strip stitch failed: " + e.message); }
  try { fs.unlinkSync(stitch); } catch (e) {}

  if (errors.length) { console.log("HOUSE PHASE2 SHOTS FAIL\n" + errors.join("\n")); process.exit(1); }
  console.log("HOUSE PHASE2 SHOTS OK " + OUT);
})();
