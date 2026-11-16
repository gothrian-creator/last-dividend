/* Last Dividend: lore layer for the base game (universe bible, BASE items only).
   - Fight narrative: every face's intro caption, opening, mid-fight reactions (by pressure family) and endings (by outcome).
   - Nine new faces (three per era) with their signature moves.
   - Light executive traits (one wholesome / one toxic each) and the hidden Temper marker's home, quadrants and asides.
   - Silent cards: the narrator's caption per era and the cheap animation each one plays on the opponent.
   Everything here is data. fy.js reads traits/temper; eras.js/fy-render.js read lines. The lore is a proposal and stays light. */
(function () {
  "use strict";
  var LD = (typeof window !== "undefined" ? window : globalThis).LD = (typeof window !== "undefined" ? window : globalThis).LD || {};

  /* ---------- Executive traits (Temper Compass, base game: one pair each; the compass UI is Add-on 1) ---------- */
  LD.EXEC_TRAITS = {
    mara: { good: { id: "boundaries", name: "Boundaries", text: "Your first Legal card each fight gives +2 Deniability." }, bad: { id: "withholding", name: "Withholding", text: "The Gallery never warms past +2 for you." } },
    reid: { good: { id: "duty", name: "Duty", text: "Cards played in round 1 give +1 Deniability." }, bad: { id: "stonewalling", name: "Stonewalling", text: "Crowds start a notch against you (lobby and protest fights)." } },
    imani: { good: { id: "patience", name: "Patience", text: "1 unspent ◆ carries into the next round." }, bad: { id: "smothering", name: "Smothering", text: "Debt cards tilt the Gallery one further against you." } },
    julian: { good: { id: "humour", name: "Humour", text: "The first hit that gets through each fight is 2 smaller." }, bad: { id: "envy", name: "Envy", text: "Holdouts who won't sell hit you 1 harder." } },
    soren: { good: { id: "passion", name: "Passion", text: "Shame and Rumour cards give +1 Pressure." }, bad: { id: "vanity", name: "Vanity", text: "When a card is exposed, the Gallery tilts one further against you." } },
    cassius: { good: { id: "equanimity", name: "Equanimity", text: "Hits that get through never tilt the Gallery." }, bad: { id: "coldcontrol", name: "Cold Control", text: "The Gallery never warms past +1 for you." } }
  };
  LD.execTraits = function (id) { return LD.EXEC_TRAITS[id] || null; };

  /* ---------- The hidden Temper marker: home positions (Stoic s, Wholesome w) and quadrants ---------- */
  LD.TEMPER_HOME = { mara: { s: 3, w: -3 }, reid: { s: 3, w: -1 }, imani: { s: 1, w: -2 }, julian: { s: -3, w: -2 }, soren: { s: -3, w: -1 }, cassius: { s: 4, w: -4 } };
  LD.temperQuad = function (T) {
    if (!T) return "Crossroads";
    if (Math.abs(T.s) <= 1 && Math.abs(T.w) <= 1) return "Crossroads";
    if (T.s === 0 || T.w === 0) return T.q || "Crossroads";
    if (T.s > 0) return T.w > 0 ? "Keel" : "Wall";
    return T.w > 0 ? "Hearth" : "Fire";
  };
  /* What the executive mutters as the door closes, by quadrant. Base game shows only this, never the marker. */
  LD.EXEC_ASIDE = {
    mara: { Wall: "Noted. Filed. Forgotten.", Keel: "Fair terms. I'll hold you to them.", Fire: "Turn their water off. Kidding. Mostly.", Hearth: "I remember winters like theirs.", Crossroads: "Hereinafter: done." },
    reid: { Wall: "Load balanced. STOP.", Keel: "Kept the lights on. That's the job.", Fire: "Cut their feed. All of it.", Hearth: "Dad would've fixed their fuse box.", Crossroads: "Circuit closed. Next." },
    imani: { Wall: "Every season has its blight.", Keel: "Store what you can. Share what you must.", Fire: "Let them go hungry a week. They'll learn.", Hearth: "Somebody feed that one. Quietly.", Crossroads: "A fair harvest. For now." },
    julian: { Wall: "Ask Victor. I'm busy.", Keel: "Loaded clean. No crate questions.", Fire: "Bet my brother couldn't have done that.", Hearth: "Buy them a drink. On me. Don't tell anyone.", Crossroads: "Ship's out. Who cares." },
    soren: { Wall: "We hear you. We've moved on.", Keel: "Learning moment. Genuinely.", Fire: "Thrilled! Crushed it!! Literally!!!", Hearth: "That one stung. I'll pivot.", Crossroads: "Exciting times." },
    cassius: { Wall: "Priced in.", Keel: "An acceptable trade.", Fire: "Margin call them. Tonight.", Hearth: "Immaterial. Mostly.", Crossroads: "Immaterial." }
  };
  LD.execAside = function (state) {
    var f = state && state.fy, T = f && f.temper, id = state && state.executiveId, A = LD.EXEC_ASIDE[id]; if (!A || !T) return null;
    var q = T.q || LD.temperQuad(T); return { q: q, t: A[q] || A.Crossroads };
  };

  /* ---------- Silent cards: the narrator's caption (era voice) and the opponent's cheap animation ----------
     1978: noir typewriter, past tense. 2008: news ticker, caps headline. Now: notification-cool, lowercase, timestamps.
     Describe objects and actions, never feelings. Two sentences at most. The narrator never takes a side.
     Fourth-wall breaks: at most one per duel (fy.js enforces), addressed to the player, never mocking them. */
  LD.SILENT = {
    glance: { fx: "freeze", cap: ["A look at the folder. A look across the desk. The folder moved.", "BREAKING: FOLDER RELOCATED. SOURCES SAY NOBODY ASKED IT TO MOVE.", "folder moved 6 inches. 2:14pm. nobody said anything."] },
    pause: { fx: "drain", cap: ["Nobody spoke. The clock on the wall did, eleven times.", "SILENCE ENTERS ITS 11TH SECOND. CLOCK SOLE SPEAKER.", "typing… stopped. typing… stopped. 11 seconds."] },
    smirk: { fx: "sweat", cap: ["The corner of a mouth moved. The coffee went cold.", "BREAKING: EXECUTIVE SMILES. MARKETS UNSURE WHAT IT MEANS.", "smile detected. 0.4 sec. screenshotted 3 times."] },
    watch: { fx: "shrink", cap: ["A watch got checked. It was a nice watch. That was the point.", "WATCH CHECKED. WATCH WORTH MORE THAN ROOM. ANALYSTS AGREE.", "checks watch. watch checks back. heart rate: fine."] },
    chair: { fx: "vignette", cap: ["The good chair stayed empty all evening. Everyone talked to it.", "EMPTY CHAIR HOLDS FLOOR FOR 40 MINUTES. NO COMMENT FROM CHAIR.", "1 empty seat. 9 people looking at it. seen."] },
    handshake: { fx: "tilt", cap: ["The handshake went on a second too long. Then another.", "HANDSHAKE ENTERS FOURTH SECOND. KNUCKLES REPORT CONCERN.", "handshake: 4.2 sec. nobody noticed. one person did."] },
    envelope: { fx: "drain", cap: ["The envelope crossed the table without a sound. Envelopes never make one.", "ENVELOPE CHANGES HANDS. CONTENTS: UNDISCLOSED. WEIGHT: CONSIDERABLE.", "envelope slid. no receipt. no read receipt either."] },
    played: { fx: "crack", w4: true, cap: ["You know how this ends. You've played it before. So have they.", "YOU KNOW HOW THIS ENDS. YOU'VE PLAYED IT BEFORE. SO HAVE THEY.", "you know how this ends. you've played it before. so have they."] },
    settle: { fx: "drain", cap: ["The envelope crossed the table without a sound. Envelopes never make one.", "SETTLEMENT REACHED. TERMS SEALED. EVERYONE NODS AT THE CARPET.", "settled. nda signed. 0 comments. 0 followers. 0."] },
    revolving: { fx: "tilt", cap: ["The nameplate changed. The office didn't.", "REGULATOR JOINS FIRM. SAME DESK, NEW LETTERHEAD.", "new job just dropped. same office. congrats in the chat."] }
  };
  LD.silentFor = function (state, cardId) {
    var S = LD.SILENT[cardId]; if (!S) return null;
    var era = Math.max(1, Math.min(3, LD.eraOf ? LD.eraOf(state) : 3));
    return { id: cardId, fx: S.fx, w4: !!S.w4, era: era, t: S.cap[era - 1] };
  };

  /* ---------- Nine new faces: three per era. Each is somebody's Light story at your door. ---------- */
  var NEW_MOVES = {
    ben_tab: { label: "The Whole Street's Tab", meter: "cash", say: "Half this street owes me. Nobody on it owes you a thing." },
    ben_word: { label: "Word of Mouth", meter: "unrest", ramp: 2, rtext: "signature · grows +2 each time it lands", say: "By Sunday every stoop on Harbor Ave knows your name." },
    gra_record: { label: "Public Record", meter: "heat", rtext: "signature · Heat +1 per 4, unrest half", say: "Deed book 41, page 212. It was always public. Nobody asked." },
    gra_fine: { label: "The Fine Print", meter: "unrest", rider: "leak", at: 4, rtext: "4+ through: a Leak curse", say: "Clause nine. I read it aloud to the whole branch." },
    pop_line: { label: "Nobody Crosses", meter: "unrest", protest: true, say: "Twenty-two years at that furnace. Nobody crosses." },
    pop_week: { label: "Week Six", meter: "unrest", protest: true, grow: 2, rtext: "signature · grows +2", say: "Week six. Cold coffee. Still here." },
    gil_cov: { label: "Covenant Violation", meter: "cash", say: "Section 4(b): lawn height. Also your entire business model." },
    gil_watch: { label: "Neighbourhood Watch", meter: "unrest", say: "We have a group. The group has noticed you." },
    gil_chat: { label: "The Group Chat", meter: "heat", ramp: 2, rtext: "signature · grows +2 each time it lands", say: "Reply-all. Forty-one households. Read receipts on." },
    pip_minutes: { label: "The Minutes", meter: "cash", rtext: "signature", say: "I took the minutes. All of them. The off-the-record bits too." },
    pip_swing: { label: "Swing Vote", meter: "cash", rider: "claim", at: 6, rtext: "6+ through: you lose the claim", say: "Six to six. Guess who breaks the tie." },
    pip_cc: { label: "Reply-All", meter: "heat", say: "I may have copied the regulator. And my mum." },
    dan_line: { label: "The Foreclosure Line", meter: "unrest", protest: true, say: "Two hundred of us out here, and every one did the sums." },
    dan_sums: { label: "I Did the Sums", meter: "unrest", protest: true, ramp: 2, rtext: "signature · grows +2 each time it lands", say: "Your late fee was bigger than my payment. I did the sums." },
    dan_kids: { label: "Brought the Kids", meter: "unrest", protest: true, mult: 1.5, rtext: "×1.5", say: "They're on the six o'clock news now. Smile for them." },
    min_log: { label: "Log Off", meter: "unrest", protest: true, say: "Every rider in the Flats just went offline. Your dinner's cold." },
    min_star: { label: "One-Star Storm", meter: "unrest", protest: true, grow: 2, rtext: "signature · grows +2", say: "You rate us every night. Tonight we rate you." },
    hon_lunch: { label: "Lunch Invitation", meter: "cash", say: "Do join us. We'll discuss what you're worth. Briefly." },
    hon_snub: { label: "The Snub", meter: "cash", rider: "claim", at: 6, rtext: "signature · 6+ through: you lose the claim", say: "We were here first. We'll be here after." },
    the_map: { label: "The Flood Map", meter: "collapse", say: "Blue is underwater by 2040. Your tower is in the blue." },
    the_no: { label: "No.", meter: "cash", ramp: 3, rtext: "signature · grows +3 each time it lands", say: "No." }
  };
  Object.keys(NEW_MOVES).forEach(function (k) { if (LD.INTENTS) LD.INTENTS[k] = NEW_MOVES[k]; if (LD.oppMoves) LD.oppMoves[k] = NEW_MOVES[k]; });
  /* sig: the signature move id. gal: where the Gallery starts. shameless: Shame does half (the Calder Trust). */
  var NEW_OPP = {
    benny: { act: 1, base: "rival", who: "Benny Ostrowski", short: "Benny", role: "Ostrowski's Grocery, Harbor Ave", art: "benny", room: "grocery", place: "Ostrowski's Grocery, behind the counter", ar: 0.452, paid: true,
      pattern: ["ben_tab", "ben_word"], sig: "ben_word", debate: "The corner shop versus the waterfront buyout" },
    grace: { act: 1, base: "journalist", who: "Grace Okafor", short: "Grace", role: "Librarian, Harbor branch", art: "grace", room: "library", place: "The Harbor branch reading room", ar: 0.482, paid: true,
      pattern: ["gra_record", "gra_fine"], sig: "gra_record", debate: "Who gets to read the city's records" },
    pops: { act: 1, base: "protest", who: "Ray 'Pops' Delgado", short: "Pops", role: "Picket captain, Local 9", art: "pops", room: "steelgate", place: "The Calder Steel gate", ar: 0.508, paid: true, venue: "away", gal: -1,
      pattern: ["pop_line", "pop_week"], sig: "pop_week", debate: "Week six of the walkout" },
    gil: { act: 2, base: "regulator", who: "Gil Marsh", short: "Gil", role: "HOA treasurer · regional manager", art: "gil", room: "culdesac", place: "Sycamore Court cul-de-sac", ar: 0.416, paid: true,
      pattern: ["gil_cov", "gil_watch", "gil_chat"], sig: "gil_chat", debate: "Keeping up appearances while the floor gives way" },
    pip: { act: 2, base: "rival", who: "Pip Whitlow", short: "Pip", role: "Swing vote, Calder Mutual board", art: "pip", room: "mutual", place: "The Calder Mutual boardroom", ar: 0.463, paid: true,
      pattern: ["pip_minutes", "pip_swing", "pip_cc"], sig: "pip_minutes", debate: "Who votes for the bailout" },
    dana: { act: 2, base: "protest", who: "Dana Reyes", short: "Dana", role: "Nurse, foreclosed in the Flats", art: "dana", room: "flats", place: "Her street in the Flats", ar: 0.452, paid: true, venue: "away", gal: -1,
      pattern: ["dan_line", "dan_sums", "dan_kids"], sig: "dan_sums", debate: "Foreclosure, and who did the sums" },
    mina: { act: 3, base: "protest", who: "Mina Kaur", short: "Mina", role: "Rider, the Flats dark kitchen", art: "mina", room: "kitchen", place: "The dark-kitchen alley", ar: 0.644, paid: true, venue: "away", gal: -1,
      pattern: ["min_log", "min_star"], sig: "min_star", debate: "Ratings, fees and who gets switched off" },
    honoria: { act: 3, base: "rival", who: "Dame Honoria Calder", short: "Honoria", role: "The Calder Trust", art: "honoria", room: "keys", place: "The Calder estate, Outer Keys", ar: 0.323, paid: true, venue: "away", shameless: true,
      pattern: ["hon_lunch", "hon_snub"], sig: "hon_snub", debate: "Old money that wins by waiting" },
    theo: { act: 3, base: "regulator", who: "Theo Lind", short: "Theo", role: "Sea Wall Board volunteer", art: "theo", room: "seawall", place: "The sea wall at Pier 9", ar: 0.438, paid: true, venue: "away",
      pattern: ["the_map", "the_no"], sig: "the_no", debate: "The sea wall vote, and learning to say no" }
  };
  Object.keys(NEW_OPP).forEach(function (id) { var o = NEW_OPP[id]; o.id = id; LD.OPPONENTS[id] = o; });
  /* Existing faces: crowd starting points and signature moves. */
  var SIG = { dunn: "dunn_price", moretti: "mor_evict", june: "june_walk", mickey: "mick_fire", odell: "odell_meet", delacroix: "del_recount", okafor: "oka_front", hale: "hale_audit", harrow: "bea_cds", gray: "gray_kettle",
    crowe: "cro_acq", rosa: "rosa_occupy", sorel: "sor_ex", ashby: "ash_down", brennan: "br_oath" };
  Object.keys(SIG).forEach(function (id) { if (LD.OPPONENTS[id]) LD.OPPONENTS[id].sig = SIG[id]; });
  ["odell", "rosa", "june_b", "varga_b"].forEach(function (id) { if (LD.OPPONENTS[id]) LD.OPPONENTS[id].gal = -1; });

  /* ---------- Fight narrative: every face, rewritten to the world, the era and the situation ----------
     why: the intro caption (narrator, era voice). open: first words. hit / block: generic reactions.
     react: what they say when a card of that pressure family lands (money = Debt/Patronage/Favour, public = Shame/Rumour/Info/Crowd/Snub,
     law = Legal/Precarity). end: one line per outcome (bought, broken, exposed, ignored, martyred, pyrrhic, deal, walked). */
  var LINES = {
    /* ===== 1978 · The Street ===== */
    dunn: { why: "The 14th Precinct had started 'reviewing permits' on Harbor Ave. Officer Dunn reviewed them personally, for a fee.",
      open: "Permits. Fire code. Loitering. I can find something wrong with anything. Including you.",
      hit: ["Hey. I'm an officer of the law.", "Easy. Let's talk numbers.", "You don't scare me. Much."], block: ["Desk sergeant's deaf.", "Paperwork says otherwise."],
      react: { money: "Now you're speaking precinct.", public: "Don't you put my name in the paper.", law: "You're quoting law at a cop?" },
      end: { bought: "Pleasure doing business. I never saw you, never will.", broken: "Harbour patrol. You got me transferred to harbour patrol.", exposed: "My picture. In the Ledger. My mother reads the Ledger.",
        ignored: "Fine. I'll go bother the bakery.", martyred: "Go on, cuff a cop. Whole block's watching. They'll remember who swung.", pyrrhic: "You won. Look at your windows, though.",
        deal: "Call it a donation to the widows' fund. Wink.", walked: "Have a safe night. Watch your windows." } },
    moretti: { why: "Sal Moretti owned fourteen walk-ups on Pell Street and the boiler in every one of them. Your waterfront deal needed his block.",
      open: "Everybody wants my block. You're the first one dumb enough to ask me in person.",
      hit: ["That's a tenant-rights move.", "Fine, fine. I'm listening.", "My lawyer's gonna hear about this."], block: ["Rent's due either way.", "I own the stairs, kid."],
      react: { money: "Now that's a number I respect.", public: "The tenants'll love this. Unfortunately.", law: "Housing court? I eat housing court for lunch." },
      end: { bought: "Fourteen buildings, one handshake. Tell the Councilman I'm happy.", broken: "Take the block. The boilers were dying anyway. So am I.", exposed: "'Slumlord.' They used the word slumlord. In a headline.",
        ignored: "Nobody returns my calls now. Fourteen buildings and nobody calls.", martyred: "Push an old landlord down his own steps. Real classy. The street saw.", pyrrhic: "You won. Count what it cost you. I did.",
        deal: "Split the difference. Like gentlemen. Like crooks.", walked: "Rent's going up. Yours too." } },
    june: { why: "Local 9 had voted to walk out. June Park ran the vote, the minutes and the coffee urn.",
      open: "Twelve hundred jobs on that dock. You've got five minutes and I'm timing you.",
      hit: ["That's a lockout tactic.", "You think we scare that easy?", "...Okay. That one landed."], block: ["Solidarity, pal.", "The line holds."],
      react: { money: "My dad got a company funeral. I know what your money buys.", public: "Print it. The hall reads the paper too.", law: "Injunctions don't feed anybody's kids." },
      end: { bought: "I'll sign. For my kids. Don't you ever say my name at the hall.", broken: "Go home, everybody. ...I said go home.", exposed: "Fine. They know about the strike fund. They know about me.",
        ignored: "Nobody came to the vote. Nobody.", martyred: "Go on. Do it where they can see. They'll be singing my name in thirty years.", pyrrhic: "You won. Count your broken windows on the way out.",
        deal: "A contract. Not a peace treaty.", walked: "See you on the picket line." } },
    mickey: { why: "Nothing moved on the waterfront without Mickey Russo hearing about it. Something was about to move.",
      open: "Nice operation. Lotta things can go wrong with an operation. Fires, mostly.",
      hit: ["Ow. Rude.", "Okay, okay, we're friends.", "You hit like a banker."], block: ["Heh. Missed me.", "I got guys for that."],
      react: { money: "Now we're speaking the language.", public: "Don't put my face in no paper.", law: "Lawyers. Cute. I got lawyers too." },
      end: { bought: "Smart. You need anything buried, you call Mickey.", broken: "Nobody does that to the Nail. Nobody did. Until now.", exposed: "My mug on the front page. Ma's gonna kill me before you do.",
        ignored: "The guys stopped calling. Even my guys.", martyred: "You'll get yours. The whole pier saw you do me.", pyrrhic: "Congrats. Smell that? That's your warehouse.",
        deal: "Let's call it a retainer. Monthly.", walked: "See? Easy. Same time next month." } },
    odell: { why: "Ma Odell had sat on the same stoop for forty years. The renewal plan had a line through her building.",
      open: "Forty years on this stoop. You think I'm moving for a briefcase?",
      hit: ["Watch your mouth on my steps.", "Hmph. My grandbabies are watching.", "Don't you sweet-talk me."], block: ["Honey, I've seen landlords.", "The block's got my back."],
      react: { money: "Money's what you people say instead of sorry.", public: "Put me in the paper. I'll wear my good hat.", law: "Eviction papers. Again. I've got a drawer for them." },
      end: { bought: "Fine. But you fix the boiler. Every winter. I'll know.", broken: "Take the stoop. The block remembers. Every name.", exposed: "Yes, I owe back rent. So does the whole street. Ask why.",
        ignored: "Even the pigeons stopped coming round.", martyred: "Drag an old woman off her stoop, then. With the whole block watching.", pyrrhic: "You won, baby. You won't sleep, though.",
        deal: "Life lease and a new boiler. Shake on it. Firm.", walked: "Go on home. This is our street." } },
    benny: { why: "Ostrowski's stayed open by candle in the '77 blackout. The waterfront deal needed his corner, and the corner had a long memory.",
      open: "Sure, sit. Coffee's on the house. The corner isn't.",
      hit: ["Hey, I was being nice!", "Okay. That one I'll write on your tab.", "My father built this counter."], block: ["Whole street owes me. They pay in kind.", "Kurczę. Nice try."],
      react: { money: "You think I never saw an envelope? I run a tab, pal.", public: "Half this street will read it to me tomorrow. Out loud.", law: "Lawyers. In my shop. Near my pierogi." },
      end: { bought: "I took it. Don't tell my daughter. Don't tell anybody.", broken: "Close early tonight. ...Close early every night, I guess.", exposed: "Sure I owe money. Half this street owes me. Put that in the paper too.",
        ignored: "Shop's still open. Nobody comes in. That's worse.", martyred: "Go ahead. Everybody on Harbor Ave is watching you squeeze a grocer.", pyrrhic: "You got my corner. Feel how cold it is out there.",
        deal: "Fine. You keep the dock, I keep the corner and the tab.", walked: "Coffee's still on the house. Goodbye." } },
    grace: { why: "The Harbor branch kept every deed since 1902. Grace Okafor had read them all, and she'd marked the page with your company's name.",
      open: "Shh. This is a library. Sit down and read page 212 with me.",
      hit: ["I'll need that in writing.", "Overdue. And so are you.", "...Hm. A fair point. Badly made."], block: ["It's in the public record.", "Footnote seven disagrees."],
      react: { money: "We don't take donations with strings. We do take note.", public: "Rumours aren't records. I'll correct it in the margin.", law: "I've read more law than your lawyer. In the original." },
      end: { bought: "The branch accepts. The ledger will show who paid for the roof.", broken: "They'll cut the hours. Then the books. Then me.", exposed: "Yes, I photocopied it. Every page. It was always public.",
        ignored: "Nobody reads the fine print. That's the whole trick, isn't it.", martyred: "Close the branch, then. Twenty kids learn to read on those steps.", pyrrhic: "You won. Read what it cost. Page by page.",
        deal: "The records stay open. Your name stays in them.", walked: "Return it by Friday. Or it's front page." } },
    pops: { why: "Week six of the walkout. Pops Delgado held the line at the Calder Steel gate with a thermos and a sign that had gone soft in the rain.",
      open: "Twenty-two years at that furnace. You want me to cross for what?",
      hit: ["I've had worse winters.", "That's a scab move, mister.", "Hm. You learned that from somebody."], block: ["Nobody crosses.", "The line holds, rain or not."],
      react: { money: "Put that away. ...Put it away before somebody sees.", public: "Let 'em print it. My name's been on worse.", law: "Your paper says go home. My boots say no." },
      end: { bought: "Don't tell June. Don't you ever tell June.", broken: "Kids are hungry. Gate's open. Go on through.", exposed: "Fine. Everybody knows I crossed in '61. I paid for it.",
        ignored: "They took my picture off the hall wall.", martyred: "Drag me off the line, then. The whole gate's watching.", pyrrhic: "You got through. Hear that? That's the furnace going cold.",
        deal: "Six more months, then we talk. My word's good.", walked: "Nobody crossed. Go home, mister." } },
    /* ===== 2008 · The Middle ===== */
    delacroix: { why: "THE STABILITY FUND NEEDED ONE MORE COUNCIL VOTE. COUNCILMAN DELACROIX NEEDED A NEW BOAT.",
      open: "I've got a ribbon to cut at three. Make it worth my while.",
      hit: ["Off the record, that hurt.", "My constituents will hear about this.", "Let's not be hasty."], block: ["I've survived worse scandals.", "That's not how the council sees it."],
      react: { money: "A contribution. To democracy. Mine.", public: "No cameras. No. Who let the blogger in?", law: "Ethics committee? I chair the ethics committee." },
      end: { bought: "A generous donation. I'll name a park after you. A small one.", broken: "Resign? I'll spend more time with my boat.", exposed: "The emails were taken out of context. All four hundred.",
        ignored: "Nobody came to the ribbon cutting. Not even the ribbon.", martyred: "Investigate me, then. Ward 6 votes for the underdog.", pyrrhic: "You got your vote. Watch what the next one costs.",
        deal: "Both stages, my friend. I sponsor both stages.", walked: "Zoning denied. See you at the fundraiser." } },
    okafor: { why: "THE LEDGER HAS THE BAILOUT MEMO. DEV OKAFOR HAS YOUR SIGNATURE ON PAGE THREE.",
      open: "I've got the bailout memo. And your signature. Want to comment before it runs?",
      hit: ["That's not a denial.", "Ouch. On the record?", "You're spinning, and it's showing."], block: ["Sources confirm otherwise.", "Nice try. Next question."],
      react: { money: "Is that an offer? Say it again, slower. I'm recording.", public: "Counter-story by morning? Cute. I file at midnight.", law: "Legal threat noted. It's going in paragraph two." },
      end: { bought: "Story's on hold. I'll need it to stay that way. My mother can't know.", broken: "They spiked it. Fourteen months of work.", exposed: "So I took a source to dinner. Run that. Everyone runs that.",
        ignored: "Page 31, below the fold. Next to the tyre ad.", martyred: "Fire me. The memo's already on four mirrors.", pyrrhic: "Killed the story. Read the comments, though.",
        deal: "One quote, on the record. Then we're done.", walked: "Front page. Tomorrow. Sleep well." } },
    hale: { why: "AGNES HALE SPENT ELEVEN YEARS AT A FIRM LIKE YOURS. NOW SHE CHAIRS THE BOARD THAT AUDITS IT.",
      open: "I spent eleven years at a firm like yours. I know where you hide things.",
      hit: ["Out of order.", "Noted. Unfavourably.", "I'll need that in writing."], block: ["Objection overruled. By me.", "The rules are the rules."],
      react: { money: "There's a revolving door behind me. Mind the hinge.", public: "Op-eds don't move my docket.", law: "Injunctions are my native tongue." },
      end: { bought: "I'll consider your comment. There may be a board seat in it.", broken: "Recess. Permanently, for some of us.", exposed: "Yes, I worked there. Everyone worked there. That's the problem.",
        ignored: "Tabled. Indefinitely. Like my career.", martyred: "Remove me, then. The next regulator will be worse for you.", pyrrhic: "You won the hearing. The fines are still accruing.",
        deal: "A consent decree. Everyone consents. Nobody decrees.", walked: "Fined. Next." } },
    harrow: { why: "BEA HARROW SHORTED HALF THE FLATS. SHE'D LIKE TO DISCUSS YOUR HALF.",
      open: "Darling, the market's big enough for one of us.",
      hit: ["How common.", "Oh, you'll pay for that. Literally.", "That's... a decent move."], block: ["I hedged.", "Cute. Is that from a seminar?"],
      react: { money: "Money? To me? Sweet.", public: "The tabloids love me. Try harder.", law: "My lawyers bill by the minute. Yours bill by the hour." },
      end: { bought: "Splendid. We'll merge our interests. Not our names.", broken: "I'll be back with a bigger fund. And a smaller conscience.", exposed: "Fine, I shorted my own clients. So did everyone at the club.",
        ignored: "Nobody at the club looks up when I walk in now.", martyred: "Make me the villain. Villains get book deals.", pyrrhic: "Congratulations. Check your credit rating.",
        deal: "We'll split the Flats down the middle. Like adults.", walked: "I'll buy the debt on whatever's left." } },
    gray: { why: "THE SQUARE IS FULL. COMMISSIONER GRAY CAN CLEAR IT BY MORNING. OVERTIME IS EXTRA.",
      open: "Square's full. I can clear it, or not. Your call. Your money.",
      hit: ["Easy. I've got a pension.", "That's assault on a public servant.", "Hm. Let's renegotiate."], block: ["The badge stops that.", "Riot gear, pal."],
      react: { money: "Overtime's overtime.", public: "Who's filming? Get that phone.", law: "The DA plays golf with me." },
      end: { bought: "Square'll be clear by morning. Off the record.", broken: "Early retirement. My lawyer says smile.", exposed: "The overtime sheets were leaked. Somebody's getting transferred. Me.",
        ignored: "Mayor stopped taking my calls. The square didn't.", martyred: "Arrest a commissioner on camera. That'll calm the square.", pyrrhic: "Square's clear. So's your reputation.",
        deal: "Half the overtime, half the square. Fair's fair.", walked: "Overtime's overtime. Pay it." } },
    gil: { why: "SYCAMORE COURT DISCOVERS IT WAS RENTING. GIL MARSH, HOA TREASURER, HAS FOUND SOMEONE TO BLAME.",
      open: "Quick one. Section 4(b). Also your company sank my 401(k). Mostly 4(b).",
      hit: ["That's not neighbourly.", "I'll bring it up at the meeting.", "Okay. Okay. Deep breath, Gil."], block: ["The covenant's very clear.", "We have bylaws for that."],
      react: { money: "A gift card? For the HOA? ...How much?", public: "Not in front of the neighbours. Please.", law: "Our attorney is my brother-in-law. He's very thorough." },
      end: { bought: "Very generous. I'll put it in the newsletter. Anonymously. Mostly.", broken: "We're putting the house on the market. Don't tell the group chat.", exposed: "Fine. I borrowed from the reserve fund. Everybody's lawn looked great.",
        ignored: "They held the HOA meeting without me. At my house.", martyred: "Foreclose on the treasurer, then. Forty-one households saw you do it.", pyrrhic: "You win. Your name's on the lawn signs now.",
        deal: "Fine. You keep quiet, we keep the pool open.", walked: "Violation filed. Have a great weekend!" } },
    pip: { why: "CALDER MUTUAL BOARD SPLIT 6-6 ON THE BAILOUT. PIP WHITLOW, 34, HOLDS THE PEN, THE MINUTES AND THE SWING VOTE.",
      open: "I'm not supposed to be talking to you. I'm taking minutes of this, by the way.",
      hit: ["Ah. Ow. Noted.", "That's going in the minutes.", "Mum said this job would be boring."], block: ["Point of order! I think.", "The chair recognises me. Barely."],
      react: { money: "Is this a, er, bonus? Hypothetically?", public: "Please don't put me on the blogs. Mum reads the blogs.", law: "I'll need to consult counsel. And a sandwich." },
      end: { bought: "I'll send you the minutes. All of them. The edited ones.", broken: "I'm resigning. Effective now. Or after lunch.", exposed: "I'll send you the minutes. All of them. The real ones.",
        ignored: "They moved the meeting. Nobody told me which room.", martyred: "Sack the minute-taker, then. The minutes are already out.", pyrrhic: "You got the vote. The bank's still on fire.",
        deal: "Abstain. I'll abstain. That's allowed, isn't it?", walked: "Six to seven. The minutes will reflect that." } },
    dana: { why: "FORECLOSURES UP 81% IN THE FLATS. DANA REYES, NIGHT-SHIFT NURSE, BROUGHT THE PAPERWORK AND TWO HUNDRED NEIGHBOURS.",
      open: "I'm fine. I'm fine. I'm here because I did the sums and your bank didn't.",
      hit: ["I work nights. I've seen worse.", "Don't. Don't do that.", "...Okay. Keep going, I'm still here."], block: ["We've got each other's backs.", "Every office says I'm the problem. Not today."],
      react: { money: "You think I can't be bought? Try me. No, don't.", public: "Put my name in the paper. Spell it right. R-E-Y-E-S.", law: "Another letter. I've got a shoebox full." },
      end: { bought: "I'll take it. For the kids. Not for you. Never for you.", broken: "Keys are on the counter. Kids are at my sister's.", exposed: "Yes, I missed four payments. I also worked four doubles. Print both.",
        ignored: "Nobody came out today. Rain, they said.", martyred: "Evict a nurse on the six o'clock news. Go on.", pyrrhic: "You won. The whole street knows exactly how.",
        deal: "Modify the loan and we go home. Today.", walked: "We're staying. All of us." } },
    /* ===== Now · The Top ===== */
    crowe: { why: "crowe terminals owns the port, the app and the tide tables. victor crowe would like your company as well. 9:41am.",
      open: "I don't build. I acquire. Today I'm acquiring you.",
      hit: ["A rounding error.", "Hm. My board will notice that.", "Interesting. Annoying."], block: ["I own the platform you said that on.", "Priced in."],
      react: { money: "You're offering me money. Adorable.", public: "Trending? I own the trend.", law: "My lawyers have lawyers. Their lawyers are bots." },
      end: { bought: "A partnership. I'll own you more slowly.", broken: "My brother always said you were the clever one.", exposed: "Fine. Thirty percent was always theft. Everyone knew.",
        ignored: "Nobody quote-tweets me anymore. Odd feeling.", martyred: "Break me up, then. The market loves a martyr with a moat.", pyrrhic: "You won. Check what the platform charged you.",
        deal: "Joint venture. You do the work. I do the venture.", walked: "Welcome to the platform. Thirty percent." } },
    rosa: { why: "rosa lind is in your lobby with 300 people, a megaphone and a livestream. 41k watching.",
      open: "We're not leaving. We brought snacks. And Gran's casserole dish.",
      hit: ["That's the best you've got?", "Shame! SHAME!", "Livestreaming this, by the way."], block: ["The people hold the line.", "We're used to your lot."],
      react: { money: "Hear that, everyone? He's offering money. Louder!", public: "Ratio me. Go on. We have more phones.", law: "Trespass? It's a public lobby. Read the deed." },
      end: { bought: "A community fund? We'll audit it. Daily. Publicly.", broken: "Okay. Everyone home. Take a casserole for the road.", exposed: "Yes, my brother works for your supplier. Everyone's brother does.",
        ignored: "Stream's down to nine viewers. Gran's one of them.", martyred: "Drag us out, then. Smile, you're on 41,000 phones.", pyrrhic: "You cleared the lobby. Try clearing the city.",
        deal: "A seat on the board. Two, actually. One's for Gran.", walked: "Whose lobby? OUR lobby!" } },
    sorel: { why: "lena sorel has published 90 pages on you. she'd like a word in garage b3. no phones.",
      open: "I'm short your stock. I'd like you to hear why, from me.",
      hit: ["Short-term noise.", "Fine. I'll add a page.", "That's going in the appendix."], block: ["Footnoted.", "My lawyers love that."],
      react: { money: "Buying me out? That's in chapter six.", public: "Spin it. I'll chart the spin.", law: "Sue a short-seller. Please. Discovery's my favourite part." },
      end: { bought: "Covered my position. Nice doing business, hypocrite.", broken: "Fund's closed. I'll be teaching. God help them.", exposed: "Yes, I profit when you fall. At least I tell people.",
        ignored: "Nobody read the report. Ninety pages.", martyred: "Silence the only honest liar in the market. Good look.", pyrrhic: "You won. Your share price didn't.",
        deal: "I close the short. You restate the books. Everybody lies less.", walked: "Report drops at nine. Have coffee ready." } },
    ashby: { why: "gail ashby is live on the morning show with your numbers. they don't add up. 1.2m watching.",
      open: "Your numbers don't add up. They multiply.",
      hit: ["That's not guidance.", "Mm. I'll revise.", "Interesting colour."], block: ["The consensus disagrees.", "Model says no."],
      react: { money: "Is this a research fee? I'll need to disclose that.", public: "Narrative's not a number.", law: "Sue an analyst? Bold. Stupid, but bold." },
      end: { bought: "Upgraded to 'hold'. Don't make me regret it.", broken: "They pulled my coverage. Of everything.", exposed: "Fine, my fund is short your stock. Disclosed. In font size four.",
        ignored: "Nobody asked a question on the call. Not one.", martyred: "Get me fired. The tape keeps rolling.", pyrrhic: "Beat the number. Missed the point.",
        deal: "Neutral. With an asterisk.", walked: "Downgrade. Effective now." } },
    brennan: { why: "senate committee hearing, room 214. senator brennan has the cameras, the gavel and your old fixer on the witness list.",
      open: "The committee will come to order. You will not.",
      hit: ["Order! ORDER!", "The witness is out of line!", "I yield. Briefly."], block: ["Asked and answered.", "I've seen better liars."],
      react: { money: "Is the witness offering a campaign contribution? On camera?", public: "This isn't a talk show. Though the ratings are excellent.", law: "Executive privilege? You're not the executive. You're a witness." },
      end: { bought: "The committee thanks the witness for the... candour.", broken: "Adjourned. Indefinitely. My own staff is leaking.", exposed: "Yes, your firm funded my last race. And my next one. Next question.",
        ignored: "Hearing moved to 6am. No cameras.", martyred: "Censure a senator? The base will love it.", pyrrhic: "You walk free. The clip is forever.",
        deal: "A closed session. No cameras. Nobody wins.", walked: "Referred for prosecution. Smile for the cameras." } },
    mina: { why: "every rider in the flats went offline at 7pm. mina kaur is in the dark-kitchen alley. 4.8 stars. 0 patience.",
      open: "Five stars, every night. Tonight I'm rating you.",
      hit: ["I ride in heat domes. Try harder.", "Ugh. Fine. That one landed.", "You'd deactivate me for that face."], block: ["Two hundred riders, one group chat.", "We're offline. Can't hear you."],
      react: { money: "A bonus? For tonight? Then they cut the base pay again.", public: "Go viral. Our clip's already got more views.", law: "Contractor, employee, whatever. I'm still standing here." },
      end: { bought: "I'll log back on. Don't call it a raise. It's a bribe with a tip jar.", broken: "Back online. 4.2 stars now. Thanks.", exposed: "Yes, my family's restaurant closed. Your app's fees closed it.",
        ignored: "Nobody saw the strike. Algorithm buried it.", martyred: "Deactivate me. Every rider will know why.", pyrrhic: "Dinner's delivered. Cold. Like your brand.",
        deal: "Fee cap and a toilet at the hub. Then we ride.", walked: "Still offline. Enjoy cooking." } },
    honoria: { why: "lunch at the calder estate, outer keys. helicopter at 12:30. the dame does not do small talk. or talk.",
      open: "Sit. Not there. That was my grandfather's chair.",
      hit: ["How tiresome.", "Mm.", "One does hear things."], block: ["We were here first.", "Grandfather sat here."],
      react: { money: "Money. How touchingly new.", public: "Shame is for people with something to lose.", law: "Our lawyers wrote the law. In 1902." },
      end: { bought: "Priced in. Do see yourself out. The helicopter won't wait.", broken: "Mm. The Trust will survive. It always does. I may not.", exposed: "Yes, we own the sea wall bonds. Someone has to.",
        ignored: "Wake me when the share price recovers.", martyred: "Evict a Calder from Calder land. Do. The papers will adore it.", pyrrhic: "Victory. How exhausting for you.",
        deal: "How quaint. Is there... a seat?", walked: "Mm. Next." } },
    theo: { why: "sea wall board vote at 6pm. theo lind, volunteer, ma odell's great-grandson, brought a flood map and a new word.",
      open: "Hi. Sorry. You probably know my mum. I'm here about the wall.",
      hit: ["Oh. Okay. That's fair, maybe.", "Gran said you'd do that.", "...Ow."], block: ["The map doesn't lie.", "Sandbags. We've got sandbags."],
      react: { money: "Is that money? I can't take money. Can I? No.", public: "Mum's livestreaming. Sorry. She does that.", law: "There's a whole board. I'm just one vote. One no." },
      end: { bought: "Okay. Just don't tell Gran. Or Mum. Or anyone.", broken: "I'll go home. I'm good at going home.", exposed: "Yeah. I was scared. I'm still voting no.",
        ignored: "They held the vote while I was filling sandbags.", martyred: "Go on, then. Everyone on the wall can see.", pyrrhic: "You won. The tide doesn't care who won.",
        deal: "Raise the wall at Pier 9 and I'll abstain. That's my offer.", walked: "No." } },
    /* ===== Bosses ===== */
    ashby_b: { why: "The earnings call came in at 9:00 sharp. Gail Ashby had the analysts on the line and the numbers on her desk.",
      open: "Welcome to the earnings call. The analysts are on the line. All of them.",
      hit: ["That's not guidance.", "Mm. I'll revise.", "Interesting colour."], block: ["The consensus disagrees.", "Model says no."],
      react: { money: "A research fee? I'll disclose it. Eventually.", public: "The tape doesn't care about headlines.", law: "Lawyers on an earnings call. That's a first." },
      end: { bought: "Upgraded to 'buy'. Lunch is on you.", broken: "Fine. Beat the number. This time.", exposed: "My fund owns your competitor. You found that. Well done.",
        ignored: "Nobody asked a single question. Remarkable.", martyred: "Silence the analyst? The tape will speak for me.", pyrrhic: "You beat the number. Look at the guidance.",
        deal: "Hold. Neutral. Nobody's happy.", walked: "Downgrade. The tape doesn't lie." } },
    sorel_b: { why: "Ninety pages on you hit the wires at dawn. Lena Sorel waited in a parking garage with the index.",
      open: "Ninety pages on you. I wrote the index myself.",
      hit: ["Short-term noise.", "Fine. I'll add a page.", "That's going in the appendix."], block: ["Footnoted.", "My lawyers love that."],
      react: { money: "Buying my silence? Page 61.", public: "Spin noted. Charted. Appendix D.", law: "Sue me. Discovery's on me." },
      end: { bought: "Covered. You're expensive to hate.", broken: "I'll find you again. You leave footprints.", exposed: "So I'm short. At least I'm honest about it.",
        ignored: "Nobody read it. Ninety pages. Bound.", martyred: "Silence me. The report's already printed.", pyrrhic: "You won. The share price didn't get the memo.",
        deal: "Retract chapter four. Restate chapter six.", walked: "Report's out. Enjoy the open." } },
    varga_b: { why: "THE WHOLE CITY WALKED OUT AT DAWN. TOMAS VARGA HOLDS THE HALL, THE BUSES AND THE BAKERS.",
      open: "Thirty years I've watched you lot. Today the city stops.",
      hit: ["We've had worse winters.", "That's a scab move.", "Hm. You've learned."], block: ["Solidarity forever.", "The hall holds."],
      react: { money: "Strike pay beats your bribe. Barely.", public: "The whole city's watching. Good.", law: "Injunction? Serve it. We'll frame it in the hall." },
      end: { bought: "Contract signed. Don't think we're friends.", broken: "You broke a strike. You didn't break us.", exposed: "Fine, I took the mayor's call. Everyone takes the mayor's call.",
        ignored: "The buses went back. Nobody told me.", martyred: "Arrest the union boss. The hall will name a room after me.", pyrrhic: "Strike's over. So's your city.",
        deal: "A contract. Not forgiveness.", walked: "The city's ours today." } },
    june_b: { why: "JUNE PARK, 64, LEADS THE GENERAL STRIKE. SHE KEPT THE MINUTES FROM 1978.",
      open: "Remember me? Thirty years. Now the whole city walks out.",
      hit: ["You did that in '78 too.", "We're older. Not softer.", "...Still hits."], block: ["The line holds. It always held.", "Solidarity, pal."],
      react: { money: "Thirty years and you still bring an envelope.", public: "Print it. I'm too old to care.", law: "Injunction. Again. You never learned a new song." },
      end: { bought: "The city gets the contract. You don't get forgiven.", broken: "Twice. You've broken me twice. Never again.", exposed: "Yes, I kept the minutes. All of them. Every name.",
        ignored: "The young ones don't know my name. That's fine.", martyred: "Go on. Thirty years, and they'll still sing it.", pyrrhic: "You won again. Look what's left.",
        deal: "A contract for the young ones. Not for me.", walked: "Told you we'd be back." } },
    crowe_b: { why: "VICTOR CROWE FILED A HOSTILE BID AT 6:02AM. YOUR BOARD HAS HIS NUMBER.",
      open: "Your board has my number. Shall we call them together?",
      hit: ["A rounding error.", "Hm. My board will notice that.", "Interesting. Annoying."], block: ["Priced in.", "I bought that argument last year."],
      react: { money: "Greenmail. Finally, a language.", public: "Bad press is a buying opportunity.", law: "Poison pill? I'm immune." },
      end: { bought: "Greenmail accepted. Pleasure.", broken: "I'll be back when you're cheaper.", exposed: "Yes, I borrowed the bid money. From your bank.",
        ignored: "My bid expired. Nobody noticed.", martyred: "Block me, then. Raiders become legends.", pyrrhic: "You kept the company. Check the debt.",
        deal: "A board seat. Just one. For now.", walked: "Your bunker's mine. Room by room." } },
    ticker_b: { why: "BREAKING: THE FLOOR GIVES WAY. THE TICKER DOES NOT TAKE QUESTIONS.",
      open: "▼ ▼ ▼  BID: NONE  ASK: EVERYTHING",
      hit: ["▲ +0.3%", "HALTED.", "...RECALCULATING"], block: ["▼ PRICED IN", "▼ NO BID"],
      react: { money: "▲ LIQUIDITY ADDED", public: "▼ SENTIMENT: IRRELEVANT", law: "▼ CIRCUIT BREAKER" },
      end: { bought: "▲ BAILED OUT. CONGRATULATIONS.", broken: "▲ RECOVERY (FOR SOME)", exposed: "▲ RESTATED. ▼ TRUST", ignored: "— FLAT —", martyred: "▼ CONTAGION", pyrrhic: "▲ GREEN. ▼ EVERYTHING ELSE",
        deal: "▲ STABILITY FUND", walked: "▼ MARGIN CALLED" } }
  };
  /* Converted (you took their people: they work for you now) and Reconciled (a favour returned: a seat at the table, maybe). */
  var CR = {
    dunn: ["Precinct's got a new friend. Don't make me say it twice, and don't make me say it in court.", "You sent flowers when my old man passed. Okay. The precinct can forget a few things."],
    moretti: ["My super works for you now. So do my lawyers. I'll keep the name on the door.", "You came to my mother's wake. Fourteen buildings don't make a man forget that."],
    june: ["Half my shop floor already signed your card. I'll go where my people go.", "You paid for my father's headstone. Nobody asked you to. Sit down. Have a coffee."],
    mickey: ["The boys like your money better. Fine. Mickey goes where the boys go.", "You kept my nephew out of it. That's a debt. I pay my debts."],
    odell: ["The block voted. They're with you. God help them. I'll keep an eye on you from inside.", "You fixed Mrs. Pruitt's stairs yourself. Come Sunday. Bring nothing. I mean it."],
    delacroix: ["My whole ward office is on your payroll. I suppose that makes me staff.", "You remembered my daughter's name. In this town, that's a coalition."],
    okafor: ["My editor took your job offer. So did my sources. I suppose I'm next.", "You kept the Harbor branch open. Mom would want me to say thank you. So, thank you."],
    hale: ["Three of my board members now consult for you. I'll be the fourth. Quietly.", "You returned the files I needed. Unredacted. I'll note it in the record."],
    harrow: ["My partners defected. Splendid. I'll defect with them and call it strategy.", "You held the door for me at the gala, once, when no one else did. Very well. Lunch."],
    gray: ["The union reps are yours. The squad cars follow the union. So do I.", "You paid for Officer Diaz's funeral. The square can wait a day."],
    crowe: ["My board voted with you. I always said loyalty was a pricing problem.", "You called Mother on her birthday. I didn't. Fine. One dinner. Not a truce."],
    rosa: ["Half my volunteers took your jobs. I can't blame them. I'll take one too, and watch.", "Gran says you kept her heating on in '09. Fine. You can sit at our table. Once."],
    sorel: ["My analysts went long on you. Traitors. Fine. I'm long on you too.", "You covered my margin in the crash and never said a word. I don't forget a hedge."],
    ashby: ["My whole desk moved to your bank. I'll move my coverage with them.", "You took my call when the desk was laughing at me. Upgraded. Personally."],
    brennan: ["My staffers took your offers. My donors too. The committee recognises… the reality.", "You came to the VFW fish fry. Nobody from your world ever comes. The chair yields."],
    ashby_b: ["My juniors are on your deal team now. Consider me covered.", "You sent my mother a card. She framed it. Rating: buy, and dinner."],
    sorel_b: ["My research staff went to work for you. Chapter four is your chapter now.", "You returned my call when nobody would. I'm closing the short. Call it even."],
    varga_b: ["The local voted. They're with you. I go where the local goes.", "You stood on the line with us in the snow, once. One meeting. No cameras."],
    june_b: ["The young ones signed your cards. I won't leave them alone with you.", "You kept the steelworks widows' pensions whole. My mother's too. I remember. Sit down."],
    crowe_b: ["My board defected. Fine. I'll chair your committee.", "You visited Mother in the hospital. I didn't. One dinner."],
    ticker_b: ["▲ ACQUIRED: ALL OF IT", "▲ RECOVERY · ▲ CONFIDENCE · ▲ FAMILY OFFICE"],
    benny: ["Half the street works your dock now. Fine. I'll stock your canteen.", "You paid the tab when my daughter was sick. Sit. Coffee's on the house. Really this time."],
    grace: ["My volunteers took your jobs. The night classes will meet in your lobby, then.", "You returned every overdue book from your office. With a donation. Fine. You may have a card."],
    pops: ["The picket's breaking for your shift money. I'm too old to stand out here alone.", "You brought soup to the line in week four. Didn't say a word. That's a man I'll talk to."],
    gil: ["The board switched sides. I'll draft the newsletter. For you.", "You fixed the cul-de-sac light yourself. On a Saturday. Barbecue's at six."],
    pip: ["The other eleven voted with you. I'll be twelve. I'll take the minutes.", "You remembered my mum's name at the AGM. I'll vote yes. On the record."],
    dana: ["The other nurses took your clinic jobs. I need the hours. Don't smile.", "You modified the loan before I asked. The kids want to meet you. I don't. But okay."],
    mina: ["Half the riders logged into your app. I'm logging in too. Not a vibe.", "You tipped the whole kitchen and didn't post it. Okay. One coffee. You're paying."],
    honoria: ["The trustees voted. The family office is yours. How vulgar. Do carry on.", "You remembered Grandfather's tide tables. Sit. The good chair. Just this once."],
    theo: ["The volunteers took your jobs on the wall. Fine. I'll supervise the wall.", "Gran says you kept her heat on. Dinner's Sunday. Bring nothing. She means it."]
  };
  Object.keys(CR).forEach(function (id) { if (LINES[id]) { LINES[id].end.converted = CR[id][0]; LINES[id].end.reconciled = CR[id][1]; } });
  LD.OPP_LINES = LINES;
  var FAM = { obligation: "money", patronage: "money", kinship: "money", shame: "public", rumour: "public", info: "public", solidarity: "public", status: "public", legal: "law", precarity: "law" };
  LD.PRESSURE_FAMILY = FAM;
  /* Merge onto the cast: lines replace the old ones; end keeps paid/crushed/walked for anything that still keys on them. */
  Object.keys(LINES).forEach(function (id) {
    var o = LD.OPPONENTS[id], L = LINES[id]; if (!o) return;
    o.why = L.why; o.open = L.open; o.hit = L.hit; o.block = L.block; o.react = L.react;
    o.end = { paid: L.end.bought, crushed: L.end.broken, walked: L.end.walked };
    LD.OUTCOMES.forEach(function (k) { if (L.end[k]) o.end[k] = L.end[k]; });
    if (!o.end.converted) o.end.converted = L.end.bought;
    if (!o.end.reconciled) o.end.reconciled = L.end.deal;
  });

  /* ---------- Outcomes: labels and how a face reads each one ---------- */
  LD.OUT_LABEL = { bought: "BOUGHT", converted: "CONVERTED", broken: "BROKEN", exposed: "EXPOSED", ignored: "IGNORED", martyred: "MARTYRED", pyrrhic: "PYRRHIC", deal: "SETTLED", walked: "THEY WALKED", reconciled: "RECONCILED" };
  LD.OUT_NOTE = {
    bought: "You won it with money and favours. They'll do as they're told, and never forgive it.",
    converted: "You took their people. They'll work for you now, quietly.",
    broken: "Paperwork and pressure, no crowd. Small, private, tired.",
    exposed: "The room was with you when it came out. Public, cornered.",
    ignored: "You simply stopped seeing them. So did everyone else.",
    martyred: "You won the fight. The room took their side.",
    pyrrhic: "You won, and it cost you nearly as much as it cost them.",
    deal: "Paid off at the door. Wary respect.",
    walked: "They got what they came for.",
    reconciled: "A favour returned. A seat at the table, maybe."
  };
  /* A mid-fight reaction to a card of this pressure type, or null. */
  LD.oppReact = function (fg, pres) {
    var o = fg && LD.OPPONENTS[fg.opp], fam = FAM[pres]; if (!o || !o.react || !fam) return null;
    return o.react[fam] || null;
  };
  var baseLine = LD.oppLine;
  LD.oppLine = function (fg, kind, n) {
    var o = fg && LD.OPPONENTS[fg.opp]; if (!o) return "";
    if (kind === "end" && fg.done && fg.done.out && o.end && o.end[fg.done.out]) return o.end[fg.done.out];
    if (kind === "why") return o.why || "";
    return baseLine ? baseLine(fg, kind, n) : "";
  };
  /* ---------- New callbacks: a familiar face, carried across eras ---------- */
  var baseCb = LD.callbackFor;
  LD.callbackFor = function (state, oppId) {
    var F = function (id) { return LD.oppFate ? LD.oppFate(state, id) : null; };
    var g = F("grace"), p = F("pops"), b = F("benny");
    if (oppId === "okafor" && g && !(F("mickey") && F("mickey").how === "paid")) return g.how === "paid" ? { id: "grace-son", who: "Grace Okafor", art: "opp-grace-paid", line: "Mom said you paid for the library roof in '78. She also kept the receipt.",
      effect: "Dev knows his mother took your money: he softens. Scrutiny −15%.", mod: { scrutMult: 0.85 } } :
      { id: "grace-son", who: "Grace Okafor", art: "opp-grace-defeated", line: "You closed my mother's branch in '78. I learned to read on its steps.", effect: "Dev Okafor is Grace's son: every question +2.", mod: { add: 2 } };
    if (oppId === "june_b" && p && p.how === "paid") return { id: "pops-crossed", who: "Ray 'Pops' Delgado", art: "opp-pops-paid", line: "Pops took your envelope in week six. June found out in 2003.",
      effect: "June has nothing left to lose: every move +2.", mod: { add: 2 } };
    if (oppId === "mina" && b) return b.how === "crushed" ? { id: "benny-corner", who: "Benny Ostrowski", art: "opp-benny-defeated", line: "Benny Ostrowski had the corner by my family's restaurant. You took it. Now I deliver to it.",
      effect: "Mina remembers the corner: every move +2.", mod: { add: 2 } } :
      { id: "benny-corner", who: "Benny Ostrowski", art: "opp-benny-paid", line: "Benny says you kept his corner open. I'm still not logging back on.", effect: "Benny vouched for you: Scrutiny −15%.", mod: { scrutMult: 0.85 } };
    return baseCb ? baseCb(state, oppId) : null;
  };
  if (LD.CALLBACKS) ["grace-son", "pops-crossed", "benny-corner"].forEach(function (k) { if (LD.CALLBACKS.indexOf(k) === -1) LD.CALLBACKS.push(k); });
})();
