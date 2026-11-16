#!/usr/bin/env node
"use strict";
/* Headless runs through all three eras: every fight has a face, named moves, an ending and (sometimes) a callback. */
const fs = require("fs"), path = require("path"), vm = require("vm");
const ROOT = path.resolve(__dirname, "..");
const src = fs.readFileSync(path.join(ROOT, "tests/run-tests.js"), "utf8");
const JS_NAMES = JSON.parse(src.match(/const JS_NAMES = (\[[\s\S]*?\]);/)[1].replace(/'/g, '"'));
const styleStub = { setProperty() {}, getPropertyValue() { return ""; } };
const elStub = { style: styleStub, setAttribute() {}, classList: { add() {}, remove() {}, toggle() {}, contains() { return false; } }, getBoundingClientRect() { return { top: 0, left: 0, right: 0, bottom: 0, width: 0, height: 0 }; } };
const ctx = { console, setTimeout, clearTimeout, module: { exports: {} }, exports: {}, addEventListener() {}, removeEventListener() {}, requestAnimationFrame(fn) { return setTimeout(fn, 0); },
  innerWidth: 1280, innerHeight: 800, visualViewport: { height: 800, width: 1280, addEventListener() {} }, matchMedia() { return { matches: false, addEventListener() {}, addListener() {} }; },
  localStorage: { getItem() { return null; }, setItem() {}, removeItem() {} } };
ctx.globalThis = ctx; ctx.window = ctx;
ctx.document = { documentElement: elStub, body: elStub, getElementById: () => elStub, querySelector: () => elStub, querySelectorAll: () => [], createElement: () => elStub, addEventListener() {} };
vm.createContext(ctx);
for (const n of JS_NAMES) vm.runInContext(fs.readFileSync(path.join(ROOT, "src/js", n), "utf8"), ctx, { filename: n });
const LD = ctx.LD;
let failed = 0, passed = 0;
function ok(c, m) { if (c) passed++; else { failed++; console.error("FAIL", m); } }

const INT = {};
const WANT = { debt: "obligation", favour: "kinship" };
function fightLoop(state, style, seen) {
  let guard = 0;
  while (state.fy.fight && !state.fy.fight.done && guard++ < 60) {
    const fg = state.fy.fight;
    ok(fg.opp && LD.oppById(fg.opp), "fight has an opponent at Q" + state.turn + " (" + fg.enc + ")");
    const O = LD.oppById(fg.opp);
    if (O && !seen.has(fg.opp + ":" + state.turn)) {
      seen.add(fg.opp + ":" + state.turn);
      ok(O.act === LD.actOf(state.turn) || O.boss || fg.opp === "brennan", "opponent " + fg.opp + " belongs to act " + LD.actOf(state.turn));
      ok(LD.INTENTS[fg.intent.k] && LD.INTENTS[fg.intent.k].say, "named move with a line: " + fg.intent.k);
      ok(O.open && O.hit.length && O.block.length && O.end.paid && O.end.crushed && O.end.walked, "lines for " + fg.opp);
      for (const html of [LD.renderFight(state, {})]) ok(/sc-bubble/.test(html) && /opp-/.test(html), "fight render has bubble + art for " + fg.opp);
    }
    if (process.env.INTENTS && !fg.played) { const it = LD.fightIntent(state); if (it) { const k = fg.opp + " " + it.meter + " " + it.k; (INT[k] = INT[k] || []).push(state.turn + ":" + it.n); } }
    const infos = fg.hand.map((u) => LD.fightCardInfo(state, u)).filter((i) => i && !i.why && i.id !== "c_subpoena");
    let pick = null;
    if (style === "bribe") pick = infos.find((i) => i.cash || i.o.sp === "codb") || infos.find((i) => i.p) || infos[0];
    else if (style === "crush") pick = infos.find((i) => i.p && !i.cash) || infos.find((i) => i.d && !i.cash) || infos.find((i) => !i.cash && i.o.sp !== "codb");
    else if (WANT[style]) pick = infos.find((i) => LD.cardPressure(i.id) === WANT[style]) || infos.find((i) => i.p && !i.cash) || infos[0];
    else pick = infos[0];
    if (pick) { const r = LD.fightPlay(state, pick.u); if (r.ok) { state = r.state; continue; } }
    if (style === "bribe" && LD.fightSettleCost(state) <= state.cash && fg.round >= fg.rounds) { const r = LD.fightSettle(state); if (r.ok) { state = r.state; continue; } }
    const r = LD.fightEndRound(state); ok(r.ok, "end round " + (r.error || "")); state = r.state;
  }
  if (state.fy.fight && state.fy.fight.done) {
    const fg = state.fy.fight;
    ok(fg.done.how, "fight has an ending: " + fg.opp);
    const html = LD.renderFight(state, {});
    ok(/sc-ending/.test(html), "ending panel renders for " + fg.opp);
    const r = LD.fightClose(state); ok(r.ok, "close"); state = r.state;
  }
  return state;
}
function runOne(seed, exec, style) {
  let state = LD.createRun({ seed, executiveId: exec, rating: 0, perks: [], packs: [], level: 1 });
  const seen = new Set(); let guard = 0;
  while (!state.ended && guard++ < 400) {
    LD.applyEra(LD.actOf(Math.min(12, state.turn)));
    const f = state.fy;
    if (f && f.fight) { state = fightLoop(state, style, seen); continue; }
    if (f && f.reward) {
      const rw = f.reward;
      if (!rw.cardDone) {
        /* deck-building styles take cards of their pressure type; the others skip */
        const want = WANT[style] && (rw.cards || []).find((id) => LD.cardPressure(id) === WANT[style]);
        const r = want ? LD.fyReward(state, { kind: "card", id: want }) : null;
        state = r && r.ok ? r.state : LD.fyReward(state, { kind: "skip" }).state; continue; }
      if (!rw.assetDone) { state = LD.fyReward(state, { kind: "assetPass" }).state; continue; }
      if (!rw.itemDone) { state = LD.fyReward(state, { kind: "item", keep: false }).state; continue; }
    }
    if (f && f.memo) { let r = LD.fyMemo(state, "b"); if (!r.ok) r = LD.fyMemo(state, "a"); state = r.state; continue; }
    if (f && f.draft) { const r = WANT[style] && f.draft.offer && f.draft.offer[0] ? LD.fyPick(state, f.draft.offer[0]) : null; state = r && r.ok ? r.state : LD.fyPick(state, null).state; continue; }
    if (f && f.loot) { const r = LD.fyTakeLoot(state, false); if (r.ok) { state = r.state; continue; } }
    if (state.phase === "deal") {
      let done = false;
      for (const id of state.offered) { const d = LD.dealById(id); for (const c of (d.choices || [{ id: null }])) { const r = LD.selectDeal(state, id, c.id); if (r.ok) { state = r.state; done = true; break; } } if (done) break; }
      if (!done) { console.error("no deal possible Q" + state.turn); break; } continue;
    }
    const b = LD.bossInfo(state, state.turn);
    const r = LD.closeQuarter(state, { bossChoice: b && b.choice ? "pay" : undefined });
    if (!r.ok) { console.error("close fail Q" + state.turn, r.error); break; }
    state = r.state;
  }
  LD.applyEra(0);
  return state;
}
const tally = {}, cbs = {}, hows = {}, outs = {}, gals = {}, styleWin = {}, runs = {};
const EXECS = ["mara", "reid", "imani", "julian", "soren", "cassius"];
const STYLES = ["bribe", "crush", "any", "debt", "favour"];
for (let i = 0; i < 40; i++) {
  const style = STYLES[i % 5];
  const s = runOne("era-sim-" + i, EXECS[i % 6], style);
  const f = s.fy || {};
  Object.keys(f.met || {}).forEach((k) => (tally[k] = (tally[k] || 0) + 1));
  (f.cbSeen || []).forEach((k) => (cbs[k] = (cbs[k] || 0) + 1));
  Object.values(f.fates || {}).forEach((x) => { hows[x.how] = (hows[x.how] || 0) + 1; if (x.out) outs[x.out] = (outs[x.out] || 0) + 1; const w = styleWin[style] = styleWin[style] || { n: 0, lost: 0 }; w.n++; if (x.how === "walked") w.lost++; });
  { const e = s.ending || {}, k = (e.kind || (s.ended ? "?" : "unfinished")) + (e.reason ? ":" + e.reason : ""), w = runs[style] = runs[style] || {}; w[k] = (w[k] || 0) + 1; w.q = (w.q || 0) + s.turn; w.collapse = (w.collapse || 0) + (s.collapse | 0); }
  ok(s.fy && s.fy.temper && typeof s.fy.temper.s === "number" && Math.abs(s.fy.temper.s) <= 12 && Math.abs(s.fy.temper.w) <= 12, "temper marker stays in range");
}
console.log("MET", JSON.stringify(tally));
console.log("CALLBACKS", JSON.stringify(cbs));
console.log("ENDINGS", JSON.stringify(hows));
if (process.env.INTENTS) Object.keys(INT).sort().forEach((k) => console.log("INT", k, [...new Set(INT[k])].slice(0, 12).join(" ")));
console.log("OUTCOMES", JSON.stringify(outs));
console.log("WALKED BY STYLE", JSON.stringify(styleWin));
console.log("RUNS BY STYLE", JSON.stringify(runs));
/* The Hostile Takeover Bid boss left the pool with the rivals; its face (crowe_b) only loads from old saves. */
Object.keys(LD.OPPONENTS).filter((k) => LD.OPPONENTS[k].boss !== "bid").forEach((k) => ok(tally[k] > 0, "every face shows up in 40 runs: " + k));
ok(!tally.crowe_b, "no Hostile Takeover Bid boss in new runs");
LD.OUTCOMES.forEach((o) => ok(outs[o] >= 3, "ending reachable in sims (3+): " + o));
["pops", "varga_b", "brennan"].forEach((k) => ok(tally[k] >= 3, "rare face shows up 3+ times: " + k));
Object.keys(styleWin).forEach((k) => { const w = styleWin[k], r = w.lost / w.n; ok(r < (k === "any" ? 0.65 : 0.45), "balance: " + k + " loses " + Math.round(100 * r) + "% of door fights"); });
{ const all = Object.values(styleWin).reduce((a, w) => ({ n: a.n + w.n, lost: a.lost + w.lost }), { n: 0, lost: 0 }), r = all.lost / all.n; ok(r > 0.08 && r < 0.3, "balance: door fights lost overall " + Math.round(100 * r) + "% (aim 8-30%)"); }
["dunn", "moretti", "june", "mickey", "odell", "delacroix", "okafor", "hale", "harrow", "gray", "rosa", "brennan"].forEach((k) => ok(tally[k] > 0, "met " + k + " at least once"));
ok(Object.keys(cbs).length >= 3, "at least 3 distinct callbacks fired");
ok(hows.paid && hows.crushed && hows.walked, "all three endings happen");
ok(LD.ACTS[0].name === "The Street" && LD.ACTS[2].name === "The Top", "acts renamed");
LD.applyEra(1); ok(LD.cardDef("darkmoney").name === "Bag Money", "era names apply"); LD.applyEra(0); ok(LD.cardDef("darkmoney").name === "Dark Money", "era names restore");
console.log(failed ? "FAILED " + failed + " / " + (passed + failed) : "SIM OK " + passed + " checks");
process.exit(failed ? 1 : 0);
