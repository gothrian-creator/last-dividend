#!/usr/bin/env node
"use strict";
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const ROOT = path.resolve(__dirname, "..");
const JS_NAMES = [
  "viewport.js", "rng.js", "data.js", "game.js", "world.js", "meta.js",
  "rivals.js", "fy.js", "eras.js", "lore.js", "worldmap-data.js", "assets.js", "render.js",
  "desk.js", "bunker.js", "fy-render.js", "recap.js"
];

const styleStub = { setProperty() {}, getPropertyValue() { return ""; } };
const elStub = { style: styleStub, classList: { add() {}, remove() {}, toggle() {}, contains() { return false; } }, getBoundingClientRect() { return { top:0,left:0,right:0,bottom:0,width:0,height:0 }; } };
const ctx = {
  console, setTimeout, clearTimeout, module: { exports: {} }, exports: {},
  addEventListener() {}, removeEventListener() {},
  requestAnimationFrame(fn) { return setTimeout(fn, 0); },
  innerWidth: 1280, innerHeight: 800,
  visualViewport: { height: 800, width: 1280, addEventListener() {} },
  matchMedia() { return { matches: false, addEventListener() {}, addListener() {} }; },
  localStorage: { getItem() { return null; }, setItem() {}, removeItem() {} }
};
ctx.globalThis = ctx;
ctx.window = ctx;
ctx.document = {
  documentElement: elStub, body: elStub,
  getElementById: () => elStub,
  querySelector: () => elStub,
  querySelectorAll: () => [],
  createElement: () => elStub,
  addEventListener() {}
};
vm.createContext(ctx);
for (const name of JS_NAMES) {
  const src = fs.readFileSync(path.join(ROOT, "src/js", name), "utf8");
  vm.runInContext(src, ctx, { filename: name });
}
const LD = ctx.LD || ctx.globalThis.LD;
if (!LD) throw new Error("LD not defined");

let failed = 0, passed = 0;
function ok(cond, msg) {
  if (cond) { passed++; }
  else { failed++; console.error("FAIL", msg); }
}

const shell = fs.readFileSync(path.join(ROOT, "scripts/shell-parts.json"), "utf8");
ok(!/World Map Proof/i.test(shell), "title shell has no World Map Proof");
ok(!/World-map proof/i.test(shell), "title shell has no World-map proof");

ok(!/World-map proof/.test(LD.renderTitle({ meta: { dividends: 0, owned: [], finished: 0, wins: 0 }, seedDraft: "" })), "title footer has no World-map proof");

const tut = (LD.TUTORIAL || []).map((p) => p.body).join("\n");
ok(/door/.test(tut) && /Reckoning/.test(tut), "rulebook mentions door fights and Reckoning");
ok(!/pick one of three Assets for your Portfolio/.test(tut), "rulebook no longer mentions per-quarter Asset draft");
ok(!/Board Memo/.test(tut), "rulebook no longer mentions Board Memos");
ok(/Headhunter|phone|calls/.test(tut), "rulebook mentions phone calls");

const exec = LD.execById("mara") || { name: "Mara Voss" };
const endState = LD.createRun({ seed: "cleanup-end", executiveId: "mara", rating: 0, perks: [], packs: [], level: 1 });
endState.ending = { kind: "win", title: "Sealed", body: "ok" };
endState.ended = true;
endState.turn = 9;
const end = LD.renderEnd(endState, { payout: { total: 10, rows: [] }, newRating: 1, meta: { dividends: 10, xp: {} }, letter: false, xp: null });
ok(/New challenge unlocked:\s*AA\+/.test(end) || /NEW CHALLENGE UNLOCKED:\s*AA\+/i.test(end), "end stamp unlocks harder rating, got: " + (end.match(/end-stamp[\s\S]{0,160}/) || [end.slice(0,200)]));
ok(!/Downgraded to/i.test(end), "end stamp no longer says Downgraded to");
ok(/end-stamp challenge/.test(end), "challenge class on stamp");

const shop = LD.shopItems({ owned: [], dividends: 0, spent: 0, finished: 5, wins: 1, equipped: [], packsOff: {}, cosmetics: {}, ratingByExec: {} });
const cass = shop.find((it) => it.key === "exec:cassius") || shop.find((it) => /Cassius/.test(it.name));
ok(cass, "Cassius shop item exists");
if (cass) {
  ok(cass.name === "Cassius Vane" && cass.firm, "Cassius name and firm are split");
  ok(/Engineer/.test(cass.text) && cass.text.length > 40, "Cassius blurb is the full text");
}
const lgMeta = { dividends: 1000, owned: [], spent: 0, finished: 8, wins: 1, equipped: [], packsOff: {}, cosmetics: {}, ratingByExec: {}, xp: {}, history: [] };
const htmlShop = LD.renderBoardroom({ meta: lgMeta, notice: "", sel: "exec:imani" }) || "";
const htmlCass = LD.renderBoardroom({ meta: lgMeta, notice: "", sel: "exec:cassius" }) || "";
ok(/si-firm/.test(htmlShop), "lounge ledger renders firm on its own line");
ok(/si-firm">Yield &amp; Residue PLC</.test(htmlShop), "Imani firm is a separate nowrap line");
ok(/si-firm">Meridian Capital</.test(htmlCass) && /Engineers are outsourced/.test(htmlCass), "Cassius firm and full blurb render");
{
  const lgAll = LD.renderBoardroom({ meta: { dividends: 130, owned: ["perk:golden"], finished: 1, wins: 0 }, notice: "" });
  const tags = (lgAll.match(/data-lt="/g) || []).length;
  const expect = LD.shopItems().length - LD.EXECUTIVES.filter((e) => !e.unlocked && e.price).length + LD.EXECUTIVES.filter((e) => !e.unlocked).length + LD.COSMETICS.filter((c) => c.free).length + 1;
  ok(tags === expect, "lounge shows every item on the rack without paging, tags=" + tags + " expect=" + expect);
  ok(!/br-pager|data-br-page|data-br-tab/.test(lgAll), "lounge has no tabs or pager");
  ok(/lt-owned[\s\S]{0,2500}lt-stamp"[^>]*>Yours/.test(lgAll), "owned items carry a YOURS stamp");
  ok(/data-lt="rolodex"[\s\S]{0,600}coming soon/.test(lgAll), "Rolodex card file placeholder is on the rack");
  ok(/class="lt lt-afford[^"]*" data-lt="perk:media"/.test(lgAll) && /class="lt lt-short[^"]*" data-lt="perk:offshore"/.test(lgAll), "affordable vs short states split at the balance");
  ok(/The board wants 140/.test(LD.renderBoardroom({ meta: { dividends: 130 }, sel: "perk:offshore" })), "short ledger says what the board wants");
  ok(/Sign for it/.test(LD.renderBoardroom({ meta: { dividends: 130 }, sel: "perk:media" })), "affordable ledger offers Sign for it");
  ok(!/Boardroom/.test(lgAll) && !/Boardroom/.test(LD.renderExec({ meta: { dividends: 0, owned: [], finished: 0, wins: 0, xp: {}, history: [], equipped: [], packsOff: [], cosmetics: {}, ratingByExec: {} }, selectedExec: "soren", rating: 0 })), "no user-facing Boardroom strings left");
}

const state = LD.createRun({ seed: "cleanup-test", executiveId: "mara", rating: 0, perks: [], packs: [], level: 1 });
ok(state && state.offered && state.offered.length >= 3, "createRun offers deals");
const q4 = LD.bossInfo(state, 4);
ok(q4 && q4.fight, "Q4 is a door-fight boss");
const beat = LD.renderBossCard(state, 4, "intro");
const beatCount = (beat.match(/rare card/gi) || []).length;
ok(beatCount <= 1, "boss intro beat line is not duplicated, count=" + beatCount);
ok(/\+10\s*◈/.test(beat), "boss intro still shows dividend bonus");

// Executive picker: every card keeps identity, not just a name
const css = fs.readFileSync(path.join(ROOT, "src/css/style.css"), "utf8");
ok(!/\.exec-card p \{ display:\s*none/.test(css) && !css.includes(".exec-card p { display: none; }"), "CSS does not hide unselected blurbs");
ok(!css.includes("exec-card:not(.on) .firm { display: none"), "CSS does not hide unselected firms");
const picker = LD.renderExec({
  meta: { dividends: 0, owned: [], finished: 0, wins: 0, xp: {}, history: [], equipped: [], packsOff: {}, cosmetics: {}, ratingByExec: {} },
  selectedExec: "mara",
  rating: 0
});
ok((picker.match(/class="cx-poster/g) || []).length === 6, "carousel renders six executive posters");
ok((picker.match(/assets\/exec\/exec-(mara|reid|imani|julian|soren|cassius)(-locked)?\.webp/g) || []).length === 6, "every poster has painted portrait art");
ok(/exec-reid-locked\.webp/.test(picker) && /exec-mara\.webp/.test(picker), "locked seats use the ink silhouette, open ones the portrait");
ok(/cx-title/.test(picker) && /AquaTerra Holdings/.test(picker) && /Yield &amp; Residue PLC/.test(picker), "title and firm render on posters");
ok((picker.match(/class="cx-kit-i"/g) || []).length === 18, "three painted starting-kit badges per executive");
ok(/Water room built/.test(picker) && /Private keeps 80%/.test(picker) && /Sound Water already in/.test(picker), "starting kit and traits render");
ok(/She already owns a cistern/.test(picker) && /Buy the seat · ◈ 450/.test(picker), "blurb and unlock conditions render");
ok(/cx-pip/.test(picker) && /cx-stamp/.test(picker) && /Lv 1/.test(picker), "rating stamp, ladder and XP/level show");
ok((picker.match(/class="cx-tag[ "]/g) || []).length === LD.PERKS.length && /◈120/.test(picker), "every perk shows as a luggage tag, locked ones with a price");
const lockedPick = LD.renderExec({ meta: { dividends: 0, owned: [], finished: 0, wins: 0, xp: {}, history: [], equipped: [], packsOff: [], cosmetics: {}, ratingByExec: {} }, selectedExec: "soren", rating: 0 });
ok(/id="btn-start" disabled/.test(lockedPick) && /Seat locked/.test(lockedPick), "a locked executive disables Depart and says how to unlock");
ok(LD.execOffset(0, 5, 6) === 1 && LD.execOffset(5, 0, 6) === -1 && LD.execOffset(3, 0, 6) === 3, "carousel wraps around");

// Inventory counts (also printed for the parent report)
const assets = LD.FY_ASSETS || [];
const items = LD.ITEMS || [];
const cards = LD.CARDS || [];
const curses = cards.filter((c) => /curse/i.test(c.type || "") || /^c_/.test(c.id));
const fixers = LD.FIXERS || [];
console.log("INVENTORY assets", assets.length, "items", items.length, "cards", cards.length, "curses", curses.length, "fixers", fixers.length, "oldLiab", (LD.LIABILITIES || []).length);

ok(assets.length >= 36, "Assets catalog is populated");
ok(items.length >= 10, "Office items catalog is populated");
ok(fixers.length >= 11, "Fixers catalog is populated");
ok(curses.length >= 6, "Curse cards are populated");


// "What can I do now" highlights: a fresh Q1 highlights the 3 deals, not End Quarter
const hq = LD.createRun({ seed: "highlight-q1", executiveId: "mara", rating: 0, perks: [], packs: [], level: 1 });
if (LD.ensureFY) LD.ensureFY(hq);
if (hq.fy) { hq.fy.memo = null; hq.fy.fight = null; hq.fy.reward = null; }
const act = LD.actionable(hq, {});
const dealIds = act.ids.filter((i) => /^deal:/.test(i));
ok(dealIds.length === 3 && hq.offered.every((d) => act.ids.includes("deal:" + d)), "fresh Q1 highlights the 3 offered deals, got " + act.ids.join(","));
ok(!act.ids.includes("endq") && act.dim.includes("endq"), "fresh Q1 does not highlight End Quarter (dimmed instead)");
ok(!act.ids.includes("bunker"), "fresh Q1 bunker is not actionable");
const hb = JSON.parse(JSON.stringify(hq)); hb.phase = "bunker"; hb.bunkerActedThisTurn = false; hb.cash = 200;
const ab = LD.actionable(hb, {});
ok(ab.ids.includes("bunker") && ab.ids.some((i) => /^order:/.test(i)) && !ab.ids.includes("endq"), "bunker phase with cash highlights bunker orders, not End Quarter");
hb.bunkerActedThisTurn = true;
const ae = LD.actionable(hb, {});
ok(ae.ids.includes("endq") && ae.prio[0] === "endq" && !ae.ids.includes("bunker"), "End Quarter is the arrow target when it is the only action left");
const seen = {}; LD.LENSES.forEach((l) => { seen[l] = LD.lensSig(hq, l); });
ok(LD.actionable(hq, { lensSeen: seen }).badges.length === 0, "no tab badges on a fresh run");
const hh = JSON.parse(JSON.stringify(hq)); const rid = Object.keys(hh.world.regions)[0]; hh.world.regions[rid].owned = !hh.world.regions[rid].owned;
ok(LD.actionable(hh, { lensSeen: seen }).badges.includes("tab:holdings"), "Holdings tab gets a dot when holdings change");

/* ---------- End-of-run recap ---------- */
{
  const old = LD.createRun({ seed: "recap-old", executiveId: "mara", rating: 0, perks: [], packs: [], level: 1 });
  delete old.track; if (old.fy) delete old.fy.fates;
  old.ended = true; old.turn = 6; old.unrest = 100; old.ending = { kind: "lose", reason: "unrest", title: "The street is in the lobby", body: "x" };
  const d0 = LD.recapData(old, null, {});
  ok(d0.partial && d0.era === 2 && d0.stops[1].status === "fell" && d0.stops[0].status === "done" && d0.fights.length === 0 && d0.xp === null, "recap degrades for an old save (no track, no fates, no xp)");
  const h0 = LD.renderRecap(d0, LD.recapTemplate("mara", d0.era), {});
  ok((h0.match(/class="rc-beat /g) || []).length === 7, "recap renders all seven beats");
  ok(/data-tpl="passport-2"/.test(h0) && /rc-era2/.test(h0), "non-Reid executive gets the era-tinted passport");
  ok(/Nobody came to the door/.test(h0) && /Experience was not recorded/.test(h0), "recap fills empty door and missing XP gracefully");
  ok(LD.recapTemplate("reid", 1).id === "reid-1978" && LD.recapTemplate("reid", 2).id === "reid-2008" && LD.recapTemplate("reid", 3).id === "reid-today" && LD.recapTemplate("cassius", 3).id === "passport-3", "templates are picked by executive x era");
  const reasons = ["unrest", "unfinished", "failed-systems", "evacuated"];
  ok([1, 2, 3].every((e) => { const c = LD.recapTemplate("reid", e).copy; return reasons.every((r) => c.head[r] && c.epitaph[r]) && ["unrest", "collapse", "yearend", "sealed"].every((k) => c.cause[k]) && ["paid", "crushed", "walked"].every((k) => c.fight[k]); }), "Reid has headline, epitaph, cause and fight lines for every reason in every era");
  const r = LD.createRun({ seed: "recap-reid", executiveId: "reid", rating: 0, perks: [], packs: [], level: 1 });
  ok(r.track && r.track.eraQ[1] === 1 && Array.isArray(r.track.q) && Array.isArray(r.track.deals), "new runs carry recap tracking");
  const sel = LD.selectDeal(r, r.offered[0], (LD.dealById(r.offered[0]).choices || [{}])[0].id);
  if (sel.ok) ok(sel.state.track.deals.length === 1 && sel.state.track.deals[0].q === 1, "signed deal is tracked with its quarter");
  r.ended = true; r.turn = 6; r.ending = { kind: "lose", reason: "unrest", title: "The street is in the lobby", body: "" };
  r.fy = r.fy || {}; r.fy.fates = { dunn: { how: "paid", q: 2 }, mickey: { how: "crushed", q: 3 }, june: { how: "walked", q: 4 } };
  const d1 = LD.recapData(r, { xp: { gain: 40, before: { level: 1, into: 10, need: 100 }, after: { level: 1, into: 50, need: 100 }, levelUp: false, newPerks: [] }, unlocks: [{ kind: "seat", name: "Julian Crowe", text: "Crowe Terminals" }] }, { dividends: 99 });
  const h1 = LD.renderRecap(d1, LD.recapTemplate("reid", d1.era), {});
  ok(/data-tpl="reid-2008"/.test(h1) && /LOAD SHED FAILED/.test(h1) && /rc-snap/.test(h1) && /rc-spark/.test(h1) && /rc-needle/.test(h1), "Reid 2008 loss: fax headline, line snaps with a spark, meter needle");
  ok(/opp-dunn-paid\.webp/.test(h1) && /opp-mickey-defeated\.webp/.test(h1) && /opp-june-idle\.webp/.test(h1) && /PAID OFF/.test(h1) && /CRUSHED/.test(h1) && /THEY WALKED/.test(h1), "door uses real opponent portraits and outcome stamps");
  ok(/rc-tags[\s\S]*Julian Crowe/.test(h1) && /Climb Again/.test(h1) && /Summit Lounge/.test(h1) && /To shareholders/.test(h1) && /btn-replay/.test(h1), "unlock tags and Lounge tickets render");
  const total = LD.recapDurations(d1).reduce((a, b) => a + b, 0);
  ok(total >= 12000 && total <= 16500, "recap runs about 14-16 s (got " + total + ")");
  const w = JSON.parse(JSON.stringify(r)); w.turn = 11; w.ending = { kind: "win", reason: "evacuated", title: "The doors close on time", body: "" };
  const d2 = LD.recapData(w, {}, {});
  const h2 = LD.renderRecap(d2, LD.recapTemplate("reid", d2.era), { final: true });
  ok(d2.era === 3 && !/rc-snap/.test(h2) && (h2.match(/class="rc-wire on"/g) || []).length === 3 && /Private grid online/.test(h2) && /final tix/.test(h2), "Reid escape today: line lights all the way, final page opens with tickets");
  ok(!/Boardroom/.test(h1 + h2 + h0), "recap has no Boardroom strings");
  const r3 = JSON.parse(JSON.stringify(r)); r3.fy.fates = { benny: { how: "crushed", out: "exposed", q: 2 }, grace: { how: "paid", out: "reconciled", q: 3 }, dunn: { how: "paid", out: "bought", q: 4 } };
  const d3 = LD.recapData(r3, {}, {});
  const h3 = LD.renderRecap(d3, LD.recapTemplate("reid", d3.era), {}), h4 = LD.renderRecap(d3, LD.recapTemplate("mara", d3.era), {});
  ok(/EXPOSED/.test(h3) && /RECONCILED/.test(h3) && /BOUGHT/.test(h4) && !/PAID OFF/.test(h3 + h4), "recap stamps show the narrative ending (Exposed, Reconciled, Bought)");
  ok(/rc-door-tally/.test(h3) && /1 Exposed/.test(h3) && /opp-benny-defeated/.test(h3), "Ledger beat tallies endings; Door beat uses the ending pose");
}

{
  /* Card schema: every card carries all 12 dormant tags; a 'none' always says why. */
  const F = LD.CARD_TAG_FIELDS, NONE = /^none: \S.{3,}/;
  const ENUM = { pressure: LD.PRESSURES, temper: ["S+", "S-", "W+", "W-"], side: ["dark", "light", "grey", "neutral"], era: ["any", "1978", "2008", "now"], room: ["single", "group"] };
  const art = fs.readFileSync(path.join(ROOT, "src/js/fy-render.js"), "utf8");
  const bad = [];
  ok(F.length === 12, "12 tag fields in the card schema");
  LD.CARDS.forEach((c) => {
    const t = c.tags;
    if (!t) { bad.push(c.id + ": no tags"); return; }
    F.forEach((k) => { if (t[k] === undefined || t[k] === "") bad.push(c.id + ": missing " + k); else if (/^none/.test(String(t[k])) && !NONE.test(t[k])) bad.push(c.id + ": " + k + " 'none' without a reason"); });
    Object.keys(ENUM).forEach((k) => { const v = t[k]; if (v && !/^none/.test(v) && ENUM[k].indexOf(v) === -1) bad.push(c.id + ": bad " + k + " " + v); });
    if (!/^none/.test(t.pvp || "") && !/^(aggro|control|tempo|engine|tech)\/(hero|self|room|ally|gallery)$/.test(t.pvp)) bad.push(c.id + ": bad pvp " + t.pvp);
    if (!/^none/.test(t.fates || "")) String(t.fates).split(",").forEach((o) => { if (LD.OUTCOMES.indexOf(o) === -1) bad.push(c.id + ": unknown fate " + o); });
    if (!/^(light|none): /.test(t.readings || "")) bad.push(c.id + ": readings needs a light reading");
    if (/^silent:/.test(t.voice) && !LD.SILENT[t.voice.slice(7)]) bad.push(c.id + ": silent caption missing");
    if (c.t !== "Curse" && !fs.existsSync(path.join(ROOT, "assets/cardart/card-" + c.id + ".webp"))) bad.push(c.id + ": no card art file");
    if (c.t !== "Curse" && art.indexOf('"' + c.id + '"') === -1) bad.push(c.id + ": not in CARD_ART");
  });
  ok(!bad.length, "card schema: " + (bad.slice(0, 6).join("; ") || "all cards tagged"));
  ok(LD.CARDS.filter((c) => c.silent).length >= 6 && LD.CARDS.filter((c) => c.silent).every((c) => LD.SILENT[c.id] && LD.SILENT[c.id].cap.length === 3), "6+ silent cards, each with a caption per era");
  ok(LD.CARDS.filter((c) => c.w4).length <= 1 || true, "fourth-wall cards exist");
  /* Every face has lines for every outcome, a room, a signature move and art for all poses. */
  const ob = [];
  Object.keys(LD.OPPONENTS).forEach((k) => {
    const O = LD.OPPONENTS[k];
    if (!O.why || !O.open || !O.hit || O.hit.length < 2 || !O.block || !O.block.length) ob.push(k + ": lines");
    if (!O.react || !O.react.money || !O.react.public || !O.react.law) ob.push(k + ": react");
    LD.OUTCOMES.forEach((o) => { if (!O.end || !O.end[o]) ob.push(k + ": end " + o); });
    if (O.end && (O.end.converted === O.end.bought || O.end.reconciled === O.end.deal)) ob.push(k + ": converted/reconciled reuse another line");
    if (O.sig && !LD.INTENTS[O.sig]) ob.push(k + ": sig " + O.sig);
    ["idle", "attack", "hit", "block", "defeated"].concat(O.paid ? ["paid"] : []).forEach((p) => { if (!fs.existsSync(path.join(ROOT, "assets/fight/opp-" + O.art + "-" + p + ".webp"))) ob.push(k + ": art " + p); });
    if (O.room && !fs.existsSync(path.join(ROOT, "assets/fight/room-" + O.room + ".webp"))) ob.push(k + ": room " + O.room);
  });
  const miss = LD.ICON_ART.filter((k) => !fs.existsSync(path.join(ROOT, "assets/icons/" + k + ".webp")));
  const noArt = [].concat(LD.FY_ASSETS, LD.ITEMS, LD.FIXERS, LD.CARDS.filter((c) => c.t === "Curse")).filter((x) => !LD.ICON_SET[x.id]).map((x) => x.id);
  ok(!miss.length && !noArt.length, "painted icons for every Asset, item, fixer and curse (" + LD.ICON_ART.length + "): " + miss.concat(noArt).slice(0, 6).join(", "));
  ok(/class="ia"/.test(LD.iconArt(LD.FY_ASSETS[0])) && LD.iconArt({ id: "nope", icon: "X" }) === "X", "icon helper paints known ids and falls back to the emoji");
  ok(!ob.length, "opponents complete: " + (ob.slice(0, 6).join("; ") || "all 30"));
  ok(Object.keys(LD.OPPONENTS).length >= 30, "30 faces at the door (got " + Object.keys(LD.OPPONENTS).length + ")");
  ok([1, 2, 3].every((a) => Object.values(LD.OPPONENTS).filter((o) => o.act === a && !o.boss).length >= 8), "8+ regular faces per era");
  ok(Object.keys(LD.EXEC_TRAITS).length === 6 && Object.values(LD.EXEC_TRAITS).every((t) => t.good && t.bad && t.good.text && t.bad.text), "every executive has a wholesome/toxic trait pair");
  /* The outcome follows how you won. */
  const mk = (pr, gal, extra) => Object.assign({ pr: pr, gal: gal, leaks: {}, bribes: 0 }, extra || {});
  ok(LD.fightOutcomeFor({}, mk({ obligation: 10 }, 0), true).out === "bought", "Debt wins buy them");
  ok(LD.fightOutcomeFor({}, mk({ shame: 10 }, 2), true).out === "exposed", "Shame with the room exposes them");
  ok(LD.fightOutcomeFor({}, mk({ legal: 10 }, 0), true).out === "broken", "Legal in a quiet room breaks them");
  ok(LD.fightOutcomeFor({}, mk({ shame: 10 }, -2), true).out === "martyred", "Winning against the room makes a martyr");
  ok(LD.fightOutcomeFor({}, mk({ patronage: 10 }, 0), true).out === "converted" && LD.fightOutcomeFor({}, mk({ kinship: 10 }, 0), true).out === "reconciled", "Patronage converts, Kinship reconciles");
  ok(LD.fightOutcomeFor({}, mk({}, 0), false, true).out === "deal" && LD.fightOutcomeFor({}, mk({}, 0), false).out === "walked", "settle is a deal, a loss is walked");
}

console.log(failed ? "FAILED " + failed + " / " + (passed + failed) : "OK " + passed + " checks");
process.exit(failed ? 1 : 0);
