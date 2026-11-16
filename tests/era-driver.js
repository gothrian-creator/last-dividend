"use strict";
/* Shared headless driver: plays a run to a stop condition. Used by the era sim search and the screenshot tour (runs in the page too). */
function eraDrive(LD, o) {
  var state = LD.createRun({ seed: o.seed, executiveId: o.exec || "mara", rating: 0, perks: [], packs: [], level: 1 });
  var guard = 0, stop = o.stop || "";
  function hit(st) {
    var f = st.fy || {}, fg = f.fight;
    if (/^deal:/.test(stop)) return st.phase === "deal" && !fg && !f.reward && !f.memo && !f.draft && st.turn === +stop.split(":")[1];
    if (/^fight:/.test(stop)) return fg && !fg.done && fg.round === 1 && !fg.played && stop.split(":")[1].split(",").indexOf(fg.opp) !== -1;
    if (/^end:/.test(stop)) { var sp = stop.split(":"); return fg && fg.done && fg.done.how === sp[1] && (!sp[2] || sp[2].split(",").indexOf(fg.opp) !== -1); }
    if (/^cb:/.test(stop)) return fg && !fg.done && fg.cb && (stop === "cb:" || fg.cb.id === stop.slice(3));
    return false;
  }
  function styleFor(st) { var s = o.style || "any"; if (o.styleBy && st.fy && st.fy.fight && o.styleBy[st.fy.fight.opp]) s = o.styleBy[st.fy.fight.opp]; return s; }
  while (!state.ended && guard++ < 600) {
    if (hit(state)) return state;
    var f = state.fy;
    if (f && f.fight) {
      var fg = f.fight;
      if (fg.done) { state = LD.fightClose(state).state; continue; }
      var style = styleFor(state);
      var infos = fg.hand.map(function (u) { return LD.fightCardInfo(state, u); }).filter(function (i) { return i && !i.why && i.id !== "c_subpoena"; });
      var pick = null;
      if (style === "bribe") pick = infos.filter(function (i) { return i.cash || i.o.sp === "codb"; })[0] || infos.filter(function (i) { return i.p; })[0] || infos[0];
      else if (style === "crush") pick = infos.filter(function (i) { return i.p && !i.cash; })[0] || infos.filter(function (i) { return i.d && !i.cash; })[0] || infos.filter(function (i) { return !i.cash && i.o.sp !== "codb"; })[0];
      else if (style === "lose") pick = null;
      else pick = infos[0];
      if (pick) { var r = LD.fightPlay(state, pick.u); if (r.ok) { state = r.state; continue; } }
      if (style === "bribe" && fg.round >= fg.rounds && LD.fightSettleCost(state) <= state.cash) { var rs = LD.fightSettle(state); if (rs.ok) { state = rs.state; continue; } }
      state = LD.fightEndRound(state).state; continue;
    }
    if (f && f.reward) {
      var rw = f.reward;
      if (!rw.cardDone) { var rc = rw.cards && rw.cards[0] && o.takeCards ? LD.fyReward(state, { kind: "card", id: rw.cards[0] }) : LD.fyReward(state, { kind: "skip" }); state = rc.ok ? rc.state : LD.fyReward(state, { kind: "skip" }).state; continue; }
      if (!rw.assetDone) { var ra = rw.asset && rw.asset[0] ? LD.fyReward(state, { kind: "asset", id: rw.asset[0] }) : null; state = ra && ra.ok ? ra.state : LD.fyReward(state, { kind: "assetPass" }).state; continue; }
      if (!rw.itemDone) { var ri = LD.fyReward(state, { kind: "item", keep: true }); state = ri.ok ? ri.state : LD.fyReward(state, { kind: "item", keep: false }).state; continue; }
    }
    if (f && f.memo) { var rm = LD.fyMemo(state, "b"); if (!rm.ok) rm = LD.fyMemo(state, "a"); if (!rm.ok) rm = LD.fyMemo(state, "c"); state = rm.state; continue; }
    if (f && f.draft) { var dp = f.draft.offer && f.draft.offer[0] ? LD.fyPick(state, f.draft.offer[0]) : null; state = dp && dp.ok ? dp.state : LD.fyPick(state, null).state; continue; }
    if (state.phase === "deal") {
      var done = false;
      if (o.smart) { /* balance bot: take the option that leaves the best cash / unrest / collapse mix */
        var best = null, bs = -1e9;
        state.offered.forEach(function (id) { var dd = LD.dealById(id); (dd.choices || [{ id: null }]).forEach(function (c) { var t = LD.selectDeal(state, id, c.id); if (!t.ok) return;
          var ts = t.state, sc = ts.cash - (state.unrest > 45 ? 2.5 : 1) * ts.unrest - (state.collapse > 50 ? 1.5 : 0.8) * ts.collapse; if (sc > bs) { bs = sc; best = ts; } }); });
        if (best) { state = best; continue; }
      }
      for (var i = 0; i < state.offered.length && !done; i++) { var d = LD.dealById(state.offered[i]), chs = d.choices || [{ id: null }];
        for (var j = 0; j < chs.length; j++) { var r2 = LD.selectDeal(state, state.offered[i], chs[j].id); if (r2.ok) { state = r2.state; done = true; break; } } }
      if (!done) break; continue;
    }
    if (o.build && !state.bunkerActedThisTurn) {
      var ids = ["air", "water", "power", "food"].sort(function (a, b) { return state.bunker[a].level - state.bunker[b].level; });
      for (var k = 0; k < ids.length; k++) { var bu = LD.buyUpgrade(state, ids[k], "sound"); if (bu && bu.ok) { state = bu.state; break; } bu = LD.buyUpgrade(state, ids[k], "cheap"); if (bu && bu.ok) { state = bu.state; break; } }
    }
    var b = LD.bossInfo(state, state.turn);
    var rq = LD.closeQuarter(state, { bossChoice: b && b.choice ? "pay" : undefined });
    if (!rq.ok) break;
    state = rq.state;
  }
  return hit(state) || (o.full && state.ended) ? state : null;
}
if (typeof module !== "undefined") module.exports = { eraDrive: eraDrive };
