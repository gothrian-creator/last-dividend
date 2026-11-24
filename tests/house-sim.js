#!/usr/bin/env node
"use strict";
/* Short headless sim of house-rules runs. Does not change the live flag default. */
const fs = require("fs"), path = require("path"), vm = require("vm");
const ROOT = path.resolve(__dirname, "..");
const src = fs.readFileSync(path.join(ROOT, "tests/run-tests.js"), "utf8");
const JS_NAMES = JSON.parse(src.match(/const JS_NAMES = (\[[\s\S]*?\]);/)[1].replace(/'/g, '"'));
const elStub = { style: { setProperty() {}, getPropertyValue() { return ""; } }, setAttribute() {}, classList: { add() {}, remove() {}, toggle() {}, contains() { return false; } }, getBoundingClientRect() { return {}; } };
const ctx = { console, setTimeout, clearTimeout, module: { exports: {} }, exports: {}, addEventListener() {}, removeEventListener() {}, requestAnimationFrame() { return 0; }, innerWidth: 1280, innerHeight: 800, visualViewport: { addEventListener() {} }, matchMedia() { return { matches: false, addEventListener() {}, addListener() {} }; }, localStorage: { getItem() { return null; }, setItem() {}, removeItem() {} } };
ctx.globalThis = ctx; ctx.window = ctx;
ctx.document = { documentElement: elStub, body: elStub, getElementById: () => elStub, querySelector: () => elStub, querySelectorAll: () => [], createElement: () => elStub, addEventListener() {} };
vm.createContext(ctx);
for (const n of JS_NAMES) vm.runInContext(fs.readFileSync(path.join(ROOT, "src/js", n), "utf8"), ctx, { filename: n });
const LD = ctx.LD;

function playFight(state, style) {
  const f = state.fy, fg = f && f.fight;
  if (!fg) return state;
  if (fg.done) return LD.fightClose(state).state;
  const infos = fg.hand.map((u) => LD.fightCardInfo(state, u)).filter((i) => i && !i.why && i.id !== "c_subpoena");
  let pick = null;
  if (style === "bribe") pick = infos.filter((i) => i.cash || i.o.sp === "codb")[0] || infos.filter((i) => i.p)[0] || infos[0];
  else if (style === "crush") pick = infos.filter((i) => i.p && !i.cash)[0] || infos.filter((i) => i.d && !i.cash)[0] || infos.filter((i) => !i.cash && i.o.sp !== "codb")[0];
  else pick = infos[0];
  if (pick) { const r = LD.fightPlay(state, pick.u); if (r.ok) return r.state; }
  if (style === "bribe" && fg.round >= fg.rounds && LD.fightSettleCost(state) <= state.cash) {
    const rs = LD.fightSettle(state); if (rs.ok) return rs.state;
  }
  return LD.fightEndRound(state).state;
}

function playHouse(state) {
  if (state.ended || state.phase !== "bunker" || state.bunkerActedThisTurn) return state;
  const due = LD.houseDuePromise(state);
  if (due) {
    let r = LD.houseKeepPromise(state);
    if (r.ok) return r.state;
    r = LD.housePostponePromise(state);
    if (r.ok) return r.state;
    r = LD.houseBreakPromise(state);
    if (r.ok) return r.state;
    return state;
  }
  const arr = LD.houseArrival(state);
  if (arr) {
    const can = LD.houseCanAdmit(state, arr.id);
    const defs = LD.HOUSE_PROMISES.filter((p) => p.residentId === arr.id);
    const openN = (state.house.promises || []).filter((p) => p.status === "open").length;
    const promiseId = openN < 2 && defs[0] ? defs[0].id : null;
    if (!can) {
      const r = LD.houseAdmit(state, { id: arr.id, promiseId });
      if (r.ok) return r.state;
    } else if (can === "replace" && state.unrest < 70) {
      const r = LD.houseReplace(state, { id: arr.id, promiseId });
      if (r.ok) return r.state;
    }
    if (state.cash >= LD.housePayOffCost(state, arr.id)) {
      const r = LD.housePayOff(state, arr.id);
      if (r.ok) return r.state;
    }
    const r = LD.houseTurnAway(state, arr.id);
    if (r.ok) return r.state;
    return state;
  }
  if (state.turn >= 7 && !state.house.contractorUsed) {
    const miss = LD.SYSTEMS.map((s) => s.id).filter((id) => !state.house.rooms[id].on)[0];
    if (miss && state.cash >= LD.houseContractorCost(state)) {
      const r = LD.houseContractor(state, miss);
      if (r.ok) return r.state;
    }
  }
  if (state.turn >= LD.MIN_EVAC_TURN && LD.canEvacuate(state)) {
    const ev = LD.evacuationResult(state);
    if (ev.kind === "win") {
      const r = LD.attemptEvacuation(state);
      if (r.ok) return r.state;
    }
  }
  return state;
}

function drive(opts) {
  let state = LD.createRun({ seed: opts.seed, executiveId: opts.exec || "mara", rating: 0, perks: opts.perks || [], packs: [], level: 1, ruleset: "house" });
  const style = opts.style || "any";
  let guard = 0;
  while (!state.ended && guard++ < 800) {
    const f = state.fy;
    if (f && f.fight) { state = playFight(state, style); continue; }
    if (f && f.reward) {
      const rw = f.reward;
      if (!rw.cardDone) { const rc = rw.cards && rw.cards[0] ? LD.fyReward(state, { kind: "card", id: rw.cards[0] }) : LD.fyReward(state, { kind: "skip" }); state = rc.ok ? rc.state : LD.fyReward(state, { kind: "skip" }).state; continue; }
      if (!rw.assetDone) { const ra = rw.asset && rw.asset[0] ? LD.fyReward(state, { kind: "asset", id: rw.asset[0] }) : null; state = ra && ra.ok ? ra.state : LD.fyReward(state, { kind: "assetPass" }).state; continue; }
      if (!rw.itemDone) { const ri = LD.fyReward(state, { kind: "item", keep: true }); state = ri.ok ? ri.state : LD.fyReward(state, { kind: "item", keep: false }).state; continue; }
    }
    if (f && f.memo) { let rm = LD.fyMemo(state, "b"); if (!rm.ok) rm = LD.fyMemo(state, "a"); if (!rm.ok) rm = LD.fyMemo(state, "c"); state = rm.state; continue; }
    if (f && f.draft) { const dp = f.draft.offer && f.draft.offer[0] ? LD.fyPick(state, f.draft.offer[0]) : null; state = dp && dp.ok ? dp.state : LD.fyPick(state, null).state; continue; }
    if (state.phase === "deal") {
      let best = null, bs = -1e9, done = false;
      state.offered.forEach((id) => {
        const dd = LD.dealById(id);
        (dd.choices || [{ id: null }]).forEach((c) => {
          const t = LD.selectDeal(state, id, c.id);
          if (!t.ok) return;
          const ts = t.state, sc = ts.cash - (state.unrest > 45 ? 2.5 : 1) * ts.unrest - (state.collapse > 50 ? 1.5 : 0.8) * ts.collapse;
          if (sc > bs) { bs = sc; best = ts; }
        });
      });
      if (best) { state = best; continue; }
      for (let i = 0; i < state.offered.length && !done; i++) {
        const d = LD.dealById(state.offered[i]), chs = d.choices || [{ id: null }];
        for (let j = 0; j < chs.length; j++) {
          const r2 = LD.selectDeal(state, state.offered[i], chs[j].id);
          if (r2.ok) { state = r2.state; done = true; break; }
        }
      }
      if (!done) break;
      continue;
    }
    const before = state;
    state = playHouse(state);
    if (state !== before && (!state.ended)) continue;
    if (state.ended) break;
    const b = LD.bossInfo(state, state.turn);
    const rq = LD.closeQuarter(state, { bossChoice: b && b.choice ? "pay" : undefined });
    if (!rq.ok) break;
    state = rq.state;
  }
  return state;
}

const N = +(process.env.N || 36);
const EX = ["mara", "reid", "imani", "julian", "soren", "cassius"];
const ST = ["any", "bribe", "crush"];
const all = { n: 0, win: 0, well: 0, contractor: 0, unrest: 0, unfinished: 0, failed: 0, stuck: 0, q: 0, stores: 0, admitted: 0, arrivals: 0, kept: 0, broken: 0, cash: 0, titles: {}, reasons: {}, exec: {} };
for (const style of ST) {
  for (let i = 0; i < N; i++) {
    const exec = EX[i % 6];
    const st = drive({ seed: "hs-" + style + "-" + i, exec, style, perks: i % 9 === 0 ? ["offshore"] : [] });
    all.n++;
    const ex = all.exec[exec] = all.exec[exec] || { n: 0, win: 0 };
    ex.n++;
    if (!st || !st.ended) { all.stuck++; all.reasons["stuck"] = (all.reasons["stuck"] || 0) + 1; continue; }
    const e = st.ending || {};
    const reason = (e.kind || "?") + ":" + (e.reason || "");
    all.reasons[reason] = (all.reasons[reason] || 0) + 1;
    all.titles[e.title || "?"] = (all.titles[e.title || "?"] || 0) + 1;
    all.q += st.turn;
    all.stores += (st.house && st.house.stores) || 0;
    all.cash += st.cash || 0;
    all.admitted += (st.house && st.house.residents && st.house.residents.length) || 0;
    all.arrivals += (st.house && st.house.arrivalsTotal) || 0;
    all.kept += (st.house && st.house.wordKept && st.house.wordKept.length) || 0;
    all.broken += (st.house && st.house.wordBroken && st.house.wordBroken.length) || 0;
    if (st.house && st.house.contractorUsed) all.contractor++;
    if (e.kind === "win") { all.win++; ex.win++; if (e.wellStocked) all.well++; }
    else if (e.reason === "unrest") all.unrest++;
    else if (e.reason === "unfinished") all.unfinished++;
    else if (e.reason === "failed-systems") all.failed++;
  }
}
function avg(x) { return (x / all.n).toFixed(1); }
console.log("HOUSE SIM n=" + all.n + " (3 styles × " + N + " seeds, 6 execs)");
console.log("win " + all.win + "/" + all.n + " (" + Math.round(100 * all.win / all.n) + "%)  well-stocked " + all.well + "  stuck " + all.stuck);
console.log("losses: unrest " + all.unrest + "  unfinished " + all.unfinished + "  failed-systems " + all.failed);
console.log("avg Q " + avg(all.q) + "  avg stores " + avg(all.stores) + "  avg cash $" + avg(all.cash) + "M  contractor used " + all.contractor + "/" + all.n);
console.log("avg arrivals rolled " + avg(all.arrivals) + "  avg residents at end " + avg(all.admitted) + "  words kept " + all.kept + "  broken " + all.broken);
console.log("reasons", JSON.stringify(all.reasons));
console.log("titles", JSON.stringify(all.titles));
console.log("by exec", JSON.stringify(all.exec));
if (LD.HOUSE_RULES !== false) { console.error("FLAG LEAK"); process.exit(1); }
