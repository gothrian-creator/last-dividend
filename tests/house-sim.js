#!/usr/bin/env node
"use strict";
/* House-rules balance sim. Three policies, flag stays off. Does not deploy anything. */
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

function keepCost(state, rec) {
  const def = LD.housePromiseDef(rec.defId);
  return def && def.keep ? def.keep(state, rec) : {};
}
function darkRooms(state) {
  return LD.SYSTEMS.filter((s) => !state.house.rooms[s.id].on).map((s) => s.id);
}
function roomsOn(state) {
  return LD.SYSTEMS.filter((s) => state.house.rooms[s.id].on).length;
}

/* greedy: keep if you can; always take the Word; fill the house. */
function greedyWord(state, fx) {
  if (fx.blocked) return "break";
  if (fx.cash && state.cash < fx.cash) return state.house.promises.filter((p) => p.id === LD.houseDuePromise(state).id)[0].postponed ? "break" : "postpone";
  if (fx.stores && state.house.stores + fx.stores < 0) return "postpone";
  return "keep";
}
/* pragmatic: keep unless it would cost the contractor or the well-stocked house, or skip a needed arrival. */
function pragmaticWord(state, fx) {
  if (fx.blocked) return "break";
  const rec = LD.houseDuePromise(state);
  const needRoom = darkRooms(state).length;
  const fromQ = LD.houseContractorTurn(state);
  const cCost = LD.houseContractorCost(state);
  if (fx.reserve && needRoom > 0 && state.turn < 10) return "break";
  if (fx.cash && needRoom > 0 && !state.house.contractorUsed && state.turn + 1 >= fromQ && state.cash - fx.cash < cCost) {
    return rec.postponed ? "break" : "postpone";
  }
  if (fx.stores) {
    const after = state.house.stores + fx.stores;
    const niaIn = state.house.residents.some((r) => r.id === "nia");
    if (niaIn && roomsOn(state) === 4 && after < 5 && state.house.stores >= 5) return "break";
    if (after < 0) return rec.postponed ? "break" : "postpone";
  }
  if (fx.cash && state.cash < fx.cash) return rec.postponed ? "break" : "postpone";
  if (fx.cash && fx.cash >= 20 && state.unrest >= 55) return "break";
  return "keep";
}
/* ruthless: break any Word that costs cash, stores, or a bunk, unless Keep is free. */
function ruthlessWord(state, fx) {
  if (fx.blocked) return "break";
  if (fx.cash || fx.stores || fx.reserve) return "break";
  if (fx.cash && state.cash < fx.cash) return "break";
  return "keep";
}

function attachPromise(state, id, policy) {
  const defs = LD.HOUSE_PROMISES.filter((p) => p.residentId === id);
  const openN = (state.house.promises || []).filter((p) => p.status === "open").length;
  if (!defs.length || openN >= 2) return null;
  if (policy === "ruthless") return defs[0].id; /* they still give the Word, then break it */
  if (policy === "pragmatic" && id === "lila" && state.unrest < 40) return null;
  return defs[0].id;
}

function playHouse(state, policy) {
  if (state.ended || state.phase !== "bunker" || state.bunkerActedThisTurn) return state;
  const due = LD.houseDuePromise(state);
  if (due) {
    const fx = keepCost(state, due) || {};
    const pick = policy === "greedy" ? greedyWord(state, fx) : policy === "ruthless" ? ruthlessWord(state, fx) : pragmaticWord(state, fx);
    const fn = pick === "keep" ? LD.houseKeepPromise : pick === "postpone" ? LD.housePostponePromise : LD.houseBreakPromise;
    let r = fn(state);
    if (!r.ok && pick === "keep") r = LD.housePostponePromise(state);
    if (!r.ok && pick !== "break") r = LD.houseBreakPromise(state);
    if (r.ok) return r.state;
    return state;
  }
  const arr = LD.houseArrival(state);
  if (arr) {
    const can = LD.houseCanAdmit(state, arr.id);
    const promiseId = attachPromise(state, arr.id, policy);
    const system = arr.id !== "lila";
    if (!can) {
      const r = LD.houseAdmit(state, { id: arr.id, promiseId });
      if (r.ok) return r.state;
    } else if (can === "replace" && state.unrest < 70 && system) {
      const r = LD.houseReplace(state, { id: arr.id, promiseId });
      if (r.ok) return r.state;
    }
    if (policy === "ruthless" && !system) {
      const r = LD.houseTurnAway(state, arr.id);
      if (r.ok) return r.state;
    }
    if (state.cash >= LD.housePayOffCost(state, arr.id) && (policy !== "greedy" || can)) {
      const r = LD.housePayOff(state, arr.id);
      if (r.ok) return r.state;
    }
    const r = LD.houseTurnAway(state, arr.id);
    if (r.ok) return r.state;
    return state;
  }
  if (state.turn >= LD.houseContractorTurn(state) && !state.house.contractorUsed) {
    const miss = darkRooms(state)[0];
    if (miss && state.cash >= LD.houseContractorCost(state)) {
      const r = LD.houseContractor(state, miss);
      if (r.ok) return r.state;
    }
  }
  if (state.turn >= LD.MIN_EVAC_TURN && LD.canEvacuate(state)) {
    const ev = LD.evacuationResult(state);
    if (ev.kind === "win") {
      /* pragmatic may wait one quarter for stores if collapse is not at the door */
      if (policy === "pragmatic" && ev.kind === "win" && !ev.wellStocked && state.house.residents.some((r) => r.id === "nia") &&
          roomsOn(state) === 4 && state.house.stores >= 3 && state.house.stores < 5 && state.collapse < 88 && state.turn < 11) {
        /* fall through to close and grow stores */
      } else {
        const r = LD.attemptEvacuation(state);
        if (r.ok) return r.state;
      }
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
    state = playHouse(state, opts.policy || "pragmatic");
    if (state !== before && (!state.ended)) continue;
    if (state.ended) break;
    const b = LD.bossInfo(state, state.turn);
    const rq = LD.closeQuarter(state, { bossChoice: b && b.choice ? "pay" : undefined });
    if (!rq.ok) break;
    state = rq.state;
  }
  return state;
}

function empty() {
  return { n: 0, win: 0, well: 0, contractor: 0, unrest: 0, unfinished: 0, failed: 0, stuck: 0, q: 0, stores: 0, admitted: 0, arrivals: 0, kept: 0, broken: 0, cash: 0, titles: {}, reasons: {}, exec: {} };
}
function tally(all, st, exec) {
  all.n++;
  const ex = all.exec[exec] = all.exec[exec] || { n: 0, win: 0 };
  ex.n++;
  if (!st || !st.ended) { all.stuck++; all.reasons.stuck = (all.reasons.stuck || 0) + 1; return; }
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
function pct(a, b) { return b ? Math.round(100 * a / b) + "%" : "—"; }
function avg(x, n) { return n ? (x / n).toFixed(1) : "—"; }
function report(name, all) {
  const wellOfWins = pct(all.well, all.win);
  const words = all.kept + all.broken;
  console.log("POLICY " + name);
  console.log("  win " + all.win + "/" + all.n + " (" + pct(all.win, all.n) + ")  well-stocked " + all.well + " (" + wellOfWins + " of wins)  stuck " + all.stuck);
  console.log("  losses: unrest " + all.unrest + "  unfinished " + all.unfinished + "  failed-systems " + all.failed);
  console.log("  avg Q " + avg(all.q, all.n) + "  avg stores " + avg(all.stores, all.n) + "  avg cash $" + avg(all.cash, all.n) + "M  contractor " + all.contractor + "/" + all.n);
  console.log("  avg arrivals " + avg(all.arrivals, all.n) + "  avg residents " + avg(all.admitted, all.n) + "  kept " + all.kept + "  broken " + all.broken + (words ? "  (keep " + pct(all.kept, words) + ")" : ""));
  const by = Object.keys(all.exec).map((k) => k + " " + all.exec[k].win + "/" + all.exec[k].n + " (" + pct(all.exec[k].win, all.exec[k].n) + ")").join("  ");
  console.log("  by exec  " + by);
  console.log("  reasons " + JSON.stringify(all.reasons));
  console.log("  titles " + JSON.stringify(all.titles));
}

const N = +(process.env.N || 36);
const EX = ["mara", "reid", "imani", "julian", "soren", "cassius"];
const ST = ["any", "bribe", "crush"];
const POL = ["greedy", "pragmatic", "ruthless"];

console.log("HOUSE SIM after tune  n=" + (N * ST.length) + " per policy  (3 fight styles × " + N + " seeds, 6 execs)");
console.log("BEFORE (greedy-only, n=108): win 16/108 (15%)  well-stocked 4/16 wins  arrivals 3.4  stores 1.5  kept 194  broken 5  contractor 58/108");
console.log("BEFORE by exec: mara 2/18  reid 4/18  imani 2/18  julian 4/18  soren 3/18  cassius 1/18");
console.log("");

if (LD.HOUSE_RULES !== false) { console.error("FLAG LEAK"); process.exit(1); }

for (const policy of POL) {
  const all = empty();
  for (const style of ST) {
    for (let i = 0; i < N; i++) {
      const exec = EX[i % 6];
      const st = drive({ seed: "hs2-" + policy + "-" + style + "-" + i, exec, style, policy, perks: i % 9 === 0 ? ["offshore"] : [] });
      tally(all, st, exec);
    }
  }
  report(policy, all);
  console.log("");
}
if (LD.HOUSE_RULES !== false) { console.error("FLAG LEAK"); process.exit(1); }
