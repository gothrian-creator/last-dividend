
/* Last Dividend — Fiscal Year: acts, boss quarters, Quarterly Acquisitions (Assets + Liabilities),
   rule-per-tier ratings. Pure engine extension (no DOM). Browser + Node. Hooked from game.js. */
(function (root) {
  var LD = root.LD || (root.LD = {});
  function clamp(n, lo, hi) { return Math.max(lo, Math.min(hi, n)); }
  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  function tagged(d, t) { return !!d && (d.tags || []).indexOf(t) !== -1; }

  LD.FY = {
    QUARTERS: 12, ACT_LEN: 4, SEAL_Q: 9,
    CAP: 5, SKIP_CASH: 3, DIVEST_CASH: 4,
    DRAWER: 3,            /* desk-drawer slots for office items */
    INFLATION: 0.25,      /* bunker works +25% per act ("construction inflation") */
    BOSS_BASE: 1.6        /* boss strength at AAA */
  };
  LD.ACTS = [
    { n: 1, roman: "I", name: "The Street", year: "1978" },
    { n: 2, roman: "II", name: "The Middle", year: "2008" },
    { n: 3, roman: "III", name: "The Top", year: "Now" }
  ];
  LD.RARITY = {
    C: { name: "Common", w: 60, wRare: 0 },
    U: { name: "Preferred", w: 30, wRare: 50 },
    R: { name: "Blue-chip", w: 10, wRare: 45 },
    L: { name: "Systemic", w: 0, wRare: 5 }
  };
  LD.ARCHETYPES = {
    baron: { name: "Squeeze Baron", set: 3, setName: "The Cartel", setText: "Squeeze deals +$2M more" },
    pr: { name: "PR Spin", set: 3, setName: "The Narrative", setText: "Soothe deals −2 more unrest" },
    bunker: { name: "Bunker Engineer", set: 3, setName: "General Contractor", setText: "Bunker works another −10%" },
    network: { name: "Network Owner", set: 3, setName: "The Utility", setText: "No strain surcharge; disrupted surcharge halved" },
    crisis: { name: "Crisis Profiteer", set: 3, setName: "Vulture Fund", setText: "Crises can always be paid off" },
    time: { name: "Long View", set: 2, setName: "Long View", setText: "−1 collapse every quarter" },
    corp: { name: "Corporate", set: 0 }
  };

  /* Assets: effects live in the hooks below, keyed by id (saves store ids only). */
  LD.FY_ASSETS = [
    { id: "shell", r: "C", arch: "baron", icon: "🐚", name: "Shell Company", text: "Paying Squeeze deals +$3M" },
    { id: "lobby", r: "C", arch: "baron", icon: "🤝", name: "Friendly Lobbyist", text: "Squeeze deals −2 unrest" },
    { id: "creative", r: "U", arch: "baron", icon: "🧮", name: "Creative Accounting", text: "Squeeze fallout lands 1 quarter later" },
    { id: "vertical", r: "U", arch: "baron", icon: "🏗️", name: "Vertical Integration", text: "Squeeze deals tagged with a room you have at Lv 2+ pay +$5M" },
    { id: "regcap", r: "R", arch: "baron", icon: "🏛️", name: "Regulatory Capture", text: "First Squeeze deal each act has no delayed collapse" },
    { id: "press", r: "C", arch: "pr", icon: "📰", name: "Press Office", text: "Soothe deals −3 more unrest" },
    { id: "thoughts", r: "C", arch: "pr", icon: "🙏", name: "Thoughts & Prayers", text: "Crisis responses that cost no cash: −4 unrest" },
    { id: "astro", r: "U", arch: "pr", icon: "📣", name: "Astroturf Network", text: "−2 unrest every quarter" },
    { id: "philan", r: "U", arch: "pr", icon: "🎗️", name: "Philanthropy Foundation", text: "Soothe deals refund +$6M (tax-deductible)" },
    { id: "narrative", r: "R", arch: "pr", icon: "🎙️", name: "Narrative Control", text: "Delayed unrest capped at 10 per quarter" },
    { id: "bulk", r: "C", arch: "bunker", icon: "🧱", name: "Bulk Concrete", text: "Bunker works −10%" },
    { id: "prefab", r: "C", arch: "bunker", icon: "📦", name: "Prefab Supplier", text: "Discount works −$3M" },
    { id: "oncall", r: "C", arch: "bunker", icon: "⛑️", name: "On-Call Contractor", text: "Chief engineer −$8M" },
    { id: "redund", r: "R", arch: "bunker", icon: "🛡️", name: "Redundancy Consultant", text: "Discount Lv 2 rooms count as reliable" },
    { id: "easement", r: "C", arch: "network", icon: "🛤️", name: "Pipeline Easement", text: "Network surcharges −$4M" },
    { id: "plantmgr", r: "C", arch: "network", icon: "🏭", name: "Plant Manager", text: "+$2M per plant every quarter" },
    { id: "utility", r: "U", arch: "network", icon: "🔌", name: "Utility Board Seat", text: "Strained networks never surcharge you" },
    { id: "toll", r: "U", arch: "network", icon: "🚧", name: "Toll Road", text: "+$1M per owned region each quarter; +1 unrest every other quarter" },
    { id: "hedge", r: "C", arch: "crisis", icon: "📉", name: "Hedge Desk", text: "Paid crisis responses refund $4M" },
    { id: "chaser", r: "C", arch: "crisis", icon: "🚑", name: "Ambulance Chaser", text: "+$4M whenever you sign a crisis" },
    { id: "short", r: "R", arch: "crisis", icon: "🩳", name: "Short Position", text: "At collapse 60+, every paying deal +$5M" },
    { id: "offsets", r: "C", arch: "time", icon: "🌱", name: "Carbon Offsets", text: "−1 collapse every other quarter" },
    { id: "geo", r: "U", arch: "time", icon: "🛰️", name: "Geoengineering Pilot", text: "Once per act: −6 collapse" },
    { id: "consult", r: "C", arch: "corp", icon: "💼", name: "Management Consultants", text: "+$2M and +1 unrest every quarter" },
    { id: "buyback", r: "C", arch: "corp", icon: "💹", name: "Stock Buyback", text: "+$8M now" },
    { id: "loyalty", r: "R", arch: "corp", icon: "🪑", name: "Board Loyalty", text: "Once per run: unrest 85+ drops to 70" },
    { id: "toobig", r: "L", arch: "corp", icon: "🏦", name: "Too Big To Fail", text: "Once per run: collapse 88+ with an unready bunker resets to 80" },
    { id: "overtime", r: "U", arch: "bunker", icon: "🌙", name: "Overtime Crew", text: "Once per act: a second bunker order in the same quarter" },
    { id: "penthouse", r: "R", arch: "bunker", icon: "🛋️", name: "Penthouse Suite", text: "Lv 3 works −$8M; +3 ◈ per Lv 3 room on a win" },
    { id: "surge", r: "R", arch: "baron", icon: "📈", name: "Surge Pricing AI", text: "At collapse 50+, paying Squeeze deals +40%" },
    { id: "influencer", r: "U", arch: "pr", icon: "🤳", name: "Influencer Retainer", text: "Once per act: your first Soothe deal −4 more unrest and +$4M" },
    { id: "brine", r: "U", arch: "network", icon: "🧂", name: "Brine Partner", text: "Your plants stop adding collapse" },
    { id: "privgrid", r: "R", arch: "network", icon: "🔋", name: "Private Grid", text: "Going private keeps 15% more deal cash (max 90%)" },
    { id: "disfut", r: "U", arch: "crisis", icon: "🌪️", name: "Disaster Futures", text: "+$3M each quarter a crisis is on offer" },
    { id: "futures", r: "U", arch: "time", icon: "⏳", name: "Futures Desk", text: "Delayed collapse from your deals lands 1 quarter later" },
    { id: "rolodex", r: "U", arch: "corp", icon: "📇", name: "Golden Rolodex", text: "At the door you hold 6 cards, not 5" },
    { id: "chief", r: "R", arch: "corp", icon: "🗂️", name: "Chief of Staff", text: "+1◆ in the first round of every fight" },
    { id: "soundproof", r: "U", arch: "pr", icon: "🔇", name: "Soundproofed Door", text: "Unrest −2 every quarter (you stop answering). Hidden cost: crisis pay-offs cost $4M more, and the door stops warning you" },
    { id: "holo", r: "U", arch: "corp", icon: "🖼️", name: "Holo-Window", text: "The window shows a calm city: +$3M every quarter. Hidden cost: collapse +1 every quarter" }
  ];
  LD.LIABILITIES = [
    { id: "classaction", icon: "⚖️", name: "Class Action", text: "+2 unrest per quarter until you sign a Soothe deal" },
    { id: "audit", icon: "🔍", name: "Building Audit", text: "Bunker works +15% for the rest of this act" },
    { id: "whistle", icon: "📯", name: "Whistleblower", text: "Your next deal's delayed fallout ×1.5" },
    { id: "stranded", icon: "🪨", name: "Stranded Asset", text: "Takes a Portfolio slot. Worth nothing." },
    { id: "mole", icon: "🐀", name: "The Mole", text: "Your next boss is 15% harder. Leaves after that boss." },
    { id: "toxic", icon: "☣️", name: "Toxic Brand", text: "Soothe deals calm 3 less for the rest of this act" }
  ];
  var BY_ID = {};
  LD.FY_ASSETS.forEach(function (a) { BY_ID[a.id] = a; });
  LD.LIABILITIES.forEach(function (l) { l.liability = true; BY_ID[l.id] = l; });
  function cardById(id) { return BY_ID[id] || null; }

  /* ---------- Office: the mainland city, the door, the executive's nerve ---------- */
  LD.OFFICE = { DOOR: [20, 40, 60], CITY: [22, 40, 58, 76], CITY_MIN: -15, CITY_MAX: 30 };
  function cityDecay(state) { var f = fy(state); return Math.max(0, Math.round(state.collapse * 0.85 + ((f && f.city) || 0))); }
  LD.cityDecay = cityDecay;
  LD.cityStage = function (state) { var d = cityDecay(state), st = 0; LD.OFFICE.CITY.forEach(function (x) { if (d >= x) st++; }); return st; };
  LD.CITY_NAMES = ["Clear skies", "Haze", "Smog alerts", "Fires on the mainland", "Blackout city"];
  LD.doorLevel = function (state) { var u = state.unrest, D = LD.OFFICE.DOOR; return u >= D[2] ? 3 : u >= D[1] ? 2 : u >= D[0] ? 1 : 0; };
  LD.DOOR_NAMES = ["A polite tap", "Knocking", "Pounding", "They're at the door"];
  LD.execMood = function (state) { var u = state.unrest, c = state.collapse; return u >= 60 || c >= 78 ? "panic" : u >= 35 || c >= 55 ? "nervous" : "confident"; };
  function cityAdd(state, n) { var f = fy(state); if (!f) return; f.city = clamp((f.city || 0) + n, LD.OFFICE.CITY_MIN, LD.OFFICE.CITY_MAX); }
  LD.fyCityAdd = cityAdd;

  /* ---------- Office items: the desk drawer (active abilities and office fixtures) ---------- */
  LD.ITEMS = [
    { id: "doorman", r: "C", icon: "🛎️", name: "Bribe the Doorman", per: "act", cost: 5, text: "Use: unrest −8, and the door stays quiet this quarter. Costs $5M." },
    { id: "prblitz", r: "C", icon: "📺", name: "PR Blitz", per: "act", cost: 8, text: "Use: repair the mainland (city −10), unrest −3, collapse −2. Costs $8M." },
    { id: "gala", r: "C", icon: "🥂", name: "Charity Gala", per: "act", phase: "deal", text: "Use before signing: your next Soothe deal this quarter refunds $6M and repairs the city." },
    { id: "hotline", r: "U", icon: "☎️", name: "Lobbyist Hotline", per: "act", phase: "deal", text: "Use before signing: redraw this quarter's three deals." },
    { id: "contract", r: "U", icon: "📜", name: "Exclusive Contract", per: "act", phase: "deal", text: "Use before signing: your next Squeeze deal this quarter pays ×1.5, and its fallout lands ×1.5." },
    { id: "rush", r: "U", icon: "🚚", name: "Rush Order", per: "act", text: "Use: bunker works cost 30% less for the rest of this quarter." },
    { id: "cloud", r: "U", icon: "🌧️", name: "Cloud Seeding", per: "act", text: "Use: collapse −6 now. The rain falls on the mainland instead (city +8)." },
    { id: "security", r: "U", icon: "🚓", name: "Private Security", per: "act", text: "Use: unrest −10 now. The crackdown burns blocks (city +8, collapse +2)." },
    { id: "liquidity", r: "R", icon: "💰", name: "Emergency Liquidity", per: "run", text: "Use once: +$20M now, unrest +5." },
    { id: "hush", r: "R", icon: "🤐", name: "Hush Money", per: "run", cost: 10, text: "Use once: every curse leaves your deck. Costs $10M." },
    { id: "pod", r: "R", icon: "🧩", name: "Prefab Pod", per: "run", cost: 12, text: "Use once: your lowest bunker room gains a level (an empty room gets Discount Lv 1). Costs $12M." }
  ];
  var ITEM_BY = {}; LD.ITEMS.forEach(function (it) { ITEM_BY[it.id] = it; });
  LD.itemById = function (id) { return ITEM_BY[id] || null; };
  LD.ITEM_SELL = { C: 4, U: 6, R: 8 };
  function hasItem(state, id) { var f = fy(state); return !!(f && f.drawer && f.drawer.some(function (d) { return d.id === id; })); }
  LD.hasItem = hasItem;
  function itemReady(state, d) {
    var f = fy(state), it = ITEM_BY[d.id]; if (!it || it.office) return false;
    return it.per === "act" ? d.used !== f.act : !d.used;
  }
  LD.itemReady = itemReady;
  /* Why an item can't be used right now (null when it can). */
  LD.itemBlock = function (state, id) {
    var f = fy(state); if (!f || state.ended) return "Not now.";
    var d = (f.drawer || []).filter(function (x) { return x.id === id; })[0], it = ITEM_BY[id];
    if (!d || !it) return "Not in your drawer.";
    if (it.office) return "Always on while it sits in your drawer.";
    if (!itemReady(state, d)) return it.per === "act" ? "Used this act. Ready again next act." : "Already used this run.";
    if (it.cost && state.cash < it.cost) return "Needs $" + it.cost + "M.";
    if (it.phase === "deal" && state.phase !== "deal") return "Use it before you sign this quarter's deal.";
    if (id === "rush" && state.bunkerActedThisTurn) return "Your bunker order for this quarter is already placed.";
    if (id === "rush" && f.rushQ === state.turn) return "Already rushing this quarter.";
    if (id === "hush" && !(f.deck || []).some(function (c) { return isCurse(c.id); })) return "No curses in your deck.";
    if (id === "pod" && LD.SYSTEMS.every(function (x) { return state.bunker[x.id].level >= 3; })) return "Every room is already at Lv 3.";
    if (id === "hotline" && (f.draft || f.memo || f.loot || f.reward || f.fight)) return "Finish what's on the desk first.";
    return null;
  };
  LD.fyUseItem = function (state, id) {
    state = clone(state);
    var f = fy(state), why = LD.itemBlock(state, id);
    if (why) return { ok: false, error: why, state: state };
    var it = ITEM_BY[id], d = f.drawer.filter(function (x) { return x.id === id; })[0], t = state.turn, msg = "";
    if (it.cost) state.cash -= it.cost;
    function un(n) { state.unrest = clamp(state.unrest + n, 0, LD.MAX_UNREST); }
    function col(n) { state.collapse = clamp(state.collapse + n, 0, LD.MAX_COLLAPSE); }
    switch (id) {
      case "doorman": un(-8); f.quietQ = t; msg = "The doorman takes the envelope. Unrest −8; the door goes quiet."; break;
      case "prblitz": cityAdd(state, -10); un(-3); col(-2); msg = "Ribbon cuttings across the mainland. City repaired, unrest −3, collapse −2."; break;
      case "gala": f.galaQ = t; msg = "Gala booked. Your next Soothe deal this quarter refunds $6M and repairs the city."; break;
      case "contract": f.contractQ = t; msg = "Contract drafted. Your next Squeeze deal this quarter pays ×1.5, fallout ×1.5."; break;
      case "hotline":
        state.recentDealIds = (state.recentDealIds || []).concat(state.offered || []);
        LD.offerDeals(state, fyRng(state, "hotline:" + t + ":" + f.act));
        if (LD.placePins) LD.placePins(state);
        msg = "A few calls later, the table has new deals."; break;
      case "rush": f.rushQ = t; msg = "Rush order: bunker works −30% for the rest of this quarter."; break;
      case "cloud": col(-6); cityAdd(state, 8); msg = "The clouds open over the mainland. Collapse −6, city +8."; break;
      case "security": un(-10); cityAdd(state, 8); col(2); msg = "Security clears the streets. Unrest −10; blocks burn (city +8, collapse +2)."; break;
      case "liquidity": state.cash += 20; un(5); msg = "The bailout line opens. +$20M, unrest +5."; break;
      case "hush": var gone = f.deck.filter(function (c) { return isCurse(c.id); });
        f.deck = f.deck.filter(function (c) { return !isCurse(c.id); });
        if (f.fight && !f.fight.done) { var gu = gone.map(function (c) { return c.u; }); ["hand", "draw", "disc"].forEach(function (p) { f.fight[p] = f.fight[p].filter(function (x) { return gu.indexOf(x) === -1; }); }); }
        msg = "Settled out of court: " + gone.length + " curse" + (gone.length === 1 ? "" : "s") + " gone."; break;
      case "pod": var low = LD.SYSTEMS.map(function (x) { return x.id; }).sort(function (a, b) { return state.bunker[a].level - state.bunker[b].level; })[0];
        var b0 = state.bunker[low]; b0.level += 1; if (b0.level === 1 || !b0.quality) b0.quality = "cheap";
        msg = "A prefab pod docks. Your " + low + " room reaches Lv " + b0.level + "."; syncRoomCards(state); break;
    }
    d.used = it.per === "act" ? f.act : true;
    f.itemsUsed = (f.itemsUsed || 0) + 1;
    rebuildMods(state);
    state.log.unshift({ turn: t, text: it.name + ": " + msg });
    return { ok: true, state: state, text: msg, item: it };
  };
  LD.fyRushMult = function (state) { var f = fy(state); return f && f.rushQ === state.turn ? 0.7 : 1; };
  LD.doorQuiet = function (state) { var f = fy(state); return !!(f && (f.quietQ === state.turn || has(state, "soundproof"))); };

  /* Loot: boss wins, some memos and some deals drop an office item. */
  function rollLoot(state, src) {
    var f = fy(state); if (!f || f.loot || state.ended) return null;
    var rng = fyRng(state, "loot:" + src + ":" + state.turn + ":" + (f.lootN || 0));
    var held = {}; f.drawer.forEach(function (d) { held[d.id] = 1; });
    var W = { C: 50, U: 38, R: src === "boss" ? 30 : 12 };
    var pool = []; LD.ITEMS.forEach(function (it) { if (!held[it.id]) for (var i = 0; i < W[it.r]; i++) pool.push(it.id); });
    if (!pool.length) return null;
    var id = pool[Math.floor(rng() * pool.length)];
    f.loot = { id: id, src: src, q: state.turn }; f.lootN = (f.lootN || 0) + 1;
    state.log.unshift({ turn: state.turn, text: "Loot: " + ITEM_BY[id].name + " (" + ({ boss: "boss beaten", memo: "board memo", deal: "deal perk" })[src] + ")." });
    return f.loot;
  }
  LD.fyRollLoot = rollLoot;
  /* keep: true keeps it (replaceId when the drawer is full), false sells it. */
  LD.fyTakeLoot = function (state, keep, replaceId) {
    state = clone(state);
    var f = fy(state); if (!f || !f.loot) return { ok: false, error: "No loot on the desk.", state: state };
    var it = ITEM_BY[f.loot.id], sold = null, text;
    if (!keep) { state.cash += LD.ITEM_SELL[it.r]; text = "Sold " + it.name + " for $" + LD.ITEM_SELL[it.r] + "M."; }
    else {
      if (f.drawer.length >= f.dcap) {
        if (!replaceId || !hasItem(state, replaceId)) return { ok: false, error: "Your drawer is full. Choose an item to sell.", state: state, needReplace: true };
        var ri = ITEM_BY[replaceId]; f.drawer = f.drawer.filter(function (d) { return d.id !== replaceId; });
        state.cash += LD.ITEM_SELL[ri.r]; sold = ri;
      }
      f.drawer.push({ id: it.id, used: null });
      text = it.name + " goes in the drawer" + (sold ? ", " + sold.name + " sold (+$" + LD.ITEM_SELL[sold.r] + "M)" : "") + ".";
    }
    f.loot = null;
    state.log.unshift({ turn: state.turn, text: text });
    return { ok: true, state: state, text: text, item: it, kept: !!keep, sold: sold };
  };

  /* ---------- Bosses ---------- */
  LD.BOSSES = {
    earnings: { name: "The Earnings Call", icon: "📞", kicker: "Act I boss", act: 1 },
    shortseller: { name: "Short-Seller Report", icon: "🐻", kicker: "Act I boss", act: 1 },
    strike: { name: "General Strike", icon: "✊", kicker: "Act II boss", act: 2 },
    bid: { name: "Hostile Takeover Bid", icon: "🦈", kicker: "Act II boss", act: 2 },
    crash: { name: "Market Crash", icon: "💥", kicker: "Act II boss", act: 2 },
    reckoning: { name: "The Reckoning", icon: "🌋", kicker: "Act III boss", act: 3, final: true },
    heatdome: { name: "The Reckoning: Heat Dome", icon: "🔥", kicker: "Act III boss", act: 3, final: true },
    seawall: { name: "The Reckoning: Sea Wall", icon: "🌊", kicker: "Act III boss", act: 3, final: true }
  };
  function seedBosses(seed) {
    var h = LD.hashString("bosses:" + seed);
    return { bossI: ["earnings", "earnings", "shortseller"][h % 3], bossII: ["strike", "crash"][Math.floor(h / 3) % 2], bossIII: ["reckoning", "heatdome", "seawall"][Math.floor(h / 9) % 3] };
  }

  /* ---------- Credit rating rules (cumulative) ---------- */
  function rulesFor(tier) {
    tier = tier | 0;
    return {
      bossMult: tier >= 10 ? 1.15 : tier >= 1 ? 1.06 : 1,
      riderChance: tier >= 2 ? 0.25 : 0,
      crisisUnrest: tier >= 5 ? 3 : 0,
      startCurse: tier >= 6,
      crackedDiscount: tier >= 8,
      paperTrail: tier >= 7,
      finalQ: tier >= 10 ? 11 : 12,
      startCollapse: tier >= 10 ? 5 : 0
    };
  }
  LD.fyRules = rulesFor;

  function actOf(turn) { return turn <= 4 ? 1 : turn <= 8 ? 2 : 3; }
  LD.actOf = actOf;
  function fy(state) { return state && state.fy; }
  function has(state, id) { var f = fy(state); if (!f) return false; for (var i = 0; i < f.hand.length; i++) if (f.hand[i].id === id) return true; return false; }
  LD.has = has;
  function hasActive(state, id) { var f = fy(state); if (!f) return false; for (var i = 0; i < f.hand.length; i++) if (f.hand[i].id === id && ((id !== "audit" && id !== "toxic") || f.hand[i].actOf === f.act)) return true; return false; }
  function archCount(state, arch) { return fy(state) ? fy(state).hand.filter(function (h) { var c = cardById(h.id); return c && c.arch === arch; }).length : 0; }
  /* Drop 1: Cartels (set bonuses) are cut; synergies live on cards. */
  function setOn() { return false; }
  function slotsUsed(state) { return fy(state).hand.filter(function (h) { var c = cardById(h.id); return c && (!c.liability || h.id === "stranded"); }).length; }
  function bossQuarters(state) { return [4, 8, fy(state) ? fy(state).rules.finalQ : 12]; }
  function bossAt(state, q) {
    var f = fy(state); if (!f) return null;
    if (q === 4) return f.bossI || "earnings";
    if (q === 8) return f.bossII;
    if (q === f.rules.finalQ) return f.bossIII || "reckoning";
    return null;
  }
  function bossK(state) { return fy(state).rules.bossMult * LD.FY.BOSS_BASE * (has(state, "mole") ? 1.15 : 1); }
  /* What a boss asks and threatens, as numbers (for UI and resolution). */
  function bossInfo(state, q) {
    var id = bossAt(state, q == null ? state.turn : q);
    if (!id) return null;
    var k = bossK(state), b = LD.BOSSES[id];
    var info = { id: id, q: q == null ? state.turn : q, name: b.name, icon: b.icon, kicker: b.kicker, final: !!b.final };
    if (!b.final && fy(state).deck && LD.ENCOUNTERS && LD.ENCOUNTERS[id]) {
      var E = LD.ENCOUNTERS[id], st0 = { turn: info.q, rating: state.rating, cash: state.cash, fy: fy(state) };
      var sc = Math.round((info.q <= 4 ? LD.DOOR.SCRUT[4] : LD.DOOR.SCRUT[8]) * (1 + LD.DOOR.TIER * (state.rating | 0)) * fy(state).rules.bossMult);
      var rounds = LD.DOOR.BOSS_ROUNDS + ((state.rating | 0) >= 10 ? 1 : 0);
      info.fight = true; info.scrutiny = sc; info.rounds = rounds;
      info.demand = "A card fight at the door: Scrutiny " + sc + ", " + rounds + " rounds. " + ((LD.bossOpp && LD.oppById(LD.bossOpp(state, id))) ? LD.oppById(LD.bossOpp(state, id)).pattern : E.pattern).slice(0, rounds).map(function (k) { return LD.INTENTS[k].label; }).join(", then ") + ".";
      info.beat = "Win: a rare card reward, an Asset for the wall, and loot"; info.miss = "Lose: what got through lands on your meters";
      return info;
    }
    if (id === "earnings") { info.ask = Math.round(15 * k); info.missUnrest = Math.round(12 * k); info.missCollapse = 4; info.choice = true;
      info.demand = "Hit the number: pay a $" + info.ask + "M special dividend.";
      info.beat = "Pay $" + info.ask + "M"; info.miss = "Guidance cut: unrest +" + info.missUnrest + ", collapse +4"; }
    if (id === "bid") { info.ask = Math.round(24 * k); info.choice = true;
      info.demand = "A corporate raider wants your best room. Pay $" + info.ask + "M greenmail to keep it.";
      info.beat = "Pay $" + info.ask + "M greenmail"; info.miss = "They strip one level off your best bunker room"; }
    if (id === "strike") { info.low = Math.round(8 * k); info.high = Math.round(18 * k); info.line = 60;
      info.demand = "The street walks out: unrest +" + info.low + " (+" + info.high + " if you are at 40+). End the quarter below " + info.line + " to break it.";
      info.beat = "Unrest stays under " + info.line; info.miss = "The strike holds. No bonus"; }
    if (id === "shortseller") { info.ask = Math.round(11 * k); info.missUnrest = Math.round(6 * k); info.choice = true;
      info.demand = "A short seller publishes 90 pages on you. Pay $" + info.ask + "M for a friendly counter-study.";
      info.beat = "Pay $" + info.ask + "M"; info.miss = "Unrest +" + info.missUnrest + " and they expose your newest Asset (it is lost)"; }
    if (id === "crash") { info.line = Math.round(10 * k); info.missUnrest = 6;
      info.demand = "Markets fall: you lose 30% of your cash at close. Keep $" + info.line + "M+ after the drop to ride it out.";
      info.beat = "$" + info.line + "M+ left after the drop"; info.miss = "The loss stands, layoffs follow: unrest +6"; }
    if (id === "reckoning") { info.hit = Math.round(15 * k);
      info.demand = "Superstorm season: collapse +" + info.hit + " in one quarter. The fiscal year ends here: sealed, ready, or gone.";
      info.beat = "Seal first, or have all 4 rooms ready"; info.miss = "Forced evacuation into whatever you built"; }
    if (id === "heatdome") { info.hit = Math.round(12 * k); info.missUnrest = Math.round(6 * k);
      info.demand = "A heat dome parks over the cities: collapse +" + info.hit + " and unrest +" + info.missUnrest + ". The fiscal year ends here.";
      info.beat = "Seal first, or have all 4 rooms ready (and unrest under 100)"; info.miss = "Forced evacuation into whatever you built"; }
    if (id === "seawall") { info.hit = Math.round(13 * k);
      info.demand = "The sea wall fails: collapse +" + info.hit + ", and floodwater takes one level off your weakest Discount room. The fiscal year ends here.";
      info.beat = "Seal first, or have all 4 rooms ready (Sound rooms stay dry)"; info.miss = "Forced evacuation into whatever you built"; }
    return info;
  }
  LD.bossAt = bossAt;
  LD.bossInfo = bossInfo;
  LD.bossQuarters = bossQuarters;
  LD.assetById = cardById;
  LD.fyHas = has;
  LD.fySetOn = setOn;
  LD.fyArchCount = archCount;
  LD.fySlotsUsed = slotsUsed;

  /* ---------- Executive levels (meta) ---------- */
  LD.MAX_LEVEL = 10;
  LD.LEVEL_PERKS = [
    { lv: 2, text: "Start cash +$3M" },
    { lv: 3, text: "Signing bonus: a second copy of your signature card" },
    { lv: 4, text: "Chief engineer −$3M" },
    { lv: 5, text: "One card-reward reroll per run" },
    { lv: 6, text: "Start collapse −2" },
    { lv: 7, text: "Start cash another +$3M" },
    { lv: 8, text: "Skipping a card reward pays $5M" },
    { lv: 9, text: "Start with one Talking Points already upgraded" },
    { lv: 10, text: "Your wall holds 6 Assets" }
  ];
  function levelCost(n) { return 100 + 25 * (n - 1); }
  function levelFromXp(xp) {
    var lv = 1, need = levelCost(1), left = xp | 0;
    while (lv < LD.MAX_LEVEL && left >= need) { left -= need; lv += 1; need = levelCost(lv); }
    return { level: lv, into: left, need: lv >= LD.MAX_LEVEL ? 0 : need };
  }
  LD.levelCost = levelCost;
  LD.levelFromXp = levelFromXp;
  LD.execLevel = function (meta, execId) { return levelFromXp(((meta && meta.xp) || {})[execId] | 0).level; };
  LD.perksAt = function (lv) { return LD.LEVEL_PERKS.filter(function (p) { return p.lv <= lv; }); };

  /* ---------- Seeded draws ---------- */
  function fyRng(state, salt) { return LD.createRng(LD.hashString("fy:" + state.seed + ":" + salt)); }
  function drawAssets(state, size, rare, rng) {
    var owned = {}; fy(state).hand.forEach(function (h) { owned[h.id] = true; });
    var pool = LD.FY_ASSETS.filter(function (a) { return !owned[a.id] && (rare ? LD.RARITY[a.r].wRare : LD.RARITY[a.r].w) > 0; });
    var out = [];
    while (out.length < size && pool.length) {
      var tot = 0; pool.forEach(function (a) { tot += rare ? LD.RARITY[a.r].wRare : LD.RARITY[a.r].w; });
      var x = rng() * tot, i = 0;
      for (; i < pool.length; i++) { x -= rare ? LD.RARITY[pool[i].r].wRare : LD.RARITY[pool[i].r].w; if (x <= 0) break; }
      i = Math.min(i, pool.length - 1);
      out.push(pool[i].id);
      pool.splice(i, 1);
    }
    return out;
  }
  function makeDraft(state, rare) {
    var f = fy(state);
    var rng = fyRng(state, "draft:" + state.turn + ":" + (f.rerolled || 0));
    var offer = drawAssets(state, has(state, "rolodex") ? 4 : 3, rare, rng);
    var rider = f.rules.riderChance > 0 && rng() < f.rules.riderChance;
    f.draft = { offer: offer, rare: !!rare, rider: rider, closed: state.turn - 1 };
    return f.draft;
  }

  /* ---------- Modifiers ---------- */
  function rebuildMods(state) {
    var f = fy(state); if (!f) return;
    var m = clone(f.baseMods);
    m.upgradeMult *= 1 + LD.FY.INFLATION * (f.act - 1);
    f.hand.forEach(function (h) {
      switch (h.id) {
        case "bulk": m.upgradeMult *= 0.9; break;
        case "prefab": m.cheapExtra -= 3; break;
        case "oncall": m.engineerCost -= 8; break;
        case "easement": m.strainSurcharge = Math.max(0, m.strainSurcharge - 4); m.disruptSurcharge = Math.max(0, m.disruptSurcharge - 4); break;
        case "utility": m.strainSurcharge = 0; break;
        case "press": m.calmBonus += 3; break;
        case "audit": if (h.actOf === f.act) m.upgradeMult *= 1.15; break;
        case "toxic": if (h.actOf === f.act) m.calmBonus -= 3; break;
      }
    });
    if (setOn(state, "bunker")) m.upgradeMult *= 0.9;
    if (setOn(state, "network")) { m.strainSurcharge = 0; m.disruptSurcharge = Math.round(m.disruptSurcharge / 2); }
    if (setOn(state, "pr")) m.calmBonus += 2;
    if (setOn(state, "crisis")) m.crisisNoPayAt = 999;
    m.upgradeMult = Math.round(m.upgradeMult * 1000) / 1000;
    state.mods = m;
  }
  LD.fyRebuildMods = rebuildMods;

  function addCard(state, id) {
    var f = fy(state), c = cardById(id);
    if (!c) return;
    f.hand.push({ id: id, actOf: f.act });
    if (id === "buyback") state.cash += 8;
  }
  /* Drop 1: Liabilities arrive as curse cards in your deck. */
  function addLiability(state, rng) {
    var pool = ["c_class", "c_subpoena", "c_whistle", "c_leak", "c_stranded"];
    var id = pool[Math.floor(rng() * pool.length)];
    addCurse(state, id);
    return LD.cardDef(id);
  }

  /* createRun hook. opts.level = executive level (meta). */
  function fyInit(state, opts) {
    opts = opts || {};
    var lv = Math.max(1, Math.min(LD.MAX_LEVEL, opts.level | 0 || 1));
    var rules = rulesFor(state.rating);
    var base = clone(state.mods);
    if (lv >= 4) base.engineerCost -= 3;
    state.fy = {
      v: 1, act: 1, level: lv, hand: [], bosses: 0, bossLog: [], rules: rules, baseMods: base,
      bossII: "strike",
      draft: null, used: {}, drafts: 0, skips: 0, rerolls: lv >= 5 ? 1 : 0, rerolled: 0,
      cap: lv >= 10 ? 6 : LD.FY.CAP, skipCash: lv >= 8 ? 5 : LD.FY.SKIP_CASH, lastBoss: null,
      memo: null, memoQs: seedMemoQs(state.seed), memosSeen: [], credit: {}, picks: [],
      drawer: [], dcap: LD.FY.DRAWER, loot: null, city: 0, lootN: 0
    };
    var sb = seedBosses(state.seed); state.fy.bossI = sb.bossI; state.fy.bossII = sb.bossII; state.fy.bossIII = sb.bossIII;
    if (lv >= 2) state.cash += 3;
    if (lv >= 7) state.cash += 3;
    if (lv >= 6) state.collapse = Math.max(0, state.collapse - 2);
    initDeck(state);
    if (rules.startCollapse) state.collapse += rules.startCollapse;
    if (rules.startCurse) { addDeckCard(state, "c_class", null, 0); state.log.unshift({ turn: state.turn, text: "Inherited lawsuit: a Class Action curse is in your deck." }); }
    rebuildMods(state);
    return state;
  }
  LD.fyInit = fyInit;

  /* Old saves (pre-Fiscal Year mid-runs) get an empty Portfolio and the current act. */
  function ensureFY(state) {
    if (!state || state.fy) return state;
    var rules = rulesFor(state.rating);
    state.fy = {
      v: 1, act: actOf(state.turn), level: 1, hand: [], bosses: 0, bossLog: [], rules: rules, baseMods: clone(state.mods || LD.DEFAULT_MODS),
      bossII: (LD.hashString("boss2:" + state.seed) % 2) ? "strike" : "crash",
      draft: null, used: {}, drafts: 0, skips: 0, rerolls: 0, rerolled: 0, cap: LD.FY.CAP, skipCash: LD.FY.SKIP_CASH, lastBoss: null
    };
    rebuildMods(state);
    return state;
  }
  /* Saves from the first Fiscal Year build: add the fields later builds use. Bosses already set stay set. */
  function upgradeFY(state) {
    var f = fy(state); if (!f) return state;
    if (!f.memoQs) f.memoQs = seedMemoQs(state.seed);
    if (!f.memosSeen) f.memosSeen = [];
    if (f.memo === undefined) f.memo = null;
    if (!f.credit) f.credit = {};
    if (!f.picks) f.picks = f.hand.filter(function (h) { var c = cardById(h.id); return c && !c.liability; }).map(function (h) { return h.id; });
    if (!f.bossI) f.bossI = "earnings";
    if (!f.bossIII) f.bossIII = "reckoning";
    if (!Array.isArray(f.drawer)) f.drawer = [];
    if (!f.dcap) f.dcap = LD.FY.DRAWER;
    if (f.loot === undefined) f.loot = null;
    if (typeof f.city !== "number") f.city = 0;
    if (typeof f.lootN !== "number") f.lootN = 0;
    if (!(f.v >= 2)) upgradeV2(state);
    return state;
  }
  LD.upgradeFY = upgradeFY;
  function seedMemoQs(seed) {
    var h = LD.hashString("memos:" + seed);
    return [[2, 3][h % 2], [5, 6, 7][Math.floor(h / 2) % 3], [9, 10][Math.floor(h / 6) % 2]];
  }
  LD.ensureFY = function (state) { ensureFY(state); return upgradeFY(state); };

  function blockDeal(state) { var f = fy(state); return !f ? null : f.fight ? "Someone is still at the door." : f.reward ? "Take your reward first." : f.loot ? "Open your loot first." : f.draft ? "Choose this quarter's acquisition first." : f.memo ? "Answer the phone first." : null; }
  LD.fyBlockDeal = blockDeal;

  /* Run summary: what each held Asset did for you (cash, unrest, collapse, quarters held). */
  function credit(state, id, k, n) {
    var f = fy(state); if (!f || !id) return;
    f.credit = f.credit || {};
    var c = f.credit[id] || (f.credit[id] = { cash: 0, unrest: 0, collapse: 0, q: 0 });
    c[k] += n;
  }
  LD.fyCredit = credit;

  /* selectDeal hook: runs after the engine applied the deal. */
  function fyOnDeal(state, deal, payload, choiceId, notes, pendingBefore) {
    var f = fy(state); if (!f) return;
    var u = f.used;
    var ext = tagged(deal, "extractive"), calm = tagged(deal, "restraint"), crisis = !!deal.isCrisis;
    var listed = LD.payloadCash ? LD.payloadCash(state, payload.immediate) : ((payload.immediate || {}).cash || 0);
    var paid = listed > 0;
    var fresh = state.pending.slice(pendingBefore).filter(function (i) { return !i.install; });
    function nm(id) { var c = cardById(id); return c ? c.name : id; }
    function cash(n, id) { state.cash = Math.max(0, state.cash + n); notes.push((n >= 0 ? "+" : "−") + Math.abs(n) + " cash (" + nm(id) + ")"); credit(state, id, "cash", n); }
    function unrest(n, id) { state.unrest = clamp(state.unrest + n, 0, LD.MAX_UNREST); notes.push((n >= 0 ? "+" : "−") + Math.abs(n) + " unrest (" + nm(id) + ")"); credit(state, id, "unrest", n); }
    var hurts = fresh.filter(function (i) { return (i.unrest || 0) > 0 || (i.collapse || 0) > 0; });
    if (ext && has(state, "creative") && hurts.length) { fresh.forEach(function (i) { i.due += 1; }); notes.push("fallout 1Q later (Creative Accounting)"); credit(state, "creative", "q", 1); }
    if (has(state, "futures") && fresh.some(function (i) { return i.collapse > 0; })) { fresh.forEach(function (i) { if (i.collapse > 0) i.due += 1; }); notes.push("collapse 1Q later (Futures Desk)"); credit(state, "futures", "q", 1); }
    if (ext && has(state, "regcap") && !(u.regcap && u.regcap[f.act]) && fresh.some(function (i) { return i.collapse > 0; })) {
      u.regcap = u.regcap || {}; u.regcap[f.act] = 1;
      var waived = 0; fresh.forEach(function (i) { waived += i.collapse || 0; i.collapse = 0; }); notes.push("delayed collapse waived (Regulatory Capture)"); credit(state, "regcap", "collapse", -waived);
    }
    if (has(state, "whistle") && hurts.length) {
      hurts.forEach(function (i) { i.unrest = Math.round((i.unrest || 0) * 1.5); i.collapse = Math.round((i.collapse || 0) * 1.5); });
      removeCard(state, "whistle"); notes.push("fallout ×1.5 (Whistleblower)");
    }
    if (ext && paid && has(state, "shell")) cash(3, "shell");
    if (ext && paid && state.collapse >= 50 && has(state, "surge")) cash(Math.max(2, Math.round(listed * 0.4)), "surge");
    if (ext && has(state, "lobby")) unrest(-2, "lobby");
    if (ext && has(state, "vertical") && ["air", "water", "power", "food"].some(function (t) { return tagged(deal, t) && state.bunker[t].level >= 2; })) cash(5, "vertical");
    if (ext && setOn(state, "baron")) { state.cash += 2; notes.push("+2 cash (The Cartel)"); }
    if (crisis && !payload.cost && has(state, "thoughts")) unrest(-4, "thoughts");
    if (calm && has(state, "philan")) cash(6, "philan");
    if (calm && has(state, "influencer") && !(u.infl && u.infl[f.act])) { u.infl = u.infl || {}; u.infl[f.act] = 1; unrest(-4, "influencer"); cash(4, "influencer"); }
    if (calm && has(state, "press")) credit(state, "press", "unrest", -3);
    if (crisis && has(state, "chaser")) cash(4, "chaser");
    if (crisis && payload.cost && has(state, "hedge")) cash(4, "hedge");
    if (paid && state.collapse >= 60 && has(state, "short")) cash(5, "short");
    if (calm && has(state, "classaction")) { removeCard(state, "classaction"); notes.push("Class Action settled"); }
    if (crisis && f.rules.crisisUnrest) { state.unrest = clamp(state.unrest + f.rules.crisisUnrest, 0, LD.MAX_UNREST); notes.push("+" + f.rules.crisisUnrest + " unrest (crisis season)"); }
    /* Office items */
    var t = state.turn;
    if (ext && f.contractQ === t) {
      f.contractQ = null;
      if (paid) { var bonus = Math.max(2, Math.round(listed * 0.5)); state.cash += bonus; notes.push("+" + bonus + " cash (Exclusive Contract)"); }
      fresh.forEach(function (i) { i.unrest = Math.round((i.unrest || 0) * 1.5); i.collapse = Math.round((i.collapse || 0) * 1.5); });
    }
    if (calm && f.galaQ === t) { f.galaQ = null; state.cash += 6; cityAdd(state, -6); notes.push("+6 cash, city repaired (Charity Gala)"); }
    if (crisis && payload.cost && has(state, "soundproof")) { state.cash = Math.max(0, state.cash - 4); notes.push("−4 cash (you never heard it coming)"); }
    /* The mainland remembers: Squeeze darkens blocks, Soothe relights them. */
    if (ext) cityAdd(state, 3);
    if (calm) cityAdd(state, -3);
    if (crisis && !payload.cost) cityAdd(state, 2);
    var lr = fyRng(state, "dealloot:" + t + ":" + deal.id)();
    if (lr < (crisis ? 0.25 : 0.06) && !f.lootNext) { var li = pickLoot(state, "deal", fyRng(state, "dealloot2:" + t)); if (li) { f.lootNext = li; notes.push("loot on the way"); } }
    if (f.deck) {
      var rid = state.world && state.world.pins ? state.world.pins[deal.id] : null;
      var claimed = !!(state.world && state.world.lastClaim && state.world.lastClaim.turn === t && state.world.lastClaim.regionId === rid);
      var dcash = paid && LD.dealCashAmount ? LD.dealCashAmount(state, listed, deal) : 0;
      makeFight(state, deal, choiceId, { cash: dcash, claimed: claimed });
    }
  }
  LD.fyOnDeal = fyOnDeal;

  function removeCard(state, id) {
    var f = fy(state);
    for (var i = 0; i < f.hand.length; i++) if (f.hand[i].id === id) { f.hand.splice(i, 1); break; }
    rebuildMods(state);
  }

  function isReady(state) { return LD.SYSTEMS.every(function (s) { return LD.systemReliable(state, s.id); }); }

  /* closeQuarter hook, before delayed effects land: Portfolio upkeep, then the boss. */
  function fyPreClose(state, opts) {
    var f = fy(state); if (!f) return [];
    opts = opts || {};
    var out = [], u = f.used, t = state.turn;
    function ev(text, kind, extra) { var e = { text: text, source: "Portfolio", fy: kind || "asset" }; if (extra) Object.keys(extra).forEach(function (k) { e[k] = extra[k]; }); out.push(e); state.log.unshift({ turn: t, text: text }); }
    function cr(id, k, n) { credit(state, id, k, n); }
    f.hand.forEach(function (h) { var c = cardById(h.id); if (c && !c.liability) cr(h.id, "q", 1); });
    if (has(state, "astro")) { var a0 = state.unrest; state.unrest = clamp(state.unrest - 2, 0, LD.MAX_UNREST); cr("astro", "unrest", state.unrest - a0); ev("Astroturf Network: unrest −2."); }
    if (has(state, "plantmgr")) { var pc = LD.plantCount ? LD.plantCount(state) : 0; if (pc) { state.cash += 2 * pc; cr("plantmgr", "cash", 2 * pc); ev("Plant Manager: +$" + (2 * pc) + "M."); } }
    if (has(state, "toll")) { var oc = LD.ownedCount ? LD.ownedCount(state) : 1; state.cash += oc; cr("toll", "cash", oc); var tu = t % 2 === 0; if (tu) { state.unrest = clamp(state.unrest + 1, 0, LD.MAX_UNREST); cr("toll", "unrest", 1); } ev("Toll Road: +$" + oc + "M" + (tu ? ", unrest +1" : "") + "."); }
    if (has(state, "offsets") && t % 2 === 1) { state.collapse = clamp(state.collapse - 1, 0, LD.MAX_COLLAPSE); cr("offsets", "collapse", -1); ev("Carbon Offsets: collapse −1."); }
    if (has(state, "consult")) { state.cash += 2; state.unrest = clamp(state.unrest + 1, 0, LD.MAX_UNREST); cr("consult", "cash", 2); cr("consult", "unrest", 1); ev("Management Consultants: +$2M, unrest +1."); }
    if (has(state, "disfut") && (state.offered || []).some(function (id) { var d0 = LD.dealById && LD.dealById(id); return d0 && d0.isCrisis; })) { state.cash += 3; cr("disfut", "cash", 3); ev("Disaster Futures: a crisis was on the board. +$3M."); }
    if (has(state, "brine") && LD.plantCount && LD.plantCount(state)) cr("brine", "collapse", -LD.plantCount(state));
    if (has(state, "classaction")) { state.unrest = clamp(state.unrest + 2, 0, LD.MAX_UNREST); ev("Class Action: unrest +2. Sign a Soothe deal to settle.", "liability"); }
    if (setOn(state, "time")) { state.collapse = clamp(state.collapse - 1, 0, LD.MAX_COLLAPSE); ev("Long View: collapse −1."); }
    if (has(state, "soundproof")) { state.unrest = clamp(state.unrest - 2, 0, LD.MAX_UNREST); ev("Soundproofed Door: you stop answering. Unrest −2.", "item"); }
    if (has(state, "holo")) { state.cash += 3; state.collapse = clamp(state.collapse + 1, 0, LD.MAX_COLLAPSE); ev("Holo-Window: investors admire the view (+$3M). Nobody fixes what nobody sees: collapse +1.", "item"); }
    var cst = LD.cityStage(state);
    if (cst >= 2) { var cu = cst - 1; state.unrest = clamp(state.unrest + cu, 0, LD.MAX_UNREST); ev("The mainland looks back across the water: unrest +" + cu + ".", "city"); }
    if (has(state, "narrative")) {
      var cap = 10, cut = 0;
      state.pending.forEach(function (i) { if (!i.install && i.due <= t && (i.unrest || 0) > 0) { var k = Math.min(i.unrest, cap); cut += i.unrest - k; cap -= k; i.unrest = k; } });
      if (cut) { cr("narrative", "unrest", -cut); ev("Narrative Control: delayed unrest capped (−" + cut + ")."); }
    }
    if (has(state, "geo") && !(u.geo && u.geo[f.act]) && (state.collapse >= 55 || t % 4 === 0)) { u.geo = u.geo || {}; u.geo[f.act] = 1; state.collapse = clamp(state.collapse - 6, 0, LD.MAX_COLLAPSE); cr("geo", "collapse", -6); ev("Geoengineering Pilot: collapse −6."); }
    if (has(state, "loyalty") && !u.loyal && state.unrest >= 85) { u.loyal = 1; cr("loyalty", "unrest", 70 - state.unrest); state.unrest = 70; ev("Board Loyalty: the board closes ranks. Unrest drops to 70."); }
    if (has(state, "toobig") && !u.toobig && state.collapse >= 88 && !isReady(state)) { u.toobig = 1; cr("toobig", "collapse", 80 - state.collapse); state.collapse = 80; ev("Too Big To Fail: the bailout lands. Collapse resets to 80."); }
    if (f.bill) { state.cash = Math.max(0, state.cash - f.bill); ev("Billable hours: −$" + f.bill + "M.", "card"); f.bill = 0; }
    var pay = 0; (f.fixers || []).forEach(function (r) { var x = LD.fixerById(r.id); if (x) pay += x.pay; });
    if (pay) { state.cash = Math.max(0, state.cash - pay); ev("Fixer retainers: −$" + pay + "M.", "card"); }
    var info = bossInfo(state, t);
    if (info && !info.final) info = null;
    if (info && f.deck) {
      var cracks = f.deck.filter(function (c) { return c.id === "c_crack"; }).length, hit0 = [];
      for (var ci = 0; ci < cracks; ci++) { var wk = LD.SYSTEMS.map(function (x) { return x.id; }).filter(function (sid) { return state.bunker[sid].quality === "cheap" && state.bunker[sid].level > 0; }).sort(function (a, b) { return state.bunker[b].level - state.bunker[a].level; })[0]; if (wk) { state.bunker[wk].level -= 1; hit0.push(wk); } }
      if (hit0.length) ev("The Reckoning finds your Cracks: " + hit0.join(", ") + " lose a level.", "card");
    }
    if (info) {
      var beaten = true, text = "";
      var refuse = opts.bossChoice === "refuse";
      if (info.id === "earnings") {
        if (!refuse && state.cash >= info.ask) { state.cash -= info.ask; text = "The Earnings Call: you hit the number (−$" + info.ask + "M). The analysts applaud."; }
        else { beaten = false; state.unrest = clamp(state.unrest + info.missUnrest, 0, LD.MAX_UNREST); state.collapse = clamp(state.collapse + 4, 0, LD.MAX_COLLAPSE); text = "The Earnings Call: guidance cut. Unrest +" + info.missUnrest + ", collapse +4."; }
      } else if (info.id === "bid") {
        if (!refuse && state.cash >= info.ask) { state.cash -= info.ask; text = "Hostile Takeover Bid: greenmail paid (−$" + info.ask + "M). The raider walks."; }
        else {
          beaten = false;
          var rooms = LD.SYSTEMS.map(function (s) { return s.id; }).sort(function (a, b) { return state.bunker[b].level - state.bunker[a].level; });
          var b = state.bunker[rooms[0]];
          if (b.level > 0) { b.level -= 1; text = "Hostile Takeover Bid: the raider strips your " + rooms[0] + " room to Lv " + b.level + "."; }
          else text = "Hostile Takeover Bid: nothing worth stripping. They leave sneering.";
        }
      } else if (info.id === "strike") {
        var hit = state.unrest >= 40 ? info.high : info.low;
        state.unrest = clamp(state.unrest + hit, 0, LD.MAX_UNREST);
        beaten = state.unrest < info.line;
        text = "General Strike: unrest +" + hit + (beaten ? ". You held the line." : ". The strike holds.");
      } else if (info.id === "shortseller") {
        if (!refuse && state.cash >= info.ask) { state.cash -= info.ask; text = "Short-Seller Report: the counter-study lands (−$" + info.ask + "M). The shorts cover."; }
        else {
          beaten = false; state.unrest = clamp(state.unrest + info.missUnrest, 0, LD.MAX_UNREST);
          var newest = null; for (var ni = f.hand.length - 1; ni >= 0; ni--) { var nc = cardById(f.hand[ni].id); if (nc && !nc.liability) { newest = nc; break; } }
          if (newest) removeCard(state, newest.id);
          text = "Short-Seller Report: unrest +" + info.missUnrest + (newest ? ", and " + newest.name + " is exposed and written off." : ". There was nothing left to expose.");
        }
      } else if (info.id === "crash") {
        var lost = Math.round(state.cash * 0.3);
        state.cash -= lost;
        beaten = state.cash >= info.line;
        if (!beaten) state.unrest = clamp(state.unrest + info.missUnrest, 0, LD.MAX_UNREST);
        text = "Market Crash: −$" + lost + "M." + (beaten ? " Your float rides it out." : " Layoffs follow: unrest +" + info.missUnrest + ".");
      } else if (info.final) {
        state.collapse = clamp(state.collapse + info.hit, 0, LD.MAX_COLLAPSE);
        if (info.missUnrest) state.unrest = clamp(state.unrest + info.missUnrest, 0, LD.MAX_UNREST);
        var flooded = "";
        if (info.id === "seawall") {
          var weak = LD.SYSTEMS.map(function (s2) { return s2.id; }).filter(function (sid) { return state.bunker[sid].quality === "cheap" && state.bunker[sid].level > 0; })
            .sort(function (a2, b2) { return state.bunker[a2].level - state.bunker[b2].level; })[0];
          if (weak) { state.bunker[weak].level -= 1; flooded = " Floodwater takes your " + weak + " room to Lv " + state.bunker[weak].level + "."; }
        }
        beaten = state.collapse < LD.MAX_COLLAPSE && state.unrest < LD.MAX_UNREST;
        text = info.name + ": collapse +" + info.hit + (info.missUnrest ? ", unrest +" + info.missUnrest : "") + "." + flooded;
      }
      if (has(state, "mole")) { removeCard(state, "mole"); text += " The mole is unmasked."; }
      if (beaten) { f.bosses += 1; f.beatNow = true; if (!info.final) f.bossLoot = true; }
      f.lastBoss = { id: info.id, q: t, beaten: beaten, text: text };
      f.bossLog.push({ id: info.id, q: t, beaten: beaten });
      ev(text + (beaten ? " +10 ◈." : ""), "boss", { boss: info.id, beaten: beaten });
    }
    return out;
  }
  LD.fyPreClose = fyPreClose;

  /* After the closing quarter's drift: the fiscal year can end at the final boss quarter. */
  function fyYearEnd(state) {
    var f = fy(state); if (!f || state.ended) return false;
    if (state.turn < f.rules.finalQ) return false;
    var result = LD.evacuationResult(state);
    if (result.kind === "win") { result.title = "The fiscal year closes on time"; result.body = "The Reckoning came and the doors held. " + result.body; }
    if (state.unrest >= LD.MAX_UNREST && result.kind === "win") { result = LD.evacuationResult(state); }
    else if (result.reason === "unfinished") { result.title = "The fiscal year closed on an unfinished room"; result.body = "The board called time after the Reckoning. " + result.body; }
    else { result.title = "Year-end, and the bargain work gave out"; result.body = "The board called time after the Reckoning. " + result.body; }
    state.ended = true; state.ending = result; state.phase = "ended";
    state.log.unshift({ turn: state.turn, text: "The fiscal year ends: " + result.kind + "." });
    return true;
  }
  LD.fyYearEnd = fyYearEnd;

  /* ---------- Board Memos: one two-way choice per act, between deals ---------- */
  LD.MEMOS = [
    { id: "leak", icon: "📨", title: "Leaked Memo", body: "Someone forwarded the 'acceptable losses' spreadsheet to a journalist.",
      a: { label: "Bury it", text: "−$8M" }, b: { label: "Sell it to a short-seller", text: "+$6M from the short, unrest +6" } },
    { id: "celebrity", icon: "🌟", title: "Celebrity Visit", body: "A beloved actor wants a tour of the 'resilience campus'.",
      a: { label: "Photo op", text: "−$6M, unrest −6" }, b: { label: "Decline", text: "Nothing happens" } },
    { id: "troll", icon: "🧌", title: "Patent Troll", body: "A shell company claims to own the idea of a door.",
      a: { label: "Settle", text: "−$10M" }, b: { label: "Fight it", text: "Coin flip: +$10M or −$15M" } },
    { id: "wedding", icon: "💒", title: "The Engineer's Wedding", body: "The best bunker engineer in the hemisphere is getting married.",
      a: { label: "Attend, with a gift", text: "−$4M now; the chief engineer costs $6M less this run" }, b: { label: "Send a gift card", text: "Nothing happens" } },
    { id: "summit", icon: "🌐", title: "Climate Summit", body: "Your attendance would be noted. So would your absence.",
      a: { label: "Attend in person", text: "Collapse −5, but no bunker order this quarter" }, b: { label: "Sponsor the lanyards", text: "+$12M, collapse +4" } },
    { id: "union", icon: "📋", title: "Union Drive", body: "The bunker crews have started using the word 'we'.",
      a: { label: "Crush it", text: "+$8M now; in 2Q, unrest +12" }, b: { label: "Recognise it", text: "−$6M, unrest −8" } },
    { id: "activist", icon: "🦅", title: "Activist Investor", body: "A fund with a bird logo wants a board seat and a 'clean-up'.",
      a: { label: "Give them the seat", text: "A random curse joins your deck; your next card reward is rare" }, b: { label: "Refuse", text: "Nothing happens" } },
    { id: "space", icon: "🚀", title: "Space Billionaire", body: "He collects bunker rooms. He also collects people who say no.",
      need: function (s) { return LD.SYSTEMS.some(function (x) { return s.bunker[x.id].level === 1; }); },
      a: { label: "Sell a Lv 1 room", text: "+$20M; one Lv 1 room goes back to Lv 0" }, b: { label: "Decline", text: "Nothing happens" } },
    { id: "collab", icon: "🤳", title: "Influencer Collab", body: "'Ten Bunkers You Won't Believe Exist'. Number four is yours.",
      a: { label: "Post it", text: "+$5M, unrest +2, and a random Common Asset for the wall" }, b: { label: "Decline", text: "Nothing happens" } },
    { id: "taxholiday", icon: "🏝️", title: "Tax Holiday", body: "A grateful ministry offers a holiday. The building inspectors are less grateful.",
      a: { label: "Take it", text: "+$12M, and a Subpoena curse joins your deck" }, b: { label: "Decline", text: "Nothing happens" } },
    { id: "pension", icon: "👴", title: "The Pension Fund", body: "Thirty thousand retirees. One very liquid fund.",
      a: { label: "Borrow from it", text: "+$14M now; in 3Q, unrest +14" }, b: { label: "Leave it alone", text: "Nothing happens" } },
    { id: "drought", icon: "🏜️", title: "Drought Emergency Powers", body: "The governor will sign anything that sounds like a plan.",
      a: { label: "Write the plan", text: "+$9M, collapse +3" }, b: { label: "Fund the reservoirs", text: "−$9M, collapse −4" } },
    { id: "headhunter", icon: "📇", title: "The Headhunter", body: "Two fixers are between engagements. Each brings their own cards, and a retainer.", hire: true, call: true,
      a: { label: "Hire the first", text: "" }, b: { label: "Hire the second", text: "" }, c: { label: "Not now", text: "Nothing happens" } },
    { id: "distressed", icon: "🏚️", title: "Distressed Sale", body: "A bankrupt firm is liquidating. One framed Asset, priced to move.", call: true,
      a: { label: "Buy it", text: "−$10M, it goes on your wall" }, b: { label: "Pass", text: "Nothing happens" } },
    { id: "oldfriend", icon: "🕵️", title: "An Old Friend at the Agency", body: "Someone you went to school with has a favour to offer. Favours talk.", call: true,
      a: { label: "Take the favour", text: "A free card, and a Leak curse" }, b: { label: "Hang up", text: "Nothing happens" } }
  ];
  var MEMO_BY = {}; LD.MEMOS.forEach(function (m) { MEMO_BY[m.id] = m; });
  LD.memoById = function (id) { return MEMO_BY[id] || null; };
  function maybeMemo(state) {
    var f = fy(state);
    if (!f.memoQs || f.memoQs.indexOf(state.turn) === -1 || state.turn >= f.rules.finalQ) return null;
    var rng = fyRng(state, "memo:" + state.turn);
    var pool = LD.MEMOS.filter(function (m) { return f.memosSeen.indexOf(m.id) === -1 && (!m.need || m.need(state)) && !m.hire && (f.deck || !m.call); });
    if (!pool.length) return null;
    var m = pool[Math.floor(rng() * pool.length)];
    f.memosSeen.push(m.id);
    f.memo = { id: m.id, q: state.turn };
    if (m.id === "distressed") { var da = drawAssets(state, 1, true, rng); if (!da.length) { f.memo = null; return null; } f.memo.asset = da[0]; }
    if (m.id === "oldfriend") { var pc = rollCards(state, 1, false, rng); f.memo.card = pc[0] || "spin"; }
    return f.memo;
  }
  /* The headhunter calls once per act, on a quarter without another call. */
  function headhunterQ(state) {
    var f = fy(state), qs = [[2, 3], [6, 7, 5], [10, 9]], out = [];
    qs.forEach(function (opts) { for (var i = 0; i < opts.length; i++) if ((f.memoQs || []).indexOf(opts[i]) === -1) { out.push(opts[i]); break; } });
    return out;
  }
  function maybeCall(state) {
    var f = fy(state);
    if (f.deck && headhunterQ(state).indexOf(state.turn) !== -1 && state.turn < f.rules.finalQ && f.fixers.length < LD.DOOR.FIXER_CAP) {
      var rng = fyRng(state, "hh:" + state.turn);
      var pool = LD.FIXERS.filter(function (x) { return !x.sig && !f.fixers.some(function (r) { return r.id === x.id; }); });
      if (pool.length >= 1) {
        pool = rng.shuffle(pool);
        f.memo = { id: "headhunter", q: state.turn, offer: pool.slice(0, 2).map(function (x) { return x.id; }) };
        return f.memo;
      }
    }
    return maybeMemo(state);
  }
  function fyMemo(state, choice) {
    state = clone(state);
    var f = fy(state);
    if (!f || !f.memo) return { ok: false, error: "No memo on the desk.", state: state };
    var m = MEMO_BY[f.memo.id], A = choice === "a", t = state.turn, msg = "";
    function cash(n) { state.cash = Math.max(0, state.cash + n); }
    function un(n) { state.unrest = clamp(state.unrest + n, 0, LD.MAX_UNREST); }
    function col(n) { state.collapse = clamp(state.collapse + n, 0, LD.MAX_COLLAPSE); }
    function later(q, u2, why) { state.pending.push({ due: t + q, source: m.title, unrest: u2, collapse: 0, cash: 0, log: why, flags: null, grantSystem: null, effectsIf: null, strain: null, ease: null, install: null }); }
    switch (m.id) {
      case "leak": if (A) cash(-8); else { cash(6); un(6); } break;
      case "celebrity": if (A) { cash(-6); un(-6); } break;
      case "troll": if (A) cash(-10); else { var win = fyRng(state, "troll:" + t)() < 0.5; cash(win ? 10 : -15); msg = win ? "The court laughs them out: +$10M." : "The court sides with the door people: −$15M."; } break;
      case "wedding": if (A) { cash(-4); f.baseMods.engineerCost -= 6; } break;
      case "summit": if (A) { col(-5); state.bunkerActedThisTurn = true; } else { cash(12); col(4); } break;
      case "union": if (A) { cash(8); later(2, 12, "The union you crushed finds a louder name."); } else { cash(-6); un(-8); } break;
      case "activist": if (A) { var l = addLiability(state, fyRng(state, "activist:" + t)); f.nextRare = true; msg = "Curse taken: " + l.name + ". Your next card reward is rare."; } break;
      case "space": if (A) { var r1 = LD.SYSTEMS.map(function (x) { return x.id; }).filter(function (id) { return state.bunker[id].level === 1; })[0]; if (r1) { state.bunker[r1].level = 0; cash(20); msg = "Sold the " + r1 + " room: +$20M."; } } break;
      case "collab": if (A) { cash(5); un(2);
          if (slotsUsed(state) < f.cap) { var pool = LD.FY_ASSETS.filter(function (a) { return a.r === "C" && !has(state, a.id); }); var pk = pool[Math.floor(fyRng(state, "collab:" + t)() * pool.length)]; if (pk) { addCard(state, pk.id); f.picks.push(pk.id); msg = "The post goes viral. " + pk.name + " joins your Portfolio."; } }
          else msg = "The post goes viral. No room for a sponsor in your Portfolio."; } break;
      case "taxholiday": if (A) { cash(12); addCurse(state, "c_subpoena", "the tax holiday"); } break;
      case "headhunter": var off = f.memo.offer || [];
        if (choice === "a" || choice === "b") { var fx0 = off[choice === "a" ? 0 : 1]; if (fx0 && f.fixers.length < LD.DOOR.FIXER_CAP) { var hx = hire(state, fx0); msg = hx ? "Hired " + hx.name + ". " + hx.cards.length + " cards join your deck; $" + hx.pay + "M a quarter." : ""; } }
        else msg = "You let the headhunter go to voicemail.";
        break;
      case "distressed": if (A && f.memo.asset) { if (state.cash >= 10 && slotsUsed(state) < f.cap) { cash(-10); addCard(state, f.memo.asset); f.picks.push(f.memo.asset); msg = cardById(f.memo.asset).name + " goes up on the wall (−$10M)."; } else msg = "No room on the wall, or no cash."; } break;
      case "oldfriend": if (A) { var gift = f.memo.card; if (gift) { addDeckCard(state, gift, null, 0); addCurse(state, "c_leak", "an old friend talks"); msg = LD.cardDef(gift).name + " joins your deck, and so does a Leak."; } } break;
      case "pension": if (A) { cash(14); later(3, 14, "The retirees notice the hole in the fund."); } break;
      case "drought": if (A) { cash(9); col(3); } else { cash(-9); col(-4); } break;
    }
    rebuildMods(state);
    f.memo = null;
    if (fyRng(state, "memoloot:" + t + ":" + choice)() < 0.35 && !f.lootNext && f.deck) f.lootNext = pickLoot(state, "memo", fyRng(state, "memoloot2:" + t));
    var opt = choice === "c" ? m.c : A ? m.a : m.b;
    state.log.unshift({ turn: t, text: m.title + ": " + ((opt && opt.label) || "") + ". " + (msg || (opt && opt.text) || "") + "." });
    return { ok: true, state: state, text: msg || opt.text, memo: m, choice: choice };
  }
  LD.fyMemo = fyMemo;
  LD.memoAffordable = function (state, choice) {
    var m = state.fy && state.fy.memo && MEMO_BY[state.fy.memo.id]; if (!m) return false;
    var need = { leak: 8, celebrity: 6, troll: 10, wedding: 4, union: 6, drought: 9 };
    if (choice === "a" && ["leak", "celebrity", "troll", "wedding"].indexOf(m.id) !== -1) return state.cash >= need[m.id];
    if (choice === "b" && (m.id === "union" || m.id === "drought")) return state.cash >= need[m.id];
    if (choice === "a" && m.id === "distressed") return state.cash >= 10 && slotsUsed(state) < state.fy.cap;
    return true;
  };

  /* closeQuarter hook after the turn advanced: new act, then the draft. */
  function fyAfterClose(state) {
    var f = fy(state); if (!f) return null;
    var was = f.act;
    f.act = actOf(state.turn);
    if (f.act !== was) {
      var a = LD.ACTS[f.act - 1];
      state.log.unshift({ turn: state.turn, text: "Act " + a.roman + " · " + a.name + " begins. Bunker works +" + Math.round(LD.FY.INFLATION * 100 * (f.act - 1)) + "%." });
      f.actIntro = f.act;
    }
    rebuildMods(state);
    if (f.deck) syncRoomCards(state);
    var d = f.deck ? makeReward(state) : makeDraft(state, f.beatNow || f.nextRare);
    f.beatNow = false;
    if (!state.ended) maybeCall(state);
    return d;
  }
  LD.fyAfterClose = fyAfterClose;

  /* Pick an Asset from the draft (id), or skip (id null). replaceId divests a held Asset when the Portfolio is full. */
  function fyPick(state, id, replaceId) {
    state = clone(state);
    var f = fy(state);
    if (!f || !f.draft) return { ok: false, error: "No acquisition on the table.", state: state };
    var d = f.draft;
    if (!id) {
      state.cash += f.skipCash; f.skips += 1; f.draft = null;
      state.log.unshift({ turn: state.turn, text: "Passed on the acquisitions: +$" + f.skipCash + "M cash back." });
      return { ok: true, state: state, skipped: true };
    }
    if (d.offer.indexOf(id) === -1) return { ok: false, error: "That Asset is not on offer.", state: state };
    var divested = null;
    if (slotsUsed(state) >= f.cap) {
      if (!replaceId) return { ok: false, error: "Your Portfolio is full. Choose an Asset to divest.", state: state, needReplace: true };
      var rc = cardById(replaceId);
      if (!rc || rc.liability || !has(state, replaceId)) return { ok: false, error: "That cannot be divested.", state: state };
      removeCard(state, replaceId);
      state.cash += LD.FY.DIVEST_CASH;
      divested = rc;
    }
    addCard(state, id);
    f.picks = f.picks || []; f.picks.push(id);
    var c = cardById(id);
    var rider = null;
    if (d.rider) rider = addLiability(state, fyRng(state, "rider:" + state.turn));
    f.drafts += 1; f.draft = null;
    rebuildMods(state);
    state.log.unshift({ turn: state.turn, text: "Acquired " + c.name + (divested ? ", divested " + divested.name + " (+$" + LD.FY.DIVEST_CASH + "M)" : "") + (rider ? ". Rider attached: " + rider.name : "") + "." });
    return { ok: true, state: state, asset: c, rider: rider, divested: divested };
  }
  LD.fyPick = fyPick;

  function fyReroll(state) {
    state = clone(state);
    var f = fy(state);
    if (!f || !f.draft || f.rerolls <= 0) return { ok: false, error: "No rerolls left.", state: state };
    f.rerolls -= 1; f.rerolled = (f.rerolled || 0) + 1;
    makeDraft(state, f.draft.rare);
    return { ok: true, state: state };
  }
  LD.fyReroll = fyReroll;

  /* Overtime Crew: once per act, the first bunker order of a quarter leaves the bunker open for one more. */
  LD.fyAfterBunker = function (state) {
    var f = fy(state); if (f && f.deck) syncRoomCards(state);
    if (!f || !has(state, "overtime")) return false;
    var u = f.used; u.ot = u.ot || {};
    if (u.ot[f.act]) return false;
    u.ot[f.act] = 1;
    state.bunkerActedThisTurn = false;
    state.ap += LD.BUNKER_AP;
    f.otNow = true;
    credit(state, "overtime", "q", 2);
    state.log.unshift({ turn: state.turn, text: "Overtime Crew: one more bunker order this quarter." });
    return true;
  };
  LD.fyConversionBonus = function (state) { return has(state, "privgrid") ? 0.15 : 0; };
  LD.fyPlantCollapse = function (state) { return has(state, "brine") ? 0 : null; };
  LD.fyLv3Discount = function (state) { return has(state, "penthouse") ? 8 : 0; };

  /* What your Portfolio will do when this quarter closes (passives only; deal triggers are on the deal card). */
  LD.fyForecast = function (state) {
    var f = fy(state); if (!f) return { cash: 0, unrest: 0, collapse: 0, items: [] };
    var t = state.turn, u = f.used, out = { cash: 0, unrest: 0, collapse: 0, items: [] };
    function add(id, c, un, co, txt) { out.cash += c; out.unrest += un; out.collapse += co; var cd = cardById(id); out.items.push({ id: id, icon: cd ? cd.icon : "", name: cd ? cd.name : id, text: txt, cash: c, unrest: un, collapse: co }); }
    if (has(state, "soundproof")) { out.unrest -= 2; out.items.push({ id: "soundproof", icon: cardById("soundproof").icon, name: cardById("soundproof").name, text: "unrest −2" }); }
    if (has(state, "holo")) { out.cash += 3; out.collapse += 1; out.items.push({ id: "holo", icon: cardById("holo").icon, name: cardById("holo").name, text: "+$3M, collapse +1" }); }
    var pay0 = 0; (f.fixers || []).forEach(function (r) { var x = LD.fixerById(r.id); if (x) pay0 += x.pay; });
    if (pay0) { out.cash -= pay0; out.items.push({ id: "retainers", icon: "💼", name: "Fixer retainers", text: "−$" + pay0 + "M", cash: -pay0, unrest: 0, collapse: 0 }); }
    if (f.bill) { out.cash -= f.bill; out.items.push({ id: "bill", icon: "⏱️", name: "Billable hours", text: "−$" + f.bill + "M", cash: -f.bill, unrest: 0, collapse: 0 }); }
    var cst0 = LD.cityStage(state); if (cst0 >= 2) { out.unrest += cst0 - 1; out.items.push({ id: "city", icon: "🏙️", name: "The mainland", text: "unrest +" + (cst0 - 1) }); }
    if (has(state, "astro")) add("astro", 0, -2, 0, "unrest −2");
    if (has(state, "plantmgr")) { var pc = LD.plantCount ? LD.plantCount(state) : 0; if (pc) add("plantmgr", 2 * pc, 0, 0, "+$" + 2 * pc + "M"); }
    if (has(state, "toll")) { var oc = LD.ownedCount ? LD.ownedCount(state) : 1; add("toll", oc, t % 2 === 0 ? 1 : 0, 0, "+$" + oc + "M" + (t % 2 === 0 ? ", unrest +1" : "")); }
    if (has(state, "offsets") && t % 2 === 1) add("offsets", 0, 0, -1, "collapse −1");
    if (has(state, "consult")) add("consult", 2, 1, 0, "+$2M, unrest +1");
    if (has(state, "disfut") && (state.offered || []).some(function (id) { var d0 = LD.dealById && LD.dealById(id); return d0 && d0.isCrisis; })) add("disfut", 3, 0, 0, "+$3M (a crisis is on offer)");
    if (has(state, "classaction")) add("classaction", 0, 2, 0, "unrest +2");
    if (setOn(state, "time")) out.items.push({ id: "set-time", icon: "⏳", name: "Long View", text: "collapse −1", cash: 0, unrest: 0, collapse: -1 }), out.collapse -= 1;
    if (has(state, "geo") && !(u.geo && u.geo[f.act]) && (state.collapse >= 55 || t % 4 === 0)) add("geo", 0, 0, -6, "collapse −6");
    if (has(state, "overtime") && !(u.ot && u.ot[f.act])) out.items.push({ id: "overtime", icon: "🌙", name: "Overtime Crew", text: "ready: a second bunker order", cash: 0, unrest: 0, collapse: 0 });
    return out;
  };

  /* End screen: the picks that carried the run. */
  LD.fyRunSummary = function (state) {
    var f = fy(state); if (!f) return [];
    var cr = f.credit || {};
    var ids = (f.picks || []).filter(function (id, i, a) { return a.indexOf(id) === i; });
    f.hand.forEach(function (h) { var c = cardById(h.id); if (c && !c.liability && ids.indexOf(h.id) === -1) ids.push(h.id); });
    return ids.map(function (id) {
      var c = cardById(id), v = cr[id] || { cash: 0, unrest: 0, collapse: 0, q: 0 };
      var score = v.cash - 1.5 * v.unrest - 2 * v.collapse + 1.5 * v.q;
      var bits = [];
      if (v.cash) bits.push((v.cash > 0 ? "+$" : "−$") + Math.abs(v.cash) + "M");
      if (v.unrest) bits.push("unrest " + (v.unrest > 0 ? "+" : "−") + Math.abs(v.unrest));
      if (v.collapse) bits.push("collapse " + (v.collapse > 0 ? "+" : "−") + Math.abs(v.collapse));
      if (!bits.length && v.q) bits.push("held " + v.q + " quarter" + (v.q === 1 ? "" : "s"));
      return { id: id, icon: c ? c.icon : "", name: c ? c.name : id, r: c ? c.r : "C", held: has(state, id), score: score, text: bits.join(" · ") || "no effect yet" };
    }).sort(function (a, b) { return b.score - a.score; });
  };

  /* Reliability rules: Redundancy Consultant and CC "Building codes". Returns true/false or null (engine default). */
  LD.fyReliable = function (state, sys) {
    var f = fy(state); if (!f) return null;
    if (sys.quality === "cheap" && sys.level < 3) {
      if (f.rules.crackedDiscount) return false;
      if (has(state, "redund")) return true;
    }
    return null;
  };

  /* ================= DROP 1 · The Door: card fights, the deck, fixers, rewards, calls =================
     Every deal sends someone to the office door. You answer with a hand of fixer cards.
     Influence 3 and a hand of 5 never grow; power comes from the cards. Your meters are your health. */
  LD.DOOR = {
    INF: 3, HAND: 5, ROUNDS: 2, BOSS_ROUNDS: 3,
    SETTLE: 0.5,                 /* $M per point of Scrutiny left */
    SHRED: 6, SHRED_STEP: 3,     /* shred cost, +3 each time */
    SKIP: 3,                     /* skip a reward: +$3M */
    FIXER_CAP: 4,
    METER: { cash: 1, unrest: 1, collapse: 0.5 },
    SCRUT: { 1: 7, 2: 9, 3: 11, 4: 22, 5: 12, 6: 13, 7: 14, 8: 28, 9: 15, 10: 16, 11: 17, 12: 17 },
    TIER: 0,                     /* extra enemy Scrutiny/intents per rating tier (tiers already scale bosses, Protests and riders) */
    INTENT: [0, 4, 7, 10],       /* per act; +1 in later rounds */
    ONE_ROUND: false             /* the "quarter takes too long" lever */
  };
  LD.CARD_TYPES = { Shared: "Shared", Silent: "Silent", Lobbyist: "Lobbyist", Lawyer: "Lawyer", PR: "PR flack", Fellow: "Fellow", Curse: "Curse", Room: "Bunker room", Private: "Go private" };
  LD.CARD_RARITY = { S: "Starter", C: "Common", U: "Uncommon", R: "Rare", M: "Special", X: "Curse" };
  LD.CARDS = [
    { id: "talking", t: "Shared", r: "S", icon: "🗣️", name: "Talking Points", cost: 1, p: 4, up: { p: 6 } },
    { id: "nocomment", t: "Shared", r: "S", icon: "🤐", name: "No Comment", cost: 1, d: 4, up: { d: 6 } },
    { id: "externalize", t: "Shared", r: "C", icon: "🏭", name: "Externalize", cost: 0, p: 7, col: 2, up: { p: 10 }, flavor: "The window shows where it went." },
    { id: "codb", t: "Shared", r: "C", icon: "💸", name: "Cost of Doing Business", cost: 0, sp: "codb", up: { mult: 1.2 } },
    { id: "synergy", t: "Shared", r: "C", icon: "📎", name: "Synergy Memo", cost: 1, p: 2, draw: 2, up: { p: 4 } },
    { id: "golden", t: "Shared", r: "C", icon: "🪙", name: "Golden Handshake", cost: 0, cash: 4, d: 7, up: { d: 10 } },
    { id: "presence", t: "Shared", r: "U", icon: "👔", name: "Executive Presence", cost: 1, p: 5, d: 2, up: { p: 7, d: 3 } },
    { id: "backup", t: "Room", r: "M", icon: "🔋", name: "Backup Generator", cost: 1, d: 7, up: { d: 10 }, flavor: "Added by a Sound bunker room at Lv 2." },
    { id: "cutcorners", t: "Room", r: "M", icon: "🪚", name: "Cut Corners", cost: 0, d: 5, ex: true, sp: "crack", up: { d: 7 }, flavor: "Added by a Discount bunker room at Lv 2." },
    { id: "privsec", t: "Private", r: "M", icon: "🚓", name: "Private Security", cost: 1, d: 10, un: 2, up: { d: 14 } },
    { id: "carveout", t: "Lobbyist", r: "C", icon: "✂️", name: "Carve-out", cost: 1, p: 5, win: "carve", up: { p: 7 } },
    { id: "campaign", t: "Lobbyist", r: "C", icon: "🎟️", name: "Campaign Contribution", cost: 0, cash: 2, p: 8, up: { p: 11 } },
    { id: "zoning", t: "Lobbyist", r: "U", icon: "🗺️", name: "Zoning Variance", cost: 1, p: 6, win: "zoning", up: { p: 8 } },
    { id: "stall", t: "Lobbyist", r: "U", icon: "⏸️", name: "Stall for Time", cost: 2, sp: "cancel", up: { cost: 1 } },
    { id: "whisper", t: "Lobbyist", r: "U", icon: "🤫", name: "Guidance Whisper", cost: 1, sp: "whisper", up: { cost: 0 } },
    { id: "fasttrack", t: "Lobbyist", r: "U", icon: "📝", name: "Fast-Track Permit", cost: 1, p: 4, win: "permit", up: { p: 6 } },
    { id: "revolving", t: "Lobbyist", r: "R", icon: "🚪", name: "Revolving Door", cost: 2, sp: "cut40", ex: true, expose: 30, up: { cost: 1 } },
    { id: "darkmoney", t: "Lobbyist", r: "R", icon: "🕳️", name: "Dark Money", cost: 0, cash: 10, p: 15, up: { p: 20 } },
    { id: "objection", t: "Lawyer", r: "C", icon: "🙅", name: "Objection", cost: 1, d: 6, up: { d: 8 } },
    { id: "buryit", t: "Lawyer", r: "C", icon: "🪦", name: "Bury It", cost: 1, d: 4, win: "bury", up: { d: 6 } },
    { id: "billable", t: "Lawyer", r: "C", icon: "⏱️", name: "Billable Hours", cost: 0, draw: 2, d: 2, bill: 1, up: { draw: 3 } },
    { id: "nda", t: "Lawyer", r: "C", icon: "📄", name: "Non-Disclosure", cost: 1, d: 4, draw: 1, up: { d: 6 } },
    { id: "discovery", t: "Lawyer", r: "U", icon: "🗄️", name: "Discovery Delay", cost: 1, d: 4, sp: "defer", up: { cost: 0 } },
    { id: "injunction", t: "Lawyer", r: "U", icon: "⚖️", name: "Injunction", cost: 2, d: 12, sp: "noswell", up: { d: 16 } },
    { id: "settle", t: "Lawyer", r: "U", icon: "🤝", name: "Settle Quietly", cost: 0, cash: 5, sp: "purge", ex: true, up: { cash: 2 } },
    { id: "countersue", t: "Lawyer", r: "R", icon: "🧑‍⚖️", name: "Countersue", cost: 2, p: 6, sp: "cancel", ex: true, up: { p: 10 } },
    { id: "astro", t: "PR", r: "C", icon: "📣", name: "Astroturf Rally", cost: 1, p: 5, sp: "vsprotest", expose: 20, up: { p: 7 } },
    { id: "oped", t: "PR", r: "C", icon: "📰", name: "Op-ed", cost: 1, p: 3, d: 3, up: { p: 4, d: 4 } },
    { id: "spin", t: "PR", r: "C", icon: "🌀", name: "Spin Cycle", cost: 1, p: 3, draw: 1, up: { p: 5 } },
    { id: "tnp", t: "PR", r: "U", icon: "🙏", name: "Thoughts and Prayers", cost: 0, d: 3, sp: "vsprotestd", up: { d: 5 } },
    { id: "photoop", t: "PR", r: "U", icon: "📸", name: "Photo Op", cost: 2, p: 8, win: "photo", up: { p: 11 } },
    { id: "crisiscomms", t: "PR", r: "R", icon: "📡", name: "Crisis Comms", cost: 2, p: 7, d: 7, up: { p: 9, d: 9 } },
    { id: "study", t: "Fellow", r: "C", icon: "🧪", name: "Commission a Study", cost: 1, sp: "nextinf", up: { cost: 0 } },
    { id: "funded", t: "Fellow", r: "C", icon: "📊", name: "Industry-Funded Study", cost: 1, p: 5, win: "cool", up: { p: 7 } },
    { id: "unsettled", t: "Fellow", r: "U", icon: "❓", name: "Unsettled Science", cost: 1, d: 3, sp: "halfcol", up: { d: 6 } },
    { id: "longterm", t: "Fellow", r: "R", icon: "🔭", name: "Long-Term Outlook", cost: 1, sp: "cut30", ex: true, up: { cost: 0 } },
    /* ---- Silent cards: no speech bubble; the narrator's yellow caption box speaks instead (captions per era in lore.js). ---- */
    { id: "glance", t: "Silent", r: "C", icon: "👁️", name: "The Glance", cost: 0, down: 2, peek: true, silent: true, up: { down: 4 } },
    { id: "pause", t: "Silent", r: "C", icon: "🕰️", name: "The Long Pause", cost: 1, d: 6, ghold: true, silent: true, up: { d: 9 } },
    { id: "smirk", t: "Silent", r: "U", icon: "😏", name: "The Smirk", cost: 1, p: 3, gb: 3, silent: true, up: { p: 4, gb: 4 } },
    { id: "watch", t: "Silent", r: "C", icon: "⌚", name: "Checking Your Watch", cost: 1, p: 4, next: 2, silent: true, up: { p: 6 } },
    { id: "chair", t: "Silent", r: "U", icon: "🪑", name: "Leaving the Chair Empty", cost: 1, d: 3, norider: true, silent: true, up: { d: 6 } },
    { id: "handshake", t: "Silent", r: "U", icon: "🤝", name: "The Handshake Held Too Long", cost: 1, p: 5, next: 3, g: 0, silent: true, up: { p: 7 } },
    { id: "envelope", t: "Silent", r: "U", icon: "✉️", name: "Sliding the Envelope", cost: 0, cash: 3, p: 9, silent: true, up: { p: 12 } },
    { id: "played", t: "Silent", r: "R", icon: "🔁", name: "You've Played This Before", cost: 2, p: 4, draw: 2, peek: true, w4: true, silent: true, up: { cost: 1 } },
    /* ---- Pressure, information and favours, era-flavoured (era: the only act whose rewards offer it). ---- */
    { id: "stoop", t: "PR", r: "C", era: 1, icon: "🗣️", name: "Word on the Stoop", cost: 1, p: 2, rum: 5, up: { rum: 7 } },
    { id: "chainmail", t: "PR", r: "C", era: 2, icon: "📧", name: "Chain Email", cost: 1, p: 2, rum: 5, up: { rum: 7 } },
    { id: "deepfake", t: "PR", r: "U", era: 3, icon: "🎭", name: "Deepfake", cost: 1, p: 3, rum: 7, expose: 20, up: { rum: 10 } },
    { id: "dossier", t: "Fellow", r: "U", icon: "🗂️", name: "Dossier", cost: 1, p: 4, down: 2, up: { p: 6 } },
    { id: "poll", t: "Fellow", r: "C", icon: "📋", name: "Poll", cost: 0, g: 1, draw: 1, up: { draw: 2 } },
    { id: "ratio", t: "PR", r: "C", era: 3, icon: "💬", name: "Ratio", cost: 1, p: 2, gb: 4, up: { gb: 6 } },
    { id: "frontpage", t: "PR", r: "U", era: 1, icon: "📸", name: "Front-Page Photo", cost: 2, p: 7, up: { p: 10 } },
    { id: "perpwalk", t: "PR", r: "R", era: 2, icon: "🚓", name: "Perp Walk", cost: 2, p: 9, expose: 15, up: { p: 12 } },
    { id: "lunch", t: "Lobbyist", r: "C", icon: "🍽️", name: "Lunch Invitation", cost: 0, p: 3, next: 2, g: 0, up: { p: 5 } },
    { id: "mortgage", t: "Lobbyist", r: "U", era: 2, icon: "🏠", name: "Buy Their Mortgage", cost: 0, cash: 4, p: 11, up: { p: 14 } },
    { id: "marker", t: "Lobbyist", r: "U", era: 1, icon: "🎰", name: "Call In a Marker", cost: 1, p: 7, ex: true, up: { p: 10 } },
    { id: "margincall", t: "Lobbyist", r: "R", icon: "☎️", name: "Margin Call", cost: 2, p: 4, per: 2, up: { per: 3 } },
    { id: "consent", t: "Lawyer", r: "U", era: 2, icon: "📕", name: "Consent Decree", cost: 2, d: 10, sp: "nextinf", up: { d: 13 } },
    { id: "arbitration", t: "Lawyer", r: "U", era: 3, icon: "🚪", name: "Forced Arbitration", cost: 1, cap: 6, up: { cap: 4 } },
    { id: "layoff", t: "Shared", r: "C", icon: "📦", name: "Restructuring Memo", cost: 0, p: 6, un: 2, up: { p: 8 } },
    { id: "eviction", t: "Lawyer", r: "C", era: 1, icon: "🛏️", name: "Eviction Notice", cost: 1, p: 7, un: 1, up: { p: 9 } },
    { id: "gig", t: "Lawyer", r: "C", era: 3, icon: "🛵", name: "Reclassify as Contractors", cost: 1, p: 5, draw: 1, up: { p: 7 } },
    { id: "boardseat", t: "Lobbyist", r: "R", icon: "🪑", name: "Board Seat", cost: 2, p: 6, solo: 6, up: { solo: 9 } },
    { id: "bothstages", t: "Lobbyist", r: "R", era: 2, icon: "🎤", name: "Both Stages", cost: 2, p: 5, gfloor: true, up: { p: 8 } },
    { id: "turnwitness", t: "Lawyer", r: "R", icon: "🕵️", name: "Turn Their Witness", cost: 2, p: 3, sp: "cancel", ex: true, up: { p: 6 } },
    { id: "littleleague", t: "PR", r: "C", era: 1, icon: "⚾", name: "Sponsor the Little League", cost: 0, cash: 2, p: 6, up: { p: 8 } },
    { id: "botswarm", t: "PR", r: "U", era: 3, icon: "🤖", name: "Bot Swarm", cost: 1, p: 6, sp: "vsprotest", expose: 25, up: { p: 8 } },
    /* Favour: kinship cards. Win mostly with these and they come round: Reconciled. */
    { id: "tab", t: "Shared", r: "C", icon: "📒", name: "Put It On My Tab", cost: 1, p: 3, d: 3, next: 2, up: { p: 5, d: 4 } },
    { id: "sunday", t: "Shared", r: "U", icon: "🍰", name: "Sunday Visit", cost: 1, p: 5, draw: 1, up: { p: 7 } },
    { id: "grandmas", t: "Shared", r: "R", icon: "👵", name: "Both Grandmothers Are Coming", cost: 2, p: 8, ghold: true, up: { p: 11 } },
    { id: "godparent", t: "Lobbyist", r: "U", icon: "🕊️", name: "Godparent to Their Kid", cost: 1, cash: 2, p: 7, up: { p: 9 } },
    { id: "c_class", t: "Curse", r: "X", icon: "⚖️", name: "Class Action", unplay: true, sp: "classaction" },
    { id: "c_subpoena", t: "Curse", r: "X", icon: "📜", name: "Subpoena", cost: 1, sp: "discardpay" },
    { id: "c_whistle", t: "Curse", r: "X", icon: "📯", name: "Whistleblower", unplay: true, sp: "drawheat" },
    { id: "c_leak", t: "Curse", r: "X", icon: "💧", name: "Leak", unplay: true },
    { id: "c_crack", t: "Curse", r: "X", icon: "🧱", name: "Crack", unplay: true, sp: "crackroom" },
    { id: "c_stranded", t: "Curse", r: "X", icon: "🪨", name: "Stranded Asset", unplay: true, sp: "noshred" }
  ];
  var CARD_BY = {}; LD.CARDS.forEach(function (c) { CARD_BY[c.id] = c; });
  LD.cardDef = function (id) { return CARD_BY[id] || null; };
  /* ---------- Dormant card tags (schema v1, see the universe bible: "Future-proof card schema") ----------
     Every card carries all 12 tags. Most do nothing in the base game; each one switches on when the add-on that reads it ships.
     Base game reads: pressure (picks the ending, moves the Gallery), temper (moves the hidden marker), voice (silent cards show
     the narrator's caption), side (frame colour), era (reward pool), fates (which endings a card feeds).
     Order: pressure | temper | side | trait | psych | voice | era | pvp | room | readings | fates   (v is added as 1).
     'none: <reason>' is the only allowed empty value; the reason is the comment. tests/run-tests.js fails any card without all tags. */
  LD.CARD_TAG_FIELDS = ["pressure", "temper", "side", "trait", "psych", "voice", "era", "pvp", "room", "readings", "fates", "v"];
  LD.PRESSURES = ["shame", "obligation", "kinship", "rumour", "legal", "solidarity", "status", "precarity", "patronage", "info"];
  LD.OUTCOMES = ["bought", "converted", "broken", "exposed", "ignored", "martyred", "pyrrhic", "deal", "walked", "reconciled"];
  var TAGS = {
    talking: "info | S+ | dark | coldcontrol | persona | verbal | any | aggro/hero | single | light: Say It Plainly | exposed,broken",
    nocomment: "status | S+ | dark | stonewalling | denial | verbal | any | control/self | single | light: Hold Your Tongue | ignored,walked",
    externalize: "precarity | W- | dark | coldcontrol | displacement | verbal | any | aggro/room | group | light: Clean It Up | broken,pyrrhic",
    codb: "obligation | W- | dark | withholding | rationalisation | verbal | any | tech/self | single | light: Pay What You Owe | bought,deal",
    synergy: "info | none: an internal memo has no temper | grey | none: a memo has no personality | jargon | verbal | any | engine/self | single | none: no Light mirror for corporate memos | exposed",
    golden: "obligation | W- | dark | withholding | reciprocity | verbal | any | control/hero | single | light: Fair Severance | bought",
    presence: "status | S+ | dark | vanity | authority | verbal | any | aggro/hero | single | light: Show Up | ignored",
    backup: "none: a bunker fixture, defence only | S+ | dark | duty | none: a generator has no psyche | verbal | any | control/self | single | light: Share the Power | walked",
    cutcorners: "none: a bunker fixture, defence only | W- | dark | coldcontrol | sunk-cost | verbal | any | tech/self | single | light: Do It Right | pyrrhic",
    privsec: "none: a guard detail removes no Scrutiny | S- | dark | coldcontrol | authority | verbal | any | control/room | group | light: Neighbourhood Watch | martyred",
    carveout: "patronage | W- | dark | envy | foot-in-door | verbal | any | engine/ally | single | light: Fair Share | converted",
    campaign: "patronage | W- | grey | peoplepleasing | reciprocity | verbal | any | aggro/ally | single | light: Small Donors | converted,bought",
    zoning: "legal | S+ | grey | coldcontrol | anchoring | verbal | any | control/room | single | light: Community Plan | broken",
    stall: "legal | S+ | dark | stonewalling | sunk-cost | verbal | any | control/hero | single | light: Hold the Line | walked",
    whisper: "info | S+ | grey | withholding | authority | verbal | any | control/hero | single | light: Plain Guidance | exposed",
    fasttrack: "patronage | W- | grey | envy | foot-in-door | verbal | any | tempo/room | single | light: Permit Clinic | converted",
    revolving: "patronage | W- | grey | coldcontrol | cognitive-dissonance | silent:revolving | any | control/ally | group | light: Whistle Through the Door | converted",
    darkmoney: "obligation | W- | dark | withholding | reciprocity | verbal | any | aggro/hero | group | light: Mutual Aid Fund | bought",
    objection: "legal | S+ | grey | stonewalling | intellectualisation | verbal | any | control/self | single | light: Point of Order | walked",
    buryit: "legal | S+ | dark | withholding | repression | verbal | any | control/self | single | light: Open the File | broken",
    billable: "legal | S+ | grey | coldcontrol | sunk-cost | verbal | any | engine/self | single | none: billing has no Light mirror | broken,pyrrhic",
    nda: "legal | S+ | dark | withholding | repression | verbal | any | control/hero | single | light: Speak Freely | broken,bought",
    discovery: "legal | S+ | grey | stonewalling | denial | verbal | any | tempo/self | single | light: Open Records | walked",
    injunction: "legal | S+ | dark | coldcontrol | authority | verbal | any | control/room | group | light: Stay of Eviction | broken,martyred",
    settle: "obligation | S+ | dark | withholding | repression | silent:settle | any | tech/self | single | light: Make It Right | bought,deal",
    countersue: "legal | S- | dark | grudge | projection | verbal | any | control/hero | single | light: Defend the Block | broken",
    astro: "solidarity | S- | dark | vanity | social-proof | verbal | any | aggro/gallery | group | light: Block Party | exposed,martyred",
    oped: "info | S+ | grey | condescension | rationalisation | verbal | any | aggro/gallery | single | light: Letter to the Editor | exposed",
    spin: "rumour | S- | dark | vanity | reframing | verbal | any | tempo/gallery | single | light: Set the Record Straight | exposed",
    tnp: "status | W- | dark | vanity | persona | verbal | any | control/gallery | group | light: Show Up With Soup | martyred,ignored",
    photoop: "status | S- | dark | vanity | persona | verbal | any | aggro/gallery | group | light: Ribbon for the Block | ignored",
    crisiscomms: "rumour | S+ | dark | coldcontrol | reframing | verbal | any | aggro/gallery | group | light: Town Hall | exposed",
    study: "info | S+ | grey | discipline | authority | verbal | any | engine/self | single | light: Night Class | exposed",
    funded: "info | S+ | dark | condescension | authority | verbal | any | aggro/gallery | single | light: Peer Review | exposed,broken",
    unsettled: "rumour | S+ | dark | cynicism | manufactured-doubt | verbal | any | control/gallery | group | light: Fact Sheet | broken",
    longterm: "info | S+ | grey | equanimity | intellectualisation | verbal | any | control/hero | single | light: Plan for the Flats | ignored",
    glance: "info | S+ | grey | discipline | attention | silent:glance | any | tech/hero | single | light: The Kind Look | exposed",
    pause: "status | S+ | grey | equanimity | silence | silent:pause | any | control/gallery | single | light: Let Them Finish | ignored",
    smirk: "shame | S- | dark | vanity | contempt | silent:smirk | any | aggro/hero | single | light: The Wink | exposed",
    watch: "status | S+ | dark | coldcontrol | status-signal | silent:watch | any | tempo/hero | single | light: Make Time | ignored",
    chair: "status | S+ | dark | withholding | ostracism | silent:chair | any | control/ally | group | light: Pull Up a Chair | ignored",
    handshake: "obligation | W- | dark | coldcontrol | reciprocity | silent:handshake | any | control/hero | single | light: A Firm Promise | bought",
    envelope: "obligation | W- | dark | withholding | repression | silent:envelope | any | tech/hero | single | light: Pay It Forward | bought",
    played: "info | none: the fourth wall sits outside the compass | grey | none: the narrator has no trait | metacognition | silent:played | any | tech/hero | single | light: We've Been Here Before | exposed",
    stoop: "rumour | S- | dark | envy | gossip | verbal | 1978 | tempo/gallery | group | light: Word of Mouth | exposed",
    chainmail: "rumour | S- | dark | envy | gossip | verbal | 2008 | tempo/gallery | group | light: The Group Email | exposed",
    deepfake: "rumour | W- | dark | vanity | gaslighting | verbal | now | tempo/gallery | group | light: Fact-check | exposed",
    dossier: "info | S+ | dark | coldcontrol | surveillance | verbal | any | control/hero | single | light: Public Record | exposed",
    poll: "info | S+ | grey | discipline | social-proof | verbal | any | engine/gallery | group | light: Ask the Block | exposed",
    ratio: "shame | S- | dark | vanity | pile-on | verbal | now | aggro/gallery | group | light: Signal Boost | exposed",
    frontpage: "shame | S- | dark | grudge | public-shaming | verbal | 1978 | aggro/gallery | group | light: Front-Page Thanks | exposed",
    perpwalk: "shame | S- | dark | grudge | public-shaming | verbal | 2008 | aggro/gallery | group | light: Walk Them Home | exposed",
    lunch: "obligation | W- | dark | withholding | reciprocity | verbal | any | control/hero | single | light: Potluck | bought,deal",
    mortgage: "obligation | W- | dark | coldcontrol | debt-bondage | verbal | 2008 | aggro/hero | single | light: Refinance the Block | bought",
    marker: "obligation | W- | grey | grudge | reciprocity | verbal | 1978 | aggro/hero | single | light: Call In a Favour | bought",
    margincall: "obligation | S+ | dark | coldcontrol | scarcity | verbal | any | aggro/hero | single | light: Forgive the Tab | bought,broken",
    consent: "legal | S+ | grey | discipline | authority | verbal | 2008 | control/self | single | light: Consent of the Governed | broken,deal",
    arbitration: "legal | S+ | dark | coldcontrol | learned-helplessness | verbal | now | control/hero | single | light: Day in Court | broken",
    layoff: "precarity | W- | dark | coldcontrol | displacement | verbal | any | aggro/room | group | light: Keep Everyone On | broken,pyrrhic",
    eviction: "precarity | W- | dark | coldcontrol | dehumanisation | verbal | 1978 | aggro/room | group | light: Rent Strike | broken,martyred",
    gig: "precarity | W- | dark | coldcontrol | rationalisation | verbal | now | tempo/room | group | light: Union Card | broken",
    boardseat: "status | S+ | dark | equanimity | entitlement | verbal | any | engine/self | single | light: A Seat at the Table | ignored",
    bothstages: "patronage | none: the Machine has no temper, only allies | grey | peoplepleasing | splitting | verbal | 2008 | control/gallery | group | light: One Stage | converted",
    turnwitness: "patronage | W- | dark | envy | cognitive-dissonance | verbal | any | control/ally | single | light: Protect the Witness | converted",
    tab: "kinship | W+ | light | patience | reciprocity | verbal | any | control/hero | single | light: Pay Me When You Can | reconciled,deal",
    sunday: "kinship | W+ | light | duty | attachment | verbal | any | engine/ally | single | light: Same Story, Same Laugh | reconciled",
    grandmas: "kinship | W+ | light | passion | belonging | verbal | any | control/gallery | group | light: Two Chairs at the Table | reconciled,deal",
    godparent: "kinship | W- | dark | smothering | ingratiation | verbal | any | aggro/hero | group | light: Stand Up at the Christening | reconciled,bought",
    littleleague: "kinship | W+ | dark | vanity | halo-effect | verbal | 1978 | aggro/gallery | group | light: Coach the Team | reconciled,deal",
    botswarm: "solidarity | S- | dark | vanity | social-proof | verbal | now | aggro/gallery | group | light: Real Neighbours | exposed,martyred",
    c_class: "none: a curse is never played as pressure | none: curses carry no temper | neutral | none: a curse has no owner | guilt | verbal | any | none: curses are inert in PvP | single | none: curses have no Light reading | pyrrhic",
    c_subpoena: "legal | none: curses carry no temper | neutral | none: a curse has no owner | authority | verbal | any | none: curses are inert in PvP | single | none: curses have no Light reading | broken",
    c_whistle: "none: a curse is never played as pressure | none: curses carry no temper | light | none: a curse has no owner | conscience | verbal | any | none: curses are inert in PvP | single | none: curses have no Light reading | exposed",
    c_leak: "none: a curse is never played as pressure | none: curses carry no temper | neutral | none: a curse has no owner | exposure | verbal | any | none: curses are inert in PvP | single | none: curses have no Light reading | exposed",
    c_crack: "none: a curse is never played as pressure | none: curses carry no temper | neutral | none: a curse has no owner | sunk-cost | verbal | any | none: curses are inert in PvP | single | none: curses have no Light reading | pyrrhic",
    c_stranded: "none: a curse is never played as pressure | none: curses carry no temper | neutral | none: a curse has no owner | sunk-cost | verbal | any | none: curses are inert in PvP | single | none: curses have no Light reading | pyrrhic"
  };
  LD.CARD_TAGS_RAW = TAGS;
  LD.CARDS.forEach(function (c) {
    var raw = TAGS[c.id]; if (!raw) return;
    var parts = raw.split(" | "), t = { v: 1 };
    LD.CARD_TAG_FIELDS.forEach(function (k, i) { if (k !== "v") t[k] = (parts[i] || "").trim(); });
    c.tags = t;
  });
  LD.cardTags = function (id) { var c = CARD_BY[id]; return c && c.tags ? c.tags : null; };
  /* The pressure family a card pushes (or null for 'none'). */
  function presOf(id) { var t = LD.cardTags(id); return t && LD.PRESSURES.indexOf(t.pressure) !== -1 ? t.pressure : null; }
  LD.cardPressure = presOf;
  LD.PRESSURE_LABEL = { shame: "Shame", obligation: "Debt", kinship: "Favour", rumour: "Rumour", legal: "Legal", solidarity: "Crowd", status: "Snub", precarity: "Precarity", patronage: "Patronage", info: "Info" };
  /* How a played card tilts the Gallery by default (a card's own g overrides). */
  var G_BY_P = { shame: 1, rumour: 1, solidarity: 1, kinship: 1, info: 1, obligation: -1, precarity: -1 };
  /* A card's numbers after its one upgrade. */
  function cv(id, up) {
    var c = CARD_BY[id]; if (!c) return null;
    var o = {}; Object.keys(c).forEach(function (k) { o[k] = c[k]; });
    if (up && c.up) Object.keys(c.up).forEach(function (k) { o[k] = c.up[k]; });
    o.upgraded = !!up;
    return o;
  }
  LD.cardValues = cv;
  var SP_TEXT = {
    codb: function (o) { return "Pay this round's intent in cash at ×" + (o.mult || 1.5) + " instead of taking it."; },
    cancel: function () { return "Cancel this round's intent."; },
    whisper: function () { return "Intents −30% this round."; },
    cut40: function () { return "Scrutiny −40%."; },
    cut30: function () { return "Scrutiny −30%."; },
    defer: function () { return "Whatever gets through this round is halved and lands next quarter, with no riders."; },
    noswell: function () { return "Protest intents stop growing."; },
    purge: function () { return "Remove a curse from your deck for good."; },
    nextinf: function () { return "Next round +1◆."; },
    halfcol: function () { return "Intents that raise collapse are halved this fight."; },
    crack: function () { return "25% chance to add a Crack."; },
    vsprotest: function () { return "Doubled against Protests."; },
    vsprotestd: function () { return "Doubled against Protests."; },
    classaction: function () { return "Unplayable. Protest intents +2 while it's in your hand."; },
    discardpay: function () { return "Clogs your hand. Pay 1◆ to discard it."; },
    drawheat: function () { return "Unplayable. When drawn: your hottest fixer gets Heat +1."; },
    crackroom: function () { return "Unplayable. At the Reckoning, each Crack takes a level off a Discount room."; },
    noshred: function () { return "Unplayable. Only Settle Quietly removes it."; }
  };
  var WIN_TEXT = { carve: "Win: a Squeeze deal pays +$3M.", zoning: "Win: the deal's region loses 1 stress.",
    permit: "Win: your next bunker work this quarter −$4M.", bury: "Win: the deal's delayed fallout −25%.", photo: "Win: city −8, a block lights back up.", cool: "Win: collapse −1." };
  LD.cardText = function (id, up) {
    var o = cv(id, up); if (!o) return "";
    if (CARD_BY[id] && CARD_BY[id].t === "Curse" && LD.curseText) return LD.curseText(id);
    var b = [];
    if (o.p) b.push(o.p + " Pressure");
    if (o.d) b.push(o.d + " Deniability");
    var s = b.join(" and ") + (b.length ? "." : "");
    if (o.draw) s += (s ? " " : "") + "Draw " + o.draw + ".";
    if (o.sp && SP_TEXT[o.sp]) s += (s ? " " : "") + SP_TEXT[o.sp](o);
    if (o.col) s += " Collapse +" + o.col + ".";
    if (o.un) s += " Unrest +" + o.un + ".";
    if (o.bill) s += " $" + o.bill + "M due at close.";
    if (o.ex) s += " Exhausts.";
    if (o.expose) s += " Exposure " + o.expose + "%.";
    if (o.win) s += " " + WIN_TEXT[o.win];
    if (o.gb) s += " +" + o.gb + " if the Gallery is with you.";
    if (o.per) s += " +" + o.per + " per other card played this round.";
    if (o.solo) s += " +" + o.solo + " if it's your first card this round.";
    if (o.rum) s += " Rumour: +" + o.rum + " Pressure when next round starts.";
    if (o.down) s += " Their move −" + o.down + " this round.";
    if (o.next) s += " Their next move −" + o.next + ".";
    if (o.cap) s += " Their move this round can't exceed " + o.cap + ".";
    if (o.norider) s += " Their move's rider can't trigger this round.";
    if (o.peek) s += " See their next move.";
    if (o.ghold) s += " The Gallery can't turn on you this round.";
    if (o.gfloor) s += " The Gallery can't drop below even this fight.";
    var gt = galOf(id, o); if (gt && !o.gfloor) s += " Gallery " + (gt > 0 ? "+" : "−") + Math.abs(gt) + ".";
    if (o.w4) s += " Fourth wall: once per fight.";
    return s.trim();
  };
  function galOf(id, o) { o = o || cv(id); if (!o) return 0; if (o.g !== undefined) return o.g; return G_BY_P[presOf(id)] || 0; }
  LD.cardGallery = galOf;
  LD.cardCostText = function (id, up) {
    var o = cv(id, up); if (!o) return "";
    if (o.unplay) return "—";
    if (o.cash) return "$" + o.cash + "M";
    return o.cost + "◆";
  };

  /* Fixers are card packages with a face. Hiring adds their cards; firing takes them away. */
  LD.FIXERS = [
    { id: "hollis", t: "Lawyer", icon: "💼", name: "Hollis Grange", role: "water-rights lawyer", cards: ["buryit", "objection"], pay: 1, sig: "mara" },
    { id: "chip", t: "Lobbyist", icon: "📞", name: "Chip Calloway", role: "ex-utility commissioner", cards: ["carveout", "stall"], pay: 1, sig: "reid" },
    { id: "pike", t: "Fellow", icon: "🎓", name: "Dr. Wendell Pike", role: "Institute for Abundant Futures", cards: ["study", "unsettled"], pay: 1, sig: "imani" },
    { id: "ines", t: "Lawyer", icon: "🛃", name: "Ines Varga", role: "customs counsel", cards: ["discovery", "billable"], pay: 1, sig: "julian" },
    { id: "tamsin", t: "PR", icon: "🎧", name: "Tamsin Rook", role: "Chief Listening Officer", cards: ["oped", "astro"], pay: 1, sig: "soren" },
    { id: "bryce", t: "Lobbyist", icon: "🏛️", name: "Bryce Pemberton-Hale", role: "ex-Treasury", cards: ["campaign", "carveout"], pay: 1, sig: "cassius" },
    { id: "dex", t: "Lobbyist", icon: "🍸", name: "Dex Marlowe", role: "K Street lobbyist", cards: ["zoning", "whisper", "fasttrack"], pay: 2 },
    { id: "priya", t: "Lawyer", icon: "⚖️", name: "Priya Saltonstall", role: "litigator, never loses", cards: ["objection", "injunction", "settle"], pay: 3 },
    { id: "gus", t: "PR", icon: "📺", name: "Gus Fenn", role: "spin doctor", cards: ["spin", "photoop", "tnp"], pay: 2 },
    { id: "lorne", t: "Fellow", icon: "🔬", name: "Dr. Lorne Bask", role: "Center for Balanced Climate", cards: ["funded", "study"], pay: 1 },
    { id: "margo", t: "Lawyer", icon: "🕶️", name: "Margo Pell", role: "fixer-at-large", cards: ["nda", "buryit"], pay: 2 }
  ];
  var FIXER_BY = {}; LD.FIXERS.forEach(function (x) { FIXER_BY[x.id] = x; });
  LD.fixerById = function (id) { return FIXER_BY[id] || null; };
  function sigFixer(execId) { return LD.FIXERS.filter(function (x) { return x.sig === execId; })[0] || LD.FIXERS[0]; }
  LD.sigFixer = sigFixer;

  function addDeckCard(state, id, fx, up) {
    var f = fy(state); f.uid = (f.uid || 0) + 1;
    var c = { u: f.uid, id: id, up: up ? 1 : 0, fx: fx || null };
    f.deck.push(c);
    return c;
  }
  function deckCard(state, u) { var d = fy(state).deck; for (var i = 0; i < d.length; i++) if (d[i].u === u) return d[i]; return null; }
  LD.deckCard = deckCard;
  function isCurse(id) { var c = CARD_BY[id]; return !!(c && c.t === "Curse"); }
  LD.isCurse = isCurse;
  var CURSE_TEXT = { c_class: "Unplayable. While in your hand, Protest intents +2.", c_subpoena: "Costs 1◆ to file away, or it sits in your hand.", c_whistle: "Unplayable. Drawing it adds Heat to a fixer.",
    c_leak: "Unplayable. Takes a slot in your hand.", c_crack: "Unplayable. At the Reckoning, a Discount room loses a level.", c_stranded: "Unplayable. Can't be shredded: only Settle Quietly removes it." };
  LD.curseText = function (id) { return CURSE_TEXT[id] || ""; };
  /* Add a curse to the deck (and to the live fight's discard pile). */
  function addCurse(state, id, why) {
    var c = addDeckCard(state, id, null, 0);
    var fg = fy(state).fight; if (fg && !fg.done) fg.disc.push(c.u);
    state.log.unshift({ turn: state.turn, text: "Curse: " + CARD_BY[id].name + (why ? " (" + why + ")" : "") + " joins your deck." });
    return c;
  }
  LD.fyAddCurse = addCurse;
  /* Old Liabilities live on as curses. */
  var LIAB_CURSE = { classaction: "c_class", audit: "c_subpoena", whistle: "c_whistle", stranded: "c_stranded", mole: "c_leak", toxic: "c_leak" };
  LD.LIAB_CURSE = LIAB_CURSE;
  function hire(state, fid, quiet) {
    var f = fy(state), x = FIXER_BY[fid]; if (!x) return null;
    if (f.fixers.some(function (r) { return r.id === fid; })) return null;
    f.fixers.push({ id: fid, heat: 0, q: state.turn });
    x.cards.forEach(function (cid) { addDeckCard(state, cid, fid, 0); });
    if (!quiet) state.log.unshift({ turn: state.turn, text: "Hired " + x.name + ", " + x.role + ". Their cards join your deck." });
    return x;
  }
  function fire(state, fid, why) {
    var f = fy(state), x = FIXER_BY[fid]; if (!x) return null;
    f.fixers = f.fixers.filter(function (r) { return r.id !== fid; });
    var gone = f.deck.filter(function (c) { return c.fx === fid; }).length;
    f.deck = f.deck.filter(function (c) { return c.fx !== fid; });
    if (f.hearing === fid) f.hearing = null;
    state.log.unshift({ turn: state.turn, text: x.name + " " + (why || "is let go") + ". " + gone + " card" + (gone === 1 ? "" : "s") + " leave with them." });
    return x;
  }
  LD.fyFire = function (state, fid) {
    state = clone(state);
    var f = fy(state);
    if (!f || !f.fixers.some(function (r) { return r.id === fid; })) return { ok: false, error: "Not on your payroll.", state: state };
    if (f.fight && !f.fight.done) return { ok: false, error: "Not in the middle of a fight.", state: state };
    if (f.fixers.length <= 1) return { ok: false, error: "Keep at least one fixer.", state: state };
    var x = fire(state, fid);
    return { ok: true, state: state, fixer: x };
  };
  function hottest(state) {
    var f = fy(state), best = null;
    f.fixers.forEach(function (r) { if (!best || r.heat > best.heat) best = r; });
    return best;
  }
  function heatUp(state, fid, n, why) {
    var f = fy(state), r = null;
    f.fixers.forEach(function (x) { if (x.id === fid) r = x; });
    if (!r) r = hottest(state);
    if (!r) return;
    r.heat = Math.min(3, r.heat + (n || 1));
    if (r.heat >= 3 && !f.hearing) { f.hearing = r.id; state.log.unshift({ turn: state.turn, text: FIXER_BY[r.id].name + " is at Heat 3. A Senate Hearing is coming next quarter." }); }
    else state.log.unshift({ turn: state.turn, text: FIXER_BY[r.id].name + ": Heat " + r.heat + (why ? " (" + why + ")" : "") + "." });
  }

  /* ---------- Encounters ---------- */
  LD.ENCOUNTERS = {
    regulator: { name: "The Regulator", sub: "On loan from industry", icon: "🕴️", pattern: ["fine", "audit"], win: "Deal pays +10%" },
    rival: { name: "The Holdout", sub: "The owner won't sell", icon: "🦈", pattern: ["undercut", "outbid"], win: "+$3M" },
    protest: { name: "The Protest", sub: "They brought a drum", icon: "✊", pattern: ["chant", "swell"], win: "Unrest −3" },
    journalist: { name: "The Journalist", sub: "Has your old emails", icon: "🎙️", pattern: ["question", "expose"], win: "Upgrade a card" },
    hearing: { name: "Senate Hearing", sub: "Elite · you are under oath", icon: "🏛️", elite: true, pattern: ["contempt", "oath", "contempt", "contempt"], win: "An Asset for the wall, Heat reset" },
    earnings: { name: "The Earnings Call", sub: "Act I boss · the analysts are on the line", icon: "📞", boss: true, pattern: ["guidance", "miss", "guidance", "miss"], win: "Rare reward and an Asset" },
    shortseller: { name: "Short-Seller Report", sub: "Act I boss · 90 pages on you", icon: "🐻", boss: true, pattern: ["report", "expose2", "report", "expose2"], win: "Rare reward and an Asset" },
    strike: { name: "General Strike", sub: "Act II boss · the street walks out", icon: "✊", boss: true, pattern: ["chant", "chant2", "chant2", "chant2"], win: "Rare reward and an Asset" },
    bid: { name: "Hostile Takeover Bid", sub: "Act II boss · greenmail or else", icon: "🦈", boss: true, pattern: ["undercut", "strip", "undercut", "strip"], win: "Rare reward and an Asset" },
    crash: { name: "Market Crash", sub: "Act II boss · the floor gives way", icon: "💥", boss: true, pattern: ["crash", "margin", "drain", "margin"], win: "Rare reward and an Asset" }
  };
  LD.INTENTS = {
    fine: { label: "Fine", meter: "cash" },
    audit: { label: "Audit", meter: "cash", rider: "subpoena", at: 4, rtext: "4+ through: a Subpoena curse" },
    undercut: { label: "Undercut", meter: "cash" },
    outbid: { label: "Outbid", meter: "cash", rider: "claim", at: 6, rtext: "6+ through: you lose the claim" },
    chant: { label: "Chant", meter: "unrest", protest: true },
    swell: { label: "Swell", meter: "unrest", protest: true, grow: 2, rtext: "grows +2" },
    question: { label: "Question", meter: "heat", rtext: "Heat +1 per 4, unrest half" },
    expose: { label: "Expose", meter: "unrest", rider: "leak", at: 4, rtext: "4+ through: a Leak curse" },
    contempt: { label: "Contempt", meter: "cash" },
    oath: { label: "Under Oath", meter: "unrest", oath: true, rtext: "your cards cost +1◆ this round" },
    guidance: { label: "Guidance?", meter: "unrest" },
    miss: { label: "Miss the number", meter: "collapse" },
    report: { label: "The Report", meter: "unrest" },
    expose2: { label: "Expose", meter: "unrest", rider: "asset", at: 5, rtext: "5+ through: you lose your newest Asset" },
    chant2: { label: "Chant ×2", meter: "unrest", protest: true, mult: 1.5 },
    strip: { label: "Strip", meter: "cash", rider: "strip", at: 6, rtext: "6+ through: a bunker room loses a level" },
    crash: { label: "Crash", meter: "cash" },
    margin: { label: "Margin call", meter: "cash" },
    drain: { label: "Drain", meter: "cash", rider: "drain", at: 1, rtext: "any through: lose 15% of your cash" }
  };
  LD.METER_NAMES = { cash: "cash", unrest: "unrest", collapse: "collapse", heat: "Heat" };
  function tierMult(state) { return 1 + LD.DOOR.TIER * (state.rating | 0); }
  function encFor(state, deal) {
    var f = fy(state);
    if (bossAt(state, state.turn) && !LD.BOSSES[bossAt(state, state.turn)].final) return bossAt(state, state.turn);
    if (f.hearing) return "hearing";
    if (LD.dunnHearingDue && LD.dunnHearingDue(state)) return "hearing";
    /* Today, a fixer who has run warm all game gets you called to the Senate once, even short of Heat 3. */
    if (actOf(state.turn) === 3 && state.turn >= 10 && !(f.met && f.met.brennan) && f.fixers.some(function (r) { return r.heat >= (state.turn >= 11 ? 1 : 2); })) return "hearing";
    /* the select committee that writes in Act III is the Senate: Brennan holds the hearing (once) */
    if (actOf(state.turn) === 3 && deal && (deal.id === "crisis-inquiry" || deal.id === "settle-action") && !(f.met && f.met.brennan)) return "hearing";
    var kind = LD.dealKind ? LD.dealKind(deal) : "neutral";
    if (LD.doorLevel(state) >= 3) return "protest";
    if (kind === "claim") return "rival";
    if (kind === "crisis") return "protest";
    if (kind === "calm") return state.converting ? "protest" : "journalist";
    return "regulator";
  }
  LD.encounterFor = function (state, dealId) { return encFor(state, LD.dealById(dealId)); };
  /* Where the fight happens: visitors come through your front door ("home"), or you slip out the back door to their turf ("away").
     Bosses and the Senate always pull you away; protests are always at your lobby glass. Otherwise it alternates by quarter. */
  LD.fightVenue = function (fg) {
    if (!fg) return "home";
    if (fg.venue) return fg.venue;
    var E = LD.ENCOUNTERS[fg.enc] || {};
    if (E.boss || E.elite) return "away";
    if (fg.enc === "protest") return "lobby";
    return (fg.q | 0) % 2 === 0 ? "away" : "home";
  };
  function fightRounds(state, encId) {
    var E = LD.ENCOUNTERS[encId];
    if (E.boss) return LD.DOOR.BOSS_ROUNDS + ((state.rating | 0) >= 10 ? 1 : 0);
    if (E.elite) return LD.DOOR.BOSS_ROUNDS;
    if (state.turn === 1 || LD.DOOR.ONE_ROUND) return 1;
    return LD.DOOR.ROUNDS;
  }
  function scrutinyFor(state, encId) {
    var E = LD.ENCOUNTERS[encId], t = state.turn;
    var s = LD.DOOR.SCRUT[Math.min(12, t)] || 30;
    if (!E.boss && (t === 4 || t === 8)) s = LD.DOOR.SCRUT[t - 1] + 2;
    if (E.boss) s = t <= 4 ? LD.DOOR.SCRUT[4] : LD.DOOR.SCRUT[8];
    if (E.elite) s += 8;
    s *= tierMult(state);
    if (E.boss) s *= fy(state).rules.bossMult;
    if (encId === "regulator" && state.cash >= 80 && t > 1) s += 3;
    if (t === 1) s = LD.DOOR.SCRUT[1];
    return Math.max(4, Math.round(s));
  }
  function intentFor(state, fg, round) {
    var key = fg.pattern[(round - 1) % fg.pattern.length], I = LD.INTENTS[key], E = LD.ENCOUNTERS[fg.enc];
    var act = actOf(state.turn);
    var n = LD.DOOR.INTENT[act] + (round - 1);
    if (state.turn === 1) n = 3;
    if (E.boss) n += 2;
    if (E.elite) n += 1;
    n *= tierMult(state);
    if (E.boss) n *= fy(state).rules.bossMult;
    var st = LD.cityStage(state); if (st >= 2) n *= 1 + 0.1 * (st - 1);
    if (I.mult) n *= I.mult;
    n += (fg.ramp || 0) + (fg.cbAdd || 0);
    if (I.protest || fg.enc === "protest") {
      n += [0, 2, 4, 6][LD.doorLevel(state)];
      if ((state.rating | 0) >= 5) n += 2;
      if (state.converting) n += 1;
      if (!fg.flags.noswell) n += fg.swell;
    }
    return { k: key, n: Math.max(1, Math.round(n)), label: I.label, meter: I.meter };
  }
  /* The intent as it will land right now (whisper, Class Action in hand, halved collapse). */
  function intentNow(state, fg) {
    var it = fg.intent; if (!it) return null;
    var n = it.n, I = LD.INTENTS[it.k], notes = [];
    if ((I.protest || fg.enc === "protest") && !fg.flags.noswell) {
      var ca = fg.hand.filter(function (u) { var c = deckCard(state, u); return c && c.id === "c_class"; }).length;
      if (ca) { n += 2 * ca; notes.push("Class Action +" + 2 * ca); }
    }
    if (I.bribeUp && fg.bribes) { n += I.bribeUp * fg.bribes; notes.push("+" + I.bribeUp * fg.bribes + " for your bribes"); }
    if (I.lobbyDown && fg.lobby) { var ld = Math.min(n, I.lobbyDown * fg.lobby); n -= ld; notes.push("captured −" + ld); }
    if (fg.flags.whisper) { n = Math.round(n * 0.7); notes.push("whispered −30%"); }
    if ((fg.gal | 0) <= -2) { n += 2; notes.push("the room is with them +2"); }
    else if ((fg.gal | 0) >= 2) { var gv = Math.min(2, Math.max(0, n - 1)); if (gv) { n -= gv; notes.push("the room is with you −" + gv); } }
    if (fg.enc === "rival" && trait(state, "envy")) { n += 1; notes.push("envy +1"); }
    if (fg.flags.down) { var dn = Math.min(fg.flags.down, Math.max(0, n - 1)); if (dn) { n -= dn; notes.push("rattled −" + dn); } }
    if (fg.flags.cap && n > fg.flags.cap) { notes.push("arbitrated to " + fg.flags.cap); n = fg.flags.cap; }
    if (it.meter === "collapse" && fg.flags.halfcol) { n = Math.round(n / 2); notes.push("halved"); }
    if (fg.flags.cancel) { n = 0; notes.push("cancelled"); }
    var through = Math.max(0, n - fg.block);
    if (through && !fg.hits && trait(state, "humour")) { var hm = Math.min(2, through); through -= hm; notes.push("laughed off −" + hm); }
    var noR = !!(fg.cb && fg.cb.mod && fg.cb.mod.noRider) || !!fg.flags.norider;
    return { k: it.k, label: it.label, meter: it.meter, n: n, block: fg.block, through: through, notes: notes, rider: noR ? null : I.rider, at: I.at, rtext: noR ? (I.rider ? (fg.flags.norider ? "rider can't trigger this round" : "rider buried by a friend") : I.rtext) : I.rtext, oath: !!I.oath, say: I.say || "", halfDeny: !!I.halfDeny, cashTax: I.cashTax || 0 };
  }
  /* The Glance / You've Played This Before: what they'll do next round. */
  LD.fightPeek = function (state) {
    var fg = fy(state) && fy(state).fight; if (!fg || fg.done || !fg.flags.peek || fg.round >= fg.rounds) return null;
    return intentFor(state, fg, fg.round + 1);
  };
  LD.fightIntent = function (state) { var fg = fy(state) && fy(state).fight; return fg && !fg.done ? intentNow(state, fg) : null; };
  function frng(fg) { var r = LD.createRng(fg.rs); return r; }
  function drawN(state, fg, n) {
    var r = frng(fg), drawn = [];
    for (var i = 0; i < n; i++) {
      if (!fg.draw.length) { if (!fg.disc.length) break; fg.draw = r.shuffle(fg.disc); fg.disc = []; }
      var u = fg.draw.shift(); fg.hand.push(u); drawn.push(u);
      var c = deckCard(state, u);
      if (c && c.id === "c_whistle") heatUp(state, null, 1, "a Whistleblower in your hand");
    }
    fg.rs = r.state();
    return drawn;
  }
  /* ---------- Social pressure helpers ---------- */
  /* Light executive traits (lore.js): one wholesome and one toxic trait per executive, each a small fight rule. */
  function trait(state, id) { var T = LD.execTraits ? LD.execTraits(state.executiveId) : null; return !!(T && (T.good.id === id || T.bad.id === id)); }
  LD.fyTrait = trait;
  function tally(fg, p, n) { if (!n || n <= 0) return; fg.pr = fg.pr || {}; fg.pr[p || "none"] = (fg.pr[p || "none"] || 0) + n; }
  /* Tilt the Gallery. Returns the real change. */
  function galMove(state, fg, n) {
    if (!n) return 0;
    if (n < 0 && fg.flags.ghold) return 0;
    var hi = 3; if (trait(state, "withholding")) hi = 2; if (trait(state, "coldcontrol")) hi = 1;
    var lo = fg.gfloor ? 0 : -3, g0 = fg.gal | 0, g = g0 + n;
    if (n > 0) g = Math.min(g, Math.max(hi, g0));
    fg.gal = Math.max(lo, Math.min(3, g));
    return fg.gal - g0;
  }
  LD.fyGalMove = galMove;
  /* The hidden Temper marker (executives only): Stoic (s) and Wholesome (w), -5..+5. Not shown in the HUD. */
  function temper(state) {
    var f = fy(state);
    if (!f.temper) { var h = LD.TEMPER_HOME && LD.TEMPER_HOME[state.executiveId] || { s: 0, w: 0 }; f.temper = { s: h.s, w: h.w, q: null }; }
    return f.temper;
  }
  LD.fyTemper = temper;
  function temperStep(state, fg, tag, free) {
    var m = /^([SW])([+-])$/.exec(tag || ""); if (!m) return;
    var ax = m[1] === "S" ? "s" : "w", d = m[2] === "+" ? 1 : -1, T = temper(state);
    if (!free) { fg.tm = fg.tm || { s: 0, w: 0 }; if (Math.abs(fg.tm[ax] + d) > 2) return; fg.tm[ax] += d; }
    T[ax] = Math.max(-5, Math.min(5, T[ax] + d));
    if (state.executiveId === "cassius") T.s = Math.max(2, T.s);
    if (state.executiveId === "soren") T.w = Math.min(2, T.w);
    T.q = LD.temperQuad ? LD.temperQuad(T) : null;
  }
  function handSize(state) { return LD.DOOR.HAND + (has(state, "rolodex") ? 1 : 0); }
  function startRound(state, fg) {
    fg.block = 0;
    var carry = fg.round > 1 && trait(state, "patience") && fg.inf > 0 ? 1 : 0;
    fg.inf = LD.DOOR.INF + carry + (fg.flags.nextInf || 0) + (fg.round === 1 && has(state, "chief") ? 1 : 0);
    fg.flags.nextInf = 0; fg.flags.cancel = false; fg.flags.whisper = false; fg.flags.defer = false; fg.flags.payCash = 0;
    fg.rp = 0; fg.flags.down = fg.flags.nextDown || 0; fg.flags.nextDown = 0; fg.flags.cap = 0; fg.flags.norider = false; fg.flags.ghold = false; fg.flags.rumLanded = 0;
    fg.flags.peek = false;
    if (fg.round > 1 && fg.rumour > 0 && fg.scrut > 0) {
      /* A rumour planted last round turns real. */
      var rb = fg.scrut; fg.scrut = Math.max(0, fg.scrut - fg.rumour); tally(fg, "rumour", rb - fg.scrut); fg.flags.rumLanded = rb - fg.scrut; fg.rumour = 0;
    }
    fg.intent = intentFor(state, fg, fg.round);
    fg.flags.oath = !!LD.INTENTS[fg.intent.k].oath;
    drawN(state, fg, handSize(state));
  }
  function makeFight(state, deal, choiceId, ctx) {
    var f = fy(state), enc = encFor(state, deal), E = LD.ENCOUNTERS[enc];
    var r = fyRng(state, "fight:" + state.turn + ":" + enc);
    var fg = {
      enc: enc, name: E.name, sub: E.sub, icon: E.icon, boss: E.boss ? enc : null, elite: !!E.elite, hearing: E.elite ? f.hearing : null,
      dealId: deal.id, kind: LD.dealKind ? LD.dealKind(deal) : "neutral", region: state.world && state.world.pins ? state.world.pins[deal.id] || null : null,
      claimed: !!(ctx && ctx.claimed), dealCash: (ctx && ctx.cash) || 0, dealTitle: deal.title,
      q: state.turn, round: 1, rounds: fightRounds(state, enc), pattern: E.pattern.slice(), swell: 0,
      scrut: 0, max: 0, inf: 0, block: 0, hand: [], draw: [], disc: [], exh: [], flags: {}, wins: [], played: 0,
      leaks: { cash: 0, unrest: 0, collapse: 0, heat: 0 }, log: [], rs: 1, done: null, intent: null
    };
    if (enc !== "protest" && LD.doorLevel(state) >= 3 && !E.boss && !E.elite) fg.pattern = LD.ENCOUNTERS.protest.pattern.slice();
    /* Who is at the door: the act's cast (eras.js). The base encounter keeps the balance; the face brings the moves and the lines. */
    var opp = LD.pickOpponent ? LD.pickOpponent(state, enc, fg.kind, r, deal) : null, O = opp && LD.oppById(opp);
    if (O) {
      fg.opp = opp; fg.encName = E.name; fg.name = O.who; fg.sub = O.role + " \u00b7 " + E.name; fg.pattern = O.pattern.slice();
      if (O.venue) fg.venue = O.venue;
      else if (enc === "protest" && !E.boss) fg.venue = (state.turn % 2 === 0) ? "away" : "home";
      f.met = f.met || {}; f.met[opp] = state.turn;
      fg.cb = LD.callbackFor ? LD.callbackFor(state, opp) : null;
      if (fg.cb && f.cbDone && f.cbDone[fg.cb.id]) fg.cb = null;
      if (fg.cb) { f.cbDone = f.cbDone || {}; f.cbDone[fg.cb.id] = state.turn; f.cbSeen = (f.cbSeen || []).concat([fg.cb.id]); }
    }
    fg.ramp = 0; fg.bribes = 0; fg.lobby = 0; fg.cbAdd = fg.cb && fg.cb.mod.add ? fg.cb.mod.add : 0;
    /* Social pressure (base game): the Gallery (-3..+3, + = the room is with you), damage by pressure type, the hidden temper steps. */
    fg.gal = 0; fg.pr = {}; fg.tm = { s: 0, w: 0 }; fg.rp = 0; fg.rumour = 0; fg.w4 = false; fg.hits = 0;
    fg.venue = LD.fightVenue(fg);
    if (O && O.gal) fg.gal = O.gal;
    if (trait(state, "stonewalling") && (fg.venue === "lobby" || enc === "protest")) fg.gal -= 1;
    fg.gal = Math.max(-3, Math.min(3, fg.gal));
    if (enc === "protest" && (state.rating | 0) >= 5) fg.swell = 0;
    fg.scrut = fg.max = scrutinyFor(state, enc);
    if (fg.cb && fg.cb.mod.scrutMult) fg.scrut = fg.max = Math.max(4, Math.round(fg.max * fg.cb.mod.scrutMult));
    if (fg.cb && fg.cb.mod.cash) { var cc = Math.min(state.cash, fg.cb.mod.cash); state.cash -= cc; fg.leaks.cash += cc; }
    fg.rs = Math.floor(r() * 4294967295) >>> 0 || 7;
    var rr = frng(fg); fg.draw = rr.shuffle(f.deck.map(function (c) { return c.u; })); fg.rs = rr.state();
    if (state.turn === 1) {
      /* Q1 is the tutorial knock: the opening hand always holds two Talking Points and a No Comment, so the first fight can be won. */
      var want = ["talking", "talking", "nocomment"], top = [];
      want.forEach(function (id) { for (var i = 0; i < fg.draw.length; i++) { var c = deckCard(state, fg.draw[i]); if (c && c.id === id) { top.push(fg.draw.splice(i, 1)[0]); break; } } });
      fg.draw = top.concat(fg.draw);
    }
    if (fg.cb && fg.cb.mod.curse) { var cz = addCurse(state, fg.cb.mod.curse, fg.cb.who); fg.hand.push(cz.u); }
    f.fightN = (f.fightN || 0) + 1;
    f.fight = fg;
    startRound(state, fg);
    state.log.unshift({ turn: state.turn, text: "A knock at the door: " + fg.name + " (Scrutiny " + fg.max + ", " + fg.rounds + " round" + (fg.rounds === 1 ? "" : "s") + ")." });
    return fg;
  }
  function costNow(state, fg, o) {
    if (o.unplay) return null;
    var c = o.cost || 0;
    if (fg.flags.oath && c >= 1 && !o.cash) c += 1;
    return c;
  }
  /* What a card would do if played now (for the UI). */
  LD.fightCardInfo = function (state, u) {
    var f = fy(state), fg = f && f.fight; if (!fg || fg.done) return null;
    var c = deckCard(state, u); if (!c) return null;
    var o = cv(c.id, c.up), cost = costNow(state, fg, o), why = null;
    var I0 = fg.intent ? LD.INTENTS[fg.intent.k] : null, cashNow = o.cash ? o.cash + (I0 && I0.cashTax ? I0.cashTax : 0) : 0;
    if (o.unplay) why = "Unplayable.";
    else if (cashNow && state.cash < cashNow) why = "Needs $" + cashNow + "M.";
    else if (cost > fg.inf) why = "Needs " + cost + "◆.";
    else if (o.sp === "purge" && !f.deck.some(function (d) { return isCurse(d.id); })) why = "No curse to remove.";
    else if (o.w4 && fg.w4) why = "The narrator only breaks the fourth wall once a fight.";
    var vsP = fg.enc === "protest" || LD.INTENTS[fg.intent.k].protest;
    var dd = (o.d || 0) * (o.sp === "vsprotestd" && vsP ? 2 : 1); if (dd && I0 && I0.halfDeny) dd = Math.ceil(dd / 2);
    var pres = presOf(c.id), O = fg.opp && LD.oppById ? LD.oppById(fg.opp) : null;
    if (dd && pres === "legal" && !fg.flags.legalUsed && trait(state, "boundaries")) dd += 2;
    if (dd && fg.round === 1 && trait(state, "duty")) dd += 1;
    var pp = (o.p || 0) * (o.sp === "vsprotest" && vsP ? 2 : 1);
    if (o.gb && (fg.gal | 0) >= 1) pp += o.gb;
    if (o.per) pp += o.per * (fg.rp || 0);
    if (o.solo && !fg.rp) pp += o.solo;
    if (pp && (pres === "shame" || pres === "rumour") && trait(state, "passion")) pp += 1;
    if (pp && pres === "shame" && O && O.shameless) pp = Math.ceil(pp / 2);
    return { u: u, id: c.id, up: c.up, o: o, cost: cost, why: why, cash: cashNow, p: pp, d: dd, pres: pres, g: galOf(c.id, o) };
  };
  function fightCheck(state) {
    var f = fy(state); if (!f) return "No fight.";
    var fg = f.fight; if (!fg) return "Nobody at the door.";
    if (fg.done) return "The fight is over.";
    if (state.ended) return "Run already ended.";
    return null;
  }
  LD.fightPlay = function (state, u) {
    state = clone(state);
    var why = fightCheck(state); if (why) return { ok: false, error: why, state: state };
    var f = fy(state), fg = f.fight, ix = fg.hand.indexOf(u);
    if (ix === -1) return { ok: false, error: "That card is not in your hand.", state: state };
    var c = deckCard(state, u), o = cv(c.id, c.up), info = LD.fightCardInfo(state, u), fx = [];
    if (o.sp === "discardpay") {
      if (fg.inf < 1) return { ok: false, error: "Needs 1◆ to discard.", state: state };
      fg.inf -= 1; fg.hand.splice(ix, 1); fg.disc.push(u);
      return { ok: true, state: state, fx: [{ k: "discard", text: "Subpoena filed away (−1◆)." }], card: o };
    }
    if (info.why) return { ok: false, error: info.why, state: state };
    fg.inf -= info.cost;
    if (info.cash) { state.cash -= info.cash; fx.push({ k: "cash", n: -info.cash }); }
    if (info.cash || o.sp === "codb") fg.bribes = (fg.bribes || 0) + 1;
    if (c && CARD_BY[c.id] && CARD_BY[c.id].t === "Lobbyist") fg.lobby = (fg.lobby || 0) + 1;
    fg.hand.splice(ix, 1);
    fg.played += 1; fg.rp = (fg.rp || 0) + 1;
    var before = fg.scrut;
    if (info.p) { fg.scrut = Math.max(0, fg.scrut - info.p); }
    if (o.sp === "cut40") fg.scrut = Math.max(0, fg.scrut - Math.round(fg.scrut * 0.4));
    if (o.sp === "cut30") fg.scrut = Math.max(0, fg.scrut - Math.round(fg.scrut * 0.3));
    if (fg.scrut < before) fx.push({ k: "pressure", n: before - fg.scrut });
    tally(fg, info.pres, before - fg.scrut);
    if (info.d) { fg.block += info.d; fx.push({ k: "deny", n: info.d }); }
    if (info.d && info.pres === "legal") fg.flags.legalUsed = true;
    /* Social pressure: card flags, the Gallery, the hidden marker. */
    if (o.gfloor) { fg.gfloor = true; if (fg.gal < 0) fg.gal = 0; }
    if (o.ghold) fg.flags.ghold = true;
    if (o.down) fg.flags.down = (fg.flags.down || 0) + o.down;
    if (o.next) fg.flags.nextDown = (fg.flags.nextDown || 0) + o.next;
    if (o.cap) fg.flags.cap = fg.flags.cap ? Math.min(fg.flags.cap, o.cap) : o.cap;
    if (o.norider) fg.flags.norider = true;
    if (o.peek) fg.flags.peek = true;
    if (o.rum) fg.rumour = (fg.rumour || 0) + o.rum;
    if (o.w4) fg.w4 = true;
    var gm = info.g + (info.pres === "obligation" && trait(state, "smothering") ? -1 : 0);
    /* Behind your own office door, facts have no audience: plain information doesn't sway the Gallery. */
    if (info.pres === "info" && o.g === undefined && LD.fightVenue(fg) === "home") gm = 0;
    var gd = galMove(state, fg, gm); if (gd) fx.push({ k: "gallery", n: gd });
    var tg = CARD_BY[c.id] && CARD_BY[c.id].tags; if (tg) temperStep(state, fg, tg.temper);
    var vtag = tg && /^silent:/.test(tg.voice) ? tg.voice.slice(7) : null;
    if (o.col) { state.collapse = clamp(state.collapse + o.col, 0, LD.MAX_COLLAPSE); cityAdd(state, 2); fx.push({ k: "collapse", n: o.col }); }
    if (o.un) { state.unrest = clamp(state.unrest + o.un, 0, LD.MAX_UNREST); fx.push({ k: "unrest", n: o.un }); }
    if (o.bill) { f.bill = (f.bill || 0) + o.bill; fx.push({ k: "bill", n: o.bill }); }
    switch (o.sp) {
      case "codb": fg.flags.payCash = o.mult || 1.5; break;
      case "cancel": fg.flags.cancel = true; break;
      case "whisper": fg.flags.whisper = true; break;
      case "defer": fg.flags.defer = true; break;
      case "noswell": fg.flags.noswell = true; break;
      case "nextinf": fg.flags.nextInf = (fg.flags.nextInf || 0) + 1; break;
      case "halfcol": fg.flags.halfcol = true; break;
      case "purge":
        var cu = fg.hand.map(function (x) { return deckCard(state, x); }).filter(function (d) { return d && isCurse(d.id); })[0] ||
          f.deck.filter(function (d) { return isCurse(d.id); })[0];
        if (cu) { f.deck = f.deck.filter(function (d) { return d.u !== cu.u; }); ["hand", "draw", "disc"].forEach(function (p) { fg[p] = fg[p].filter(function (x) { return x !== cu.u; }); });
          fx.push({ k: "purge", text: CARD_BY[cu.id].name + " settled for good." }); state.log.unshift({ turn: state.turn, text: "Settle Quietly: " + CARD_BY[cu.id].name + " leaves your deck." }); }
        break;
      case "crack":
        var cr = fyRng(state, "crack:" + state.turn + ":" + u + ":" + fg.played)();
        if (cr < (f.rules.crackedDiscount ? 0.5 : 0.25)) { addCurse(state, "c_crack", "Cut Corners"); fx.push({ k: "curse", text: "A Crack forms." }); }
        break;
    }
    if (o.expose) {
      var er = fyRng(state, "expose:" + state.turn + ":" + u + ":" + fg.played)();
      if (er < o.expose / 100) { addCurse(state, "c_leak", o.name + " was exposed"); heatUp(state, c.fx, 1, o.name + " exposed"); fx.push({ k: "exposed", text: o.name + " was exposed: a Leak, Heat +1." });
        fg.flags.ghold = false; var ge = galMove(state, fg, -2 - (trait(state, "vanity") ? 1 : 0)); if (ge) fx.push({ k: "gallery", n: ge }); }
    }
    if (o.draw) drawN(state, fg, o.draw);
    if (o.win) fg.wins.push(o.win);
    if (o.ex) fg.exh.push(u); else fg.disc.push(u);
    var res = { ok: true, state: state, fx: fx, card: o, silent: vtag, pres: info.pres, gal: gd };
    if (fg.scrut <= 0) { resolve(state, true, false); res.ended = fg.done; }
    return res;
  };
  function applyThrough(state, fg, it) {
    var out = { meter: it.meter, n: it.through, text: "", riders: [] };
    if (!it.through) { out.text = it.label + ": blocked."; return out; }
    var M = LD.DOOR.METER, t = it.through;
    if (fg.flags.defer) {
      t = Math.max(1, Math.round(t / 2));
      var pd = { due: state.turn + 1, source: fg.name, unrest: 0, collapse: 0, cash: 0, log: fg.name + ": the delayed filing lands.", flags: null, grantSystem: null, effectsIf: null, strain: null, ease: null, install: null };
      if (it.meter === "cash") pd.cash = -Math.round(t * M.cash); else if (it.meter === "collapse") pd.collapse = Math.round(t * M.collapse); else pd.unrest = Math.round(t * M.unrest * (it.meter === "heat" ? 0.5 : 1));
      state.pending.push(pd);
      out.text = it.label + ": halved to " + t + " and deferred to next quarter (Discovery Delay).";
      out.deferred = true;
      return out;
    }
    if (fg.flags.payCash) {
      var pay = Math.ceil(t * fg.flags.payCash);
      state.cash = Math.max(0, state.cash - pay); fg.leaks.cash += pay;
      out.text = it.label + ": paid off, −$" + pay + "M."; out.meter = "cash"; out.n = pay;
      return out;
    }
    if (it.meter === "cash") { var cn = Math.round(t * M.cash); state.cash = Math.max(0, state.cash - cn); fg.leaks.cash += cn; out.n = cn; out.text = it.label + ": −$" + cn + "M."; }
    else if (it.meter === "unrest") { var un = Math.round(t * M.unrest); state.unrest = clamp(state.unrest + un, 0, LD.MAX_UNREST); fg.leaks.unrest += un; out.n = un; out.text = it.label + ": unrest +" + un + "."; }
    else if (it.meter === "collapse") { var co = Math.max(1, Math.round(t * M.collapse)); state.collapse = clamp(state.collapse + co, 0, LD.MAX_COLLAPSE); fg.leaks.collapse += co; out.n = co; out.text = it.label + ": collapse +" + co + "."; }
    else if (it.meter === "heat") {
      var h = Math.max(1, Math.floor(t / 4)), hu = Math.round(t / 2);
      heatUp(state, null, h, "the Journalist's questions"); fg.leaks.heat += h;
      if (hu) { state.unrest = clamp(state.unrest + hu, 0, LD.MAX_UNREST); fg.leaks.unrest += hu; }
      out.text = it.label + ": Heat +" + h + (hu ? ", unrest +" + hu : "") + ".";
    }
    var I = LD.INTENTS[it.k];
    if (I.rider && t >= I.at && !(fg.cb && fg.cb.mod && fg.cb.mod.noRider) && !fg.flags.norider) {
      if (I.rider === "subpoena") { addCurse(state, "c_subpoena", "the audit"); out.riders.push("A Subpoena joins your deck."); }
      if (I.rider === "leak") { addCurse(state, "c_leak", "the story ran"); out.riders.push("A Leak joins your deck."); }
      if (I.rider === "claim" && fg.claimed && fg.region && state.world.regions[fg.region]) { state.world.regions[fg.region].owned = false; fg.claimed = false; out.riders.push("Outbid: you lose the claim on " + LD.REGION_NAMES[fg.region] + "."); }
      if (I.rider === "asset") { var nw = null; for (var i = f0(state).hand.length - 1; i >= 0; i--) { var ac = cardById(f0(state).hand[i].id); if (ac && !ac.liability) { nw = ac; break; } } if (nw) { removeCard(state, nw.id); out.riders.push(nw.name + " is exposed and written off."); } }
      if (I.rider === "strip") { var rooms = LD.SYSTEMS.map(function (s) { return s.id; }).sort(function (a, b) { return state.bunker[b].level - state.bunker[a].level; }); var b = state.bunker[rooms[0]]; if (b.level > 0) { b.level -= 1; out.riders.push("The raider strips your " + rooms[0] + " room to Lv " + b.level + "."); } }
      if (I.rider === "drain") { var lost = Math.round(state.cash * 0.15); state.cash -= lost; fg.leaks.cash += lost; out.riders.push("The drain takes another $" + lost + "M."); }
    }
    if (I.grow && !fg.flags.noswell) fg.swell += I.grow;
    return out;
  }
  function f0(state) { return fy(state); }
  LD.fightEndRound = function (state) {
    state = clone(state);
    var why = fightCheck(state); if (why) return { ok: false, error: why, state: state };
    var f = fy(state), fg = f.fight, it = intentNow(state, fg);
    var hit = applyThrough(state, fg, it), I1 = LD.INTENTS[it.k];
    if (it.through > 0) { fg.hits = (fg.hits || 0) + 1; if (it.through >= 4 && !trait(state, "equanimity")) hit.gal = galMove(state, fg, -1); } /* a hit the room can see */
    if (I1.ramp && it.through) { fg.ramp = (fg.ramp || 0) + I1.ramp; hit.ramp = I1.ramp; }
    if (I1.heal && it.n > 0 && fg.scrut > 0) { var hb = fg.scrut; fg.scrut = Math.min(fg.max, fg.scrut + I1.heal); hit.heal = fg.scrut - hb; if (hit.heal) hit.text += " They win back " + hit.heal + " Scrutiny."; }
    fg.log.push({ round: fg.round, intent: it.label, n: it.n, block: it.block, through: it.through, text: hit.text, riders: hit.riders });
    state.log.unshift({ turn: state.turn, text: fg.name + " · round " + fg.round + ": " + hit.text + (hit.riders.length ? " " + hit.riders.join(" ") : "") });
    fg.hand.forEach(function (u) { fg.disc.push(u); }); fg.hand = [];
    var res = { ok: true, state: state, hit: hit, intent: it };
    if (state.unrest >= LD.MAX_UNREST || state.collapse >= LD.MAX_COLLAPSE) { resolve(state, false, false); res.ended = fg.done; return res; }
    if (fg.round >= fg.rounds) { resolve(state, false, false); res.ended = fg.done; return res; }
    fg.round += 1;
    startRound(state, fg);
    if (fg.flags.rumLanded) res.rumour = fg.flags.rumLanded;
    if (fg.scrut <= 0) { resolve(state, true, false); res.ended = fg.done; }
    return res;
  };
  LD.fightSettleCost = function (state) { var fg = fy(state) && fy(state).fight; return fg && !fg.done ? Math.max(1, Math.ceil(fg.scrut * LD.DOOR.SETTLE)) : 0; };
  LD.fightSettle = function (state) {
    state = clone(state);
    var why = fightCheck(state); if (why) return { ok: false, error: why, state: state };
    var fg = fy(state).fight, cost = LD.fightSettleCost(state);
    if (state.cash < cost) return { ok: false, error: "Settling needs $" + cost + "M.", state: state };
    state.cash -= cost;
    fg.leaks.cash += cost;
    resolve(state, false, true, cost);
    return { ok: true, state: state, cost: cost };
  };
  /* ---------- Outcomes: the ending is chosen from HOW you won (dominant pressure, the Gallery, the cost) ----------
     The mechanical result (paid / crushed / walked, see LD.fightHow) is unchanged; callbacks and the recap still key on it. */
  var OUT_TEMPER = { bought: "W-", reconciled: "W+", martyred: "S-", exposed: "S-", ignored: "S+" };
  function outcomeFor(state, fg, win, settled) {
    var pr = fg.pr || {}, tot = 0, dom = null, best = 0;
    Object.keys(pr).forEach(function (k) { tot += pr[k]; if (k !== "none" && pr[k] > best) { best = pr[k]; dom = k; } });
    var mixed = !dom || best < 0.4 * tot; /* no pressure type carried 40% of the damage */
    var g = fg.gal | 0, L = fg.leaks || {}, cost = (L.unrest || 0) + Math.round((L.cash || 0) / 2) + 2 * (L.collapse || 0) + 3 * (L.heat || 0);
    if (settled) return { out: "deal", dom: dom };
    if (!win) return { out: "walked", dom: dom };
    if (g <= -2) return { out: "martyred", dom: dom };
    if (cost >= 12) return { out: "pyrrhic", dom: dom };
    var o = "broken";
    if (mixed) o = g >= 1 ? "exposed" : (fg.bribes | 0) > 0 ? "bought" : "broken";
    else if (dom === "obligation") o = "bought";
    else if (dom === "patronage") o = "converted";
    else if (dom === "kinship") o = "reconciled";
    else if (dom === "status") o = g >= 2 ? "exposed" : "ignored"; /* a snub only empties a room that wasn't watching */
    else if (dom === "shame" || dom === "info" || dom === "rumour" || dom === "solidarity") o = g >= 1 ? "exposed" : dom === "solidarity" ? "ignored" : "broken";
    else if ((fg.bribes | 0) > 0) o = "bought";
    return { out: o, dom: dom };
  }
  LD.fightOutcomeFor = outcomeFor;
  /* Win, loss or settle: bonuses, penalties, region stress, bosses, the Hearing. */
  function resolve(state, win, settled, cost) {
    var f = fy(state), fg = f.fight, E = LD.ENCOUNTERS[fg.enc], notes = [], t = state.turn;
    var reg = fg.region && state.world && state.world.regions ? state.world.regions[fg.region] : null;
    if (win) {
      if (fg.enc === "regulator") { var b = Math.max(2, Math.round(Math.max(0, fg.dealCash) * 0.1)); state.cash += b; notes.push("deal pays +$" + b + "M"); }
      if (fg.enc === "rival") { state.cash += 3; notes.push("+$3M"); }
      if (fg.enc === "protest") { state.unrest = clamp(state.unrest - 3, 0, LD.MAX_UNREST); notes.push("unrest −3"); }
      if (fg.enc === "journalist") { f.upTokens = (f.upTokens || 0) + 1; notes.push("a card upgrade"); }
      if (fg.elite) { var hf = f.fixers.filter(function (x) { return x.id === fg.hearing; })[0]; if (hf) hf.heat = 0; f.hearing = null; f.assetNext = true; notes.push("an Asset for the wall, Heat reset"); }
      if (fg.boss) { f.bosses += 1; f.beatNow = true; f.bossLoot = true; notes.push("rare reward, an Asset and loot"); }
      fg.wins.forEach(function (w) {
        if (w === "carve" && fg.kind === "squeeze") { state.cash += 3; notes.push("Carve-out +$3M"); }
        if (w === "zoning" && reg) { reg.stress = Math.max(0, reg.stress - 1); notes.push("Zoning: stress −1"); }
        if (w === "permit") { f.permitQ = t; notes.push("next bunker work −$4M"); }
        if (w === "bury") { var cut = 0; state.pending.forEach(function (p) { if (!p.install && p.source === fg.dealTitle && p.due > t) { var u0 = p.unrest || 0, c0 = p.collapse || 0; p.unrest = Math.round(u0 * 0.75); p.collapse = Math.round(c0 * 0.75); cut += u0 - p.unrest + c0 - p.collapse; } }); notes.push("fallout −" + cut); }
        if (w === "photo") { cityAdd(state, -8); notes.push("city −8"); }
        if (w === "cool") { state.collapse = clamp(state.collapse - 1, 0, LD.MAX_COLLAPSE); notes.push("collapse −1"); }
      });
      if (reg) reg.stress = Math.max(0, reg.stress - 1);
    } else if (!settled) {
      if (reg) { reg.stress = Math.min(LD.STRESS_MAX || 5, reg.stress + 1); notes.push(LD.REGION_NAMES[fg.region] + " stress +1"); }
      if (fg.elite && fg.hearing) { fire(state, fg.hearing, "testifies and leaves the firm"); f.hearing = null; notes.push("your fixer testified"); }
    } else if (fg.elite) { var hf2 = f.fixers.filter(function (x) { return x.id === fg.hearing; })[0]; if (hf2) hf2.heat = 1; f.hearing = null; notes.push("Heat eased"); }
    if (fg.boss) {
      f.lastBoss = { id: fg.boss, q: t, beaten: !!win, text: fg.name + (win ? ": you won the room." : settled ? ": settled out of court." : ": they got what they came for.") };
      f.bossLog.push({ id: fg.boss, q: t, beaten: !!win });
    }
    fg.done = { win: !!win, settled: !!settled, cost: cost || 0, notes: notes, leaks: clone(fg.leaks) };
    var out = outcomeFor(state, fg, win, settled);
    fg.done.out = out.out; fg.done.dom = out.dom; fg.done.gal = fg.gal | 0;
    var how = LD.fightHow ? LD.fightHow(fg) : null;
    temperStep(state, fg, OUT_TEMPER[out.out], true);
    if (out.out === "martyred") temperStep(state, fg, "W+", true);
    f.outcomes = f.outcomes || {}; f.outcomes[out.out] = (f.outcomes[out.out] || 0) + 1;
    if (fg.opp && how) {
      fg.done.how = how;
      f.fates = f.fates || {}; f.fates[fg.opp] = { how: how, out: out.out, q: t, act: actOf(t), who: fg.name, dealId: fg.dealId || null };
      if ((fg.opp === "june" || fg.opp === "pops") && how === "crushed" && f.bossII !== "strike" && t < 8) { f.bossII = "strike"; f.strikeSwap = t; notes.push(LD.oppFate && LD.oppFate(state, "june") && LD.oppFate(state, "june").how === "crushed" ? "June Park will lead a general strike at Q8" : "The picket line remembers Pops: a general strike at Q8"); }
    }
    f.lastFight = { q: t, enc: fg.enc, win: !!win, settled: !!settled, boss: fg.boss, elite: fg.elite, opp: fg.opp || null, how: how, out: out.out };
    f.fights = f.fights || { won: 0, lost: 0, settled: 0 };
    f.fights[win ? "won" : settled ? "settled" : "lost"] += 1;
    state.log.unshift({ turn: t, text: fg.name + ": " + (win ? "you win" : settled ? "settled for $" + cost + "M" : "they got through") + (notes.length ? " (" + notes.join(", ") + ")" : "") + "." });
    rebuildMods(state);
  }
  /* Leave the door: back to the desk (the deal is already signed). */
  LD.fightClose = function (state) {
    state = clone(state);
    var f = fy(state); if (!f || !f.fight) return { ok: false, error: "Nobody at the door.", state: state };
    if (!f.fight.done) return { ok: false, error: "Finish the fight first.", state: state };
    f.fight = null;
    makeReward(state);
    f.beatNow = false;
    return { ok: true, state: state, reward: f.reward };
  };
  LD.fyPermitCut = function (state) { var f = fy(state); return f && f.permitQ === state.turn ? 4 : 0; };
  function busy(state) { var f = fy(state); return f && f.fight ? (f.fight.done ? "Close the door first." : "Finish the fight at the door first.") : f && f.reward ? "Take your reward first." : null; }
  LD.fyBusy = busy;

  /* ---------- Rewards: 1 of 3 cards, shred, or skip; Assets after bosses and the Hearing ---------- */
  function rewardPool(state) {
    var f = fy(state), types = { Shared: 1, Silent: 1 }, act = actOf(state.turn);
    f.fixers.forEach(function (r) { var x = FIXER_BY[r.id]; if (x) types[x.t] = 1; });
    return LD.CARDS.filter(function (c) { return types[c.t] && (c.r === "C" || c.r === "U" || c.r === "R") && (!c.era || c.era === act); });
  }
  function rollCards(state, n, rare, rng) {
    var act = actOf(state.turn), W = [null, { C: 60, U: 32, R: 8 }, { C: 50, U: 38, R: 12 }, { C: 40, U: 42, R: 18 }][act];
    var pool = rewardPool(state), out = [];
    if (rare) { var rs = pool.filter(function (c) { return c.r === "R"; }); if (rs.length) { var pr = rs[Math.floor(rng() * rs.length)]; out.push(pr.id); } }
    var guard = 0;
    while (out.length < n && guard++ < 60) {
      var tot = 0; pool.forEach(function (c) { tot += W[c.r]; });
      var x = rng() * tot, pick = pool[0];
      for (var i = 0; i < pool.length; i++) { x -= W[pool[i].r]; if (x <= 0) { pick = pool[i]; break; } }
      if (out.indexOf(pick.id) === -1) out.push(pick.id);
    }
    return out;
  }
  function makeReward(state) {
    var f = fy(state), lf = f.lastFight;
    if (!lf || lf.rewarded || lf.q < state.turn - 1) return null;
    lf.rewarded = true;
    var rng = fyRng(state, "reward:" + lf.q + ":" + (f.rerolled || 0));
    var rare = !!(f.beatNow || f.nextRare);
    var n = !lf.win && !lf.settled ? 2 : 3;
    var cards = rollCards(state, n, rare, rng);
    var asset = null;
    var actOpen = (lf.q === 1 || lf.q === 4 || lf.q === 8);
    if (f.beatNow || f.assetNext || actOpen) asset = drawAssets(state, 3, !!(f.beatNow || f.assetNext), rng);
    if (asset && !asset.length) asset = null;
    var item = null;
    if (f.bossLoot) { f.bossLoot = false; item = pickLoot(state, "boss", rng); }
    else if (f.lootNext) { item = f.lootNext; }
    f.lootNext = null;
    var rider = f.rules.riderChance > 0 && rng() < f.rules.riderChance ? ["c_class", "c_subpoena", "c_whistle", "c_leak"][Math.floor(rng() * 4)] : null;
    f.assetNext = false; f.nextRare = false;
    f.reward = { q: state.turn, from: lf, cards: cards, rare: rare, asset: asset, item: item, rider: rider, cardDone: false, assetDone: !asset, itemDone: !item, picked: null, why: lf.boss ? "boss" : lf.elite ? "elite" : actOpen && asset ? "act" : "fight" };
    return f.reward;
  }
  function pickLoot(state, src, rng) {
    var f = fy(state), held = {}; f.drawer.forEach(function (d) { held[d.id] = 1; });
    var W = { C: 50, U: 38, R: src === "boss" ? 30 : 12 };
    var pool = []; LD.ITEMS.forEach(function (it) { if (!held[it.id] && !it.office) for (var i = 0; i < W[it.r]; i++) pool.push(it.id); });
    return pool.length ? pool[Math.floor(rng() * pool.length)] : null;
  }
  function rewardDone(f) { var r = f.reward; if (r && r.cardDone && r.assetDone && r.itemDone) f.reward = null; }
  LD.shredCost = function (state) { var f = fy(state); return f && f.freeShreds ? 0 : LD.DOOR.SHRED + LD.DOOR.SHRED_STEP * ((f && f.shreds) || 0); };
  LD.shredBlock = function (state, u) {
    var f = fy(state), c = deckCard(state, u); if (!c) return "Not in your deck.";
    if (c.id === "c_stranded") return "Only Settle Quietly removes a Stranded Asset.";
    if (isCurse(c.id) && f.rules.paperTrail && f.act >= 3) return "Paper trail: curses can't be shredded in Act III.";
    if (f.deck.length <= 6) return "Keep at least 6 cards.";
    var cost = LD.shredCost(state); if (state.cash < cost) return "Shredding costs $" + cost + "M.";
    return null;
  };
  LD.upgradeBlock = function (state, u) {
    var f = fy(state), c = deckCard(state, u); if (!c) return "Not in your deck.";
    if (!(f.upTokens > 0)) return "No upgrades left. Beat a Journalist to earn one.";
    if (c.up) return "Already upgraded (once per card).";
    if (!CARD_BY[c.id].up) return "This card can't be upgraded.";
    return null;
  };
  /* action: {kind:"card",id} | {kind:"shred",u} | {kind:"skip"} | {kind:"asset",id,replace} | {kind:"assetPass"} | {kind:"item",keep,replace} | {kind:"upgrade",u} | {kind:"reroll"} */
  LD.fyReward = function (state, a) {
    state = clone(state);
    var f = fy(state), r = f && f.reward, out = { ok: true, state: state };
    if (a.kind === "upgrade") {
      var ub = LD.upgradeBlock(state, a.u); if (ub) return { ok: false, error: ub, state: state };
      var uc = deckCard(state, a.u); uc.up = 1; f.upTokens -= 1;
      state.log.unshift({ turn: state.turn, text: "Upgraded " + CARD_BY[uc.id].name + "." });
      out.card = uc; return out;
    }
    if (a.kind === "shred" && !r) {
      var sb0 = LD.shredBlock(state, a.u); if (sb0) return { ok: false, error: sb0, state: state };
      if (!f.freeShreds) return { ok: false, error: "Shred at a reward, or right after going private.", state: state };
      var sc0 = deckCard(state, a.u); f.deck = f.deck.filter(function (d) { return d.u !== a.u; }); f.freeShreds -= 1;
      state.log.unshift({ turn: state.turn, text: "Shredded " + CARD_BY[sc0.id].name + " (free, going private)." });
      out.card = sc0; return out;
    }
    if (!r) return { ok: false, error: "No reward on the desk.", state: state };
    if (a.kind === "reroll") {
      if (r.cardDone || !(f.rerolls > 0)) return { ok: false, error: "No rerolls left.", state: state };
      f.rerolls -= 1; f.rerolled = (f.rerolled || 0) + 1;
      r.cards = rollCards(state, r.cards.length, r.rare, fyRng(state, "reward:" + state.turn + ":" + f.rerolled));
      return out;
    }
    if (a.kind === "card" || a.kind === "shred" || a.kind === "skip") {
      if (r.cardDone) return { ok: false, error: "Already chosen.", state: state };
      if (a.kind === "card") {
        if (r.cards.indexOf(a.id) === -1) return { ok: false, error: "That card is not on offer.", state: state };
        var nc = addDeckCard(state, a.id, null, 0); out.card = nc;
        state.log.unshift({ turn: state.turn, text: "Added " + CARD_BY[a.id].name + " to your deck." });
        if (r.rider) { addCurse(state, r.rider, "the activist's rider"); out.rider = r.rider; }
        r.picked = a.id;
      } else if (a.kind === "shred") {
        var sb = LD.shredBlock(state, a.u); if (sb) return { ok: false, error: sb, state: state };
        var cost = LD.shredCost(state), sc = deckCard(state, a.u);
        state.cash -= cost; if (f.freeShreds) f.freeShreds -= 1; else f.shreds = (f.shreds || 0) + 1;
        f.deck = f.deck.filter(function (d) { return d.u !== a.u; });
        state.log.unshift({ turn: state.turn, text: "Shredded " + CARD_BY[sc.id].name + (cost ? " ($" + cost + "M)" : "") + "." });
        out.card = sc; out.cost = cost; r.picked = "shred";
      } else { var sk = f.skipCash || LD.DOOR.SKIP; state.cash += sk; out.cash = sk; r.picked = "skip"; state.log.unshift({ turn: state.turn, text: "Skipped the card reward: +$" + sk + "M." }); }
      r.cardDone = true;
    } else if (a.kind === "asset" || a.kind === "assetPass") {
      if (r.assetDone) return { ok: false, error: "Already chosen.", state: state };
      if (a.kind === "asset") {
        if (!r.asset || r.asset.indexOf(a.id) === -1) return { ok: false, error: "That Asset is not on offer.", state: state };
        if (slotsUsed(state) >= f.cap) {
          if (!a.replace || !has(state, a.replace)) return { ok: false, error: "Your wall is full. Choose a frame to take down.", state: state, needReplace: true };
          removeCard(state, a.replace); state.cash += LD.FY.DIVEST_CASH; out.divested = cardById(a.replace);
        }
        addCard(state, a.id); f.picks.push(a.id); out.asset = cardById(a.id);
        state.log.unshift({ turn: state.turn, text: "Framed on the wall: " + cardById(a.id).name + "." });
      }
      r.assetDone = true;
    } else if (a.kind === "item") {
      if (r.itemDone || !r.item) return { ok: false, error: "No item on the desk.", state: state };
      var it = LD.itemById(r.item), sold = null;
      if (!a.keep) { state.cash += LD.ITEM_SELL[it.r]; out.cash = LD.ITEM_SELL[it.r]; }
      else {
        if (f.drawer.length >= f.dcap) {
          if (!a.replace || !hasItem(state, a.replace)) return { ok: false, error: "Your briefcase is full. Choose an item to sell.", state: state, needReplace: true };
          sold = LD.itemById(a.replace); f.drawer = f.drawer.filter(function (d) { return d.id !== a.replace; }); state.cash += LD.ITEM_SELL[sold.r];
        }
        f.drawer.push({ id: it.id, used: null });
      }
      out.item = it; out.kept = !!a.keep; out.sold = sold;
      state.log.unshift({ turn: state.turn, text: a.keep ? it.name + " goes in the briefcase" + (sold ? ", " + sold.name + " sold" : "") + "." : "Sold " + it.name + " for $" + LD.ITEM_SELL[it.r] + "M." });
      r.itemDone = true;
    } else return { ok: false, error: "Unknown choice.", state: state };
    rebuildMods(state);
    rewardDone(f);
    out.done = !f.reward;
    return out;
  };

  /* ---------- Bunker room cards, going private ---------- */
  function syncRoomCards(state) {
    var f = fy(state); if (!f || !f.deck) return [];
    f.roomCards = f.roomCards || {};
    var added = [];
    LD.SYSTEMS.forEach(function (s) {
      var b = state.bunker[s.id];
      if (b.level >= 2 && !f.roomCards[s.id]) {
        var id = b.quality === "cheap" ? "cutcorners" : "backup";
        f.roomCards[s.id] = id; addDeckCard(state, id, null, 0); added.push(id);
        state.log.unshift({ turn: state.turn, text: "Your " + s.id + " room adds " + CARD_BY[id].name + " to your deck." });
      }
    });
    return added;
  }
  LD.fySyncRoomCards = syncRoomCards;
  LD.fyOnConvert = function (state) {
    var f = fy(state); if (!f || !f.deck) return;
    addDeckCard(state, "privsec", null, 0); addDeckCard(state, "privsec", null, 0);
    f.freeShreds = (f.freeShreds || 0) + 3;
    state.log.unshift({ turn: state.turn, text: "Going private: 2 Private Security join your deck, and you may shred up to 3 cards for free. Journalists stop calling; Protests get louder." });
  };

  /* Starter deck: 4 Talking Points, 4 No Comment, and the signature fixer's two cards. */
  function initDeck(state) {
    var f = fy(state);
    f.v = 2; f.deck = []; f.uid = 0; f.fixers = []; f.shreds = 0; f.freeShreds = 0; f.upTokens = 0; f.fight = null; f.reward = null; f.lastFight = null;
    f.fights = { won: 0, lost: 0, settled: 0 }; f.roomCards = {}; f.hearing = null; f.bill = 0; f.lootNext = null;
    for (var i = 0; i < 4; i++) addDeckCard(state, "talking", null, 0);
    for (var j = 0; j < 4; j++) addDeckCard(state, "nocomment", null, 0);
    var sig = sigFixer(state.executiveId);
    hire(state, sig.id, true);
    if (f.level >= 3) addDeckCard(state, sig.cards[0], sig.id, 0);
    if (f.level >= 9) { var tp = f.deck.filter(function (c) { return c.id === "talking"; })[0]; if (tp) tp.up = 1; }
  }
  LD.fyInitDeck = initDeck;
  /* Saves from before the card layer: build the starter deck, Liabilities become curses, fixtures go on the wall. */
  function upgradeV2(state) {
    var f = fy(state); if (!f || f.v >= 2) return false;
    var liabs = f.hand.filter(function (h) { var c = cardById(h.id); return c && c.liability; }).map(function (h) { return h.id; });
    f.hand = f.hand.filter(function (h) { var c = cardById(h.id); return c && !c.liability; });
    initDeck(state);
    liabs.forEach(function (id) { if (LIAB_CURSE[id]) addDeckCard(state, LIAB_CURSE[id], null, 0); });
    ["soundproof", "holo"].forEach(function (id) {
      if (f.drawer.some(function (d) { return d.id === id; })) {
        f.drawer = f.drawer.filter(function (d) { return d.id !== id; });
        if (slotsUsed(state) < f.cap) addCard(state, id); else state.cash += 6;
      }
    });
    while (f.drawer.length > 3) { var it = LD.itemById(f.drawer.pop().id); state.cash += LD.ITEM_SELL[it.r]; }
    f.dcap = 3;
    if (f.draft) { state.cash += f.skipCash || 3; f.draft = null; }
    if (f.loot) { f.lootNext = f.loot.id; f.loot = null; }
    syncRoomCards(state);
    state.log.unshift({ turn: state.turn, text: "New rules at the office: your fixers now fight at the door. Starter deck issued" + (liabs.length ? "; Liabilities became curse cards" : "") + "." });
    rebuildMods(state);
    return true;
  }
  LD.fyUpgradeV2 = upgradeV2;
  LD.fyDeckSummary = function (state) {
    var f = fy(state); if (!f || !f.deck) return null;
    var curses = f.deck.filter(function (c) { return isCurse(c.id); }).length;
    var fg = f.fight && !f.fight.done ? f.fight : null;
    return { size: f.deck.length, curses: curses, up: f.deck.filter(function (c) { return c.up; }).length, draw: fg ? fg.draw.length : f.deck.length, disc: fg ? fg.disc.length : 0, hand: fg ? fg.hand.length : 0 };
  };

  /* ---------- Rewards ---------- */
  LD.FIRST_CLEAR = function (tier) { return { div: 25 + 10 * tier, xp: 50 + 25 * tier }; };
  LD.runXp = function (state) {
    var win = !!(state.ending && state.ending.kind === "win");
    var q = Math.min(state.turn, 12), b = fy(state) ? fy(state).bosses : 0;
    var sb = win && LD.sealBonus ? LD.sealBonus(state).xp : 0;
    return Math.round((8 * q + 25 * b + (win ? 60 : 0) + sb) * (1 + 0.15 * (state.rating | 0)));
  };

  if (typeof module !== "undefined" && module.exports) module.exports = LD;
})(typeof globalThis !== "undefined" ? globalThis : this);

  