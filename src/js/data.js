
/* Last Dividend — static content. Browser + Node. */
(function (root) {
  var LD = root.LD || (root.LD = {});

  LD.SAVE_KEY = "lastDividend.v1";
  LD.MAX_UNREST = 100;
  LD.MAX_COLLAPSE = 100;
  LD.AP_PER_TURN = 2;
  LD.DEAL_AP = 1;
  LD.BUNKER_AP = 1;
  LD.BASE_COLLAPSE_TICK = 5;
  LD.MIN_EVAC_TURN = 9; /* Fiscal Year: sealing opens after the Act II boss */
  LD.WIN_LEVEL = 2;
  LD.DEMO_LABEL = "Short demo";
  LD.GRID_CLEAR = 0;
  LD.GRID_STRAINED = 1;
  LD.GRID_DISRUPTED = 2;
  LD.STRAIN_SURCHARGE = 8;
  LD.DISRUPT_SURCHARGE = 14;
  LD.CONVERSION_CASH_RATE = 0.7;

  LD.SYSTEMS = [
    { id: "air", name: "Air", short: "AIR" },
    { id: "water", name: "Water", short: "H2O" },
    { id: "power", name: "Power", short: "PWR" },
    { id: "food", name: "Food", short: "FOOD" }
  ];

  LD.UPGRADES = {
    air: [
      { level: 1, name: "Intake fans", sound: 15, cheap: 10 },
      { level: 2, name: "Filtration stack", sound: 24, cheap: 16 },
      { level: 3, name: "Redundant scrubbers", sound: 30, cheap: 22 }
    ],
    water: [
      { level: 1, name: "Cistern", sound: 15, cheap: 10 },
      { level: 2, name: "Recycling plant", sound: 24, cheap: 16 },
      { level: 3, name: "Deep well tap", sound: 30, cheap: 22 }
    ],
    power: [
      { level: 1, name: "Diesel reserve", sound: 15, cheap: 10 },
      { level: 2, name: "Generator hall", sound: 24, cheap: 16 },
      { level: 3, name: "Battery vault", sound: 30, cheap: 22 }
    ],
    food: [
      { level: 1, name: "Dry stockpile", sound: 15, cheap: 10 },
      { level: 2, name: "Hydroponics", sound: 24, cheap: 16 },
      { level: 3, name: "Seed kitchen", sound: 30, cheap: 22 }
    ]
  };

  LD.ENGINEER_COST = 22;

  LD.EXECUTIVES = [
    {
      id: "mara",
      name: "Mara Voss",
      title: "Chief Rights Officer",
      firm: "AquaTerra Holdings",
      blurb: "She already owns a cistern. Water work comes cheaper. The towns she bought it from do not.",
      trait: "Sound Water already in · cheaper water works",
      start: { cash: 30, unrest: 14, collapse: 20, water: 1, waterQuality: "sound" },
      perks: { waterUpgradeDiscount: 4, tags: ["water"] },
      compound: "The Wellspring",
      unlocked: true
    },
    {
      id: "reid",
      name: "Reid Holtz",
      title: "Grid Principal",
      firm: "Northline Energy",
      blurb: "A generator is already on the pad. Power installs cost less. The blackouts he priced are still coming.",
      trait: "Sound Power already in · cheaper power works",
      start: { cash: 30, unrest: 14, collapse: 20, power: 1, powerQuality: "sound" },
      perks: { powerUpgradeDiscount: 4, tags: ["power"] },
      compound: "Lumen Spire",
      unlock: "finish-run"
    },
    {
      id: "imani",
      name: "Dr. Imani Okoye",
      title: "AgriFutures Chair",
      firm: "Yield & Residue PLC",
      blurb: "A stockpile is already counted. The street is quieter, and the clock runs a little slower through Act I.",
      trait: "Sound Food already in · quieter street, slower Act I",
      start: { cash: 26, unrest: 12, collapse: 20, food: 1, foodQuality: "sound" },
      perks: { foodCollapseRelief: 1, tags: ["food"] },
      compound: "Harvest Ziggurat",
      unlock: "win-run",
      price: 150
    },
    {
      id: "julian",
      name: "Julian Crowe",
      title: "Crisis Logistics",
      firm: "Crowe Terminals",
      blurb: "More cash, more heat, and bad news takes an extra quarter to arrive. Use the time.",
      trait: "Richer start, more heat · bad news delayed 1Q",
      start: { cash: 70, unrest: 19, collapse: 20 },
      perks: { delayBonus: 1, tags: ["logistics"] },
      compound: "Port Sovereign",
      unlock: "three-runs",
      price: 250
    },
    {
      id: "soren",
      name: "Soren Aalto",
      title: "Chief Optimism Officer",
      firm: "Halcyon Systems",
      blurb: "The air plant is already humming. Air installs cost less. The servers run hot, and so does the clock.",
      trait: "Sound Air already in · cheaper air, a hotter clock",
      start: { cash: 34, unrest: 14, collapse: 24, air: 1, airQuality: "sound" },
      perks: { airUpgradeDiscount: 4, dealAffinity: "divert-filters", tags: ["air"] },
      compound: "Cloud Atrium",
      unlock: "buy",
      price: 350
    },
    {
      id: "cassius",
      name: "Cassius Vane",
      title: "Managing Partner",
      firm: "Meridian Capital",
      blurb: "No rooms, a fat float. Pay-offs cost 20% less, and his late contractor builds 8% cheaper. Engineers are outsourced, and priced like it.",
      trait: "Fat float · pay-offs 20% cheaper · cheaper late contractor",
      start: { cash: 56, unrest: 14, collapse: 20 },
      perks: { conversionRate: 0.8, engineerExtra: 2, privateWorks: 0.92, tags: ["finance"] },
      compound: "Vault Exchange",
      unlock: "buy",
      price: 450
    }
  ];

  /* Per-run difficulty levers. Credit Ratings and Perquisites write a copy into state.mods.
     These defaults are the AAA baseline (includes the base-game tightening). */
  LD.DEFAULT_MODS = {
    collapseTick: 7,          /* collapse drift per quarter (Fiscal Year base) */
    lateAccelTurn: 9,         /* from this quarter's close, drift +1 ("the curve steepens") */
    upgradeMult: 1,           /* bunker works price multiplier */
    cheapExtra: 0,            /* Discount rooms cost extra */
    engineerCost: 22,
    engineerMinTurn: 1,
    strainSurcharge: 8,
    disruptSurcharge: 14,
    delayMult: 1,             /* delayed unrest/collapse fallout multiplier */
    conversionRate: 0.7,      /* Go private cash rate */
    conversionFee: 0,
    crisisNoPayAt: 70,        /* crises lose their "pay" option at this unrest */
    topDealAt: 30,            /* deal cash at or above this is trimmed */
    topDealTrim: 0.9,
    calmBonus: 0,             /* extra unrest relief on Soothe deals */
    squeezeMult: 1,           /* cash multiplier on Squeeze (extractive) deals */
    crisisDiscount: 0,        /* first crisis pay option is this much cheaper */
    permitWaivers: 0,         /* bunker orders that ignore public-network surcharges */
    extraRegion: 0            /* start owning extra regions */
  };

  function deal(d) {
    return d;
  }

  LD.DEALS = [
    deal({
      id: "water-rights",
      claims: true,
      title: "Buy the town’s water rights",
      kicker: "Acquisition",
      body: "The aquifer still has a few good years. The town does not.",
      hint: "+28 cash. In 2Q: unrest +14, collapse +7. Public water strained at close: installs +8.",
      immediate: { cash: 28 },
      delay: { turns: 2, unrest: 14, collapse: 7, log: "The town posts rationing notices. Your pipes still run." },
      tags: ["extractive", "water"],
      weight: 12
    }),
    deal({
      id: "quiet-inspector",
      title: "Quiet the river inspector",
      kicker: "Compliance",
      body: "A revised finding. A delayed report. A career that finds a quieter desk.",
      hint: "+16 cash. In 3Q: collapse +8 unless you later fund public filters.",
      immediate: { cash: 16, flags: ["inspectorSilenced"] },
      delay: {
        turns: 3,
        log: "The river report, never filed, is now obvious in the water.",
        effectsIf: { unlessFlag: "fundedFilters", collapse: 8 }
      },
      tags: ["extractive", "political"],
      weight: 10,
      unique: true
    }),
    deal({
      id: "dump-grain",
      title: "Dump surplus grain abroad",
      kicker: "Export",
      body: "Better prices at the port than in the county that grew it.",
      hint: "+24 cash. In 2Q: collapse +6. Public food strained at close: installs +8.",
      immediate: { cash: 24, flags: ["grainDumped"] },
      delay: { turns: 2, collapse: 6, log: "Silos at home read empty. The export invoices do not." },
      tags: ["extractive", "food"],
      weight: 10
    }),
    deal({
      id: "sell-reserves",
      title: "Sell emergency water reserves",
      kicker: "Treasury",
      body: "The municipal cache was never meant to be a product. It is now.",
      hint: "+36 cash. In 2Q: unrest +18, collapse +8. Public water disrupted at close: installs +14 and a quarter late.",
      immediate: { cash: 36, flags: ["reservesSold"] },
      delay: { turns: 2, unrest: 18, collapse: 8, log: "The emergency cisterns are empty when the first well fails." },
      tags: ["extractive", "water"],
      strain: { water: 2 },
      weight: 8
    }),
    deal({
      id: "accelerate-permits",
      claims: true,
      title: "Accelerate extractive permits",
      kicker: "Lobby",
      body: "The hearing is short. The language is shorter. Work starts Monday.",
      hint: "+22 cash, collapse +4 now. In 2Q: collapse +6.",
      immediate: { cash: 22, collapse: 4 },
      delay: { turns: 2, collapse: 6, log: "The new cuts show first in the water table, then in the news." },
      tags: ["extractive"],
      weight: 11
    }),
    deal({
      id: "offshore-pensions",
      title: "Offshore the pension fund",
      kicker: "Finance",
      body: "A restructuring. A lighter balance sheet. A quieter obligation.",
      hint: "+30 cash. In 3Q: unrest +16.",
      immediate: { cash: 30 },
      delay: { turns: 3, unrest: 16, log: "Retirees find the new administrator does not return calls." },
      tags: ["extractive", "finance"],
      weight: 9,
      unique: true
    }),
    deal({
      id: "fuel-futures",
      claims: true,
      title: "Corner diesel futures",
      kicker: "Commodities",
      body: "If the grid stutters, you already priced the stutter.",
      hint: "+20 cash. In 2Q: unrest +8. Public power strained at close: installs +8.",
      immediate: { cash: 20, flags: ["fuelHoard"] },
      delay: { turns: 2, unrest: 8, log: "Depots ration fuel. Your contracts are honored first." },
      tags: ["extractive", "power"],
      weight: 10
    }),
    deal({
      id: "crisis-kits",
      title: "Sell the government its own crisis kits",
      kicker: "Procurement",
      body: "A sole-source contract. Familiar packaging. A familiar margin.",
      hint: "+26 cash. In 2Q: unrest +10, collapse +5.",
      immediate: { cash: 26 },
      delay: { turns: 2, unrest: 10, collapse: 5, log: "The kits arrive late, and lighter than the invoice." },
      tags: ["extractive"],
      weight: 10
    }),
    deal({
      id: "rezoning-clinic",
      claims: true,
      title: "Rezone the clinic lot",
      kicker: "Land",
      body: "The hospital was unprofitable. The parcel is not.",
      hint: "+32 cash. In 3Q: unrest +20.",
      immediate: { cash: 32, flags: ["clinicSold"] },
      delay: { turns: 3, unrest: 20, log: "The nearest trauma bay is now a two-hour drive." },
      tags: ["extractive"],
      weight: 8,
      unique: true
    }),
    deal({
      id: "cut-safety",
      title: "Cut the safety staff",
      kicker: "Operations",
      body: "A leaner plant is a cheaper plant. The ledger does not list near-misses.",
      hint: "+18 cash. In 2Q: unrest +12.",
      immediate: { cash: 18 },
      delay: { turns: 2, unrest: 12, log: "The night shift files a complaint, then a walkout." },
      tags: ["extractive"],
      weight: 11
    }),
    deal({
      id: "blackout-insurance",
      title: "Sell rolling-blackout insurance",
      kicker: "Products",
      body: "You priced the dark. Now you need the dark to stay on schedule.",
      hint: "+20 cash. In 2Q: unrest +8. Public power disrupted at close: installs +14 and a quarter late.",
      immediate: { cash: 20, flags: ["blackoutContracts"] },
      delay: { turns: 2, unrest: 8, log: "Neighborhoods go dark in the order the policies predicted." },
      tags: ["extractive", "power"],
      strain: { power: 2 },
      weight: 9,
      unique: true
    }),
    deal({
      id: "lobby-relief",
      title: "Weaken the drought-relief bill",
      kicker: "Government",
      body: "Aid would distort the market. Your market.",
      hint: "+24 cash, unrest +6 now. In 2Q: collapse +8.",
      immediate: { cash: 24, unrest: 6 },
      delay: { turns: 2, collapse: 8, log: "The relief vote fails. The dust does not." },
      tags: ["extractive", "political"],
      weight: 9
    }),
    deal({
      id: "cloud-seeding",
      title: "Sell cloud-seeding contracts",
      kicker: "Services",
      body: "A visible effort. A billable sky. Rain remains a rumor.",
      hint: "+14 cash, collapse +3 now. In 2Q: collapse +4.",
      immediate: { cash: 14, collapse: 3 },
      delay: { turns: 2, collapse: 4, log: "The seeding planes fly. The reservoirs do not rise." },
      tags: ["extractive"],
      weight: 8
    }),
    deal({
      id: "farm-rollups",
      claims: true,
      title: "Acquire the failing farms",
      kicker: "Acquisition",
      body: "Land is cheap when the wells are not. You may need that land later.",
      hint: "+18 cash. In 2Q: collapse +7. Hydroponics will cost less.",
      immediate: { cash: 18, flags: ["farmLand"] },
      delay: { turns: 2, collapse: 7, log: "County farms close. Your holding company keeps the deeds." },
      tags: ["extractive", "food"],
      weight: 10
    }),
    deal({
      id: "media-buy",
      title: "Buy the local news hour",
      kicker: "Communications",
      body: "A friendlier desk, a softer chyron, a quieter week.",
      hint: "Costs 8 cash. Unrest −10.",
      cost: 8,
      immediate: { cash: -8, unrest: -10 },
      tags: ["restraint", "political"],
      weight: 10
    }),
    deal({
      id: "charity-filters",
      title: "Fund municipal filters",
      kicker: "Philanthropy",
      body: "A photographed cheque. Actual carbon. A useful alibi later.",
      hint: "Costs 12 cash. Unrest −12. In 2Q: collapse −6. Clears the inspector problem.",
      cost: 12,
      immediate: { cash: -12, unrest: -12, flags: ["fundedFilters"] },
      delay: { turns: 2, collapse: -6, log: "The public plant coughs back to life, briefly." },
      tags: ["restraint", "water"],
      ease: { water: 1 },
      weight: 10
    }),
    deal({
      id: "well-repairs",
      title: "Pay for community well repairs",
      kicker: "Concession",
      body: "You do not have to. That is why it works, for a while.",
      hint: "Costs 10 cash. Unrest −8. In 1Q: collapse −4.",
      cost: 10,
      immediate: { cash: -10, unrest: -8 },
      delay: { turns: 1, collapse: -4, log: "Three wells come back online. The line at the fourth shortens." },
      tags: ["restraint", "water"],
      ease: { water: 1 },
      weight: 10
    }),
    deal({
      id: "seed-vault",
      claims: true,
      title: "Buy a distressed seed vault",
      kicker: "Acquisition",
      body: "A failed co-op, a locked cellar, a future that still germinates.",
      hint: "Costs 14 cash. In 2Q: food install discount, collapse −3.",
      cost: 14,
      immediate: { cash: -14, flags: ["seedVault"] },
      delay: { turns: 2, collapse: -3, log: "The vault inventory is real. The labels are almost honest." },
      tags: ["restraint", "food", "bunker"],
      weight: 9,
      unique: true
    }),
    deal({
      id: "settle-action",
      title: "Settle the class action quietly",
      kicker: "Legal",
      body: "No admission. A sealed annex. A lower temperature in the street.",
      hint: "Costs 18 cash. Unrest −14.",
      cost: 18,
      immediate: { cash: -18, unrest: -14 },
      tags: ["restraint", "political"],
      weight: 8,
      unique: true,
      minTurn: 3
    }),
    deal({
      id: "calm-quarterly",
      title: "Publish a reassuring quarterly",
      kicker: "IR",
      body: "The charts are handsome. The footnotes are small.",
      hint: "Costs 6 cash. Unrest −5. Next collapse tick is −2.",
      cost: 6,
      immediate: { cash: -6, unrest: -5, flags: ["softQuarter"] },
      tags: ["restraint"],
      weight: 11
    }),
    deal({
      id: "solar-writeoff",
      title: "Take a solar write-off",
      kicker: "Tax",
      body: "The panels may even work. The deduction already does.",
      hint: "Costs 12 cash. In 2Q: power L2 costs −8.",
      cost: 12,
      immediate: { cash: -12, flags: ["solarWriteoff"] },
      delay: { turns: 2, log: "A shipment of cells arrives, invoiced as a loss." },
      tags: ["restraint", "power", "bunker"],
      weight: 9,
      unique: true
    }),
    deal({
      id: "open-books",
      title: "Publish the real reserve numbers",
      kicker: "Disclosure",
      body: "Honesty is not free. It is, however, clarifying.",
      hint: "Cash −8, unrest +8, collapse −5.",
      immediate: { cash: -8, unrest: 8, collapse: -5 },
      tags: ["restraint"],
      weight: 7,
      unique: true,
      minTurn: 2
    }),
    deal({
      id: "retention-bonus",
      title: "Pay plant retention bonuses",
      kicker: "People",
      body: "The ones who still know the valves are updating their résumés.",
      hint: "Costs 14 cash. Unrest −10. Next install is forced to sound quality.",
      cost: 14,
      immediate: { cash: -14, unrest: -10, flags: ["skilledCrew"] },
      tags: ["restraint", "bunker"],
      weight: 8,
      unique: true
    }),
    deal({
      id: "charter-freight",
      title: "Charter the last freight",
      kicker: "Logistics",
      body: "A train, a window, a surcharge. After this, the line is a rumor.",
      hint: "Costs 16 cash. Your next bunker install this or next quarter is 30% off.",
      cost: 16,
      immediate: { cash: -16, flags: ["freightCharter"] },
      tags: ["restraint", "bunker"],
      weight: 8,
      unique: true,
      minTurn: 3
    }),
    deal({
      id: "aquifer-tap",
      claims: true,
      title: "Quietly tap a sealed aquifer",
      kicker: "Off-books",
      body: "A civic reserve, a night crew, a second set of pipes.",
      hint: "+12 cash. In 2Q: a water L1 component arrives — also unrest +10, collapse +9.",
      immediate: { cash: 12 },
      delay: {
        turns: 2,
        unrest: 10,
        collapse: 9,
        grantSystem: { id: "water", level: 1, quality: "sound" },
        log: "A tanker of clean water reaches your site. So do the questions."
      },
      tags: ["extractive", "water", "bunker"],
      weight: 8,
      unique: true
    }),
    deal({
      id: "divert-filters",
      title: "Divert a public filtration shipment",
      kicker: "Diversion",
      body: "The crates were labelled for the city plant. They will filter something.",
      hint: "If you lack Air L1, you get it (cheap). Else +12 cash. Unrest +12, collapse +4.",
      immediate: { special: "divertFilters", unrest: 12, collapse: 4 },
      tags: ["extractive", "air", "bunker"],
      weight: 8,
      unique: true
    }),
    deal({
      id: "poach-engineers",
      title: "Poach the public utility engineers",
      kicker: "Talent",
      body: "You hire the people who kept the city running. The city notices.",
      hint: "Costs 16 cash. Unrest +8. Chief engineer hire costs 10 less.",
      cost: 16,
      immediate: { cash: -16, unrest: 8, flags: ["poachedTalent"] },
      tags: ["extractive", "bunker"],
      weight: 8,
      unique: true,
      minTurn: 2
    }),
    deal({
      id: "crisis-strike",
      title: "The plant walks out",
      kicker: "Crisis",
      body: "Picket lines at dawn. The night shift did not clock in.",
      hint: "Pay 15 (−12 unrest), break the line (+20 cash, unrest +18 in 1Q), or promise later (unrest +6 now, +14 in 2Q).",
      isCrisis: true,
      unique: true,
      minUnrest: 48,
      choices: [
        { id: "pay", label: "Pay them", hint: "Costs 15. Unrest −12.", cost: 15, immediate: { cash: -15, unrest: -12 } },
        { id: "break", label: "Break the line", hint: "+20 cash. In 1Q: unrest +18.", immediate: { cash: 20 }, delay: { turns: 1, unrest: 18, log: "The strike is over. The photographs are not." } },
        { id: "promise", label: "Promise a review", hint: "Unrest +6 now. In 2Q: unrest +14.", immediate: { unrest: 6 }, delay: { turns: 2, unrest: 14, log: "The promised review does not appear on any calendar." } }
      ],
      weight: 20
    }),
    deal({
      id: "crisis-inquiry",
      title: "A select committee writes",
      kicker: "Crisis",
      body: "Polite letterhead. An impolite list of dates. They would like documents.",
      hint: "Cooperate (12 cash, unrest −8), shred (in 2Q: unrest +16), or scapegoat (+8 cash, unrest +8).",
      isCrisis: true,
      unique: true,
      minUnrest: 40,
      minTurn: 4,
      choices: [
        { id: "coop", label: "Cooperate", hint: "Costs 12. Unrest −8.", cost: 12, immediate: { cash: -12, unrest: -8 } },
        { id: "shred", label: "Lose the archive", hint: "In 2Q: unrest +16.", delay: { turns: 2, unrest: 16, log: "The missing files become the story." } },
        { id: "scapegoat", label: "Name a deputy", hint: "+8 cash, unrest +8.", immediate: { cash: 8, unrest: 8 } }
      ],
      weight: 18
    }),
    deal({
      id: "crisis-dust",
      title: "Dust season arrives early",
      kicker: "Crisis",
      body: "The sky turns the color of an invoice. Water is a headline again.",
      hint: "Donate (12 cash, collapse −4, unrest −8), gouge (+28, unrest +16, collapse +6), or wait (collapse +8).",
      isCrisis: true,
      unique: true,
      minCollapse: 55,
      choices: [
        { id: "donate", label: "Release water", hint: "Costs 12. Collapse −4, unrest −8. Eases water supply.", cost: 12, immediate: { cash: -12, collapse: -4, unrest: -8 }, ease: { water: 1 } },
        { id: "gouge", label: "Raise the tariff", hint: "+28 cash, unrest +16, collapse +6. Disrupts water supply at quarter close.", immediate: { cash: 28, unrest: 16, collapse: 6 }, strain: { water: 2 } },
        { id: "wait", label: "Issue a statement", hint: "Collapse +8.", immediate: { collapse: 8 } }
      ],
      weight: 20
    }),
    deal({
      id: "crisis-smoke",
      title: "Wildfire smoke rolls in",
      kicker: "Crisis",
      body: "The sun is a coin behind orange glass. Everyone is shopping for air.",
      hint: "Hand out masks (10 cash, unrest −7), sell filters (+22, unrest +12, strains air), or wait (collapse +6).",
      isCrisis: true,
      unique: true,
      minCollapse: 40,
      minTurn: 3,
      choices: [
        { id: "masks", label: "Hand out branded masks", hint: "Costs 10. Unrest −7. Eases air supply.", cost: 10, immediate: { cash: -10, unrest: -7 }, ease: { air: 1 } },
        { id: "filters", label: "Sell premium filters", hint: "+22 cash, unrest +12. Strains air supply.", immediate: { cash: 22, unrest: 12 }, strain: { air: 1 } },
        { id: "wait", label: "Tweet a sunset photo", hint: "Collapse +6.", immediate: { collapse: 6 } }
      ],
      weight: 16
    }),
    deal({
      id: "crisis-bread",
      title: "Bread queues turn ugly",
      kicker: "Crisis",
      body: "The shelves are empty. Your warehouses are not. Someone has a drone.",
      hint: "Open a food bank (14 cash, unrest −10), sell at market (+18, in 1Q unrest +14), or hold stock (unrest +6, collapse +3).",
      isCrisis: true,
      unique: true,
      minUnrest: 36,
      minTurn: 3,
      choices: [
        { id: "bank", label: "Open a food bank", hint: "Costs 14. Unrest −10. Eases food supply.", cost: 14, immediate: { cash: -14, unrest: -10 }, ease: { food: 1 } },
        { id: "market", label: "Sell at 'market' prices", hint: "+18 cash. In 1Q: unrest +14.", immediate: { cash: 18 }, delay: { turns: 1, unrest: 14, log: "The 'market' price becomes a chant." } },
        { id: "hold", label: "Hold the stock", hint: "Unrest +6, collapse +3.", immediate: { unrest: 6, collapse: 3 } }
      ],
      weight: 16
    }),
    deal({
      id: "crisis-blackout",
      title: "Rolling blackouts",
      kicker: "Crisis",
      body: "The grid is load-shedding the poor first. The algorithm insists it is neutral.",
      hint: "Fund repairs (12 cash, collapse −3, unrest −5), sell priority power (+24, unrest +12, disrupts power), or wait (unrest +8).",
      isCrisis: true,
      unique: true,
      minCollapse: 50,
      choices: [
        { id: "repair", label: "Fund the repair crews", hint: "Costs 12. Collapse −3, unrest −5. Eases power supply.", cost: 12, immediate: { cash: -12, collapse: -3, unrest: -5 }, ease: { power: 1 } },
        { id: "priority", label: "Sell priority power", hint: "+24 cash, unrest +12. Disrupts power supply at quarter close.", immediate: { cash: 24, unrest: 12 }, strain: { power: 2 } },
        { id: "wait", label: "Blame the weather", hint: "Unrest +8.", immediate: { unrest: 8 } }
      ],
      weight: 16
    }),
    deal({
      id: "crisis-flood",
      title: "The river forgets its banks",
      kicker: "Crisis",
      body: "Three towns are underwater. Your levee held. It was built for one address.",
      hint: "Lend the pumps (10 cash, unrest −6, collapse −2), charge for rescue boats (+20, unrest +14), or wait (collapse +7).",
      isCrisis: true,
      unique: true,
      minCollapse: 60,
      choices: [
        { id: "pumps", label: "Lend the pumps", hint: "Costs 10. Unrest −6, collapse −2. Eases water supply.", cost: 10, immediate: { cash: -10, unrest: -6, collapse: -2 }, ease: { water: 1 } },
        { id: "boats", label: "Charge for the boats", hint: "+20 cash, unrest +14. Strains water supply.", immediate: { cash: 20, unrest: 14 }, strain: { water: 1 } },
        { id: "wait", label: "Send thoughts", hint: "Collapse +7.", immediate: { collapse: 7 } }
      ],
      weight: 14
    })
  ];

  LD.TUTORIAL = [
    {
      title: "One deal a quarter",
      body: "Each quarter you are offered three deals. You pick one. Money often arrives now. Public consequences often arrive later. Extractive deals can strain or disrupt the municipal water, power, air, or food networks your own shelter still uses."
    },
    {
      title: "Private supply versus profit",
      body: "A strained network makes that system costlier to install. A disrupted one also delays the shipment by a quarter — it will not help you if collapse arrives first. You may spend a bunker action to convert to private supply: deals then pay only 70% cash, but further installs ignore that damage and arrive this quarter. Convert early to lock in materials; stay in the market longer if you want a bigger pile. Exploitation can still work either way."
    },
    {
      title: "The Fiscal Year",
      body: "A run is three acts of four quarters, and each act is an era of Port Calder: The Street (1978), The Middle (2008) and The Top (now). Every deal sends someone to your door: a beat cop, a landlord, a councilman, a reporter. Pay them off or crush them, and they remember. Q4 and Q8 end in a boss fight (an Earnings Call or a Short-Seller Report, then a General Strike, a Hostile Takeover or a Market Crash). Q12 is The Reckoning, which tests your bunker. Win fights to earn new cards. Assets are rarer trophies for the office wall, and the phone rings with calls — a Headhunter, a distressed sale, an old friend. Each executive levels up from runs and earns small perks."
    },
    {
      title: "Then finish the shelter",
      body: "After the deal you may also install air, water, power, or food, or hire a chief engineer. Sound work holds. Discount work is cheaper, but a level-2 discount system fails at evacuation unless you hired an engineer or raised it to level 3. You win with all four systems at level 2 or better, and working. You may seal from quarter 9. Collapse at 100 forces the doors. Unrest at 100 means you never reach them."
    }
  ];

  if (typeof module !== "undefined" && module.exports) {
    module.exports = LD;
  }
})(typeof globalThis !== "undefined" ? globalThis : this);

  