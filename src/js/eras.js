/* Last Dividend: eras, act casts, narrative fights and callbacks.
   Each act is an era of the last fifty years in Port Calder: I "The Street" (1978), II "The Middle" (2008), III "The Top" (now).
   The fight engine (fy.js) keeps its base encounter types for balance; this file picks WHO is at the door, what they call their
   moves, what they say, how it ends, and who comes back. Everything here is fiction. */
(function () {
  "use strict";
  var LD = (typeof window !== "undefined" ? window : globalThis).LD = (typeof window !== "undefined" ? window : globalThis).LD || {};

  /* ---------- The three eras ---------- */
  LD.ERAS = [null,
    { act: 1, year: "1978", name: "The Street", tag: "Port Calder, 1978. The mills are closing. Everything is for sale, cheap.", device: "rotary", phone: "The rotary phone rings", phoneIcon: "☎️",
      bunker: "Fallout Shelter", bunkerSub: "Civil-defence surplus, bought by the crate", window: "Smokestacks, gas lines, a strike banner" },
    { act: 2, year: "2008", name: "The Middle", tag: "Port Calder, 2008. The banks fell over and somebody has to pay. Not you.", device: "berry", phone: "Your Berry buzzes", phoneIcon: "📟",
      bunker: "Prepper Vault", bunkerSub: "Servers, a wine wall and a panic room", window: "Cranes, foreclosure signs, a jumbotron" },
    { act: 3, year: "Now", name: "The Top", tag: "Port Calder, now. The sea is at the door and the sky garden is lovely.", device: "ring", phone: "Your smart ring pings", phoneIcon: "💍",
      bunker: "Resilience Estate", bunkerSub: "Hydroponics, a house AI and a sky garden", window: "Heat haze, sea wall, delivery drones" }
  ];
  LD.eraOf = function (state) { var t = state && state.turn ? state.turn : 1; return LD.actOf ? LD.actOf(Math.min(12, t)) : (t <= 4 ? 1 : t <= 8 ? 2 : 3); };
  LD.ERA_NEWS = [null,
    ["STATE TO CALDER: SINK OR SWIM", "Calder Steel banks its last furnace", "Gas lines round the block on Harbor Ave", "Rent strike spreads down Odell Street", "14th Precinct begins 'quality of life' sweeps",
      "Mayor: the water works 'could be sold'", "Local 9 votes to strike. Again.", "Tenement fire on Pell Street: 'electrical', says landlord", "Unemployment 11% in the Flats", "Disco is dead, says man at bus stop"],
    ["STABILITY FUND PASSES: BANKS RESCUED", "Calder Mutual: 'We are well capitalised'", "Foreclosures up 81% in the Flats", "Ledger.now: 10 Bunkers You Won't Believe", "Citizens for Prosperity buys every ad slot",
      "Regulator joins the firm she regulated", "Odell Street rebranded 'The Brownstone District'", "Council approves luxury tower. Councilman approves luxury boat", "Pundit: 'Nobody could have seen this coming'", "Your bonus is safe, says your bonus"],
    ["Heat dome: day 19", "Sea-wall bond fails by 400 votes", "Trust in institutions hits a record low (again)", "Hearth rally and Forward march meet on the bridge", "A billionaire's bunker gets a sky garden",
      "One app now owns the buses, the bank and the weather", "Water rationing for the Flats, not the Heights", "Both parties blame the other party", "Insurers leave the coast", "Experts disagree about experts"]
  ];

  /* ---------- Era names: what things were called then (Act III keeps the canonical names) ---------- */
  /* kind -> id -> [act1, act2, act3?] entries: { n: name, i: icon } ; omitted fields keep the canonical value. */
  LD.ERA_NAMES = {
    asset: {
      astro: [{ n: "Letter-Writing Campaign", i: "✉️" }, { n: "Astroturf Blog Network", i: "💻" }],
      influencer: [{ n: "Radio Jingle Retainer", i: "📻" }, { n: "Blogger Retainer", i: "💻" }],
      surge: [{ n: "Price-Gouging Desk", i: "🧾" }, { n: "Dynamic Pricing Software", i: "💽" }],
      holo: [{ n: "Painted Window Blind", i: "🪟" }, { n: "Flat-Screen 'Window'", i: "📺" }],
      geo: [{ n: "Cloud-Seeding Pilot", i: "☁️" }, { n: "Carbon Capture Pilot", i: "🏭" }],
      offsets: [{ n: "Tree-Planting Ad", i: "🌳" }, { n: "Carbon Offsets" }],
      rolodex: [{ n: "Golden Rolodex", i: "📇" }, { n: "Golden Berry", i: "📟" }, { n: "Golden Smart Ring", i: "💍" }],
      privgrid: [{ n: "Private Diesel Plant", i: "🛢️" }, { n: "Private Substation", i: "⚡" }],
      buyback: [{ n: "Special Dividend", i: "💵" }, { n: "Stock Buyback" }],
      toobig: [{ n: "Friends at the Treasury", i: "🏦" }, { n: "Too Big To Fail" }],
      disfut: [{ n: "Disaster Insurance Book", i: "📒" }, { n: "Disaster Futures" }],
      narrative: [{ n: "Friendly Editor", i: "🗞️" }, { n: "Message Discipline", i: "🎙️" }],
      press: [{ n: "Press Office", i: "📠" }, { n: "Press Office", i: "📰" }],
      penthouse: [{ n: "Penthouse Suite", i: "🛋️" }, { n: "Penthouse Suite", i: "🍾" }],
      short: [{ n: "Short Position", i: "📉" }, { n: "Short Position", i: "🩳" }],
      shell: [{ n: "Shell Company", i: "🐚" }, { n: "Offshore Shell", i: "🏝️" }],
      futures: [{ n: "Commodities Desk", i: "⏳" }, { n: "Futures Desk" }]
    },
    item: {
      prblitz: [{ n: "Newspaper Ad Blitz", i: "🗞️" }, { n: "Cable News Blitz", i: "📺" }],
      hotline: [{ n: "Lobbyist on Retainer", i: "☎️" }, { n: "Lobbyist on Speed-Dial", i: "📟" }],
      cloud: [{ n: "Cloud Seeding", i: "✈️" }, { n: "Cloud Seeding" }],
      pod: [{ n: "Prefab Shelter Kit", i: "🧰" }, { n: "Prefab Panic Room", i: "🚪" }],
      security: [{ n: "Night Watchmen", i: "🔦" }, { n: "Private Security" }],
      liquidity: [{ n: "Bridge Loan", i: "💰" }, { n: "Emergency Liquidity" }]
    },
    card: {
      darkmoney: [{ n: "Bag Money", i: "💼" }, { n: "Soft Money", i: "🕳️" }],
      unsettled: [{ n: "Further Study Needed", i: "❓" }, { n: "Unsettled Science" }],
      synergy: [{ n: "Interoffice Memo", i: "📎" }, { n: "Synergy Memo" }],
      privsec: [{ n: "Strikebreaker Detail", i: "🚔" }, { n: "Private Security" }],
      astro: [{ n: "Paid Letter Campaign", i: "✉️" }, { n: "Astroturf Rally" }],
      crisiscomms: [{ n: "Crisis Comms", i: "📠" }, { n: "Crisis Comms", i: "📡" }],
      photoop: [{ n: "Ribbon Cutting", i: "✂️" }, { n: "Photo Op" }],
      revolving: [{ n: "Revolving Door", i: "🚪" }, { n: "Revolving Door" }]
    },
    fixer: {
      tamsin: [{ role: "public relations counsel" }, { role: "head of social media" }],
      dex: [{ role: "Capitol Row lobbyist" }, { role: "Capitol Row lobbyist" }, { role: "Capitol Row lobbyist" }],
      gus: [{ role: "ad man" }, { role: "cable-news spin doctor" }],
      lorne: [{ role: "Council for Balanced Energy" }, { role: "Center for Balanced Climate" }],
      pike: [{ role: "Institute for Free Enterprise" }, { role: "Institute for Abundant Futures" }],
      chip: [{ role: "ex-utility commissioner" }],
      margo: [{ role: "fixer-at-large" }]
    },
    upgrade: {
      air: [["Hand-crank vent", "Blast filter", "Twin scrubbers"], ["HVAC intake", "HEPA stack", "Redundant scrubbers"], ["Intake fans", "Filtration stack", "Redundant scrubbers"]],
      water: [["Water drums", "Cistern", "Deep-well tap"], ["Bottled reserve", "Recycling plant", "Deep-well tap"]],
      power: [["Diesel reserve", "Generator hall", "Battery bank"], ["Diesel reserve", "Server-grade UPS", "Battery vault"]],
      food: [["Canned goods", "Ration store", "Root cellar"], ["Freeze-dried stock", "Wine wall & pantry", "Hydroponics trial"], ["Dry stockpile", "Hydroponics", "Sky garden"]]
    },
    deal: {
      "crisis-smoke": [{ choice: { "wait": "Issue a cheerful press release" } }, { choice: { "wait": "Post a sunset photo on your blog" } }],
      "crisis-bread": [{ body: "The shelves are empty. Your warehouses are not. Someone has a crowbar." }, { body: "The shelves are empty. Your warehouses are not. Someone has a camera phone." }],
      "crisis-blackout": [{ body: "The grid is load-shedding the poor first. The utility insists it is neutral." }, { body: "The grid is load-shedding the poor first. The software insists it is neutral." }],
      "esg-offset": [{ body: "A forest on paper. A press release in every paper." }, { body: "A forest on paper. A press release on every blog." }]
    },
    memo: {
      collab: [{ title: "Talk-Show Appearance", icon: "📺", body: "A late-night host wants to film your fallout shelter for the Friday show. The wine rack is 'a must'." },
        { title: "Viral Video Collab", icon: "📹", body: "'10 Bunkers You Won't Believe Exist'. Number four is yours. Three million views by lunch." }],
      space: [{ title: "The Shipping Magnate", icon: "🚢", body: "He owns half the tankers on the coast. He also collects people who say no." },
        { title: "The Dot-Com Billionaire", icon: "💾", body: "He sold a search engine for a billion. Now he collects bunker rooms, and people who say no." }],
      summit: [{ title: "Energy Crisis Summit", icon: "⛽", body: "Gas lines, an oil shock, a summit. Your attendance would be noted. So would your absence." }, { title: "Climate Summit" }],
      leak: [{ body: "Someone photocopied the 'acceptable losses' ledger and mailed it to a reporter." }, { body: "Someone forwarded the 'acceptable losses' spreadsheet to a blogger." }],
      troll: [{ title: "The Shakedown Lawyer", icon: "🦈" }, { title: "Patent Troll" }]
    }
  };
  var CANON = null;
  function snap(o, keys) { var s = {}; keys.forEach(function (k) { s[k] = o[k]; }); return s; }
  function canon() {
    if (CANON) return CANON;
    CANON = { asset: {}, item: {}, card: {}, fixer: {}, upgrade: {}, memo: {} };
    (LD.FY_ASSETS || []).forEach(function (a) { CANON.asset[a.id] = snap(a, ["name", "icon"]); });
    (LD.ITEMS || []).forEach(function (a) { CANON.item[a.id] = snap(a, ["name", "icon"]); });
    (LD.CARDS || []).forEach(function (a) { CANON.card[a.id] = snap(a, ["name", "icon"]); });
    (LD.FIXERS || []).forEach(function (a) { CANON.fixer[a.id] = snap(a, ["role"]); });
    Object.keys(LD.UPGRADES || {}).forEach(function (k) { CANON.upgrade[k] = LD.UPGRADES[k].map(function (u) { return u.name; }); });
    (LD.MEMOS || []).forEach(function (m) { if (m.id) CANON.memo[m.id] = snap(m, ["title", "icon", "body"]); });
    return CANON;
  }
  LD.eraNow = 0;
  /* Swap display names to an era (0 = canonical, used by the timeless meta screens). Saves only store ids, so this is display-only. */
  LD.applyEra = function (act) {
    act = act | 0; var C = canon(), E = LD.ERA_NAMES;
    if (LD.eraNow === act) return act;
    LD.eraNow = act;
    function pick(tab, id) { var r = tab && tab[id]; return act >= 1 && r ? r[act - 1] || null : null; }
    function apply(list, kind, keys) {
      (list || []).forEach(function (a) {
        var c = C[kind][a.id]; if (!c) return;
        keys.forEach(function (k) { a[k] = c[k]; });
        var o = pick(E[kind], a.id); if (!o) return;
        if (o.n && keys.indexOf("name") !== -1) a.name = o.n;
        if (o.i && keys.indexOf("icon") !== -1) a.icon = o.i;
        if (o.role) a.role = o.role;
        if (o.title) a.title = o.title;
      });
    }
    apply(LD.FY_ASSETS, "asset", ["name", "icon"]);
    apply(LD.ITEMS, "item", ["name", "icon"]);
    apply(LD.CARDS, "card", ["name", "icon"]);
    apply(LD.FIXERS, "fixer", ["role"]);
    (LD.MEMOS || []).forEach(function (m) { var c = C.memo[m.id]; if (!c) return; m.title = c.title; m.icon = c.icon; m.body = c.body; var o = pick(E.memo, m.id); if (o) { if (o.title) m.title = o.title; if (o.icon) m.icon = o.icon; if (o.body) m.body = o.body; } });
    Object.keys(LD.UPGRADES || {}).forEach(function (k) {
      var names = C.upgrade[k], o = pick(E.upgrade, k);
      LD.UPGRADES[k].forEach(function (u, i) { u.name = o && o[i] ? o[i] : names[i]; });
    });
    Object.keys(E.deal).forEach(function (did) {
      var d = LD.dealById ? LD.dealById(did) : null; if (!d) return;
      var o = pick(E.deal, did);
      if (d._canonBody == null) d._canonBody = d.body || ""; d.body = o && o.body ? o.body : d._canonBody;
      (d.choices || []).forEach(function (c) { if (c._canon == null) c._canon = c.label; c.label = c._canon; if (o && o.choice && o.choice[c.id]) c.label = o.choice[c.id]; });
    });
    if (typeof document !== "undefined" && document.body && document.body.setAttribute) document.body.setAttribute("data-era", String(act));
    return act;
  };
  LD.eraDealChoice = function (dealId, choiceId, label, state) {
    var r = LD.ERA_NAMES.deal[dealId], a = state ? LD.eraOf(state) : LD.eraNow; if (!r || !a || a >= 3) return label;
    var o = r[a - 1]; return o && o.choice && o.choice[choiceId] ? o.choice[choiceId] : label;
  };

  /* ---------- Named moves (intents) per opponent ---------- */
  /* Base meters stay the same as the generic encounter so balance holds; twists add character:
     ramp: later intents grow +n after this fires · bribeUp: +n per paid card you played this fight · lobbyDown: −n per Lobbyist card
     heal: they win back n Scrutiny after it fires · halfDeny: your Deniability is halved this round · cashTax: cash cards cost +$n this round */
  var MOVES = {
    /* Act I */
    dunn_paper: { label: "Lost Paperwork", meter: "cash", rider: "subpoena", at: 4, rtext: "4+ through: a Subpoena curse", say: "Funny. Your permit's gone missing." },
    dunn_price: { label: "The Price Goes Up", meter: "cash", bribeUp: 2, rtext: "+2 for every paid card you've played", say: "Inflation, pal. Everything costs more." },
    mor_evict: { label: "Eviction Notice", meter: "unrest", rtext: "unrest on the block", say: "Tenants out by Friday. Your problem now." },
    mor_rent: { label: "Rent Hike", meter: "cash", ramp: 2, rtext: "grows +2 each time it lands", say: "Rent's due. Rent's always due." },
    mor_fire: { label: "Electrical Fault", meter: "collapse", rtext: "a 'convenient' fire", say: "Old wiring. Terrible shame." },
    june_griev: { label: "Grievance", meter: "heat", rtext: "Heat +1 per 4, unrest half", say: "Article nine. Read it. Out loud." },
    june_walk: { label: "Wildcat Walkout", meter: "unrest", protest: true, grow: 2, rtext: "grows +2", say: "Line's stopped. Nobody told the line to stop." },
    mick_vig: { label: "The Vig", meter: "cash", cashTax: 2, rtext: "your cash cards cost +$2M this round", say: "Interest, sweetheart. It compounds." },
    mick_fire: { label: "A Little Fire", meter: "collapse", rtext: "an insurance job nobody ordered", say: "Shame about the warehouse." },
    mick_favor: { label: "Calling in a Favor", meter: "cash", rider: "leak", at: 5, rtext: "5+ through: a Leak curse", say: "Remember '76? I remember '76." },
    odell_pet: { label: "Petition", meter: "unrest", protest: true, grow: 2, rtext: "grows +2", say: "Four hundred signatures. Grandmas sign in pen." },
    odell_meet: { label: "Block Meeting", meter: "unrest", protest: true, heal: 3, rtext: "the block rallies: they win back 3 Scrutiny", say: "Coffee's on. Bring the neighbours." },
    /* Act II */
    del_zone: { label: "Zoning Hold", meter: "cash", rider: "claim", at: 6, rtext: "6+ through: you lose the claim", say: "Committee's backed up. Months. Years." },
    del_ask: { label: "Campaign Ask", meter: "cash", bribeUp: 1, rtext: "+1 for every paid card you've played", say: "Re-election's expensive. You get that." },
    del_recount: { label: "Recount", meter: "unrest", heal: 4, rtext: "they win back 4 Scrutiny", say: "Let's count that again. Slowly." },
    oka_front: { label: "Front Page", meter: "unrest", rider: "leak", at: 4, halfDeny: true, rtext: "your Deniability is halved this round · 4+ through: a Leak", say: "'No comment' reads as guilty, you know." },
    oka_follow: { label: "Follow-up Question", meter: "heat", rtext: "Heat +1 per 4, unrest half", say: "Just one more. Who signed the bailout memo?" },
    oka_click: { label: "It Went Viral", meter: "unrest", ramp: 2, rtext: "grows +2 each time it lands", say: "Two million views. Before lunch." },
    hale_decree: { label: "Consent Decree", meter: "cash", lobbyDown: 2, rtext: "−2 for every Lobbyist card you play (she's on loan from industry)", say: "Sign here. Admit nothing. Pay this." },
    hale_audit: { label: "Comment Period", meter: "cash", rider: "subpoena", at: 4, lobbyDown: 2, rtext: "4+ through: a Subpoena · −2 per Lobbyist card", say: "We'd love your input. Under seal." },
    bea_under: { label: "Undercut", meter: "cash", say: "We'll do it for half. Quality is a feeling." },
    bea_poach: { label: "Poach the Contract", meter: "cash", rider: "claim", at: 6, rtext: "6+ through: you lose the claim", say: "Your client called me. Twice." },
    bea_cds: { label: "Bet Against You", meter: "cash", ramp: 2, rtext: "grows +2 each time it lands", say: "I bought insurance on your house. Then I lit a candle." },
    gray_kettle: { label: "Kettle", meter: "unrest", protest: true, rtext: "the crowd gets angrier", say: "Nobody leaves the square." },
    gray_ot: { label: "Overtime Invoice", meter: "cash", ramp: 3, rtext: "grows +3 each time it lands", say: "Protection's billed by the hour. My hours." },
    /* Act III regulars and the hearing */
    cro_fee: { label: "Platform Fee", meter: "cash", ramp: 2, rtext: "grows +2 each time it lands", say: "Thirty percent. It's in the terms." },
    cro_acq: { label: "Acquire & Shut Down", meter: "cash", rider: "claim", at: 6, rtext: "6+ through: you lose the claim", say: "I don't compete. I purchase." },
    rosa_chant: { label: "Chant", meter: "unrest", protest: true, say: "Whose city? OUR city!" },
    rosa_occupy: { label: "Occupy the Lobby", meter: "unrest", protest: true, grow: 2, rtext: "grows +2", say: "We brought tents. And Gran's thermos." },
    sor_q: { label: "Short Interest", meter: "unrest", say: "Your numbers have numbers. I counted them." },
    sor_ex: { label: "Footnote 47", meter: "unrest", rider: "asset", at: 5, rtext: "5+ through: you lose your newest Asset", say: "Page 47. The shell in the shell." },
    ash_down: { label: "Downgrade", meter: "cash", say: "Sell. Strong sell." },
    ash_guide: { label: "Guidance?", meter: "unrest", heal: 3, rtext: "they win back 3 Scrutiny", say: "Any colour on next quarter?" },
    br_contempt: { label: "Contempt", meter: "cash", say: "You'll answer the question or you'll answer to me." },
    br_oath: { label: "Under Oath", meter: "unrest", oath: true, rtext: "your cards cost +1◆ this round", say: "Raise your right hand." },
    br_bite: { label: "Sound Bite", meter: "unrest", ramp: 2, rtext: "grows +2 each time it lands", say: "For the cameras: are you a crook, yes or no?" },
    /* Bosses */
    ash_guidance: { label: "Guidance?", meter: "unrest", say: "Walk us through the miss. Slowly." },
    ash_miss: { label: "Miss the Number", meter: "collapse", say: "You missed. The market has feelings." },
    ash_call: { label: "Analyst Pile-on", meter: "unrest", ramp: 3, rtext: "grows +3 each time it lands", say: "Next question. And the next. And the next." },
    sor_report: { label: "The Report", meter: "unrest", say: "Ninety pages. Bound. Embossed." },
    sor_expose: { label: "Expose", meter: "unrest", rider: "asset", at: 5, rtext: "5+ through: you lose your newest Asset", say: "Your best asset is a shell company. I drew a diagram." },
    sor_borrow: { label: "Borrowed Shares", meter: "cash", ramp: 3, rtext: "grows +3 each time it lands", say: "I don't own you. I rent you." },
    var_chant: { label: "Down Tools", meter: "unrest", protest: true, say: "Not a wheel turns." },
    var_picket: { label: "Picket Line", meter: "unrest", protest: true, mult: 1.5, rtext: "×1.5", say: "Cross it. I dare you." },
    var_general: { label: "General Strike", meter: "unrest", protest: true, mult: 1.5, heal: 3, rtext: "×1.5 · solidarity: they win back 3 Scrutiny", say: "The buses joined. The bakers joined. Your driver joined." },
    jun_chant: { label: "Nothing Left to Lose", meter: "unrest", protest: true, ramp: 2, rtext: "grows +2 each time it lands", say: "You took the job. You don't get the city." },
    cro_green: { label: "Greenmail", meter: "cash", say: "Buy my stake back. At my price." },
    cro_strip: { label: "Asset Strip", meter: "cash", rider: "strip", at: 6, rtext: "6+ through: a bunker room loses a level", say: "I'll sell your bunker by the room." },
    tic_crash: { label: "Flash Crash", meter: "cash", say: "▼▼▼" },
    tic_margin: { label: "Margin Call", meter: "cash", ramp: 3, rtext: "grows +3 each time it lands", say: "CALL. CALL. CALL." },
    tic_drain: { label: "Liquidity Drain", meter: "cash", rider: "drain", at: 1, rtext: "any through: lose 15% of your cash", say: "BID: NONE." }
  };

  /* ---------- The cast ---------- */
  /* base: the generic encounter it plays as (balance + win bonus). paid: has a sixth 'paid' pose. venue: fixed venue or null. */
  LD.OPPONENTS = {
    dunn: { act: 1, base: "regulator", who: "Officer Frank Dunn", role: "14th Precinct", art: "dunn", room: "precinct", place: "The 14th Precinct front desk", ar: 0.526, paid: true,
      pattern: ["dunn_paper", "dunn_price"], debate: "Broken-windows policing, and who it's for",
      open: "Nice place. Be a shame if it got... inspected.", hit: ["Hey! I'm an officer of the law!", "Okay, okay. Let's talk numbers.", "You don't scare me. Much."], block: ["Ha! Desk sergeant's deaf.", "Paperwork says otherwise."],
      end: { paid: "Pleasure doing business. I never saw you.", crushed: "You'll regret this. Cops remember.", walked: "Have a safe night. Watch your windows." } },
    moretti: { act: 1, base: "rival", who: "Sal Moretti", role: "Moretti Holdings (14 buildings)", art: "moretti", room: "tenement", place: "A Moretti walk-up on Pell Street", ar: 0.522, paid: true,
      pattern: ["mor_rent", "mor_evict"], debate: "Rent control versus property rights",
      open: "You want my block? Everybody wants my block.", hit: ["Ow! That's a tenant-rights move!", "Fine, fine, I'm listening.", "My lawyer's gonna hear about this."], block: ["Rent's due either way.", "I own the stairs, kid."],
      end: { paid: "A pleasure. You're good people. I'll tell the Councilman.", crushed: "Fourteen buildings. You'll want them back someday.", walked: "Rent's going up. Yours too." } },
    june: { act: 1, base: "journalist", who: "June Park", role: "Shop steward, Local 9", art: "june", room: "diner", place: "Rosie's Diner, back booth", ar: 0.575, paid: true,
      pattern: ["june_griev", "june_walk"], debate: "The long decline of the unions",
      open: "Twelve hundred jobs. You've got five minutes.", hit: ["That's a lockout tactic!", "You think we scare that easy?", "...Okay. That one landed."], block: ["Solidarity, pal.", "The line holds."],
      end: { paid: "I'll take it. For my kids. Not for you.", crushed: "You think this is over? We'll be back. All of us.", walked: "See you on the picket line." } },
    mickey: { act: 1, base: "regulator", who: "Mickey 'the Nail' Russo", role: "Waterfront 'consultant'", art: "mickey", room: "alley", place: "The alley behind Club Pelican", ar: 0.534, paid: true,
      pattern: ["mick_vig", "mick_fire"], debate: "The informal economy: who really runs the docks",
      open: "Nice operation. Lotta things can go wrong with an operation.", hit: ["Ow. Rude.", "Okay, okay, we're friends.", "You hit like a banker."], block: ["Heh. Missed me.", "I got guys for that."],
      end: { paid: "Smart. You need anything buried, call Mickey.", crushed: "Nobody does that to the Nail. Nobody.", walked: "See? Easy. Same time next month." } },
    odell: { act: 1, base: "protest", who: "Ma Odell", role: "Odell Street Block Association", art: "odell", room: "stoop", place: "Her stoop on Odell Street", ar: 0.583, paid: true, venue: "away",
      pattern: ["odell_pet", "odell_meet"], debate: "Urban renewal, and who gets renewed",
      open: "Forty years on this stoop. You think I'm moving for a briefcase?", hit: ["Watch your mouth on my steps!", "Hmph. My grandbabies are watching.", "Don't you sweet-talk me."], block: ["Honey, I've seen landlords.", "The block's got my back."],
      end: { paid: "Fine. But you fix the boiler. Every winter.", crushed: "You'll tear it down, sure. Someone always remembers.", walked: "Go on home. This is our street." } },
    delacroix: { act: 2, base: "regulator", who: "Councilman Ray Delacroix", role: "City Council, Ward 6", art: "delacroix", room: "cityhall", place: "His City Hall office", ar: 0.521, paid: true,
      pattern: ["del_zone", "del_ask", "del_recount"], debate: "Campaign money and the machine",
      open: "I've got a ribbon to cut at three. Make it worth my while.", hit: ["Off the record, that hurt.", "My constituents will hear about this!", "Let's not be hasty."], block: ["I've survived worse scandals.", "That's not how the council sees it."],
      end: { paid: "A generous donation. I'll name a park after you. A small one.", crushed: "Politics is long, friend. Long and petty.", walked: "Zoning denied. See you at the fundraiser." } },
    okafor: { act: 2, base: "journalist", who: "Dev Okafor", role: "The Ledger", art: "okafor", room: "newsroom", place: "The Ledger newsroom, 2 a.m.", ar: 0.485, paid: true,
      pattern: ["oka_front", "oka_follow", "oka_click"], debate: "Journalism in the age of clicks",
      open: "I've got the bailout memo. And your signature.", hit: ["That's not a denial.", "Ouch. On the record?", "You're spinning, and it's showing."], block: ["Sources confirm otherwise.", "Nice try. Next question."],
      end: { paid: "Story's... on hold. I'll need it to stay that way.", crushed: "You'll see this story again. I keep everything.", walked: "Front page. Tomorrow. Sleep well." } },
    hale: { act: 2, base: "regulator", who: "Agnes Hale", role: "Resource Oversight Board", art: "hale", room: "regulator", place: "Her hearing room", ar: 0.667,
      pattern: ["hale_decree", "hale_audit"], debate: "Regulatory capture and the revolving door",
      open: "I spent eleven years at a firm like yours. I know where you hide things.", hit: ["Out of order!", "Noted. Unfavourably.", "I'll need that in writing."], block: ["Objection overruled. By me.", "The rules are the rules."],
      end: { paid: "I'll consider your comment. There may be a board seat in it.", crushed: "Recess. Permanently, for some of us.", walked: "Fined. Next." } },
    harrow: { act: 2, base: "rival", who: "Bea Harrow", role: "Yield & Residue", art: "harrow", room: "club", place: "The Calder Club, members' bar", ar: 0.52, paid: true,
      pattern: ["bea_under", "bea_poach", "bea_cds"], debate: "Financialisation: making money from money",
      open: "Darling, the market's big enough for one of us.", hit: ["How common.", "Oh, you'll pay for that. Literally.", "That's... a decent move."], block: ["I hedged.", "Cute. Is that from a seminar?"],
      end: { paid: "Splendid. We'll merge our interests. Not our names.", crushed: "I'll be back with a bigger fund.", walked: "I'll buy the debt on whatever's left." } },
    gray: { act: 2, base: "protest", who: "Commissioner Gray", role: "Calder Police Dept.", art: "gray", room: "policehq", place: "Police HQ, the commissioner's office", ar: 0.52, paid: true, venue: "away",
      pattern: ["gray_kettle", "gray_ot"], debate: "Protest policing, overtime and who pays",
      open: "Square's full. I can clear it, or not. Your call. Your money.", hit: ["Easy. I've got a pension.", "That's assault on a public servant.", "Hm. Let's renegotiate."], block: ["The badge stops that.", "Riot gear, pal."],
      end: { paid: "Square'll be clear by morning. Off the record.", crushed: "I'll remember this at the next riot.", walked: "Overtime's overtime. Pay it." } },
    crowe: { act: 3, base: "rival", who: "Victor Crowe", role: "Crowe Terminals", art: "crowe", room: "rival", place: "Crowe Terminals, top floor", ar: 0.571,
      pattern: ["cro_fee", "cro_acq"], debate: "Tech monopolies and the platform tax",
      open: "I don't build. I acquire. Today I'm acquiring you.", hit: ["A rounding error.", "Hm. My board will notice that.", "Interesting. Annoying."], block: ["I own the platform you said that on.", "Priced in."],
      end: { paid: "A partnership. I'll own you more slowly.", crushed: "My brother always said you were the clever one.", walked: "Welcome to the platform. Thirty percent." } },
    rosa: { act: 3, base: "protest", who: "Rosa Lind", role: "The People", art: "rosa", room: "protest", place: "Your lobby glass", ar: 0.63, venue: "lobby",
      pattern: ["rosa_chant", "rosa_occupy"], debate: "Populism, left and right, at the same door",
      open: "We're not leaving. We brought snacks.", hit: ["That's the best you've got?", "Shame! SHAME!", "Livestreaming this, by the way."], block: ["The people hold the line.", "We're used to your lot."],
      end: { paid: "A community fund? We'll audit it. Daily.", crushed: "You can clear a lobby. You can't clear a city.", walked: "Whose lobby? OUR lobby!" } },
    sorel: { act: 3, base: "journalist", who: "Lena Sorel", role: "Nightjar Capital", art: "sorel", room: "garage", place: "Garage, level B3", ar: 0.71,
      pattern: ["sor_q", "sor_ex"], debate: "The only honest liar in the market",
      open: "I'm short your stock. I'd like you to know why.", hit: ["Short-term noise.", "Fine. I'll add a page.", "That's going in the appendix."], block: ["Footnoted.", "My lawyers love that."],
      end: { paid: "Covered my position. Nice doing business, hypocrite.", crushed: "You'll be a case study. Someday.", walked: "Report drops at nine. Have coffee ready." } },
    ashby: { act: 3, base: "regulator", who: "Gail Ashby", role: "Lead Analyst", art: "ashby", room: "earnings", place: "The broadcast studio", ar: 0.575,
      pattern: ["ash_down", "ash_guide"], debate: "Quarterly capitalism",
      open: "Your numbers don't add up. They multiply.", hit: ["That's not guidance.", "Mm. I'll revise.", "Interesting colour."], block: ["The consensus disagrees.", "Model says no."],
      end: { paid: "Upgraded to 'hold'. Don't make me regret it.", crushed: "I'll be on the next call too.", walked: "Downgrade. Effective now." } },
    brennan: { act: 3, base: "hearing", who: "Sen. Walt Brennan", role: "Senate Committee", art: "brennan", room: "senate", place: "The Senate chamber", ar: 0.69, venue: "away",
      pattern: ["br_contempt", "br_oath", "br_bite", "br_contempt"], debate: "Institutions as theatre",
      open: "The committee will come to order. You will not.", hit: ["Order! ORDER!", "The witness is out of line!", "I yield. Briefly."], block: ["Asked and answered.", "I've seen better liars."],
      end: { paid: "The committee thanks the witness for the... candour.", crushed: "Adjourned. But the cameras remember.", walked: "Referred for prosecution. Smile for the cameras." } },
    /* Bosses */
    ashby_b: { act: 1, boss: "earnings", who: "Gail Ashby", role: "Lead Analyst, Calder Securities", art: "ashby", room: "earnings", place: "The broadcast studio", ar: 0.575,
      pattern: ["ash_guidance", "ash_miss", "ash_call", "ash_miss"], debate: "Quarterly capitalism is born",
      open: "Welcome to the earnings call. The analysts are on the line. All of them.", hit: ["That's not guidance.", "Mm. I'll revise.", "Interesting colour."], block: ["The consensus disagrees.", "Model says no."],
      end: { paid: "Upgraded to 'buy'. Lunch is on you.", crushed: "Fine. Beat the number. This time.", walked: "Downgrade. The tape doesn't lie." } },
    sorel_b: { act: 1, boss: "shortseller", who: "Lena Sorel", role: "Nightjar Capital", art: "sorel", room: "garage", place: "Garage, level B3", ar: 0.71,
      pattern: ["sor_report", "sor_expose", "sor_borrow", "sor_expose"], debate: "Short-sellers: vultures or auditors?",
      open: "Ninety pages on you. I wrote the index myself.", hit: ["Short-term noise.", "Fine. I'll add a page.", "That's going in the appendix."], block: ["Footnoted.", "My lawyers love that."],
      end: { paid: "Covered. You're expensive to hate.", crushed: "I'll find you again. You leave footprints.", walked: "Report's out. Enjoy the open." } },
    varga_b: { act: 2, boss: "strike", who: "Tomas Varga", role: "United Workers", art: "varga", room: "union", place: "The union hall", ar: 0.854,
      pattern: ["var_chant", "var_picket", "var_general", "var_picket"], debate: "The general strike, one more time",
      open: "Thirty years I've watched you lot. Today the city stops.", hit: ["We've had worse winters.", "That's a scab move.", "Hm. You've learned."], block: ["Solidarity forever.", "The hall holds."],
      end: { paid: "Contract signed. Don't think we're friends.", crushed: "You broke a strike. You didn't break us.", walked: "The city's ours today." } },
    june_b: { act: 2, boss: "strike", who: "June Park", role: "Strike Captain, United Workers", art: "june", room: "union", place: "The union hall", ar: 0.575, paid: true,
      pattern: ["jun_chant", "var_picket", "var_general", "var_picket"], debate: "The general strike, one more time",
      open: "Remember me? Thirty years. Now the whole city walks out.", hit: ["You did that in '78 too.", "We're older. Not softer.", "...Still hits."], block: ["The line holds. It always held.", "Solidarity, pal."],
      end: { paid: "The city gets the contract. You don't get forgiven.", crushed: "Twice. You've broken me twice. Never again.", walked: "Told you we'd be back." } },
    crowe_b: { act: 2, boss: "bid", who: "Victor Crowe", role: "Hostile takeover", art: "crowe", room: "rival", place: "Crowe Terminals, top floor", ar: 0.571,
      pattern: ["cro_green", "cro_strip", "cro_green", "cro_strip"], debate: "Raiders, greenmail and the leveraged buyout",
      open: "Your board has my number. Shall we call them together?", hit: ["A rounding error.", "Hm. My board will notice that.", "Interesting. Annoying."], block: ["Priced in.", "I bought that argument last year."],
      end: { paid: "Greenmail accepted. Pleasure.", crushed: "I'll be back when you're cheaper.", walked: "Your bunker's mine. Room by room." } },
    ticker_b: { act: 2, boss: "crash", who: "The Ticker", role: "The Market", art: "ticker", room: "crash", place: "The trading floor", ar: 0.606,
      pattern: ["tic_crash", "tic_margin", "tic_drain", "tic_margin"], debate: "The 2008 crash: who caught the falling knife",
      open: "▼ ▼ ▼  BID: NONE  ASK: EVERYTHING", hit: ["▲ +0.3%", "HALTED.", "...RECALCULATING"], block: ["▼ PRICED IN", "▼ NO BID"],
      end: { paid: "▲ BAILED OUT. CONGRATULATIONS.", crushed: "▲ RECOVERY (FOR SOME)", walked: "▼ MARGIN CALLED" } }
  };
  var SHORT = { dunn: "Dunn", moretti: "Sal", june: "June", mickey: "Mickey", odell: "Ma Odell", delacroix: "Delacroix", okafor: "Okafor", hale: "Hale", harrow: "Bea", gray: "Gray",
    crowe: "Crowe", rosa: "Rosa", sorel: "Sorel", ashby: "Ashby", brennan: "Brennan", ashby_b: "Ashby", sorel_b: "Sorel", varga_b: "Varga", june_b: "June", crowe_b: "Crowe", ticker_b: "The Ticker" };
  Object.keys(LD.OPPONENTS).forEach(function (id) { LD.OPPONENTS[id].id = id; LD.OPPONENTS[id].short = SHORT[id] || LD.OPPONENTS[id].who; });
  LD.oppMoves = MOVES;
  LD.oppById = function (id) { return LD.OPPONENTS[id] || null; };
  var BOSS_OPP = { earnings: "ashby_b", shortseller: "sorel_b", strike: "varga_b", bid: "crowe_b", crash: "ticker_b" };

  function fates(state) { var f = state.fy; f.fates = f.fates || {}; return f.fates; }
  LD.oppFates = function (state) { return state && state.fy ? fates(state) : {}; };
  function fate(state, id) { var x = state && state.fy && state.fy.fates; return x ? x[id] || null : null; }
  LD.oppFate = fate;
  function met(state, id) { var m = state.fy.met || {}; return !!m[id]; }

  /* Which boss slot is filled by whom (June leads the strike if you crushed her in '78). */
  LD.bossOpp = function (state, bossId) {
    if (bossId === "strike") { var fj = fate(state, "june"); if (fj && fj.how === "crushed") return "june_b"; }
    return BOSS_OPP[bossId] || null;
  };
  /* Pick the face at the door. enc is the base encounter fy.js chose; kind is the deal kind. */
  LD.pickOpponent = function (state, enc, kind, rng) {
    var f = state.fy, act = LD.eraOf(state);
    var E = LD.ENCOUNTERS && LD.ENCOUNTERS[enc];
    if (E && E.boss) return LD.bossOpp(state, enc);
    if (enc === "hearing") return "brennan";
    var mk = fate(state, "mickey");
    if (act === 2 && mk && mk.how === "paid" && !met(state, "okafor")) return "okafor";
    var taken = {}; if (f.bossI === "earnings") taken.ashby = 1; if (f.bossI === "shortseller") taken.sorel = 1; if (f.bossII === "bid") taken.crowe = 1;
    var pool = Object.keys(LD.OPPONENTS).filter(function (id) { var o = LD.OPPONENTS[id]; return o.act === act && !o.boss && o.base !== "hearing" && !taken[id]; });
    /* Faces who haven't been met this run come first; a face whose usual beat matches the deal is likelier (×4). */
    var fresh = pool.filter(function (id) { return !met(state, id); });
    var want = fresh.length ? fresh : pool.slice();
    var w = want.map(function (id) {
      var o = LD.OPPONENTS[id], x = o.base === enc ? 4 : 1;
      if (act === 1 && enc === "journalist" && id === "mickey") x = 3;
      if (id === "delacroix" && fate(state, "moretti")) x *= 2;
      if (id === "june" && f.bossII === "strike") x *= 2;
      if (id === "dunn" && state.turn <= 2) x *= 2;
      if (id === "pops") x *= enc === "protest" ? 3 : 2; /* the picket captain turns up at every 1978 door with a labour angle; June runs the hall */
      if (id === "pops" && fate(state, "june")) x *= 2;
      return x;
    });
    var tot = w.reduce(function (a, b) { return a + b; }, 0), r = (rng ? rng() : Math.random()) * tot;
    for (var i = 0; i < want.length; i++) { r -= w[i]; if (r <= 0) return want[i]; }
    return want[want.length - 1] || null;
  };
  LD.oppIntentDefs = MOVES;
  if (LD.INTENTS) Object.keys(MOVES).forEach(function (k) { LD.INTENTS[k] = MOVES[k]; });

  /* ---------- Callbacks: "A FAMILIAR FACE" ---------- */
  /* Returns { id, who, art, pose, line, effect, mod } or null. mod: scrutMult, add (intent +n), noRider, cash (−$n at start), curse */
  LD.callbackFor = function (state, oppId) {
    var F = function (id) { return fate(state, id); };
    var d = F("dunn"), j = F("june"), m = F("mickey"), mo = F("moretti"), od = F("odell");
    if (oppId === "brennan" && d && d.how === "paid") return { id: "dunn-testifies", who: "Officer Frank Dunn (ret.)", art: "wit-dunn-accuse", inset: true, line: LD.execPronoun(state) + " paid me. Q" + d.q + ". Cash.",
      effect: "Dunn is the committee's star witness: Scrutiny +25% and a Subpoena in your hand.", mod: { scrutMult: 1.25, curse: "c_subpoena" } };
    if (oppId === "june_b" && j) return { id: "june-strike", who: "June Park", art: "opp-june-idle", line: "You crushed Local 9 in '78. I kept the minutes.",
      effect: "June leads the strike, with nothing left to lose: every move +2.", mod: { add: 2 } };
    if (oppId === "varga_b" && j && j.how === "paid") return { id: "june-scab", who: "June Park", art: "opp-june-paid", line: "Even June took your envelope in '78. The hall hasn't forgotten.",
      effect: "Half the old guard won't march with Varga: Scrutiny −20%.", mod: { scrutMult: 0.8 } };
    if (oppId === "okafor" && m && m.how === "paid") return { id: "mickey-buries", who: "Mickey 'the Nail' Russo", art: "opp-mickey-paid", line: "I know a guy at the Ledger's printing plant. Story's going nowhere.",
      effect: "Mickey buries the story: Scrutiny −30%, Okafor's riders are off. His cut: $3M.", mod: { scrutMult: 0.7, noRider: true, cash: 3 } };
    if (oppId === "delacroix" && mo) return mo.how === "crushed" ? { id: "moretti-donor", who: "Sal Moretti", art: "opp-moretti-hit", line: "Sal Moretti was my biggest donor. Was.",
      effect: "Delacroix holds a grudge for his old donor: every move +2.", mod: { add: 2 } } :
      { id: "moretti-donor", who: "Sal Moretti", art: "opp-moretti-paid", line: "Sal says you're good for it. Sal's never wrong about money.", effect: "Moretti vouched for you: Scrutiny −20%.", mod: { scrutMult: 0.8 } };
    if (oppId === "gray" && d) return d.how === "crushed" ? { id: "dunn-grudge", who: "Officer Frank Dunn", art: "opp-dunn-defeated", line: "You got Frank Dunn transferred to the harbour patrol. He was one of mine.",
      effect: "Gray remembers Dunn: every move +2.", mod: { add: 2 } } :
      { id: "dunn-grudge", who: "Officer Frank Dunn", art: "opp-dunn-paid", line: "Frank Dunn says you tip well. The department noticed.", effect: "Gray expects the same rate: Overtime starts higher (+2), Scrutiny −15%.", mod: { add: 1, scrutMult: 0.85 } };
    if (oppId === "rosa" && od) return od.how === "crushed" ? { id: "odell-granddaughter", who: "Ma Odell", art: "opp-odell-defeated", line: "You took Gran's stoop. I grew up on it.",
      effect: "Rosa is Ma Odell's granddaughter: every chant +2.", mod: { add: 2 } } :
      { id: "odell-granddaughter", who: "Ma Odell", art: "opp-odell-paid", line: "Gran says you kept the boiler running. I still don't trust you.", effect: "Rosa is Ma Odell's granddaughter: Scrutiny −15%.", mod: { scrutMult: 0.85 } };
    return null;
  };
  LD.execPronoun = function (state) { var id = state && state.executiveId; return id === "mara" || id === "imani" ? "She" : "He"; };
  LD.CALLBACKS = ["dunn-testifies", "june-strike", "june-scab", "mickey-buries", "moretti-donor", "dunn-grudge", "odell-granddaughter"];

  /* Should the Senate call Dunn? (Act III, from Q10, once, if he was paid.) */
  LD.dunnHearingDue = function (state) {
    var f = state.fy, d = fate(state, "dunn");
    return !!(d && d.how === "paid" && LD.eraOf(state) === 3 && state.turn >= 10 && !(f.cbDone && f.cbDone["dunn-testifies"]) && !f.hearing);
  };

  /* How a fight ended, in story terms. */
  LD.fightHow = function (fg) {
    if (!fg || !fg.done) return null;
    if (fg.done.settled) return "paid";
    if (fg.done.win) return (fg.bribes | 0) > 0 || fg.done.out === "bought" || fg.done.out === "converted" ? "paid" : "crushed";
    return "walked";
  };
  LD.HOW_LABEL = { paid: "PAID OFF", crushed: "CRUSHED", walked: "THEY WALKED" };
  LD.oppLine = function (fg, kind, n) {
    var o = fg && LD.OPPONENTS[fg.opp]; if (!o) return "";
    if (kind === "open") return o.open;
    if (kind === "end") return (o.end || {})[LD.fightHow(fg)] || "";
    var arr = o[kind] || []; if (!arr.length) return "";
    return arr[Math.abs(n | 0) % arr.length];
  };
})();
