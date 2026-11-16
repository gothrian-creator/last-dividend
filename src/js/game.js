
/* Last Dividend — pure game engine. Browser + Node. No DOM. */
(function (root) {
  var LD = root.LD || (root.LD = {});

  function deepClone(obj) {
    return JSON.parse(JSON.stringify(obj));
  }

  function clamp(n, lo, hi) {
    return Math.max(lo, Math.min(hi, n));
  }

  function execById(id) {
    var list = LD.EXECUTIVES;
    for (var i = 0; i < list.length; i++) {
      if (list[i].id === id) return list[i];
    }
    return list[0];
  }

  function mods(state) {
    return (state && state.mods) || LD.DEFAULT_MODS;
  }

  function dealById(id) {
    var list = LD.DEALS;
    for (var i = 0; i < list.length; i++) {
      if (list[i].id === id) return list[i];
    }
    return null;
  }

  function emptyBunker() {
    return {
      air: { level: 0, quality: "sound" },
      water: { level: 0, quality: "sound" },
      power: { level: 0, quality: "sound" },
      food: { level: 0, quality: "sound" }
    };
  }

  function createRun(opts) {
    opts = opts || {};
    var seedInput = opts.seed;
    var numericSeed = LD.normalizeSeed(seedInput == null || seedInput === "" ? Date.now() : seedInput);
    var exec = execById(opts.executiveId || "mara");
    var rating = Math.max(0, Math.min((LD.RATINGS || [0]).length - 1, opts.rating | 0));
    var perks = (opts.perks || []).slice();
    var runMods = LD.buildMods ? LD.buildMods(exec, rating, perks) : deepClone(LD.DEFAULT_MODS);
    var start = deepClone(exec.start || {});
    var sd = runMods.startDelta || {};
    start.cash = (start.cash != null ? start.cash : 30) + (sd.cash || 0);
    start.unrest = (start.unrest != null ? start.unrest : 14) + (sd.unrest || 0);
    start.collapse = (start.collapse != null ? start.collapse : 20) + (sd.collapse || 0);
    var bunker = emptyBunker();
    LD.SYSTEMS.forEach(function (sys) {
      var lv = start[sys.id] || 0;
      var q = start[sys.id + "Quality"] || "sound";
      if (lv > 0) {
        bunker[sys.id].level = lv;
        bunker[sys.id].quality = q;
      }
    });
    var state = {
      seed: numericSeed,
      seedLabel: seedInput == null || seedInput === "" ? String(numericSeed) : String(seedInput),
      executiveId: exec.id,
      rating: rating,
      perks: perks,
      mods: runMods,
      packs: (opts.packs || []).slice(),
      mandate: LD.pickMandate ? LD.pickMandate(numericSeed, exec.id) : null,
      turn: 1,
      phase: "deal",
      ap: LD.AP_PER_TURN,
      cash: start.cash != null ? start.cash : 30,
      unrest: start.unrest != null ? start.unrest : 14,
      collapse: start.collapse != null ? start.collapse : 20,
      bunker: bunker,
      engineer: false,
      converting: false,
      grids: { air: 0, water: 0, power: 0, food: 0 },
      pending: [],
      flags: {},
      usedUnique: [],
      recentDealIds: [],
      offered: [],
      lastDealId: null,
      lastBunkerAction: null,
      dealPickedThisTurn: false,
      bunkerActedThisTurn: false,
      log: [],
      ended: false,
      ending: null,
      rngState: numericSeed,
      track: { v: 1, q: [], eraQ: { 1: 1 }, deals: [] }
    };
    var rng = LD.createRng(numericSeed);
    state = offerDeals(state, rng);
    state.rngState = rng.state();
    /* World map layer uses its own seeded stream, so deal draws are unchanged. */
    if (LD.initWorld) LD.initWorld(state);
    if (LD.applyStartWorldMods) LD.applyStartWorldMods(state);
    if (LD.fyInit) LD.fyInit(state, opts);
    pushLog(state, "Q" + state.turn + " opens. " + exec.name + ", " + exec.firm + (LD.ratingName ? " · rated " + LD.ratingName(rating) : "") + ".");
    return state;
  }

  /* Recap tracking: cheap per-quarter snapshots, era entry quarters and signed deals. Old saves lack it; the recap degrades. */
  function track(state) {
    if (!state.track || typeof state.track !== "object") state.track = { v: 1, q: [], eraQ: {}, deals: [], partial: true };
    var tr = state.track; if (!tr.q) tr.q = []; if (!tr.eraQ) tr.eraQ = {}; if (!tr.deals) tr.deals = [];
    return tr;
  }
  function trackQuarter(state) {
    var tr = track(state), t = state.turn;
    tr.q = tr.q.filter(function (x) { return x.t !== t; });
    tr.q.push({ t: t, cash: state.cash, unrest: state.unrest, collapse: state.collapse });
    if (tr.q.length > 20) tr.q = tr.q.slice(-20);
  }
  LD.trackQuarter = trackQuarter;

  function rngFrom(state) {
    return LD.createRng(state.rngState);
  }

  function pushLog(state, text) {
    state.log.unshift({ turn: state.turn, text: text });
    if (state.log.length > 40) state.log.length = 40;
  }

  function hasFlag(state, name) {
    return !!state.flags[name];
  }

  function setFlags(state, flags) {
    if (!flags) return;
    if (Array.isArray(flags)) {
      flags.forEach(function (f) { state.flags[f] = true; });
    } else {
      Object.keys(flags).forEach(function (k) { state.flags[k] = flags[k]; });
    }
  }

  function emptyGrids() {
    return { air: 0, water: 0, power: 0, food: 0 };
  }

  function ensureSupply(state) {
    if (!state.grids) state.grids = emptyGrids();
    if (state.converting == null) state.converting = false;
    return state;
  }

  function gridLevel(state, systemId) {
    ensureSupply(state);
    var n = state.grids[systemId];
    return n == null ? 0 : n;
  }

  function gridLabel(level) {
    if (level >= LD.GRID_DISRUPTED) return "disrupted";
    if (level >= LD.GRID_STRAINED) return "strained";
    return "clear";
  }

  function bumpGrid(state, systemId, delta) {
    if (!state.grids || state.grids[systemId] == null) return;
    state.grids[systemId] = clamp((state.grids[systemId] || 0) + delta, 0, LD.GRID_DISRUPTED);
  }

  function applyGridMap(state, map, sign, notes) {
    if (!map) return notes;
    Object.keys(map).forEach(function (id) {
      var before = gridLevel(state, id);
      bumpGrid(state, id, (map[id] || 0) * sign);
      var after = gridLevel(state, id);
      if (after !== before && notes) {
        notes.push(id + " supply " + gridLabel(after));
      }
    });
    return notes;
  }

  function conversionRate(state) {
    var exec = execById(state.executiveId);
    var r = mods(state).conversionRate;
    if (exec.perks && exec.perks.conversionRate) r = Math.max(r, exec.perks.conversionRate);
    if (LD.fyConversionBonus) r = Math.min(0.9, r + LD.fyConversionBonus(state));
    return r;
  }

  /* Cash a deal actually pays. `deal` is optional (Squeeze modifiers need it). */
  function dealCashAmount(state, cash, deal) {
    if (!cash) return 0;
    if (cash <= 0) return cash;
    var m = mods(state);
    if (m.topDealTrim < 1 && cash >= m.topDealAt) cash = Math.round(cash * m.topDealTrim);
    if (deal && m.squeezeMult !== 1 && (deal.tags || []).indexOf("extractive") !== -1) cash = Math.max(1, Math.round(cash * m.squeezeMult));
    if (state.converting) cash = Math.max(1, Math.floor(cash * conversionRate(state)));
    return cash;
  }

  function defaultSupply(deal, payload) {
    if (payload.strain || payload.ease || (deal && (deal.strain || deal.ease))) {
      return {
        strain: payload.strain || deal.strain || null,
        ease: payload.ease || deal.ease || null
      };
    }
    var tags = (deal && deal.tags) || [];
    var map = {};
    var found = false;
    ["air", "water", "power", "food"].forEach(function (g) {
      if (tags.indexOf(g) !== -1) {
        map[g] = 1;
        found = true;
      }
    });
    if (!found) return { strain: null, ease: null };
    if (tags.indexOf("extractive") !== -1) return { strain: map, ease: null };
    if (tags.indexOf("restraint") !== -1) return { strain: null, ease: map };
    return { strain: null, ease: null };
  }

  function pendingInstallFor(state, systemId) {
    var list = state.pending || [];
    for (var i = 0; i < list.length; i++) {
      if (list[i].install && list[i].install.id === systemId) return list[i];
    }
    return null;
  }

  function pendingStrainLines(state) {
    var lines = [];
    (state.pending || []).forEach(function (item) {
      if (!item.strain) return;
      Object.keys(item.strain).forEach(function (g) {
        lines.push({ id: g, amount: item.strain[g], due: item.due, source: item.source });
      });
    });
    return lines;
  }

  function shipmentQuote(state, systemId, quality) {
    ensureSupply(state);
    var cur = state.bunker[systemId];
    if (!cur || cur.level >= 3) return null;
    var nextLevel = cur.level + 1;
    var converting = !!state.converting;
    var level = gridLevel(state, systemId);
    var surcharge = 0;
    var delay = 0;
    var waived = !converting && level >= LD.GRID_STRAINED && permitAvailable(state);
    if (!converting && !waived) {
      if (level >= LD.GRID_DISRUPTED) {
        surcharge = mods(state).disruptSurcharge;
        delay = 1;
      } else if (level >= LD.GRID_STRAINED) {
        surcharge = mods(state).strainSurcharge;
      }
    }
    var cost = upgradeCost(state, systemId, nextLevel, quality);
    return {
      systemId: systemId,
      level: nextLevel,
      quality: quality,
      cost: cost,
      surcharge: surcharge,
      delay: delay,
      grid: level,
      gridLabel: gridLabel(level),
      converting: converting,
      waived: waived,
      inbound: pendingInstallFor(state, systemId)
    };
  }

  function eligibleDeal(state, deal) {
    if (!deal) return false;
    if (deal.pack && (state.packs || []).indexOf(deal.pack) === -1) return false;
    if (deal.unique && state.usedUnique.indexOf(deal.id) !== -1) return false;
    if (deal.minTurn && state.turn < deal.minTurn) return false;
    if (deal.minUnrest && state.unrest < deal.minUnrest) return false;
    if (deal.minCollapse && state.collapse < deal.minCollapse) return false;
    if (deal.cost && state.cash < deal.cost && !deal.choices) return false;
    return true;
  }

  function offerDeals(state, rng) {
    var crises = [];
    var regular = [];
    LD.DEALS.forEach(function (d) {
      if (!eligibleDeal(state, d)) return;
      if (state.recentDealIds.indexOf(d.id) !== -1 && !d.isCrisis) return;
      if (d.isCrisis) crises.push(d);
      else regular.push(d);
    });
    var picked = [];
    if (crises.length && (state.unrest >= 48 || state.collapse >= 55 || rng() < 0.18 + state.unrest / 400)) {
      var cWeighted = [];
      crises.forEach(function (d) {
        var w = d.weight || 1;
        for (var i = 0; i < w; i++) cWeighted.push(d);
      });
      var crisis = rng.pick(cWeighted);
      picked.push(crisis.id);
    }
    var pool = regular.slice();
    var affinity = (execById(state.executiveId).perks || {}).dealAffinity;
    while (picked.length < 3 && pool.length) {
      var weighted = [];
      pool.forEach(function (d) {
        var w = d.weight || 1;
        if (affinity && d.id === affinity) w *= 2;
        for (var i = 0; i < w; i++) weighted.push(d);
      });
      if (!weighted.length) break;
      var choice = rng.pick(weighted);
      picked.push(choice.id);
      pool = pool.filter(function (d) { return d.id !== choice.id; });
    }
    // Fallback if pool exhausted
    if (picked.length < 3) {
      LD.DEALS.forEach(function (d) {
        if (picked.length >= 3) return;
        if (picked.indexOf(d.id) !== -1) return;
        if (d.isCrisis) return;
        if (d.pack && (state.packs || []).indexOf(d.pack) === -1) return;
        if (d.unique && state.usedUnique.indexOf(d.id) !== -1) return;
        picked.push(d.id);
      });
    }
    state.offered = picked.slice(0, 3);
    return state;
  }
  LD.offerDeals = offerDeals;

  /* Listed cash of a payload, including Disaster Capitalism collapse scaling. */
  function payloadCash(state, payload) {
    if (!payload) return 0;
    var c = payload.cash || 0;
    if (payload.collapseScale) c += Math.floor(state.collapse / 10) * payload.collapseScale;
    return c;
  }

  function applyImmediate(state, payload, notes, deal) {
    notes = notes || [];
    if (!payload) return notes;
    var listed = payloadCash(state, payload);
    if (listed) {
      payload = Object.assign({}, payload, { cash: listed });
      var cash = dealCashAmount(state, payload.cash, deal);
      state.cash = Math.max(0, state.cash + cash);
      if (cash !== payload.cash && payload.cash > 0 && state.converting) {
        notes.push("+" + cash + " cash (conversion rate)");
      } else {
        notes.push((cash >= 0 ? "+" : "") + cash + " cash");
      }
    }
    if (payload.unrest) {
      state.unrest = clamp(state.unrest + payload.unrest, 0, LD.MAX_UNREST);
      notes.push((payload.unrest >= 0 ? "+" : "") + payload.unrest + " unrest");
    }
    if (payload.collapse) {
      state.collapse = clamp(state.collapse + payload.collapse, 0, LD.MAX_COLLAPSE);
      notes.push((payload.collapse >= 0 ? "+" : "") + payload.collapse + " collapse");
    }
    if (payload.flags) setFlags(state, payload.flags);
    if (payload.special === "divertFilters") {
      if (state.bunker.air.level < 1) {
        state.bunker.air.level = 1;
        state.bunker.air.quality = "cheap";
        notes.push("Air L1 installed (discount crates)");
      } else {
        state.cash += 12;
        notes.push("+12 cash (shipment resold)");
      }
    }
    if (payload.grantSystem) {
      grantSystem(state, payload.grantSystem, notes);
    }
    return notes;
  }

  function grantSystem(state, grant, notes) {
    var sys = state.bunker[grant.id];
    if (!sys) return;
    if (sys.level < grant.level) {
      sys.level = grant.level;
      sys.quality = grant.quality || sys.quality;
      notes.push(grant.id + " raised to L" + grant.level + (grant.quality === "cheap" ? " (cheap)" : ""));
    } else if (grant.quality === "sound" && sys.quality === "cheap") {
      sys.quality = "sound";
      notes.push(grant.id + " recertified sound");
    } else {
      state.cash += 8;
      notes.push("Redundant " + grant.id + " component sold, +8 cash");
    }
  }

  function scheduleDelay(state, delay, sourceTitle) {
    if (!delay) return null;
    var exec = execById(state.executiveId);
    var bonus = delay.noBonus ? 0 : ((exec.perks && exec.perks.delayBonus) || 0);
    var due = state.turn + delay.turns + bonus;
    var delayedCash = delay.cash || 0;
    if (delayedCash > 0) delayedCash = dealCashAmount(state, delayedCash);
    var dm = mods(state).delayMult;
    function fallout(n) { return n > 0 && dm !== 1 ? Math.round(n * dm) : (n || 0); }
    var item = {
      due: due,
      source: sourceTitle,
      unrest: fallout(delay.unrest),
      collapse: fallout(delay.collapse),
      cash: delayedCash,
      log: delay.log || (sourceTitle + " comes due."),
      flags: delay.flags || null,
      grantSystem: delay.grantSystem || null,
      effectsIf: delay.effectsIf || null,
      strain: delay.strain || null,
      ease: delay.ease || null,
      install: delay.install || null
    };
    state.pending.push(item);
    return item;
  }

  /* Friendly Regulator: the first paid crisis response of the run is cheaper. */
  function crisisRebate(state, deal, payload) {
    var d = mods(state).crisisDiscount;
    if (!d || !deal || !deal.isCrisis || !payload || !payload.cost) return 0;
    if (state.flags && state.flags.regulatorUsed) return 0;
    return Math.min(d, payload.cost);
  }

  /* Can this crisis response be chosen right now (pay options vanish at high unrest)? */
  function choiceBlocked(state, deal, choice) {
    if (!deal || !deal.isCrisis || !choice || !choice.cost) return null;
    var at = mods(state).crisisNoPayAt;
    if (state.unrest >= at) return "Past being bought (unrest " + at + "+)";
    return null;
  }

  function resolveChoiceDeal(deal, choiceId) {
    if (!deal.choices) return null;
    for (var i = 0; i < deal.choices.length; i++) {
      if (deal.choices[i].id === choiceId) return deal.choices[i];
    }
    return null;
  }

  function selectDeal(state, dealId, choiceId) {
    state = deepClone(state);
    if (state.ended) return { ok: false, error: "Run already ended.", state: state };
    if (state.phase !== "deal") return { ok: false, error: "Deal already chosen this quarter.", state: state };
    if (state.dealPickedThisTurn) return { ok: false, error: "Deal already chosen this quarter.", state: state };
    if (state.ap < LD.DEAL_AP) return { ok: false, error: "No action points remain.", state: state };
    if (state.offered.indexOf(dealId) === -1) return { ok: false, error: "That deal is not on offer.", state: state };
    var fyBlock = LD.fyBlockDeal ? LD.fyBlockDeal(state) : null;
    if (fyBlock) return { ok: false, error: fyBlock, state: state };

    var deal = dealById(dealId);
    if (!deal) return { ok: false, error: "Unknown deal.", state: state };

    var payload = deal;
    if (deal.choices) {
      var choice = resolveChoiceDeal(deal, choiceId);
      if (!choice) return { ok: false, error: "Choose a response to this crisis.", state: state, needChoice: true, deal: deal };
      payload = choice;
    }

    var m = mods(state);
    var cost = payload.cost || 0;
    if (deal.isCrisis && cost && state.unrest >= m.crisisNoPayAt) {
      return { ok: false, error: "They are past being bought. Paying is off the table at unrest " + m.crisisNoPayAt + "+.", state: state };
    }
    var rebate = crisisRebate(state, deal, payload);
    if (cost && state.cash < cost - rebate) {
      return { ok: false, error: "Not enough cash (" + (cost - rebate) + " required).", state: state };
    }

    var pendingBefore = state.pending.length;
    var cashBefore = state.cash;
    var notes = applyImmediate(state, payload.immediate, [], deal);
    if (rebate) {
      state.cash += rebate;
      state.flags.regulatorUsed = true;
      notes.push("regulator rebate +" + rebate);
    }
    if (m.calmBonus && LD.dealKind && LD.dealKind(deal) === "calm") {
      state.unrest = clamp(state.unrest - m.calmBonus, 0, LD.MAX_UNREST);
      notes.push("−" + m.calmBonus + " unrest (media darling)");
    }
    if (payload.delay) scheduleDelay(state, payload.delay, deal.title);
    var supply = defaultSupply(deal, payload);
    if (supply.ease) applyGridMap(state, supply.ease, -1, notes);
    if (supply.strain) {
      var execS = execById(state.executiveId);
      var bonusS = (execS.perks && execS.perks.delayBonus) || 0;
      scheduleDelay(state, {
        turns: 0 + bonusS,
        strain: supply.strain,
        log: "Public networks you still buy from have tightened."
      }, deal.title);
      Object.keys(supply.strain).forEach(function (g) {
        var next = Math.min(LD.GRID_DISRUPTED, gridLevel(state, g) + supply.strain[g]);
        notes.push(g + " supply will be " + gridLabel(next) + " at close");
      });
    }
    var regionEffect = LD.worldOnDeal ? LD.worldOnDeal(state, deal, choiceId, notes) : null;
    if (LD.fyOnDeal) LD.fyOnDeal(state, deal, payload, choiceId, notes, pendingBefore);
    if (deal.unique || deal.isCrisis) {
      if (state.usedUnique.indexOf(deal.id) === -1) state.usedUnique.push(deal.id);
    }

    state.ap -= LD.DEAL_AP;
    state.dealPickedThisTurn = true;
    state.lastDealId = deal.id;
    state.phase = "bunker";
    state.recentDealIds = state.recentDealIds.concat([deal.id]).slice(-6);
    var line = deal.title;
    if (payload.label) line += " — " + payload.label;
    if (notes.length) line += " (" + notes.join(", ") + ")";
    if (payload.delay) {
      var exec = execById(state.executiveId);
      var bonus = (exec.perks && exec.perks.delayBonus) || 0;
      line += ". Due Q" + (state.turn + payload.delay.turns + bonus) + ".";
    }
    pushLog(state, line);
    var trd = track(state);
    trd.deals.push({ q: state.turn, id: deal.id, title: deal.title, choice: payload.label || null, cash: state.cash - cashBefore });
    if (trd.deals.length > 24) trd.deals = trd.deals.slice(-24);
    return { ok: true, state: state, notes: notes, region: regionEffect };
  }

  function upgradeCost(state, systemId, level, quality) {
    var table = LD.UPGRADES[systemId];
    if (!table) return null;
    var row = null;
    for (var i = 0; i < table.length; i++) {
      if (table[i].level === level) row = table[i];
    }
    if (!row) return null;
    var m = mods(state);
    var cost = quality === "cheap" ? row.cheap : row.sound;
    var um = m.upgradeMult;
    if (state.converting && execById(state.executiveId).perks && execById(state.executiveId).perks.privateWorks) um *= execById(state.executiveId).perks.privateWorks;
    if (LD.fyRushMult) um *= LD.fyRushMult(state);
    if (um !== 1) cost = Math.round(cost * um);
    if (quality === "cheap" && m.cheapExtra) cost += m.cheapExtra;
    var exec = execById(state.executiveId);
    var perks = exec.perks || {};
    if (systemId === "water" && perks.waterUpgradeDiscount) cost -= perks.waterUpgradeDiscount;
    if (systemId === "power" && perks.powerUpgradeDiscount) cost -= perks.powerUpgradeDiscount;
    if (systemId === "air" && perks.airUpgradeDiscount) cost -= perks.airUpgradeDiscount;
    if (systemId === "food" && hasFlag(state, "seedVault")) cost -= 6;
    if (systemId === "food" && level === 2 && hasFlag(state, "farmLand")) cost -= 6;
    if (systemId === "power" && level === 2 && hasFlag(state, "solarWriteoff")) cost -= 8;
    if (!state.converting && !permitAvailable(state)) {
      var gl = gridLevel(state, systemId);
      if (gl >= LD.GRID_DISRUPTED) cost += m.disruptSurcharge;
      else if (gl >= LD.GRID_STRAINED) cost += m.strainSurcharge;
    }
    if (state.bunker.water.level >= 2 && systemId === "food" && level === 2) cost -= 6;
    if (state.bunker.power.level >= 2 && (systemId === "air" || systemId === "water") && level === 2) cost -= 4;
    if (level === 3 && LD.fyLv3Discount) cost -= LD.fyLv3Discount(state);
    if (LD.fyPermitCut) cost -= LD.fyPermitCut(state);
    if (hasFlag(state, "freightCharter")) {
      cost = Math.floor(cost * 0.7);
    }
    return Math.max(4, cost);
  }

  /* Pre-Approved Permits: an order that ignores public-network damage. */
  function permitAvailable(state) {
    var m = mods(state);
    return m.permitWaivers > ((state.flags && state.flags.permitsUsed) || 0);
  }

  function availableUpgrades(state) {
    var list = [];
    LD.SYSTEMS.forEach(function (sys) {
      var cur = state.bunker[sys.id];
      var nextLevel = cur.level + 1;
      if (nextLevel > 3) return;
      var table = LD.UPGRADES[sys.id];
      var row = table[nextLevel - 1];
      var inbound = pendingInstallFor(state, sys.id);
      var soundQ = shipmentQuote(state, sys.id, "sound");
      var cheapQ = shipmentQuote(state, sys.id, "cheap");
      var soundCost = soundQ ? soundQ.cost : upgradeCost(state, sys.id, nextLevel, "sound");
      var cheapCost = cheapQ ? cheapQ.cost : upgradeCost(state, sys.id, nextLevel, "cheap");
      list.push({
        systemId: sys.id,
        systemName: sys.name,
        level: nextLevel,
        name: row.name,
        soundCost: soundCost,
        cheapCost: cheapCost,
        canSound: !inbound && state.cash >= soundCost,
        canCheap: !inbound && state.cash >= cheapCost,
        delay: soundQ ? soundQ.delay : 0,
        surcharge: soundQ ? soundQ.surcharge : 0,
        gridLabel: soundQ ? soundQ.gridLabel : "clear",
        inbound: inbound
      });
    });
    return list;
  }

  function engineerCost(state) {
    var c = mods(state).engineerCost;
    var exec = execById(state.executiveId);
    if (exec.perks && exec.perks.engineerExtra) c += exec.perks.engineerExtra;
    if (hasFlag(state, "poachedTalent")) c -= 10;
    return Math.max(8, c);
  }

  function engineerBlocked(state) {
    var t = mods(state).engineerMinTurn || 1;
    return state.turn < t ? "Your retainer engineer is not free until Q" + t + "." : null;
  }

  function canHireEngineer(state) {
    return !state.engineer && !engineerBlocked(state) && state.cash >= engineerCost(state);
  }

  function bunkerGuard(state) {
    if (state.ended) return "Run already ended.";
    var busyB = LD.fyBusy ? LD.fyBusy(state) : null; if (busyB) return busyB;
    if (state.phase !== "bunker") return "Choose a deal first.";
    if (state.bunkerActedThisTurn) return "Bunker action already taken this quarter.";
    if (state.ap < LD.BUNKER_AP) return "No action points remain.";
    return null;
  }

  function buyUpgrade(state, systemId, quality) {
    state = deepClone(state);
    var err = bunkerGuard(state);
    if (err) return { ok: false, error: err, state: state };
    if (quality !== "sound" && quality !== "cheap") {
      return { ok: false, error: "Choose sound or discount contractors.", state: state };
    }
    var cur = state.bunker[systemId];
    if (!cur) return { ok: false, error: "Unknown system.", state: state };
    if (cur.level >= 3) return { ok: false, error: "That system is already at maximum.", state: state };
    var nextLevel = cur.level + 1;
    var cost = upgradeCost(state, systemId, nextLevel, quality);
    if (state.cash < cost) return { ok: false, error: "Not enough cash (" + cost + " required).", state: state };

    if (hasFlag(state, "skilledCrew")) {
      quality = "sound";
      delete state.flags.skilledCrew;
    }
    if (hasFlag(state, "freightCharter")) {
      delete state.flags.freightCharter;
    }

    if (pendingInstallFor(state, systemId)) {
      return { ok: false, error: "A shipment for that system is already in transit.", state: state };
    }
    var quote = shipmentQuote(state, systemId, quality);
    state.cash -= cost;
    if (quote && quote.waived) {
      state.flags.permitsUsed = (state.flags.permitsUsed || 0) + 1;
      pushLog(state, "Pre-approved permit used: public-network surcharge waived.");
    }
    var row = LD.UPGRADES[systemId][nextLevel - 1];
    if (quote && quote.delay > 0) {
      scheduleDelay(state, {
        turns: quote.delay,
        noBonus: true,
        install: { id: systemId, level: nextLevel, quality: quality },
        log: "Private-shelter shipment arrived: " + row.name + "."
      }, row.name);
      state.ap -= LD.BUNKER_AP;
      state.bunkerActedThisTurn = true;
      if (LD.fyAfterBunker) LD.fyAfterBunker(state);
      state.lastBunkerAction = "upgrade:" + systemId + ":L" + nextLevel + ":" + quality + ":delayed";
      pushLog(state, "Paid " + cost + " for " + row.name + " (" + systemId + " L" + nextLevel + ", " + quality + "). Public " + systemId + " is disrupted — arrives Q" + (state.turn + quote.delay) + ".");
      return { ok: true, state: state, cost: cost, delayed: true, due: state.turn + quote.delay };
    }
    cur.level = nextLevel;
    if (quality === "cheap") {
      cur.quality = "cheap";
    } else if (nextLevel >= 3) {
      cur.quality = "sound";
    }
    /* L3 sound remediates; L1/L2 sound does not wash out a prior cheap mark unless L3. */
    state.ap -= LD.BUNKER_AP;
    state.bunkerActedThisTurn = true;
      if (LD.fyAfterBunker) LD.fyAfterBunker(state);
    state.lastBunkerAction = "upgrade:" + systemId + ":L" + nextLevel + ":" + quality;
    pushLog(state, "Installed " + row.name + " (" + systemId + " L" + nextLevel + ", " + quality + ") for " + cost + ".");
    return { ok: true, state: state, cost: cost, delayed: false };
  }

  function hireEngineer(state) {
    state = deepClone(state);
    var err = bunkerGuard(state);
    if (err) return { ok: false, error: err, state: state };
    if (state.engineer) return { ok: false, error: "A chief engineer is already retained.", state: state };
    var eb = engineerBlocked(state);
    if (eb) return { ok: false, error: eb, state: state };
    var cost = engineerCost(state);
    if (state.cash < cost) return { ok: false, error: "Not enough cash (" + cost + " required).", state: state };
    state.cash -= cost;
    state.engineer = true;
    state.ap -= LD.BUNKER_AP;
    state.bunkerActedThisTurn = true;
      if (LD.fyAfterBunker) LD.fyAfterBunker(state);
    state.lastBunkerAction = "engineer";
    pushLog(state, "Retained a chief engineer for " + cost + ".");
    return { ok: true, state: state, cost: cost };
  }

  function canBeginConversion(state) {
    return !(LD.fyBusy && LD.fyBusy(state)) && !state.ended && state.phase === "bunker" && !state.bunkerActedThisTurn && !state.converting && state.ap >= LD.BUNKER_AP;
  }

  function beginConversion(state, systemId, quality) {
    state = deepClone(state);
    var err = bunkerGuard(state);
    if (err) return { ok: false, error: err, state: state };
    if (state.converting) return { ok: false, error: "You have already converted to private supply.", state: state };
    if (systemId && quality !== "sound" && quality !== "cheap") {
      return { ok: false, error: "Choose sound or discount contractors.", state: state };
    }
    var cost = 0;
    var secured = null;
    var fee = mods(state).conversionFee || 0;
    if (state.cash < fee) return { ok: false, error: "Going private needs " + fee + " cash for the offshore paperwork.", state: state };
    if (systemId) {
      var curCheck = state.bunker[systemId];
      if (!curCheck) return { ok: false, error: "Unknown system.", state: state };
      if (curCheck.level >= 3) return { ok: false, error: "That system is already at maximum.", state: state };
      if (pendingInstallFor(state, systemId)) {
        return { ok: false, error: "A shipment for that system is already in transit.", state: state };
      }
      var priced = deepClone(state);
      priced.converting = true;
      if (hasFlag(priced, "skilledCrew")) quality = "sound";
      var nextCheck = curCheck.level + 1;
      cost = upgradeCost(priced, systemId, nextCheck, quality);
      if (state.cash < cost + fee) return { ok: false, error: "Not enough cash (" + (cost + fee) + " required).", state: state };
    }
    state.converting = true;
    if (LD.fyOnConvert) LD.fyOnConvert(state);
    if (fee) state.cash -= fee;
    if (systemId) {
      if (hasFlag(state, "skilledCrew")) {
        quality = "sound";
        delete state.flags.skilledCrew;
      }
      if (hasFlag(state, "freightCharter")) {
        delete state.flags.freightCharter;
      }
      var cur = state.bunker[systemId];
      var nextLevel = cur.level + 1;
      cost = upgradeCost(state, systemId, nextLevel, quality);
      state.cash -= cost;
      cur.level = nextLevel;
      if (quality === "cheap") cur.quality = "cheap";
      else if (nextLevel >= 3) cur.quality = "sound";
      secured = { systemId: systemId, level: nextLevel, quality: quality, name: LD.UPGRADES[systemId][nextLevel - 1].name };
      state.lastBunkerAction = "convert:" + systemId + ":L" + nextLevel + ":" + quality;
    } else {
      state.lastBunkerAction = "convert";
    }
    state.ap -= LD.BUNKER_AP;
    state.bunkerActedThisTurn = true;
      if (LD.fyAfterBunker) LD.fyAfterBunker(state);
    pushLog(state, "Converted to private supply. Further deals pay " + Math.round(conversionRate(state) * 100) + "% cash." + (fee ? " Offshore paperwork " + fee + "." : "") + " Installs ignore public-network damage and arrive this quarter.");
    if (secured) {
      pushLog(state, "Secured " + secured.name + " (" + secured.systemId + " L" + secured.level + ", " + secured.quality + ") for " + cost + ".");
    }
    return { ok: true, state: state, cost: cost + fee, secured: secured };
  }

  function systemReliable(state, systemId) {
    var sys = state.bunker[systemId];
    if (!sys || sys.level < LD.WIN_LEVEL) return false;
    var fyRel = LD.fyReliable ? LD.fyReliable(state, sys) : null;
    if (fyRel !== null) return fyRel;
    if (sys.quality === "sound") return true;
    if (sys.level >= 3) return true;
    if (state.engineer) return true;
    return false;
  }

  function evacuationResult(state) {
    var missing = [];
    var unreliable = [];
    LD.SYSTEMS.forEach(function (s) {
      var sys = state.bunker[s.id];
      if (sys.level < LD.WIN_LEVEL) missing.push(s.name);
      else if (!systemReliable(state, s.id)) unreliable.push(s.name);
    });
    if (missing.length) {
      return {
        kind: "lose",
        reason: "unfinished",
        title: "An unfinished hole in the ground",
        body: "The doors can close. They should not. Incomplete systems: " + missing.join(", ") + "."
      };
    }
    if (unreliable.length) {
      return {
        kind: "lose",
        reason: "failed-systems",
        title: "The cheapest filters failed first",
        body: "You sealed on time. The bargain work did not hold. Failed systems: " + unreliable.join(", ") + ". A chief engineer, or level-3 redundancy, would have carried them."
      };
    }
    var flavor = [];
    if (hasFlag(state, "clinicSold")) flavor.push("There is no surgeon. You did sell the clinic lot.");
    if (hasFlag(state, "blackoutContracts")) flavor.push("The generator is yours. The grid you priced in the dark is not coming back.");
    if (state.collapse < 70 && state.cash >= 20) flavor.push("You left money on the table. The street would have taken it anyway.");
    if (state.converting) flavor.push("You converted to a private supply chain before the public one finished failing.");
    else if ((state.grids && (state.grids.water + state.grids.power + state.grids.air + state.grids.food)) >= 3) {
      flavor.push("The municipal contracts you sold are not coming back. Your private ones did.");
    }
    var body = "Air, water, power, and food all hold. The last dividend is silence.";
    if (flavor.length) body += " " + flavor.join(" ");
    return {
      kind: "win",
      reason: "evacuated",
      title: "The doors close on time",
      body: body
    };
  }

  function applyPendingDue(state) {
    var fired = [];
    var keep = [];
    state.pending.forEach(function (item) {
      if (item.due > state.turn || item.install) {
        keep.push(item);
        return;
      }
      var notes = [];
      var unrest = item.unrest || 0;
      var collapse = item.collapse || 0;
      var cash = item.cash || 0;
      if (item.effectsIf) {
        var cond = item.effectsIf;
        var apply = true;
        if (cond.unlessFlag && hasFlag(state, cond.unlessFlag)) apply = false;
        if (cond.ifFlag && !hasFlag(state, cond.ifFlag)) apply = false;
        if (apply) {
          unrest += cond.unrest || 0;
          collapse += cond.collapse || 0;
          cash += cond.cash || 0;
        }
      }
      var exec = execById(state.executiveId);
      if (collapse > 0 && exec.perks && exec.perks.foodCollapseRelief && item.grantSystem == null) {
        /* Imani only relieves collapse on food-tagged delayed pain if we stored it; keep simple: small relief always on delayed collapse. */
      }
      if (unrest) {
        state.unrest = clamp(state.unrest + unrest, 0, LD.MAX_UNREST);
        notes.push((unrest >= 0 ? "+" : "") + unrest + " unrest");
      }
      if (collapse) {
        state.collapse = clamp(state.collapse + collapse, 0, LD.MAX_COLLAPSE);
        notes.push((collapse >= 0 ? "+" : "") + collapse + " collapse");
      }
      if (cash) {
        state.cash = Math.max(0, state.cash + cash);
        notes.push((cash >= 0 ? "+" : "") + cash + " cash");
      }
      if (item.flags) setFlags(state, item.flags);
      if (item.grantSystem) grantSystem(state, item.grantSystem, notes);
      if (item.strain) applyGridMap(state, item.strain, 1, notes);
      if (item.ease) applyGridMap(state, item.ease, -1, notes);
      var line = item.log + (notes.length ? " (" + notes.join(", ") + ")" : "");
      pushLog(state, line);
      fired.push({ text: line, source: item.source });
    });
    state.pending = keep;
    return fired;
  }

  function baseTick(state) {
    var m = mods(state);
    return m.collapseTick + (state.turn >= m.lateAccelTurn ? 1 : 0);
  }

  function collapseTickAmount(state) {
    var tick = baseTick(state);
    if (hasFlag(state, "softQuarter")) {
      tick -= 2;
      delete state.flags.softQuarter;
    }
    var exec = execById(state.executiveId);
    if (exec.perks && exec.perks.foodCollapseRelief && state.turn < 5) tick -= exec.perks.foodCollapseRelief;
    return Math.max(1, tick);
  }

  function forecastQuarters(state) {
    var exec = execById(state.executiveId);
    var relief = (exec.perks && exec.perks.foodCollapseRelief) || 0;
    var remain = LD.MAX_COLLAPSE - state.collapse;
    if (remain <= 0) return 0;
    var m = mods(state);
    var q = 0, turn = state.turn, soft = hasFlag(state, "softQuarter");
    while (remain > 0 && q < 40) {
      var tick = m.collapseTick + (turn >= m.lateAccelTurn ? 1 : 0) - (turn < 5 ? relief : 0);
      if (soft) { tick -= 2; soft = false; }
      remain -= Math.max(1, tick);
      turn += 1;
      q += 1;
    }
    return q;
  }

  function maybeEnd(state) {
    if (state.ended) return;
    if (state.unrest >= LD.MAX_UNREST) {
      state.ended = true;
      state.ending = {
        kind: "lose",
        reason: "unrest",
        title: "The street is in the lobby",
        body: "The board is still in session. You do not reach the car."
      };
      state.phase = "ended";
      pushLog(state, "Run ends: unrest reached " + LD.MAX_UNREST + ".");
      return;
    }
    if (state.collapse >= LD.MAX_COLLAPSE) {
      var result = evacuationResult(state);
      if (result.kind === "win") {
        result.title = "The sirens started during the ribbon-cutting";
        result.body = "Collapse reached the door. Your bunker held. " + result.body;
      } else if (result.reason === "unfinished") {
        result.title = "The countdown expired in an unfinished room";
        result.body = "Collapse reached 100 before the bunker was ready. " + result.body;
      } else {
        result.title = "The doors closed on bargain work";
        result.body = "Collapse forced an evacuation. " + result.body;
      }
      state.ended = true;
      state.ending = result;
      state.phase = "ended";
      pushLog(state, "Run ends: collapse reached " + LD.MAX_COLLAPSE + " — " + result.kind + ".");
    }
  }

  function applyIncomingInstalls(state) {
    var fired = [];
    var keep = [];
    state.pending.forEach(function (item) {
      if (!item.install || item.due > state.turn) {
        keep.push(item);
        return;
      }
      var notes = [];
      grantSystem(state, item.install, notes);
      var text = item.log || (item.source + " arrives.");
      if (notes.length) text += " " + notes.join(", ") + ".";
      pushLog(state, text);
      fired.push({ source: item.source, text: text, item: item });
    });
    state.pending = keep;
    return fired;
  }

  function closeQuarter(state, opts) {
    state = deepClone(state);
    if (state.ended) return { ok: false, error: "Run already ended.", state: state };
    if (state.phase === "deal" || !state.dealPickedThisTurn) {
      return { ok: false, error: "Choose a deal before closing the quarter.", state: state };
    }
    var busyC = LD.fyBusy ? LD.fyBusy(state) : null;
    if (busyC) return { ok: false, error: busyC, state: state };
    var fired = (LD.fyPreClose ? LD.fyPreClose(state, opts) : []).concat(applyPendingDue(state));
    var worldEvents = LD.spreadCrises ? LD.spreadCrises(state) : [];
    worldEvents = worldEvents.concat(LD.resolveWorldQuarter ? LD.resolveWorldQuarter(state) : []);
    worldEvents.forEach(function (ev) { fired.push({ text: ev.text, source: "map", world: ev }); });
    maybeEnd(state);
    if (state.ended) { trackQuarter(state); return { ok: true, state: state, fired: fired, ended: true, world: worldEvents }; }

    var tick = collapseTickAmount(state);
    state.collapse = clamp(state.collapse + tick, 0, LD.MAX_COLLAPSE);
    pushLog(state, "Quarter closes. Collapse drifts +" + tick + ".");
    maybeEnd(state);
    if (!state.ended && LD.fyYearEnd) LD.fyYearEnd(state);
    trackQuarter(state);
    if (state.ended) return { ok: true, state: state, fired: fired, ended: true, tick: tick, world: worldEvents };

    state.turn += 1;
    var eraNow = LD.actOf ? LD.actOf(Math.min(12, state.turn)) : (state.turn <= 4 ? 1 : state.turn <= 8 ? 2 : 3);
    var trE = track(state); if (trE.eraQ[eraNow] == null) trE.eraQ[eraNow] = state.turn;
    state.phase = "deal";
    state.ap = LD.AP_PER_TURN;
    state.dealPickedThisTurn = false;
    state.bunkerActedThisTurn = false;
    state.lastDealId = null;
    state.lastBunkerAction = null;
    var rng = rngFrom(state);
    offerDeals(state, rng);
    state.rngState = rng.state();
    if (LD.worldAfterClose) LD.worldAfterClose(state);
    var arrivals = applyIncomingInstalls(state);
    if (arrivals.length) fired = fired.concat(arrivals);
    pushLog(state, "Q" + state.turn + " opens.");
    var draft = LD.fyAfterClose ? LD.fyAfterClose(state) : null;
    return { ok: true, state: state, fired: fired, ended: false, tick: tick, world: worldEvents, draft: draft };
  }

  function attemptEvacuation(state) {
    state = deepClone(state);
    if (state.ended) return { ok: false, error: "Run already ended.", state: state };
    if (state.phase !== "bunker") return { ok: false, error: "Choose a deal first.", state: state };
    var busyE = LD.fyBusy ? LD.fyBusy(state) : null;
    if (busyE) return { ok: false, error: busyE, state: state };
    if (state.turn < LD.MIN_EVAC_TURN) {
      return { ok: false, error: "The bunker cannot be sealed before quarter " + LD.MIN_EVAC_TURN + ".", state: state };
    }
    var result = evacuationResult(state);
    state.ended = true;
    state.ending = result;
    state.phase = "ended";
    pushLog(state, "You seal the bunker. " + result.title);
    trackQuarter(state);
    return { ok: true, state: state, ending: result };
  }

  function canEvacuate(state) {
    return !state.ended && state.phase === "bunker" && state.turn >= LD.MIN_EVAC_TURN && !(LD.fyBusy && LD.fyBusy(state));
  }

  function restart(state, opts) {
    opts = opts || {};
    return createRun({
      seed: opts.seed != null ? opts.seed : (Date.now() >>> 0),
      executiveId: opts.executiveId || (state && state.executiveId) || "mara",
      rating: opts.rating != null ? opts.rating : (state && state.rating) || 0,
      perks: opts.perks || (state && state.perks) || []
    });
  }

  function snapshot(state) {
    return deepClone(state);
  }

  function isExecutiveUnlocked(id, meta) {
    var exec = execById(id);
    if (!exec) return false;
    if (exec.unlocked) return true;
    meta = meta || { runs: 0, wins: 0, finished: 0 };
    if (meta.owned && meta.owned.indexOf("exec:" + id) !== -1) return true;
    if (exec.unlock === "finish-run") return meta.finished >= 1;
    if (exec.unlock === "win-run") return meta.wins >= 1;
    if (exec.unlock === "three-runs") return meta.finished >= 3;
    return false;
  }

  LD.deepClone = deepClone;
  LD.execById = execById;
  LD.dealById = dealById;
  LD.createRun = createRun;
  LD.selectDeal = selectDeal;
  LD.upgradeCost = upgradeCost;
  LD.availableUpgrades = availableUpgrades;
  LD.engineerCost = engineerCost;
  LD.canHireEngineer = canHireEngineer;
  LD.buyUpgrade = buyUpgrade;
  LD.hireEngineer = hireEngineer;
  LD.beginConversion = beginConversion;
  LD.canBeginConversion = canBeginConversion;
  LD.gridLevel = gridLevel;
  LD.gridLabel = gridLabel;
  LD.shipmentQuote = shipmentQuote;
  LD.pendingInstallFor = pendingInstallFor;
  LD.pendingStrainLines = pendingStrainLines;
  LD.dealCashAmount = dealCashAmount;
  LD.defaultSupply = defaultSupply;
  LD.ensureSupply = ensureSupply;
  LD.systemReliable = systemReliable;
  LD.evacuationResult = evacuationResult;
  LD.closeQuarter = closeQuarter;
  LD.attemptEvacuation = attemptEvacuation;
  LD.canEvacuate = canEvacuate;
  LD.restart = restart;
  LD.snapshot = snapshot;
  LD.forecastQuarters = forecastQuarters;
  LD.isExecutiveUnlocked = isExecutiveUnlocked;
  LD.eligibleDeal = eligibleDeal;
  LD.mods = mods;
  LD.payloadCash = payloadCash;
  LD.conversionRate = conversionRate;
  LD.crisisRebate = crisisRebate;
  LD.choiceBlocked = choiceBlocked;
  LD.engineerBlocked = engineerBlocked;
  LD.permitAvailable = permitAvailable;
  LD.collapseTickAmountPreview = baseTick;

  if (typeof module !== "undefined" && module.exports) {
    module.exports = LD;
  }
})(typeof globalThis !== "undefined" ? globalThis : this);

  