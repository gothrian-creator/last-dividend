
/* Last Dividend — world map layer. Regions, conquest, plants, regional stress.
   Pure engine extension (no DOM). Browser + Node. Hooks are called from game.js. */
(function (root) {
  var LD = root.LD || (root.LD = {});

  LD.REGION_IDS = ["na", "sam", "eu", "af", "me", "sa", "ea", "oc"];
  LD.REGION_NAMES = {
    na: "North America", sam: "South America", eu: "Europe", af: "Africa",
    me: "Middle East", sa: "South Asia", ea: "East Asia", oc: "Oceania"
  };
  LD.HAZARDS = ["fire", "storm", "drought", "flood"];
  LD.HAZARD_NAMES = { fire: "Wildfires", storm: "Hurricanes", drought: "Drought", flood: "Floods" };

  /* One building type for the proof: a private desalination plant. */
  LD.PLANT = {
    name: "Desalination plant",
    cost: 18,
    income: 7,
    boomBonus: 3,
    stressPerQuarter: 1,
    collapsePerQuarter: 1
  };
  LD.PR_PUSH = { name: "Charm offensive", cost: 6, calm: 2 };
  LD.STRESS_TENSE = 2;   /* protests: +1 unrest per quarter */
  LD.STRESS_STRIKE = 4;  /* plant pays nothing, +3 unrest per quarter */
  LD.STRESS_REVOLT = 5;  /* region nationalised: lost, plant seized, +6 unrest */
  LD.STRESS_MAX = 5;
  LD.REVOLT_UNREST = 6;
  LD.STRIKE_UNREST = 3;
  LD.TENSE_UNREST = 1;

  function clamp(n, lo, hi) { return Math.max(lo, Math.min(hi, n)); }

  function worldRng(state, salt) {
    return LD.createRng(LD.hashString(salt + ":" + state.seed));
  }

  function blankRegion() {
    return { owned: false, stress: 0, plant: false, trait: null, hazard: "fire", hazardAt: 70 };
  }

  function initWorld(state) {
    var rng = worldRng(state, "world");
    var regions = {};
    LD.REGION_IDS.forEach(function (id) {
      var r = blankRegion();
      r.hazard = rng.pick(LD.HAZARDS);
      r.hazardAt = 35 + rng.int(50);
      regions[id] = r;
    });
    var order = rng.shuffle(LD.REGION_IDS);
    var home = order[0];
    regions[home].owned = true;
    regions[home].trait = "hq";
    /* Two regions open the run already in crisis, one or two are booming. */
    [order[1], order[2]].forEach(function (id) {
      regions[id].trait = "crisis";
      regions[id].stress = 2;
      regions[id].hazardAt = 0;
    });
    var booms = rng() < 0.5 ? 1 : 2;
    for (var i = 0; i < booms; i++) regions[order[3 + i]].trait = "boom";
    state.world = {
      home: home,
      regions: regions,
      pins: {},
      actedTurn: 0,
      lastClaim: null,
      history: [{ turn: state.turn, cash: state.cash }]
    };
    placePins(state);
    return state;
  }

  function ensureWorld(state) {
    if (!state) return state;
    if (!state.world || !state.world.regions) initWorld(state);
    if (!state.world.pins) state.world.pins = {};
    if (!state.world.history) state.world.history = [{ turn: state.turn, cash: state.cash }];
    return state;
  }

  function region(state, id) {
    return state.world && state.world.regions ? state.world.regions[id] : null;
  }

  function dealKind(deal) {
    if (!deal) return "neutral";
    if (deal.isCrisis) return "crisis";
    if (deal.claims) return "claim";
    var tags = deal.tags || [];
    if (tags.indexOf("restraint") !== -1) return "calm";
    if (tags.indexOf("extractive") !== -1) return "squeeze";
    return "neutral";
  }

  function placePins(state) {
    if (!state.world) return state;
    var rng = worldRng(state, "pins:" + state.turn);
    var used = {};
    var pins = {};
    (state.offered || []).forEach(function (dealId) {
      var deal = LD.dealById(dealId);
      var kind = dealKind(deal);
      var free = LD.REGION_IDS.filter(function (id) { return !used[id]; });
      var pref = free.filter(function (id) {
        var r = state.world.regions[id];
        if (kind === "claim") return !r.owned;
        if (kind === "calm" || kind === "crisis") return r.stress >= LD.STRESS_TENSE;
        if (kind === "squeeze") return r.owned || r.trait === "boom" || r.trait === "crisis";
        return true;
      });
      var pool = pref.length ? pref : free;
      var pick = rng.pick(pool);
      used[pick] = true;
      pins[dealId] = pick;
    });
    state.world.pins = pins;
    return state;
  }

  function stressLabel(stress) {
    if (stress >= LD.STRESS_REVOLT) return "revolt";
    if (stress >= LD.STRESS_STRIKE) return "strike";
    if (stress >= LD.STRESS_TENSE) return "tense";
    return "calm";
  }

  function plantIncome(state, id) {
    var r = region(state, id);
    if (!r || !r.owned || !r.plant) return 0;
    return LD.PLANT.income + (r.trait === "boom" ? LD.PLANT.boomBonus : 0);
  }

  /* What a deal will do on the map, before it is signed. Pure. */
  function dealRegionEffect(state, dealId, choiceId) {
    if (!state.world) return null;
    var regionId = state.world.pins[dealId];
    if (!regionId) return null;
    var deal = LD.dealById(dealId);
    var r = state.world.regions[regionId];
    var kind = dealKind(deal);
    var eff = { regionId: regionId, regionName: LD.REGION_NAMES[regionId], claim: false, stress: 0 };
    if (kind === "claim") {
      if (!r.owned) { eff.claim = true; eff.stress = 1; }
      else eff.stress = 2;
    } else if (kind === "squeeze") {
      eff.stress = 2;
    } else if (kind === "calm") {
      eff.stress = -2;
    } else if (kind === "crisis") {
      var c = null;
      (deal.choices || []).forEach(function (ch) { if (ch.id === choiceId) c = ch; });
      if (c) {
        if (c.cost) eff.stress = -2;
        else if (c.immediate && c.immediate.cash > 0) eff.stress = 2;
        else eff.stress = 1;
      }
    }
    return eff;
  }

  /* Called by selectDeal after a deal is applied. */
  function worldOnDeal(state, deal, choiceId, notes) {
    if (!state.world) return null;
    var eff = dealRegionEffect(state, deal.id, choiceId);
    if (!eff) return null;
    var r = state.world.regions[eff.regionId];
    if (eff.claim) {
      r.owned = true;
      state.world.lastClaim = { regionId: eff.regionId, turn: state.turn };
      if (notes) notes.push("claimed " + eff.regionName);
    }
    if (eff.stress) {
      r.stress = clamp(r.stress + eff.stress, 0, LD.STRESS_MAX);
      if (notes && r.owned && r.stress >= LD.STRESS_TENSE) notes.push(eff.regionName + " " + stressLabel(r.stress));
    }
    return eff;
  }

  function regionGuard(state, regionId) {
    if (state.ended) return "Run already ended.";
    var busyR = LD.fyBusy ? LD.fyBusy(state) : null; if (busyR) return busyR;
    if (!state.world) return "No map.";
    var r = state.world.regions[regionId];
    if (!r) return "Unknown region.";
    if (!r.owned) return "You do not own " + LD.REGION_NAMES[regionId] + " yet.";
    if (state.world.actedTurn === state.turn) return "One regional order per quarter.";
    return null;
  }

  function canBuildPlant(state, regionId) {
    var r = region(state, regionId);
    return !regionGuard(state, regionId) && !r.plant && state.cash >= LD.PLANT.cost;
  }

  function buildPlant(state, regionId) {
    state = LD.deepClone(state);
    var err = regionGuard(state, regionId);
    if (err) return { ok: false, error: err, state: state };
    var r = state.world.regions[regionId];
    if (r.plant) return { ok: false, error: "A plant already runs there.", state: state };
    if (state.cash < LD.PLANT.cost) return { ok: false, error: "Not enough cash (" + LD.PLANT.cost + " required).", state: state };
    state.cash -= LD.PLANT.cost;
    r.plant = true;
    state.world.actedTurn = state.turn;
    state.log.unshift({ turn: state.turn, text: "Opened a " + LD.PLANT.name.toLowerCase() + " in " + LD.REGION_NAMES[regionId] + " for " + LD.PLANT.cost + "." });
    return { ok: true, state: state, cost: LD.PLANT.cost };
  }

  function canCalmRegion(state, regionId) {
    var r = region(state, regionId);
    return !regionGuard(state, regionId) && r.stress > 0 && state.cash >= LD.PR_PUSH.cost;
  }

  function calmRegion(state, regionId) {
    state = LD.deepClone(state);
    var err = regionGuard(state, regionId);
    if (err) return { ok: false, error: err, state: state };
    var r = state.world.regions[regionId];
    if (r.stress <= 0) return { ok: false, error: "It is already calm there.", state: state };
    if (state.cash < LD.PR_PUSH.cost) return { ok: false, error: "Not enough cash (" + LD.PR_PUSH.cost + " required).", state: state };
    state.cash -= LD.PR_PUSH.cost;
    r.stress = Math.max(0, r.stress - LD.PR_PUSH.calm);
    state.world.actedTurn = state.turn;
    state.log.unshift({ turn: state.turn, text: "Charm offensive in " + LD.REGION_NAMES[regionId] + " (" + LD.PR_PUSH.cost + " cash)." });
    return { ok: true, state: state, cost: LD.PR_PUSH.cost };
  }

  /* Called by closeQuarter after delayed effects, before the end check. */
  function resolveWorldQuarter(state) {
    var events = [];
    if (!state.world) return events;
    var unrest = 0, cash = 0, collapse = 0;
    LD.REGION_IDS.forEach(function (id) {
      var r = state.world.regions[id];
      var name = LD.REGION_NAMES[id];
      if (!r.owned) return;
      if (r.plant) r.stress = clamp(r.stress + LD.PLANT.stressPerQuarter, 0, LD.STRESS_MAX);
      else r.stress = Math.max(0, r.stress - 1);
      if (r.stress >= LD.STRESS_REVOLT) {
        var hadPlant = r.plant;
        r.owned = false;
        r.plant = false;
        r.stress = LD.STRESS_TENSE;
        if (r.trait === "hq") r.trait = null;
        unrest += LD.REVOLT_UNREST;
        events.push({ regionId: id, kind: "revolt", unrest: LD.REVOLT_UNREST, text: name + " nationalises your holdings" + (hadPlant ? " and the plant" : "") + ". Unrest +" + LD.REVOLT_UNREST + "." });
        return;
      }
      if (r.plant) {
        if (r.stress >= LD.STRESS_STRIKE) {
          events.push({ regionId: id, kind: "strike", text: name + " plant on strike. No income." });
        } else {
          var pay = plantIncome(state, id);
          cash += pay;
          events.push({ regionId: id, kind: "income", cash: pay, text: name + " plant pays +" + pay + "." });
        }
        collapse += LD.fyPlantCollapse && LD.fyPlantCollapse(state) === 0 ? 0 : LD.PLANT.collapsePerQuarter;
      }
      if (r.stress >= LD.STRESS_STRIKE) {
        unrest += LD.STRIKE_UNREST;
        events.push({ regionId: id, kind: "riot", unrest: LD.STRIKE_UNREST, text: name + " riots. Unrest +" + LD.STRIKE_UNREST + "." });
      } else if (r.stress >= LD.STRESS_TENSE) {
        unrest += LD.TENSE_UNREST;
        events.push({ regionId: id, kind: "protest", unrest: LD.TENSE_UNREST, text: name + " protests. Unrest +" + LD.TENSE_UNREST + "." });
      }
    });
    if (cash) state.cash += cash;
    if (unrest) state.unrest = clamp(state.unrest + unrest, 0, LD.MAX_UNREST);
    if (collapse) {
      state.collapse = clamp(state.collapse + collapse, 0, LD.MAX_COLLAPSE);
      events.push({ regionId: null, kind: "brine", collapse: collapse, text: "Plant brine: collapse +" + collapse + "." });
    }
    if (events.length) {
      var parts = [];
      if (cash) parts.push("+" + cash + " cash");
      if (unrest) parts.push("+" + unrest + " unrest");
      if (collapse) parts.push("+" + collapse + " collapse");
      state.log.unshift({ turn: state.turn, text: "Regional report" + (parts.length ? " (" + parts.join(", ") + ")" : "") + "." });
    }
    return events;
  }

  /* Called by closeQuarter after the new quarter's deals are drawn. */
  function worldAfterClose(state) {
    if (!state.world) return;
    placePins(state);
    state.world.history.push({ turn: state.turn, cash: state.cash });
    if (state.world.history.length > 16) state.world.history.shift();
  }

  function hazardVisible(state, id) {
    var r = region(state, id);
    if (!r) return false;
    return r.stress >= LD.STRESS_TENSE || state.collapse >= r.hazardAt;
  }

  function ownedCount(state) {
    if (!state.world) return 0;
    return LD.REGION_IDS.filter(function (id) { return state.world.regions[id].owned; }).length;
  }

  function plantCount(state) {
    if (!state.world) return 0;
    return LD.REGION_IDS.filter(function (id) { var r = state.world.regions[id]; return r.owned && r.plant; }).length;
  }

  LD.initWorld = initWorld;
  LD.ensureWorld = ensureWorld;
  LD.placePins = placePins;
  LD.dealKind = dealKind;
  LD.dealRegionEffect = dealRegionEffect;
  LD.worldOnDeal = worldOnDeal;
  LD.buildPlant = buildPlant;
  LD.canBuildPlant = canBuildPlant;
  LD.calmRegion = calmRegion;
  LD.canCalmRegion = canCalmRegion;
  LD.regionGuard = regionGuard;
  LD.resolveWorldQuarter = resolveWorldQuarter;
  LD.worldAfterClose = worldAfterClose;
  LD.stressLabel = stressLabel;
  LD.plantIncome = plantIncome;
  LD.hazardVisible = hazardVisible;
  LD.ownedCount = ownedCount;
  LD.plantCount = plantCount;

  if (typeof module !== "undefined" && module.exports) module.exports = LD;
})(typeof globalThis !== "undefined" ? globalThis : this);

  