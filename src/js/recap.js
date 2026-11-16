/* Last Dividend — end-of-run recap: data, era-aware per-executive templates, and the beat player. Browser + Node (render only). */
(function (root) {
  var LD = root.LD || (root.LD = {});
  function esc(s) { return LD.escapeHtml ? LD.escapeHtml(s == null ? "" : String(s)) : String(s == null ? "" : s); }
  function tok(n) { return LD.tok ? LD.tok(n) : ""; }
  var ERA = { 1: { yr: "1978", name: "The Street", up: "1978" }, 2: { yr: "2008", name: "The Middle", up: "2008" }, 3: { yr: "Today", name: "The Top", up: "TODAY" } };
  var BEATS = ["headline", "climb", "door", "bunker", "ledger", "level", "next"];
  LD.RECAP_BEATS = BEATS;

  /* ---------- Data: everything the recap shows, with graceful fallbacks for old saves ---------- */
  function recapData(state, info, meta) {
    info = info || {};
    meta = meta || {};
    var e = state.ending || { kind: "lose", reason: "unrest", title: "The run is over", body: "" };
    var exec = (LD.execById && LD.execById(state.executiveId)) || { id: state.executiveId, name: state.executiveId, firm: "" };
    var era = LD.eraOf ? LD.eraOf(state) : (state.turn <= 4 ? 1 : state.turn <= 8 ? 2 : 3);
    var win = e.kind === "win";
    var cause = e.reason === "unrest" ? "unrest" : /fiscal year|year-end/i.test(e.title || "") ? "yearend" : state.collapse >= (LD.MAX_COLLAPSE || 100) ? "collapse" : "sealed";
    var tr = state.track || {};
    var eraQ = { 1: 1, 2: 5, 3: 9 };
    if (tr.eraQ) Object.keys(tr.eraQ).forEach(function (k) { if (tr.eraQ[k] != null) eraQ[k] = tr.eraQ[k]; });
    var stops = [1, 2, 3].map(function (n) {
      return { n: n, yr: ERA[n].yr, name: ERA[n].name, q: eraQ[n], status: n < era ? "done" : n === era ? (win ? "done" : "fell") : "dark" };
    });
    stops.push({ n: 4, yr: "Bunker", name: exec.compound || "The Bunker", q: win ? state.turn : null, status: win ? "done" : "dark" });
    var fates = (state.fy && state.fy.fates) || {};
    var fights = Object.keys(fates).map(function (id) {
      var f = fates[id] || {}, o = (LD.OPPONENTS && LD.OPPONENTS[id]) || {};
      var how = f.how || "walked";
      var pose = how === "paid" ? (o.paid ? "paid" : "idle") : how === "crushed" ? "defeated" : "idle";
      return { id: id, who: o.who || f.who || id, short: id.charAt(0).toUpperCase() + id.slice(1), role: o.role || "",
        how: how, q: f.q || 0, art: o.art ? "assets/fight/opp-" + o.art + "-" + pose + ".webp" : "", quote: (o.end || {})[how] || "" };
    }).sort(function (a, b) { return a.q - b.q; });
    var moreFights = 0;
    if (fights.length > 4) { moreFights = fights.length - 4; fights = fights.slice(-4); }
    var rooms = (LD.SYSTEMS || []).map(function (s) {
      var b = (state.bunker && state.bunker[s.id]) || { level: 0 };
      return { id: s.id, name: s.name, short: s.short, level: b.level | 0, quality: b.quality || "", ready: (b.level | 0) >= (LD.WIN_LEVEL || 2) };
    });
    var ready = rooms.filter(function (r) { return r.ready; }).length;
    var pay = info.payout || (LD.computeDividends ? LD.computeDividends(state) : { lines: [], total: 0 });
    var lines = (pay.lines || []).filter(function (l) { return l.amount; }).map(function (l) { return { label: l.label, amount: l.amount }; });
    if (pay.firstClear) lines.push({ label: "First clear", amount: pay.firstClear.div });
    if (lines.length > 8) { var rest = lines.slice(7).reduce(function (a, l) { return a + l.amount; }, 0); lines = lines.slice(0, 7).concat([{ label: "Other lines", amount: rest }]); }
    var deals = tr.deals || [], big = null;
    deals.forEach(function (dl) { if (!big || Math.abs(dl.cash || 0) > Math.abs(big.cash || 0)) big = dl; });
    var peak = null; (tr.q || []).forEach(function (x) { if (!peak || x.unrest > peak.unrest) peak = x; });
    return {
      exec: exec, execId: exec.id, era: era, kind: win ? "win" : "lose", win: win, reason: e.reason || (win ? "evacuated" : "unrest"), cause: cause,
      title: e.title || "", body: e.body || "", turn: state.turn | 0, seed: state.seedLabel != null ? String(state.seedLabel) : String(state.seed || ""),
      rating: LD.ratingName ? LD.ratingName(state.rating | 0) : "AAA", cash: state.cash | 0, unrest: state.unrest | 0, collapse: state.collapse | 0,
      stops: stops, fights: fights, moreFights: moreFights, rooms: rooms, ready: ready, roomsTotal: rooms.length || 4,
      ledger: lines, total: pay.total | 0, balance: meta.dividends != null ? meta.dividends | 0 : null,
      xp: info.xp || null, unlocks: info.unlocks || [], newRating: info.newRating != null ? info.newRating : null,
      bigDeal: big, peak: peak, deals: deals.length, partial: !state.track
    };
  }
  LD.recapData = recapData;

  /* ---------- Copy: Reid Holtz, Northline Energy, in three eras ---------- */
  function cap(s) { return String(s).toUpperCase(); }
  var REID_COPY = {
    1: {
      kicker: function (d) { return "NORTHLINE WIRE · Q" + d.turn + " · 1978"; },
      head: {
        unrest: "GRID DOWN STOP STREET IN LOBBY STOP",
        unfinished: "COUNTDOWN OUT STOP ROOMS UNWIRED STOP",
        "failed-systems": "BARGAIN BREAKERS TRIPPED STOP DOORS SHUT ON DARK STOP",
        evacuated: "BUNKER ENERGIZED STOP CITY DARK STOP"
      },
      epitaph: {
        unrest: "HE PRICED THE BLACKOUT STOP IT ARRIVED ON TIME STOP",
        unfinished: "ALL THAT CABLE STOP NOWHERE TO PLUG IN STOP",
        "failed-systems": "CHEAPEST QUOTE WON STOP SO DID THE DARK STOP",
        evacuated: "THE LIGHTS STAYED ON STOP ONLY HIS STOP"
      },
      cause: { unrest: "UNREST AT ONE HUNDRED STOP", collapse: "COLLAPSE AT ONE HUNDRED STOP", yearend: "FISCAL YEAR CLOSED STOP", sealed: "DOORS SEALED BY HAND STOP" },
      climb: "LINE ROUTE", door: "CALLERS AT THE DOOR", bunker: "LOAD ON THE BUNKER", ledger: "DIVIDENDS BILLED", level: "PROMOTION WIRE",
      fight: { paid: "{N} PAID OFF STOP", crushed: "{N} CRUSHED STOP", walked: "{N} WALKED STOP" },
      none: "NO CALLERS STOP DOOR STAYED SHUT STOP",
      live: "LIVE", down: "DOWN"
    },
    2: {
      kicker: function (d) { return "FAX · NORTHLINE ENERGY · Q" + d.turn + " 2008 · PG 1/1"; },
      head: {
        unrest: "URGENT: LOAD SHED FAILED. THE STREET IS IN THE LOBBY.",
        unfinished: "PAGE 2 OF 4 MISSING: BUNKER NOT COMMISSIONED.",
        "failed-systems": "TRIP REPORT: BARGAIN BREAKERS FAILED UNDER LOAD.",
        evacuated: "CONFIRMED: PRIVATE FEED LIVE. PUBLIC FEED SHED."
      },
      epitaph: {
        unrest: "Faxed to the board at 4:12 a.m. The board had already left.",
        unfinished: "The quote was approved. The work stayed \u201cin the pipeline\u201d.",
        "failed-systems": "Lowest bidder, highest price. Please initial and return.",
        evacuated: "Cover sheet reads: for internal distribution only."
      },
      cause: { unrest: "Unrest index: 100. Crowd on site.", collapse: "Collapse index: 100. Market closed.", yearend: "Year-end close. All sheets final.", sealed: "Manual seal logged by R. Holtz." },
      climb: "GRID ROUTE · CIRCUIT LOG", door: "INCIDENT LOG", bunker: "BUNKER LOAD TEST", ledger: "STATEMENT OF ACCOUNT", level: "PERFORMANCE REVIEW",
      fight: { paid: "Q{Q} \u2014 {W}: settled, paid", crushed: "Q{Q} \u2014 {W}: crushed in session", walked: "Q{Q} \u2014 {W}: walked out" },
      none: "No incidents logged. Suspicious.",
      live: "IN SVC", down: "TRIPPED"
    },
    3: {
      kicker: function (d) { return "Northline Grid Ops \u00b7 now"; },
      head: {
        unrest: "Outage alert: the street is in the lobby",
        unfinished: "Bunker commissioning failed \u00b7 {R} of 4 systems online",
        "failed-systems": "Critical: cheap breakers tripped under load",
        evacuated: "Private grid online \u00b7 city load shed 100%"
      },
      epitaph: {
        unrest: "Notification muted. The crowd was not.",
        unfinished: "Your bunker is {P}% ready. Tap to retry.",
        "failed-systems": "He A/B-tested the apocalypse. B lost.",
        evacuated: "Reminder: the lights are on. Just his."
      },
      cause: { unrest: "Unrest 100% \u00b7 crowd on site", collapse: "Collapse 100% \u00b7 system-wide", yearend: "Fiscal year closed \u00b7 auto-archived", sealed: "You sealed the doors manually" },
      climb: "Grid status \u00b7 route", door: "Activity", bunker: "Bunker load", ledger: "Payout processed", level: "Profile",
      fight: { paid: "{W} \u00b7 payment received", crushed: "{W} \u00b7 blocked", walked: "{W} \u00b7 left the chat" },
      none: "No activity. The door stayed closed.",
      live: "ONLINE", down: "OUTAGE"
    }
  };
  var DEF_COPY = {
    mast: { 1: "The Daily Dividend", 2: "The Dividend Ledger", 3: "Dividend Daily \u00b7 Digital" },
    epitaph: {
      unrest: "The board is still in session. You do not reach the car.",
      unfinished: "An unfinished hole in the ground, very well financed.",
      "failed-systems": "The cheapest work failed first. It always does.",
      evacuated: "The doors closed on time. The last dividend is silence."
    },
    fight: { paid: "Paid off", crushed: "Crushed", walked: "They walked" }
  };
  function fill(s, d, f) {
    return String(s || "").replace(/\{R\}/g, d.ready).replace(/\{P\}/g, Math.round(100 * d.ready / (d.roomsTotal || 4)))
      .replace(/\{N\}/g, f ? cap(f.short) : "").replace(/\{W\}/g, f ? f.who : "").replace(/\{Q\}/g, f ? f.q : "");
  }

  /* ---------- Templates: executive × era. Anything without its own falls back to the passport. ---------- */
  var FONT_DIR = "assets/fonts/";
  var T = {};
  T["reid:1"] = { id: "reid-1978", skin: "wire", cls: "rc-tele", era: 1, copy: REID_COPY[1], prop: "assets/endrun/reid-1978.webp", machine: "assets/endrun/reid-teletype.webp",
    fonts: [["RC Big Shoulders", "bigshoulders-800", "800"], ["RC Courier Prime", "courierprime-400", "400"], ["RC Courier Prime", "courierprime-700", "700"]], pole: "wood" };
  T["reid:2"] = { id: "reid-2008", skin: "wire", cls: "rc-fax", era: 2, copy: REID_COPY[2], prop: "assets/endrun/reid-2008.webp", machine: "assets/endrun/reid-fax.webp",
    fonts: [["RC Archivo Narrow", "archivonarrow-700", "700"], ["RC Share Tech Mono", "sharetechmono-400", "400"]], pole: "lattice" };
  T["reid:3"] = { id: "reid-today", skin: "wire", cls: "rc-push", era: 3, copy: REID_COPY[3], prop: "assets/endrun/reid-today.webp",
    fonts: [["RC DM Sans", "dmsans-500", "500"], ["RC DM Sans", "dmsans-700", "700"], ["RC DM Mono", "dmmono-500", "500"]], pole: "lattice" };
  function passport(era) { return { id: "passport-" + era, skin: "passport", cls: "rc-pass", era: era, copy: DEF_COPY, fonts: [] }; }
  LD.RECAP_TEMPLATES = T;
  LD.recapTemplate = function (execId, era) { return T[execId + ":" + era] || passport(era); };

  var fontsLoaded = {};
  LD.recapLoadFonts = function (tpl) {
    if (typeof document === "undefined" || !document.fonts || typeof FontFace === "undefined") return Promise.resolve();
    return Promise.all((tpl.fonts || []).map(function (f) {
      var key = f[1]; if (fontsLoaded[key]) return fontsLoaded[key];
      var ff = new FontFace(f[0], "url(" + FONT_DIR + f[1] + ".woff2) format('woff2')", { weight: f[2], display: "swap" });
      fontsLoaded[key] = ff.load().then(function (x) { document.fonts.add(x); }).catch(function () {});
      return fontsLoaded[key];
    }));
  };

  /* ---------- Shared pieces ---------- */
  function typed(text, cls, delay, speed) {
    var n = Math.max(1, String(text).length);
    var dur = Math.min(1500, Math.max(300, n * (speed || 32)));
    return '<span class="rc-type ' + (cls || "") + '" data-td="' + (delay | 0) + '" data-tt="' + dur + '">' + esc(text) + "</span>";
  }
  function stamp(text, cls, delay) { return '<b class="rc-stamp ' + (cls || "") + '" style="--sd:' + (delay | 0) + 'ms">' + esc(text) + "</b>"; }
  function poleSvg(kind, x, y) {
    if (kind === "wood") return '<g class="rc-pole" transform="translate(' + x + "," + y + ')"><rect x="-2.5" y="0" width="5" height="62" class="ink-fill wood"/><rect x="-16" y="5" width="32" height="4.5" class="ink-fill wood"/><rect x="-11" y="15" width="22" height="3.5" class="ink-fill wood"/><circle cx="-14" cy="4" r="2.6" class="ins"/><circle cx="14" cy="4" r="2.6" class="ins"/></g>';
    return '<g class="rc-pole" transform="translate(' + x + "," + y + ')"><path d="M-12 62 L-3 0 L3 0 L12 62 M-9 42 L9 42 M-6 22 L6 22 M-9 42 L6 22 M9 42 L-6 22 M-12 62 L9 42 M12 62 L-9 42 M-18 6 L18 6 M-14 14 L14 14" class="ink-line"/><circle cx="-17" cy="7" r="2.4" class="ins"/><circle cx="17" cy="7" r="2.4" class="ins"/></g>';
  }
  /* The power line motif: poles climb a hill; the wire draws pole to pole and snaps after the era you fell in. */
  function powerLine(d, tpl) {
    var P = [{ x: 44, y: 78 }, { x: 156, y: 58 }, { x: 268, y: 36 }, { x: 368, y: 16 }];
    var reach = 0; d.stops.forEach(function (s, i) { if (s.status !== "dark") reach = i; });
    var fell = !d.win;
    var h = '<svg class="rc-line" viewBox="0 0 400 160" preserveAspectRatio="xMidYMid meet" aria-hidden="true">';
    h += '<path class="rc-hill" d="M0 160 L0 140 C 90 132, 160 112, 230 96 S 360 70, 400 62 L400 160 Z"/>';
    P.forEach(function (p, i) { h += '<g class="rc-pg" style="--pd:' + (i * 140) + 'ms">' + poleSvg(tpl.pole, p.x, p.y) + "</g>"; });
    var seg = "", segs = [];
    for (var i = 0; i < 3; i++) {
      var a = P[i], b = P[i + 1], mx = (a.x + b.x) / 2, my = Math.max(a.y, b.y) + 18;
      segs.push("M" + (a.x + 17) + " " + (a.y + 7) + " Q " + mx + " " + (my + 7) + " " + (b.x - 17) + " " + (b.y + 7));
    }
    var lit = fell ? reach : 3;
    for (var j = 0; j < lit; j++) h += '<path class="rc-wire on" pathLength="100" style="--wd:' + (600 + j * 380) + 'ms" d="' + segs[j] + '"/>';
    if (fell && reach < 3) {
      var a2 = P[reach], ox = a2.x + 17, oy = a2.y + 7, t0 = 600 + reach * 380;
      h += '<path class="rc-wire ghost" d="' + segs[reach] + '"/>';
      h += '<g class="rc-snap" style="--wd:' + t0 + 'ms;transform-origin:' + ox + "px " + oy + 'px"><path class="rc-wire dangle" d="M' + ox + " " + oy + " q 14 10 18 34 t 2 30" + '"/></g>';
      h += '<g class="rc-spark" style="--wd:' + (t0 + 220) + "ms;transform-origin:" + ox + "px " + oy + 'px"><path transform="translate(' + ox + "," + oy + ')" d="M0 -16 L4 -5 L15 -7 L6 1 L12 12 L1 6 L-6 15 L-4 3 L-15 1 L-5 -4 Z" class="spark-a"/><path transform="translate(' + ox + "," + oy + ') rotate(22) scale(.5)" d="M0 -16 L4 -5 L15 -7 L6 1 L12 12 L1 6 L-6 15 L-4 3 L-15 1 L-5 -4 Z" class="spark-b"/></g>';
    }
    P.forEach(function (p, i) { if (i <= lit) h += '<circle class="rc-bulb ' + (d.stops[i].status === "fell" ? "fell" : "") + '" style="--wd:' + (700 + i * 380) + 'ms" cx="' + p.x + '" cy="' + (p.y - 6) + '" r="5"/>'; });
    h += "</svg>";
    h += '<ol class="rc-stops">';
    d.stops.forEach(function (s, i) {
      var st = s.status === "done" ? tpl.copy.live : s.status === "fell" ? tpl.copy.down : "";
      h += '<li class="st-' + s.status + '" style="left:' + (P[i].x / 4) + '%"><b>' + esc(s.n === 3 ? "Today" : s.yr) + "</b><small>" + (s.q ? "Q" + s.q : "\u2014") + "</small>" +
        (st ? stamp(st, s.status === "fell" ? "red" : "", 760 + i * 380) : "") + "</li>";
    });
    h += "</ol>";
    return h;
  }
  function portrait(f) { return f.art ? '<span class="rc-face"><img src="' + esc(f.art) + '" alt="" draggable="false"></span>' : '<span class="rc-face none"></span>'; }
  function meter(d, tpl) {
    var frac = d.ready / (d.roomsTotal || 4), ang = -90 + 180 * frac;
    var h = '<div class="rc-meter"><svg viewBox="0 0 200 120" aria-hidden="true">';
    if (tpl.era === 3) {
      h += '<path class="rc-arc-bg" d="M20 105 A80 80 0 0 1 180 105" pathLength="100"/><path class="rc-arc-fg" d="M20 105 A80 80 0 0 1 180 105" pathLength="100" style="--to:' + (100 - 100 * frac) + '"/>';
      h += '<text x="100" y="98" text-anchor="middle" class="rc-arc-n">' + Math.round(frac * 100) + "%</text>";
    } else {
      h += '<path class="rc-dial" d="M14 108 A86 86 0 0 1 186 108 Z"/>';
      for (var k = 0; k <= 8; k++) { var a = Math.PI * (1 - k / 8), x1 = 100 + 72 * Math.cos(a), y1 = 108 - 72 * Math.sin(a), x2 = 100 + (k % 2 ? 64 : 58) * Math.cos(a), y2 = 108 - (k % 2 ? 64 : 58) * Math.sin(a); h += '<line class="rc-tick" x1="' + x1.toFixed(1) + '" y1="' + y1.toFixed(1) + '" x2="' + x2.toFixed(1) + '" y2="' + y2.toFixed(1) + '"/>'; }
      h += '<path class="rc-red" d="M' + (100 + 72 * Math.cos(Math.PI * 0.25)).toFixed(1) + " " + (108 - 72 * Math.sin(Math.PI * 0.25)).toFixed(1) + ' A72 72 0 0 1 172 108" />';
      h += '<g class="rc-needle" style="--ang:' + ang + 'deg"><path d="M97 108 L100 40 L103 108 Z"/></g><circle cx="100" cy="108" r="8" class="rc-hub"/>';
    }
    h += "</svg><b class=\"rc-meter-cap\">Bunker " + d.ready + " of " + (d.roomsTotal || 4) + "</b></div>";
    return h;
  }
  function rooms(d, cls) {
    var h = '<ul class="rc-rooms ' + (cls || "") + '">';
    d.rooms.forEach(function (r, i) {
      h += '<li class="' + (r.ready ? "ready" : r.level ? "part" : "empty") + '" style="--rd:' + (300 + i * 220) + 'ms"><b>' + esc(r.short) + "</b><small>Lv " + r.level + (r.quality === "cheap" && r.level ? " \u00b7 cheap" : "") + "</small></li>";
    });
    return h + "</ul>";
  }
  function ledger(d, opts) {
    opts = opts || {};
    var h = '<div class="rc-ledger"><ul class="rc-lines">';
    d.ledger.forEach(function (l, i) {
      h += '<li style="--ld:' + (i * 220) + 'ms">' + typed(l.label, "lab", i * 220, 24) + '<span class="amt">+' + l.amount + "</span></li>";
    });
    if (!d.ledger.length) h += "<li>" + typed("No dividends recorded", "lab", 0, 26) + "</li>";
    h += "</ul>";
    var coins = "";
    for (var c = 0; c < 9; c++) coins += '<i class="rc-coin" style="--cd:' + (200 + c * 170) + "ms;--cx:" + ((c * 37) % 60 - 30) + 'px">' + tok("div") + "</i>";
    h += '<div class="rc-total"><span class="rc-coins" aria-hidden="true">' + coins + '</span><small>' + esc(opts.totalLabel || "Total") + '</small><b>' + tok("div") + '<span class="rc-count" data-to="' + d.total + '">' + d.total + "</span></b>" +
      (d.balance != null ? '<em>Balance \u25c8 ' + d.balance + "</em>" : "") + "</div></div>";
    return h;
  }
  function xpBar(d) {
    var x = d.xp;
    if (!x) return '<div class="rc-xp none"><b>' + esc(d.exec.name) + "</b><small>Experience was not recorded for this run.</small></div>";
    var a = x.after || {}, b = x.before || a;
    var from = b.need ? Math.round(100 * b.into / b.need) : 100, to = a.need ? Math.round(100 * a.into / a.need) : 100;
    if (!x.levelUp && to < from) from = 0;
    var h = '<div class="rc-xp' + (x.levelUp ? " up" : "") + '"><div class="rc-xp-k"><b>Lv ' + (x.levelUp ? b.level : a.level) + '</b><span class="rc-xp-gain">+' + x.gain + " XP</span>" +
      (a.need ? "<small>" + a.into + "/" + a.need + " to Lv " + (a.level + 1) + "</small>" : "<small>Max level</small>") + "</div>";
    h += '<div class="rc-xp-bar" style="--from:' + from + "%;--to:" + to + '%"><i></i></div>';
    if (x.levelUp) h += stamp("Level up \u00b7 Lv " + a.level, "lvl", 1300);
    return h + "</div>";
  }
  function tags(d) {
    var list = d.unlocks.slice(0, 5);
    if (!list.length) list = [{ kind: "goal", name: d.xp && d.xp.after && d.xp.after.need ? (d.xp.after.need - d.xp.after.into) + " XP to Lv " + (d.xp.after.level + 1) : "Climb again", text: "Nothing new unlocked this time" }];
    var h = '<ul class="rc-tags">';
    list.forEach(function (u, i) {
      h += '<li class="k-' + esc(u.kind) + '" style="--gd:' + (500 + i * 180) + 'ms"><i class="rc-hole" aria-hidden="true"></i><small>' + esc({ seat: "New seat", rating: "New challenge", perk: "Level perk", mandate: "Mandate met", afford: "Within reach", goal: "Next goal" }[u.kind] || "Unlocked") + "</small><b>" + esc(u.name) + "</b>" + (u.text ? "<em>" + esc(u.text) + "</em>" : "") + "</li>";
    });
    return h + "</ul>";
  }
  function tickets(d, opts) {
    return '<div class="rc-tix">' +
      '<button type="button" class="lg-ticket go" id="btn-again"><b>Climb Again</b><small>' + esc(d.exec.name.split(" ").slice(-1)[0]) + " \u00b7 new seed</small></button>" +
      '<button type="button" class="lg-ticket ochre" id="btn-end-board"><b>Summit Lounge</b><small>\u25c8 ' + (d.balance != null ? d.balance : "") + " to spend</small></button>" +
      '<button type="button" class="lg-ticket back" id="btn-letter"><b>Letter</b><small>To shareholders</small></button>' +
      '<button type="button" class="lg-ticket back" id="btn-title"><b>Title</b></button>' +
      '<button type="button" class="lg-ticket back rc-replay" id="btn-replay"><b>Replay \u21ba</b></button></div>';
  }
  function factsLine(d) {
    var bits = ["Q" + d.turn, ERA[d.era].yr + " \u00b7 " + ERA[d.era].name, d.rating, "seed " + d.seed];
    return bits.map(esc).join(" \u00b7 ");
  }
  function extraFacts(d) {
    var out = [];
    if (d.bigDeal && d.bigDeal.cash) out.push("Biggest deal: " + d.bigDeal.title + " (Q" + d.bigDeal.q + ", " + (d.bigDeal.cash > 0 ? "+" : "\u2212") + "$" + Math.abs(d.bigDeal.cash) + "M)");
    if (d.peak) out.push("Unrest peaked at " + d.peak.unrest + " in Q" + d.peak.t);
    return out;
  }

  /* ---------- Wire skin (Reid: telegram / fax / push) ---------- */
  function wireBeats(d, tpl) {
    var C = tpl.copy, head = fill(C.head[d.reason] || C.head.unrest, d), epi = fill(C.epitaph[d.reason] || C.epitaph.unrest, d);
    var B = {};
    var photo = '<span class="rc-photo"><img src="assets/exec/exec-' + esc(d.execId) + '.webp" alt="" draggable="false"></span>';
    if (tpl.era === 3) {
      B.headline = '<div class="rc-notif main"><div class="rc-nh"><i class="rc-app" aria-hidden="true"></i><span>' + esc(C.kicker(d)) + "</span><em>now</em></div>" +
        "<h2>" + typed(head, "", 260, 22) + "</h2><p>" + esc(C.cause[d.cause] || "") + " \u00b7 " + factsLine(d) + "</p>" + photo + "</div>";
    } else {
      B.headline = (tpl.machine ? '<div class="rc-machine" aria-hidden="true"><img src="' + esc(tpl.machine) + '" alt="" draggable="false"></div>' : "") + '<div class="rc-slip main">' + (tpl.era === 2 ? '<div class="rc-faxhead">' + esc(C.kicker(d)) + "</div>" : '<div class="rc-kick">' + esc(C.kicker(d)) + "</div>") +
        "<h2>" + typed(head, "", 300, tpl.era === 1 ? 34 : 24) + "</h2><p class=\"rc-cause\">" + esc(C.cause[d.cause] || "") + "</p><p class=\"rc-facts\">" + factsLine(d) + "</p>" + photo + "</div>";
    }
    B.climb = '<h3 class="rc-h3">' + esc(C.climb) + "</h3>" + '<div class="rc-route">' + powerLine(d, tpl) + "</div>";
    var door = '<h3 class="rc-h3">' + esc(C.door) + "</h3>";
    if (!d.fights.length) door += '<p class="rc-strip">' + typed(C.none, "", 200) + "</p>";
    else {
      door += '<ul class="rc-calls">';
      d.fights.forEach(function (f, i) {
        var t0 = 250 + i * 520;
        door += '<li class="rc-call how-' + f.how + '" style="--cd:' + t0 + 'ms">' + portrait(f) + '<span class="rc-call-t">' + typed(fill(C.fight[f.how], d, f), "", t0 + 120, tpl.era === 3 ? 16 : 22) +
          (f.quote ? "<small>\u201c" + esc(f.quote) + "\u201d</small>" : "") + "</span>" + stamp(LD.HOW_LABEL ? LD.HOW_LABEL[f.how] : f.how, f.how === "crushed" ? "red" : f.how === "walked" ? "ink" : "", t0 + 380) + "</li>";
      });
      door += "</ul>" + (d.moreFights ? '<p class="rc-more">+' + d.moreFights + " earlier</p>" : "");
    }
    B.door = door;
    B.bunker = '<h3 class="rc-h3">' + esc(C.bunker) + '</h3><div class="rc-bunk">' + meter(d, tpl) + rooms(d) + "</div>";
    B.ledger = '<h3 class="rc-h3">' + esc(C.ledger) + "</h3>" + ledger(d, { totalLabel: tpl.era === 1 ? "TOTAL STOP" : tpl.era === 2 ? "Net payable" : "Paid out" });
    B.level = '<h3 class="rc-h3">' + esc(C.level) + "</h3>" + xpBar(d) + tags(d);
    var ex = extraFacts(d);
    B.next = '<p class="rc-epi">' + typed(epi, "", 100, tpl.era === 3 ? 18 : 26) + "</p>" + (ex.length ? '<p class="rc-extra">' + ex.map(esc).join(" \u00b7 ") + "</p>" : "");
    return B;
  }

  /* ---------- Passport skin (default; era-tinted stamps, colours and paper) ---------- */
  function passportBeats(d, tpl) {
    var C = tpl.copy, B = {};
    B.headline = '<div class="rc-paper"><div class="rc-mast">' + esc(C.mast[d.era]) + '</div><div class="rc-dateline">' + factsLine(d) + "</div>" +
      "<h2>" + esc(d.title) + '</h2><div class="rc-news-row"><img class="rc-news" src="assets/endrun/news-' + (d.win ? "win" : "lose") + '.webp" alt="" draggable="false"><p>' + esc(d.body) + "</p></div></div>";
    var route = '<div class="rc-pp-route"><svg viewBox="0 0 400 60" preserveAspectRatio="none" aria-hidden="true"><path class="rc-trail" pathLength="100" d="M30 30 C 90 0, 130 60, 150 30 S 230 0, 260 30 S 340 60, 370 30"/></svg><ol>';
    d.stops.forEach(function (s, i) {
      var st = s.status === "done" ? (s.n === 4 ? "Evacuated" : "Entered") : s.status === "fell" ? "Denied" : "";
      route += '<li class="st-' + s.status + '" style="--sd:' + (400 + i * 420) + 'ms"><span class="ring"><b>' + esc(s.n === 4 ? "Bunker" : s.yr) + "</b><small>" + esc(s.n === 4 ? (d.exec.compound || "") : s.name) + "</small><em>" + (s.q ? "Q" + s.q : "") + "</em></span>" +
        (st ? stamp(st, s.status === "fell" ? "red" : "", 600 + i * 420) : "") + "</li>";
    });
    B.climb = '<h3 class="rc-h3">The climb</h3>' + route + "</ol></div>";
    var door = '<h3 class="rc-h3">Visitors at the door</h3>';
    if (!d.fights.length) door += '<p class="rc-strip">Nobody came to the door. Nobody needed to.</p>';
    else {
      door += '<ul class="rc-visas">';
      d.fights.forEach(function (f, i) {
        var t0 = 250 + i * 520;
        door += '<li class="how-' + f.how + '" style="--cd:' + t0 + 'ms">' + portrait(f) + "<b>" + esc(f.who) + "</b><small>Q" + f.q + "</small>" + stamp(LD.HOW_LABEL ? LD.HOW_LABEL[f.how] : f.how, f.how === "crushed" ? "red" : f.how === "walked" ? "ink" : "", t0 + 300) + "</li>";
      });
      door += "</ul>" + (d.moreFights ? '<p class="rc-more">+' + d.moreFights + " earlier</p>" : "");
    }
    B.door = door;
    B.bunker = '<h3 class="rc-h3">The bunker \u00b7 ' + d.ready + " of " + (d.roomsTotal || 4) + " ready</h3>" + rooms(d, "tiles");
    B.ledger = '<h3 class="rc-h3">Dividends receipt</h3><div class="rc-receipt">' + ledger(d, { totalLabel: "Dividends paid" }) + "</div>";
    B.level = '<h3 class="rc-h3">' + esc(d.exec.name) + "</h3>" + xpBar(d) + tags(d);
    var ex = extraFacts(d);
    B.next = '<p class="rc-epi">' + esc(C.epitaph[d.reason] || C.epitaph.unrest) + "</p>" + (ex.length ? '<p class="rc-extra">' + ex.map(esc).join(" \u00b7 ") + "</p>" : "");
    return B;
  }

  /* ---------- Painted backdrop (noir techno-optimism), era x outcome, with matte ambient layers ----------
     Positions are % of the painting; frames are sized like background-size:cover so overlays stay pinned. */
  var BD = {
    "lose-1978": { p: { lamps: [[90.8, 3], [88.5, 12.1], [95, 17.3], [87.6, 17.6], [95.9, 23.6], [86.9, 23.8], [96.9, 32.6], [86.7, 32.8]], smoke: [[59, 40], [74, 38.5]], ship: 17 },
                   l: { lamps: [[85.4, 2.3], [84.3, 13.3], [88, 38.3], [83.4, 38.5]], smoke: [[61, 41.5], [68.3, 37]], ship: 20 } },
    "lose-2008": { p: { lamps: [], smoke: [[52, 62], [18, 52], [77, 58]], ship: 22 },
                   l: { lamps: [], smoke: [], ship: 27 } },
    "lose-today": { p: { lamps: [[87.7, 2.9], [91.5, 17.9], [84.2, 18.1], [92.2, 24.2], [83.5, 24.4], [93.4, 33.3], [82.8, 33.3]], smoke: [[37, 48], [41, 66], [47, 74]], ship: 9 },
                    l: { lamps: [[75.1, 1.9], [73.5, 22.2], [76.7, 22.1], [73.2, 30.8], [77.1, 30.7]], smoke: [[43, 62], [43, 86]], ship: 12 } },
    "win-today": { p: { lamps: [[89.9, 14.6], [84.9, 14.8], [90.8, 19.8], [84, 19.9], [91.6, 25.8], [83.3, 26], [92.7, 34.6], [82.4, 34.7]], bdy: 0.75, depart: true },
                   l: { lamps: [[77.1, 1.7], [78.8, 21], [75.3, 21.2], [79.3, 30.3], [75, 30.5], [79.8, 42.4], [74.5, 42.4]], bdy: 0.6, depart: true } }
  };
  var SHIP_SVG = '<svg viewBox="0 0 120 40" aria-hidden="true"><path class="fin" d="M98 20 L116 8 L114 20 L116 32 Z"/><ellipse class="hull" cx="54" cy="20" rx="50" ry="14"/><path class="belly" d="M8 24 Q54 40 100 24 Q90 33 54 34 Q18 33 8 24 Z"/><path class="seam" d="M34 9 Q30 20 34 31 M54 6 V34 M74 9 Q78 20 74 31"/><rect class="gon" x="42" y="32" width="22" height="6" rx="2"/></svg>';
  var CLOUD_SVG = '<svg viewBox="0 0 160 50" aria-hidden="true"><path class="cl" d="M6 44 Q4 30 20 30 Q22 14 42 18 Q52 4 72 12 Q88 2 102 16 Q122 10 128 26 Q152 24 154 44 Z"/><path class="cl-ink" d="M6 44 H154"/></svg>';
  function bdKey(d) { return d.kind === "win" ? "win-today" : "lose-" + (d.era === 1 ? "1978" : d.era === 2 ? "2008" : "today"); }
  function bdFrame(key, o) {
    var c = BD[key][o], h = '<div class="rc-bdf rc-bdf-' + o + '" style="background-image:url(assets/endrun/bd-' + key + "-" + o + '.webp);--bdy:' + (c.bdy || 0) + '">';
    (c.smoke || []).forEach(function (s, i) {
      h += '<span class="bd-smoke' + (c.thin ? " thin" : "") + '" style="left:' + s[0] + "%;top:" + s[1] + "%;--sd:" + (i * -2.3) + 's">';
      for (var k = 0; k < 6; k++) h += '<i style="--k:' + k + '"></i>';
      h += "</span>";
    });
    if (c.clouds) c.clouds.forEach(function (y, i) { h += '<span class="bd-cloud c' + i + '" style="top:' + y + '%">' + CLOUD_SVG + "</span>"; });
    (c.lamps || []).forEach(function (l, i) { h += '<span class="bd-lamp" style="left:' + l[0] + "%;top:" + l[1] + "%;--ld:" + ((i % 3) * 0.8 + (i > 2 ? 0.4 : 0)).toFixed(1) + 's"></span>'; });
    if (c.ship) h += '<span class="bd-ship" style="top:' + c.ship + '%">' + SHIP_SVG + "</span>";
    if (c.depart) h += '<span class="bd-ship depart">' + SHIP_SVG + "</span>";
    return h + "</div>";
  }
  function backdrop(d) {
    var key = bdKey(d);
    return '<div class="rc-bd rc-bd-' + key + '" aria-hidden="true">' + bdFrame(key, "p") + bdFrame(key, "l") + '<div class="rc-bd-scrim"></div></div>';
  }
  LD.recapBackdropKey = bdKey;

  /* ---------- Render ---------- */
  function renderRecap(d, tpl, opts) {
    opts = opts || {};
    var B = tpl.skin === "wire" ? wireBeats(d, tpl) : passportBeats(d, tpl);
    var h = '<div class="page rc ' + tpl.cls + " rc-sk-" + tpl.skin + " rc-era" + tpl.era + " rc-" + d.kind + (opts.final ? " final tix" : "") + '" id="rc" data-tpl="' + tpl.id + '" data-exec="' + esc(d.execId) + '">';
    h += backdrop(d);
    h += '<div class="rc-scroll" id="rc-scroll"><div class="rc-doc">';
    BEATS.forEach(function (b, i) {
      if (b === "next") return;
      h += '<section class="rc-beat b-' + b + (opts.final ? " on done" : "") + '" data-beat="' + i + '">' + B[b] + "</section>";
    });
    h += '<section class="rc-beat b-next' + (opts.final ? " on done" : "") + '" data-beat="6">' + B.next + "</section>";
    h += "</div></div>";
    h += '<div class="rc-foot">' + tickets(d, opts) + "</div>";
    h += '<button type="button" class="rc-skip" id="rc-skip" aria-label="Skip to the summary">Skip \u25b8\u25b8</button>';
    h += '<p class="rc-hint" aria-hidden="true">Tap to hurry</p>';
    return h + "</div>";
  }
  LD.renderRecap = renderRecap;

  /* Beat lengths (ms). About 15s for a typical run with three fights. */
  LD.recapDurations = function (d) {
    var nf = Math.max(1, Math.min(4, d.fights.length));
    return [1900, 2500, 600 + nf * 520, 1700, 700 + Math.max(1, d.ledger.length) * 220 + 500, 1600 + (d.xp && d.xp.levelUp ? 400 : 0) + Math.min(4, d.unlocks.length) * 180, 1200];
  };
  /* Sound cues per beat: [offset ms, sfx name]. */
  LD.recapCues = function (d) {
    var c = [[[0, d.win ? "win" : "lose"]], [], [], [], [], [], []];
    d.stops.forEach(function (s, i) { if (s.status !== "dark") c[1].push([760 + i * 380, "stamp"]); });
    d.fights.forEach(function (f, i) { c[2].push([250 + i * 520 + 380, "stamp"]); });
    c[3].push([300, "tick"]); c[3].push([900, d.ready === (d.roomsTotal || 4) ? "good" : "bad"]);
    for (var k = 0; k < 9; k++) c[4].push([200 + k * 170 + 420, "coin"]);
    if (d.xp && d.xp.levelUp) c[5].push([1300, "levelup"]);
    d.unlocks.slice(0, 5).forEach(function (u, i) { c[5].push([500 + i * 180, "item"]); });
    c[6].push([0, "tick"]);
    return c;
  };

  /* ---------- Player (browser) ---------- */
  LD.playRecap = function (root, d, opts) {
    opts = opts || {};
    var rc = root.querySelector("#rc"), scroller = root.querySelector("#rc-scroll");
    var beats = Array.prototype.slice.call(root.querySelectorAll(".rc-beat")).sort(function (a, b) { return a.getAttribute("data-beat") - b.getAttribute("data-beat"); });
    var dur = LD.recapDurations(d), cues = LD.recapCues(d), sfx = opts.sfx || function () {};
    var cur = -1, timer = null, gap = null, cueT = [], rafs = [], finished = false;
    function clearCues() { cueT.forEach(clearTimeout); cueT = []; rafs.forEach(function (r) { r.stop = true; }); rafs = []; }
    function counters(el, ms) {
      Array.prototype.forEach.call(el.querySelectorAll(".rc-count"), function (n) {
        var to = +n.getAttribute("data-to") || 0, t0 = null, job = { stop: false }; rafs.push(job);
        n.textContent = "0";
        function step(ts) { if (job.stop) { n.textContent = to; return; } if (t0 == null) t0 = ts; var k = Math.min(1, (ts - t0) / ms); n.textContent = Math.round(to * (1 - Math.pow(1 - k, 3))); if (k < 1) requestAnimationFrame(step); }
        setTimeout(function () { requestAnimationFrame(step); }, 300);
      });
    }
    /* Typewriter: the full text keeps its layout (hidden remainder), so nothing reflows while it types. */
    function typeIn(el, clack) {
      Array.prototype.forEach.call(el.querySelectorAll(".rc-type"), function (n) {
        var full = n.getAttribute("data-full"); if (full == null) { full = n.textContent; n.setAttribute("data-full", full); }
        var td = +n.getAttribute("data-td") || 0, tt = +n.getAttribute("data-tt") || 600, len = full.length, job = { stop: false, n: n };
        rafs.push(job);
        n.classList.add("typing");
        n.innerHTML = '<span class="tv"></span><span class="ti">' + esc(full) + "</span>";
        var tv = n.firstChild, ti = n.lastChild, t0 = null, last = 0;
        function step(ts) {
          if (job.stop) return;
          if (t0 == null) t0 = ts;
          var k = Math.min(len, Math.floor(len * (ts - t0) / tt));
          if (k !== last) { tv.textContent = full.slice(0, k); ti.textContent = full.slice(k); if (clack && k % 3 === 0 && full.charAt(k - 1) !== " ") sfx("tick"); last = k; }
          if (k < len) requestAnimationFrame(step); else { n.classList.remove("typing"); n.textContent = full; }
        }
        setTimeout(function () { if (!job.stop) requestAnimationFrame(step); }, td);
      });
    }
    function settleType(el) {
      Array.prototype.forEach.call(el.querySelectorAll(".rc-type"), function (n) { var f = n.getAttribute("data-full"); if (f != null) n.textContent = f; n.classList.remove("typing"); });
    }
    function finishBeat(i) {
      var el = beats[i]; if (!el) return;
      el.classList.add("on", "done");
      settleType(el);
      Array.prototype.forEach.call(el.querySelectorAll(".rc-count"), function (n) { n.textContent = n.getAttribute("data-to"); });
    }
    function play(i) {
      clearTimeout(gap); gap = null;
      if (i >= beats.length) { end(); return; }
      cur = i;
      var el = beats[i];
      rc.setAttribute("data-cur", i);
      typeIn(el, opts.clack && i === 0);
      el.classList.add("on");
      if (i === beats.length - 1) rc.classList.add("tix");
      if (scroller && el.scrollIntoView && i < beats.length - 1) { try { el.scrollIntoView({ block: "nearest", behavior: "smooth" }); } catch (e) { el.scrollIntoView(false); } }
      (cues[i] || []).forEach(function (c) { cueT.push(setTimeout(function () { sfx(c[1]); }, c[0])); });
      if (i === 4) counters(el, Math.max(800, dur[4] - 700));
      timer = setTimeout(function () { clearCues(); finishBeat(i); play(i + 1); }, dur[i]);
    }
    function end() {
      if (finished) return; finished = true;
      clearTimeout(timer); clearTimeout(gap); clearCues();
      beats.forEach(function (b, k) { finishBeat(k); });
      rc.classList.add("final", "tix"); rc.removeAttribute("data-cur");
      if (scroller) scroller.scrollTop = 0;
      if (opts.onEnd) opts.onEnd();
    }
    function hurry() {
      if (finished) return;
      if (gap) { play(cur + 1); return; }
      clearTimeout(timer); clearCues(); finishBeat(cur);
      gap = setTimeout(function () { play(cur + 1); }, 380);
    }
    rc.addEventListener("click", function (ev) {
      if (finished) return;
      if (ev.target.closest && ev.target.closest("button")) return;
      hurry();
    });
    var sk = root.querySelector("#rc-skip");
    if (sk) sk.addEventListener("click", function (ev) { ev.stopPropagation(); sfx("tick"); end(); });
    root.addEventListener("keydown", function (ev) { if (!finished && (ev.key === " " || ev.key === "Enter") && !(ev.target.closest && ev.target.closest("button"))) { ev.preventDefault(); hurry(); } });
    setTimeout(function () { play(0); }, opts.delay || 120);
    return { hurry: hurry, end: end, state: function () { return { cur: cur, finished: finished }; } };
  };

  if (typeof module !== "undefined" && module.exports) module.exports = LD;
})(typeof globalThis !== "undefined" ? globalThis : this);
