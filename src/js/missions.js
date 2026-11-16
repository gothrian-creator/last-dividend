/* Last Dividend: missions and coherence.
   Every fight answers four things in its own text: who they are, what you are doing to them in THIS mission, why you are
   in the same room, and what they do about it. Each deal names the scheme ({doing}), the thing at stake ({it}) and who
   pays ({stake}); each face lists the kinds of scheme it would plausibly turn up for, and its lines are written against
   those slots. Moves are named from the face's side. */
(function () {
  "use strict";
  var LD = (window.LD = window.LD || {});
  /* d: what you are doing (gerund) · it: the thing at stake · st: who or what pays · th: themes */
  var M = {
    "water-rights": { d: "buying up the town's water rights", it: "the water rights", st: "every tap in town", th: ["water", "land"] },
    "quiet-inspector": { d: "leaning on the river inspector", it: "the inspector's report", st: "whatever is in the river", th: ["politics", "water"] },
    "dump-grain": { d: "dumping the surplus grain abroad", it: "the grain shipment", st: "the bread on this street", th: ["food", "finance"] },
    "sell-reserves": { d: "selling off the emergency water reserves", it: "the reserve tanks", st: "the summer water", th: ["water", "relief"] },
    "accelerate-permits": { d: "fast-tracking the extraction permits", it: "the permits", st: "the ground under the block", th: ["politics", "land"] },
    "offshore-pensions": { d: "moving the pension fund offshore", it: "the pension fund", st: "forty years of pensions", th: ["finance", "labour"] },
    "fuel-futures": { d: "cornering the diesel market", it: "the diesel", st: "the winter heating oil", th: ["power", "finance"] },
    "crisis-kits": { d: "selling the city its own crisis kits", it: "the crisis-kit contract", st: "the relief budget", th: ["relief", "politics"] },
    "rezoning-clinic": { d: "rezoning the clinic lot", it: "the clinic lot", st: "the only trauma bay in the Flats", th: ["land", "health"] },
    "cut-safety": { d: "cutting the plant's safety staff", it: "the safety crew", st: "the night shift", th: ["labour", "health"] },
    "blackout-insurance": { d: "selling blackout insurance", it: "the blackout policies", st: "the lights on this street", th: ["power", "finance"] },
    "lobby-relief": { d: "gutting the drought-relief bill", it: "the relief bill", st: "the drought aid", th: ["politics", "relief", "water"] },
    "cloud-seeding": { d: "selling cloud-seeding contracts", it: "the cloud-seeding contracts", st: "the rain", th: ["water", "climate"] },
    "farm-rollups": { d: "buying up the failing farms", it: "the farms", st: "the family farms", th: ["food", "land"] },
    "media-buy": { d: "buying the local news hour", it: "the news hour", st: "what this city gets told", th: ["media", "politics"] },
    "charity-filters": { d: "funding the city's water filters, with your name on every one", it: "the filter programme", st: "clean water", th: ["water", "media"] },
    "well-repairs": { d: "paying for the community well repairs", it: "the well repairs", st: "the wells", th: ["water", "land"] },
    "seed-vault": { d: "buying a distressed seed vault", it: "the seed vault", st: "next year's harvest", th: ["food", "finance"] },
    "settle-action": { d: "settling the class action quietly", it: "the settlement", st: "the plaintiffs", th: ["law", "media"] },
    "calm-quarterly": { d: "publishing a reassuring quarterly", it: "the quarterly", st: "the real numbers", th: ["finance", "media"] },
    "solar-writeoff": { d: "writing the solar farm off for tax", it: "the solar write-off", st: "the public solar money", th: ["power", "finance"] },
    "open-books": { d: "publishing the real reserve numbers", it: "the reserve numbers", st: "who knew what, and when", th: ["finance", "media"] },
    "retention-bonus": { d: "paying retention bonuses to the plant crews", it: "the retention bonuses", st: "the crews who stay", th: ["labour"] },
    "charter-freight": { d: "chartering the last freight out", it: "the freight charter", st: "what's left on the shelves", th: ["labour", "food"] },
    "aquifer-tap": { d: "quietly tapping a sealed aquifer", it: "the aquifer", st: "the town's last clean water", th: ["water", "land"] },
    "divert-filters": { d: "diverting a public filtration shipment", it: "the filter shipment", st: "the clinic's air", th: ["relief", "health"] },
    "poach-engineers": { d: "poaching the public utility's engineers", it: "the engineers", st: "the city grid", th: ["labour", "power"] },
    "crisis-strike": { d: "facing down the plant walkout", it: "the walkout", st: "the plant", th: ["labour"] },
    "crisis-inquiry": { d: "stonewalling the select committee", it: "the inquiry", st: "the paper trail", th: ["politics", "media", "law"] },
    "crisis-dust": { d: "selling your way through the early dust season", it: "the dust masks", st: "the kids' lungs", th: ["health", "climate"] },
    "crisis-smoke": { d: "selling your way through the wildfire smoke", it: "the air filters", st: "the kids' lungs", th: ["health", "climate"] },
    "crisis-bread": { d: "working the bread queues", it: "the bread queues", st: "the bakeries", th: ["food", "relief"] },
    "crisis-blackout": { d: "working the rolling blackouts", it: "the blackouts", st: "the lights", th: ["power", "relief"] },
    "crisis-flood": { d: "working the river flood", it: "the flood response", st: "the low streets", th: ["climate", "land", "relief"] },
    "esg-offset": { d: "planting a carbon-offset forest", it: "the offset forest", st: "the actual emissions", th: ["climate", "media"] },
    "esg-water-pledge": { d: "pledging net-zero water use", it: "the water pledge", st: "the river", th: ["climate", "water", "media"] },
    "esg-rewild": { d: "rebranding the strip mine as rewilding", it: "the 'rewilding'", st: "the hills", th: ["climate", "land", "media"] },
    "esg-solar-glass": { d: "putting solar glass on the town hall", it: "the solar glass", st: "the town hall", th: ["climate", "power", "politics"] },
    "esg-badge": { d: "buying a sustainability badge", it: "the badge", st: "the truth", th: ["climate", "media"] },
    "dc-surge": { d: "surge-pricing the evacuation buses", it: "the evacuation buses", st: "the people who can't pay", th: ["relief", "health"] },
    "dc-rebuild": { d: "taking the no-bid rebuild contract", it: "the rebuild contract", st: "the flooded blocks", th: ["relief", "politics", "land"] },
    "dc-insure": { d: "cancelling the flood insurance pool", it: "the insurance pool", st: "every policy on the low streets", th: ["finance", "land", "climate"] },
    "dc-ration": { d: "taking the ration-card exclusive", it: "the ration cards", st: "the queue", th: ["food", "relief"] },
    "dc-heatwave": { d: "selling your way through the heat dome", it: "the cooling centres", st: "the old folks on the top floors", th: ["climate", "health", "power"] },
    "ht-desal": { d: "taking over the desalination plant", it: "the desal plant", st: "the city's water", th: ["finance", "water"] },
    "ht-poison": { d: "poison-pilling a shipping line's port", it: "the port", st: "the dockers", th: ["finance", "labour"] },
    "ht-greenmail": { d: "greenmailing a regional utility", it: "the utility", st: "the power bills", th: ["finance", "power"] },
    "ht-merge": { d: "merging with a struggling grid", it: "the grid merger", st: "the grid", th: ["finance", "power"] }
  };
  var GENERIC = { d: "pushing your latest deal through", it: "your deal", st: "the neighbourhood", th: [] };
  LD.MISSIONS = M;
  LD.missionFor = function (x) { var id = x && typeof x === "object" ? x.dealId : x; return (id && M[id]) || GENERIC; };
  function cap(s) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : s; }
  /* Fill {doing} {it} {stake} (capitalised: {Doing} {It} {Stake}) from the fight's mission. */
  LD.missionText = function (str, x) {
    if (!str || str.indexOf("{") === -1) return str || "";
    var m = LD.missionFor(x);
    return str.replace(/\{(doing|Doing|it|It|stake|Stake)\}/g, function (_, k) {
      var v = /^doing$/i.test(k) ? m.d : /^it$/i.test(k) ? m.it : m.st; return k.charAt(0) === k.charAt(0).toUpperCase() ? cap(v) : v; });
  };

  /* fits: the schemes a face would plausibly come to fight you over. */
  var FITS = {
    dunn: ["politics", "land", "relief", "health", "food"], moretti: ["land", "water", "power", "finance"], june: ["labour", "finance"],
    mickey: ["food", "power", "finance", "relief"], odell: ["land", "health", "water", "climate"], benny: ["food", "relief", "land", "power"],
    grace: ["media", "politics", "water", "land", "law", "climate"], pops: ["labour", "health"],
    delacroix: ["politics", "land", "relief", "climate", "media"], okafor: ["media", "finance", "law", "politics"], hale: ["water", "power", "politics", "law", "climate", "food"],
    harrow: ["finance", "land", "power", "food", "water"], gray: ["relief", "health", "labour", "food", "power"], gil: ["finance", "land", "climate", "water", "power"],
    pip: ["finance", "labour", "law"], dana: ["land", "health", "relief"],
    crowe: ["finance", "power", "water", "food"], rosa: ["land", "health", "climate", "relief", "labour", "media"], sorel: ["finance", "media", "law"], ashby: ["finance", "media"],
    theo: ["climate", "water", "land", "relief"], mina: ["labour", "food", "health", "relief"], honoria: ["land", "finance", "water", "climate"]
  };
  Object.keys(FITS).forEach(function (id) { if (LD.OPPONENTS[id]) LD.OPPONENTS[id].fits = FITS[id]; });
  LD.oppFits = function (id, dealId) { var o = LD.OPPONENTS[id], m = M[dealId]; if (!o || !m || !o.fits) return true; return o.fits.some(function (t) { return m.th.indexOf(t) !== -1; }); };
  /* Pick only from faces who would plausibly be in this fight; fall back to the whole cast if nobody fits. */
  var basePick = LD.pickOpponent;
  LD.pickOpponent = function (state, enc, kind, rng, deal) {
    var dealId = deal && deal.id;
    if (!basePick || !dealId || !M[dealId]) return basePick ? basePick(state, enc, kind, rng) : null;
    var saved = {}, all = LD.OPPONENTS, any = false;
    Object.keys(all).forEach(function (id) { var o = all[id]; if (o.boss || o.base === "hearing" || o.act !== LD.eraOf(state)) return; if (LD.oppFits(id, dealId)) any = true; });
    if (!any) return basePick(state, enc, kind, rng);
    /* hide the faces that don't fit for this one pick (act is the filter basePick already uses) */
    Object.keys(all).forEach(function (id) { var o = all[id]; if (!o.boss && o.base !== "hearing" && !LD.oppFits(id, dealId)) { saved[id] = o.act; o.act = -1; } });
    try { return basePick(state, enc, kind, rng); } finally { Object.keys(saved).forEach(function (id) { all[id].act = saved[id]; }); }
  };

  /* ---------- The text pass: situation (why), opening line, and every line that named the wrong scheme ---------- */
  var T = {
    /* 1978 · The Street */
    dunn: { why: "You're {doing}, and on Harbor Ave nothing gets built, shipped or signed without a permit from the 14th Precinct. Officer Frank Dunn made that his beat. He came up to your office to discuss the fee.",
      open: "{It}? Lotta permits on a thing like that. Be a shame if they went missing." },
    moretti: { why: "You're {doing}, and Sal Moretti owns fourteen walk-ups in the way of it, and the boiler in every one. He'll sell, evict or let them burn, whichever pays. He came up to your office to name a price.",
      open: "Everybody wants a piece of my block for {it}. You're the first one dumb enough to ask me in person.",
      end: { deal: "Split the difference on {it}. Like gentlemen. Like crooks." } },
    june: { why: "You're {doing}, and it comes out of Local 9's jobs. June Park, shop steward, runs the vote, the minutes and the coffee urn. She gave you five minutes in the back booth at Rosie's.",
      open: "{It} puts twelve hundred jobs on the line. You've got five minutes and I'm timing you.",
      end: { deal: "A contract, in writing, before you touch {it}. Not a peace treaty." } },
    mickey: { why: "You're {doing}, and nothing moves on the waterfront without Mickey 'the Nail' Russo taking his cut. He asked you to the alley behind Club Pelican to explain how cuts work.",
      open: "{It}. Nice operation. Lotta things can go wrong with an operation. Fires, mostly.",
      end: { deal: "Call it a retainer on {it}. Monthly." } },
    odell: { why: "You're {doing}, and the plan runs straight through Odell Street. Ma Odell has sat on the same stoop for forty years and runs the block association from it. She won't come to you, so you went to her.",
      open: "Forty years on this stoop. You think I'll trade {stake} for a briefcase?",
      react: { law: "Papers. Again. I've got a drawer for your papers." },
      end: { deal: "Leave the block out of {it}, fix the boiler, and shake on it. Firm." } },
    benny: { why: "You're {doing}, and the whole of Harbor Ave eats on credit at Ostrowski's corner grocery. Benny Ostrowski kept the shop open by candle in the '77 blackout. The street listens to him. You went to the shop to keep him quiet.",
      open: "Sure, sit. Coffee's on the house. {It} isn't. Not while this street eats on my tab.",
      end: { deal: "Fine. You keep {it}, I keep the corner and the tab.", pyrrhic: "You got {it}. Feel how cold it is out there.", converted: "Half the street works for you now. Fine. I'll stock your canteen." } },
    grace: { why: "You're {doing}, and the paper trail sits in the Harbor branch library, which has kept every deed and contract since 1902. Grace Okafor, the librarian, found your company's name in it. You went to the reading room before she read it aloud.",
      open: "Shh. This is a library. Sit down and read page 212 with me. It's about {it}.",
      end: { deal: "The records on {it} stay open. Your name stays in them." } },
    pops: { why: "You're {doing}, and Local 9 is in week six of the walkout at the Calder Steel gate. Ray 'Pops' Delgado, picket captain, decides what crosses. You went down to the gate to get your trucks through.",
      open: "Twenty-two years at that furnace. You want {it} through my picket line? For what?",
      end: { deal: "Six more months, then we talk about {it}. My word's good." } },
    /* 2008 · The Middle */
    delacroix: { why: "You're {doing}, and it needs one more council vote. Councilman Ray Delacroix, Ward 6, has that vote and a boat he can't afford. He's taking meetings in his City Hall office.",
      open: "{It}? I've got a ribbon to cut at three. Make my vote worth my while.",
      end: { walked: "Vote's no on {it}. See you at the fundraiser." } },
    okafor: { why: "You're {doing}, and Dev Okafor at the Ledger has the internal memo with your signature on page three. He's at the newsroom at 2 a.m., asking for comment before the story runs.",
      open: "I've got the memo on {it}. And your signature. Want to comment before it runs?" },
    hale: { why: "You're {doing}, and it needs sign-off from the Resource Oversight Board. Agnes Hale chairs it. She spent eleven years at a firm like yours and knows where the bodies are buried. She has called you to her hearing room.",
      open: "I spent eleven years at a firm like yours. I know exactly where {it} hides things." },
    harrow: { why: "You're {doing}, and Bea Harrow of Harrow Yield Partners wants the same deal for her fund, or wants you to fail at it, whichever pays more. She invited you for a drink at the Calder Club.",
      open: "Darling, {it} is big enough for one of us.",
      end: { deal: "We'll split {it} down the middle. Like adults." } },
    gray: { why: "You're {doing}, and the square outside is full of people who hate it. Commissioner Gray can clear them out by morning, for a price, and make it worse if you don't pay. You went to Police HQ to talk overtime.",
      open: "Square's full of people angry about {it}. I can clear it, or not. Your call. Your money." },
    gil: { why: "You're {doing}, and Sycamore Court just worked out what it does to their houses and their 401(k)s. Gil Marsh, HOA treasurer, has decided it's your fault, which it is. He's waiting at the end of the cul-de-sac.",
      open: "Quick one. Section 4(b). Also {it} just sank my 401(k). Mostly 4(b)." },
    pip: { why: "You're {doing}, and the money comes from Calder Mutual. The board is split six to six. Pip Whitlow, 34, takes the minutes and holds the swing vote. He's asked you into the boardroom.",
      open: "I'm not supposed to be talking to you about {it}. I'm taking minutes of this, by the way.",
      end: { pyrrhic: "You got the vote. The bank's still on fire." } },
    dana: { why: "You're {doing}, and it lands on the Flats, where your mortgage arm has already foreclosed on one house in five. Dana Reyes, a night-shift nurse who lost hers last spring, brought two hundred neighbours out. You went down to her street before the six o'clock news did.",
      open: "Your mortgage arm took my house last spring. Now you're coming for {stake}? Not while I'm standing here.",
      react: { money: "You think I can't be bought? Try me. No. Don't.", public: "Go on, smear a nurse. I've got payslips, and a shoebox of your foreclosure letters.", law: "Another letter. I've got a shoebox full of them." },
      end: { bought: "I'll take it. For the kids. Not for you. Never for you.", converted: "The other nurses took the jobs you offered. I need the hours. Don't smile.",
        broken: "Fine. Keys are on the counter. Kids are at my sister's.", martyred: "Drag a nurse off her own street on the six o'clock news. Go on.",
        deal: "Leave {it} alone, modify the loans, and we go home. Today.", walked: "We're staying. All of us. {It} can wait." } },
    /* Today · The Top */
    crowe: { why: "You're {doing}, and Victor Crowe wants it, and your company with it. Gannet Freight Exchange owns the port, the app and the tide tables. 9:41am, top floor. He sent for you.",
      open: "I don't build. I acquire. Today I'm acquiring {it}. And you." },
    rosa: { why: "You're {doing}, and Rosa Lind has brought 300 people, a megaphone and a livestream into your lobby to stop it. 41k watching.",
      open: "We're not leaving until you drop {it}. We brought snacks. And Gran's casserole dish." },
    sorel: { why: "You're {doing}, and short-seller Lena Sorel has just published 90 pages on what it hides. She'd like a word in garage B3. No phones.",
      open: "I'm short your stock because of {it}. I'd like you to hear why, from me." },
    ashby: { why: "You're {doing}, and Gail Ashby is live on the morning show taking your numbers apart. 1.2m watching. You're on the line.",
      open: "Your numbers on {it} don't add up. They multiply." },
    theo: { why: "You're {doing}, and it needs the Sea Wall Board's vote at 6pm. Theo Lind, volunteer, Ma Odell's great-grandson, brought a flood map and a new word. You went down to Pier 9 to change his mind.",
      open: "Hi. Sorry. You probably know my mum. I'm here about {it}. And the wall." },
    mina: { why: "You're {doing}, and the riders who feed the Flats are paying for it. Every rider logged off at 7pm. Mina Kaur, 4.8 stars, 0 patience, is in the dark-kitchen alley. You went down to get the app back online.",
      open: "{It}, on our backs again. Five stars, every night. Tonight I'm rating you." },
    honoria: { why: "You're {doing}, and the Calder Trust has owned the land, the bonds or the water under it since 1902. Dame Honoria Calder has asked you to lunch at the estate. The helicopter leaves at 12:30.",
      open: "Sit. Not there. That was Grandfather's chair. Now. {It}." },
    brennan: { why: "You're {doing}, and the Senate wants to know how. Committee room 214: Senator Walt Brennan has the cameras, the gavel and your old fixer on the witness list.",
      open: "The committee will come to order. You will not. We'll start with {it}." },
    /* Bosses: the quarter's reckoning, tied to the deal that rang the bell */
    ashby_b: { why: "You had just signed off on {doing} when the earnings call came in at 9:00 sharp. Gail Ashby had the analysts on the line and the numbers on her desk.",
      open: "Welcome to the earnings call. Let's start with {it}. The analysts are on the line. All of them." },
    sorel_b: { why: "You had just signed off on {doing}. At dawn, ninety pages on it hit the wires. Lena Sorel waited in a parking garage with the index.",
      open: "Ninety pages on you. Chapter one is {it}. I wrote the index myself." },
    varga_b: { why: "You're {doing}, and that was the last straw. The whole city walked out at dawn. Tomas Varga holds the hall, the buses and the bakers.",
      open: "Thirty years I've watched you lot. {It} was the last straw. Today the city stops." },
    june_b: { why: "You're {doing}, and June Park, 64, is leading the general strike against it. She kept the minutes from 1978.",
      open: "Remember me? Thirty years. Now {it}, and the whole city walks out." },
    crowe_b: { why: "You had just signed off on {doing} when Victor Crowe filed a hostile bid at 6:02am. Your board has his number.",
      open: "Your board has my number. They didn't like {it}. Shall we call them together?" },
    ticker_b: { why: "You're {doing} when the floor gives way. The Ticker does not take questions." }
  };
  LD.COHERENCE = T;
  Object.keys(T).forEach(function (id) {
    var o = LD.OPPONENTS[id], t = T[id]; if (!o) return;
    if (t.why) o.why = t.why; if (t.open) o.open = t.open;
    if (t.react) { o.react = o.react || {}; Object.keys(t.react).forEach(function (k) { o.react[k] = t.react[k]; }); }
    if (t.end) { o.end = o.end || {}; Object.keys(t.end).forEach(function (k) { o.end[k] = t.end[k]; if (k === "bought") o.end.paid = t.end[k]; if (k === "broken") o.end.crushed = t.end[k]; }); }
    if (LD.OPP_LINES && LD.OPP_LINES[id]) { var L = LD.OPP_LINES[id]; if (t.why) L.why = t.why; if (t.open) L.open = t.open; }
  });
  /* Moves, named from their side of the table */
  var MV = {
    dan_line: { label: "Two Hundred Neighbours", say: "Two hundred of us on this street, and every one did the sums on {it}." },
    dan_sums: { say: "Your late fee was bigger than my mortgage payment. I did the sums on you too." },
    dan_kids: { say: "The kids are on the six o'clock news now. Smile for them." },
    oka_follow: { say: "Just one more. Who signed the memo on {it}?" },
    pop_line: { say: "Twenty-two years at that furnace. Nothing crosses. Not {it}." },
    gil_cov: { say: "Section 4(b): lawn height. Also {it}." },
    pip_swing: { say: "Six to six on {it}. Guess who breaks the tie." },
    the_map: { say: "Blue is underwater by 2040. {It} is in the blue." },
    rosa_chant: { say: "Whose city? OUR city! Drop {it}!" },
    del_zone: { say: "{It}? Committee's backed up. Months. Years." },
    hale_audit: { say: "We'd love your input on {it}. Under seal." }
  };
  Object.keys(MV).forEach(function (k) { var I = LD.INTENTS && LD.INTENTS[k]; if (!I) return; if (MV[k].label) I.label = MV[k].label; if (MV[k].say) I.say = MV[k].say; });

  /* Every place a face speaks goes through the mission filler. */
  var lineFn = LD.oppLine, reactFn = LD.oppReact;
  LD.oppLine = function (fg, kind, n) { return LD.missionText(lineFn ? lineFn(fg, kind, n) : "", fg); };
  LD.oppReact = function (fg, pres) { var r = reactFn ? reactFn(fg, pres) : null; return r ? LD.missionText(r, fg) : r; };
  LD.moveSay = function (fg, k) { var I = LD.INTENTS && LD.INTENTS[k]; return I && I.say ? LD.missionText(I.say, fg) : ""; };
})();
