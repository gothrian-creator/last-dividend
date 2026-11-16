
/* Last Dividend — pure render helpers. Browser + Node. No DOM writes. */
(function (root) {
  var LD = root.LD || (root.LD = {});

  var DISCOUNT_RULE =
    "You can seal from quarter 9, after the Act II boss. A working bunker needs all four systems at Lv 2 or higher, and those systems must hold. Sound contractors cost more and will hold. Discount contractors are cheaper, but a discount system at Lv 2 will fail at evacuation unless you have hired a chief engineer or raised that system to Lv 3.";

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function assetUrl(name) {
    if (LD.ASSETS && LD.ASSETS[name]) return LD.ASSETS[name];
    return "assets/" + name + ".webp";
  }

  function dealArtKey(dealId) {
    if (LD.DEAL_ART && LD.DEAL_ART[dealId]) return LD.DEAL_ART[dealId];
    return null;
  }

  function systemStatus(state, systemId) {
    var sys = state.bunker[systemId];
    if (!sys || sys.level <= 0) return "empty";
    if (sys.level < LD.WIN_LEVEL) return "incomplete";
    if (LD.systemReliable(state, systemId)) return "ready";
    return "risk";
  }

  function installedName(systemId, level) {
    if (!level) return "";
    var table = LD.UPGRADES[systemId];
    return table && table[level - 1] ? table[level - 1].name : "";
  }

  function qualityLabel(q) {
    return q === "cheap" ? "discount" : "sound";
  }

  function inboundFor(state, systemId) {
    return LD.pendingInstallFor ? LD.pendingInstallFor(state, systemId) : null;
  }

  function systemDetail(state, systemId, compact) {
    var sys = state.bunker[systemId];
    var status = systemStatus(state, systemId);
    var inbound = inboundFor(state, systemId);
    if (inbound && inbound.install) {
      var due = inbound.due;
      if (compact) return "arrives Q" + due;
      return "shipment in transit · arrives Q" + due + " · will not count if you seal first";
    }
    if (status === "empty") return "Not installed";
    var name = installedName(systemId, sys.level);
    var q = qualityLabel(sys.quality);
    if (compact) {
      if (status === "ready") return (name ? name + " · " : "") + q;
      if (status === "risk") return q + " · at risk";
      return (name ? name + " · " : "") + q;
    }
    if (status === "ready") return name + " · " + q + " · will hold";
    if (status === "risk") return name + " · " + q + " · at risk (hire an engineer or raise to Lv 3)";
    return name + " · " + q + " · not ready (need Lv 2)";
  }

  function readinessSummary(state) {
    var lines = [];
    var ready = 0, risk = 0, incomplete = 0, empty = 0;
    LD.SYSTEMS.forEach(function (s) {
      var st = systemStatus(state, s.id);
      var sys = state.bunker[s.id];
      if (st === "ready") ready += 1;
      else if (st === "risk") risk += 1;
      else if (st === "incomplete") incomplete += 1;
      else empty += 1;
      lines.push({
        id: s.id,
        name: s.name,
        level: sys.level,
        status: st,
        text: s.name + " — Lv " + sys.level + " · " + systemDetail(state, s.id, false)
      });
    });
    var missing = incomplete + empty;
    return {
      ready: ready,
      risk: risk,
      incomplete: incomplete,
      empty: empty,
      missing: missing,
      canWin: ready === 4 && risk === 0 && missing === 0,
      sealAvailable: state.turn >= LD.MIN_EVAC_TURN && state.phase === "bunker" && !state.ended,
      engineer: !!state.engineer,
      lines: lines,
      tally: "Ready " + ready + " of 4" +
        (missing ? " · " + missing + " incomplete" : "") +
        (risk ? " · " + risk + " at risk" : "") +
        (state.engineer ? " · chief engineer retained" : ""),
      rule: DISCOUNT_RULE
    };
  }

  function barPct(n, max) {
    return Math.max(0, Math.min(100, Math.round((n / max) * 100)));
  }

  function renderChrome(state) {
    var exec = LD.execById(state.executiveId);
    var html = '<div class="chrome">';
    html += "<div><div class='kicker'>" + escapeHtml(exec.firm) + "</div>";
    html += "<h2>" + escapeHtml(exec.name) + "</h2>";
    html += "<div class='who'>" + escapeHtml(exec.title) + " · seed " + escapeHtml(String(state.seedLabel)) + "</div></div>";
    html += "<div class='q-badge' aria-label='Quarter " + state.turn + "'>Q" + state.turn + "</div></div>";

    html += '<div class="stats">';
    html += statBox("cash", "Cash", state.cash, 100);
    html += statBox("unrest", "Unrest", state.unrest, LD.MAX_UNREST);
    html += statBox("collapse", "Collapse", state.collapse, LD.MAX_COLLAPSE);
    html += "</div>";
    var fc = LD.forecastQuarters(state);
    html += '<p class="forecast">At the current drift, breach in about ' + fc + " quarter" + (fc === 1 ? "" : "s") + ". Delayed deals are not included in this estimate.</p>";
    return html;
  }

  function statBox(cls, label, val, max) {
    var h = '<div class="stat ' + cls + '"><div class="lbl">' + label + '</div><div class="val">' + val + "</div>";
    h += '<div class="bar" aria-hidden="true"><span style="width:' + barPct(val, max) + '%"></span></div></div>';
    return h;
  }

  function renderChips(state) {
    var html = '<div class="chips" aria-label="Bunker systems">';
    LD.SYSTEMS.forEach(function (s) {
      var st = systemStatus(state, s.id);
      var sys = state.bunker[s.id];
      var installed = sys.level > 0;
      html += '<div class="chip ' + st + '"><div class="nm' + (installed ? " accent" : "") + '">' + escapeHtml(s.name) + "</div>";
      html += '<div class="lv">Lv ' + sys.level + "</div>";
      html += '<div class="q">' + escapeHtml(systemDetail(state, s.id, true)) + "</div></div>";
    });
    html += "</div>";
    return html;
  }

  function renderPending(state) {
    if (!state.pending || !state.pending.length) return "";
    var parts = state.pending.map(function (p) {
      var bits = [escapeHtml(p.source) + " due Q" + p.due];
      if (p.install) bits.push("shipment for " + p.install.id + " L" + p.install.level);
      if (p.strain) {
        Object.keys(p.strain).forEach(function (g) {
          bits.push(g + " network tightens");
        });
      }
      return bits.join(" — ");
    });
    return '<div class="pending"><strong>Still outstanding.</strong> ' + parts.join(" · ") + "</div>";
  }

  function renderContracts(state) {
    if (LD.ensureSupply) LD.ensureSupply(state);
    var html = '<section class="contracts" aria-label="Public supply contracts">';
    html += '<div class="kicker">Public networks you still buy from</div>';
    if (state.converting) {
      html += '<p class="convert-banner">Private supply conversion is active. Further deals pay ' + Math.round(LD.conversionRate(state) * 100) + '% cash. Installs ignore network damage and arrive this quarter.</p>';
    }
    html += '<div class="contract-grid">';
    LD.SYSTEMS.forEach(function (s) {
      var level = LD.gridLevel ? LD.gridLevel(state, s.id) : 0;
      var label = LD.gridLabel ? LD.gridLabel(level) : "clear";
      var inbound = inboundFor(state, s.id);
      var coming = "";
      (state.pending || []).forEach(function (item) {
        if (item.strain && item.strain[s.id]) coming = "tightens Q" + item.due;
        if (item.ease && item.ease[s.id]) coming = "eases Q" + item.due;
      });
      html += '<div class="contract ' + label + '"><div class="nm">' + escapeHtml(s.name) + "</div>";
      html += '<div class="lv">' + escapeHtml(label) + "</div>";
      if (coming) html += '<div class="q">' + escapeHtml(coming) + "</div>";
      else if (inbound) html += '<div class="q">shipment Q' + inbound.due + "</div>";
      else if (level >= 2) html += '<div class="q">+14 and delayed</div>';
      else if (level >= 1) html += '<div class="q">+8 to install</div>';
      else html += '<div class="q">clear rate</div>';
      html += "</div>";
    });
    html += "</div></section>";
    return html;
  }

  function dealExtraHint(state, deal) {
    var bits = [];
    if (state.converting && deal.immediate && deal.immediate.cash > 0 && LD.dealCashAmount) {
      bits.push("Pays " + LD.dealCashAmount(state, deal.immediate.cash) + " after conversion (" + Math.round(LD.conversionRate(state) * 100) + "%).");
    }
    if (deal.choices) {
      bits.push("A choice here can ease or strain a public network at close.");
    } else if (LD.defaultSupply) {
      var supply = LD.defaultSupply(deal, deal);
      if (supply.strain) {
        Object.keys(supply.strain).forEach(function (g) {
          var next = Math.min(LD.GRID_DISRUPTED, (LD.gridLevel(state, g) || 0) + supply.strain[g]);
          bits.push(g + " supply will be " + LD.gridLabel(next) + " at close.");
        });
      }
      if (supply.ease) {
        Object.keys(supply.ease).forEach(function (g) {
          bits.push("eases the " + g + " network now.");
        });
      }
    }
    return bits.join(" ");
  }

  function conversionSecureCost(state, systemId, quality) {
    var clone = LD.deepClone(state);
    clone.converting = true;
    return LD.upgradeCost(clone, systemId, clone.bunker[systemId].level + 1, quality);
  }

  function renderLog(state) {
    var html = '<div class="log"><div class="kicker">Ledger</div><ul>';
    (state.log || []).slice(0, 5).forEach(function (l) {
      html += "<li>Q" + l.turn + " — " + escapeHtml(l.text) + "</li>";
    });
    html += "</ul></div>";
    return html;
  }

  function renderPlayNav() {
    return '<div class="footer-nav"><button class="btn btn-ghost" id="btn-play-how">How to play</button>' +
      '<button class="btn btn-danger" id="btn-abandon">Abandon run</button></div>';
  }

  var titleDemo = null;
  function titleMap() {
    if (!LD.renderMap || !LD.WORLD_MAP || !LD.createRun) {
      return '<img src="' + escapeHtml(assetUrl("hero-title")) + '" alt="">';
    }
    if (!titleDemo) {
      titleDemo = LD.createRun({ seed: "brighter-tomorrow", executiveId: "mara" });
      titleDemo.phase = "bunker";
      ["eu", "na", "oc"].forEach(function (id) { titleDemo.world.regions[id].owned = true; });
      titleDemo.world.regions.eu.plant = true;
      titleDemo.collapse = 60;
    }
    return '<div class="board-tilt"><div class="board-slab">' + LD.renderMap(titleDemo, { idPrefix: "t" }) + "</div></div>";
  }

  /* ---------- Journey: resource tokens (painted sprite) ---------- */
  var TOKENS = ["cash", "div", "unrest", "collapse", "bunker", "quarter", "scrutiny", "case"];
  function tok(name, extra) {
    var i = TOKENS.indexOf(name); if (i < 0) i = 0;
    return '<i class="tok tok-' + name + (extra ? " " + extra : "") + '" aria-hidden="true" style="background-position:' + (i * 100 / 7).toFixed(3) + '% 0"></i>';
  }
  LD.tok = tok;
  /* Resource levels: ok / warn / danger. Same thresholds everywhere (hub, fights, bunker). */
  function resLevel(kind, v) {
    if (kind === "cash") return v < 5 ? "danger" : v < 12 ? "warn" : "ok";
    if (kind === "unrest") return v >= 40 ? "danger" : v >= 20 ? "warn" : "ok";
    if (kind === "collapse") return v >= 55 ? "danger" : v >= 35 ? "warn" : "ok";
    if (kind === "scrutiny") return v >= 0.66 ? "danger" : v >= 0.33 ? "warn" : "ok";
    return "ok";
  }
  LD.resLevel = resLevel;
  var RES_TOK = { cash: "cash", unrest: "unrest", collapse: "collapse", div: "div", bunker: "bunker", quarter: "quarter", scrutiny: "scrutiny", case: "case", heat: "scrutiny" };
  function resPill(kind, val, tip, opts) {
    opts = opts || {};
    var lvl = opts.lvl || resLevel(kind, typeof val === "number" ? val : 0);
    var shown = opts.text != null ? opts.text : (kind === "cash" ? "$" + val + "M" : String(val));
    return '<span class="rs rs-' + kind + " lvl-" + lvl + (opts.cls ? " " + opts.cls : "") + '" data-tip="' + escapeHtml(tip || "") + '" data-num="' + (typeof val === "number" ? val : "") + '" data-kind="' + kind + '" role="button" tabindex="0" aria-label="' + escapeHtml(tip || shown) + '">' + tok(RES_TOK[kind] || "cash") + "<b>" + escapeHtml(shown) + "</b>" + (opts.label ? "<small>" + escapeHtml(opts.label) + "</small>" : "") + "</span>";
  }
  LD.resPill = resPill;

  /* ---------- Journey title: the climb from 1978 to the bunker ---------- */
  var JOURNEY_STOPS = [
    { era: 1, year: "1978", name: "The Street", p: [64, 67], l: [64, 81], blurb: "Mills closing, rents rising, the union hall half empty. Everything is for sale, cheap. Every climb starts here." },
    { era: 2, year: "2008", name: "The Middle", p: [47, 54], l: [79, 56], blurb: "The banks fell over and somebody has to pay. Lobby, spin, foreclose, and keep climbing." },
    { era: 3, year: "Today", name: "The Top", p: [70, 41], l: [64, 35], blurb: "The sea is at the door and the sky garden is lovely. Finish the bunker before the doors close." },
    { era: 4, year: "Summit", name: "The Bunker", p: [86, 25], l: [86, 13], blurb: "One hatch, four systems, a private tomorrow. Seal it and evacuate." }
  ];
  LD.JOURNEY_STOPS = JOURNEY_STOPS;
  function journeyProgress(meta) {
    var best = 0, act = LD.actOf || function (t) { return t <= 4 ? 1 : t <= 8 ? 2 : 3; };
    (meta.history || []).forEach(function (h) { var a = h.result === "win" ? 4 : act(Math.min(12, h.turn || 1)); if (a > best) best = a; });
    if ((meta.wins | 0) > 0) best = 4;
    var cur = meta.midRun && !meta.midRun.ended ? act(Math.min(12, meta.midRun.turn || 1)) : 0;
    return { best: best, cur: cur };
  }
  LD.journeyProgress = journeyProgress;
  function radioSvg(on) {
    return '<svg viewBox="0 0 40 40" aria-hidden="true"><rect x="5" y="13" width="30" height="21" rx="4" class="rd-body"/><circle cx="14" cy="23.5" r="5.5" class="rd-spk"/><rect x="23" y="19" width="8" height="2.4" class="rd-dial"/><rect x="23" y="24" width="8" height="2.4" class="rd-dial"/><path d="M12 13 L26 5" class="rd-ant"/>' +
      (on ? '<path d="M33 8 q3 3 0 6 M36 5 q5 6 0 12" class="rd-wave"/>' : '<path d="M31 6 L39 14 M39 6 L31 14" class="rd-x"/>') + "</svg>";
  }
  LD.radioSvg = radioSvg;

  function renderTitle(opts) {
    opts = opts || {};
    var meta = opts.meta || { midRun: null, finished: 0, wins: 0 };
    var prog = journeyProgress(meta);
    var soundOn = LD.SFX ? !/off/i.test(LD.SFX.label()) : true;
    var mid = meta.midRun && !meta.midRun.ended ? meta.midRun : null;
    var html = '<div class="jy" id="jy">';
    html += '<div class="jy-stage" id="jy-stage"><img class="jy-art" id="jy-poster" alt="" src="assets/journey/journey-portrait.webp">' +
      '<video class="jy-art jy-vid" id="jy-video" muted loop playsinline autoplay preload="auto" aria-hidden="true" tabindex="-1"></video>';
    html += '<div class="jy-stops" role="list" aria-label="The climb">';
    JOURNEY_STOPS.forEach(function (st) {
      var reached = prog.best >= st.era, here = prog.cur === st.era, next = !reached && st.era === Math.min(4, prog.best + 1);
      html += '<button type="button" role="listitem" class="jy-stop e' + st.era + (reached ? " reached" : "") + (here ? " here" : "") + (next ? " next" : "") + (st.era === 4 ? " summit" : "") + '" data-era="' + st.era + '" style="--px:' + st.p[0] + "%;--py:" + st.p[1] + "%;--lx:" + st.l[0] + "%;--ly:" + st.l[1] + '%" aria-label="' + escapeHtml(st.year + ", " + st.name + (reached ? ", reached" : "")) + '">' +
        '<span class="jy-pin" aria-hidden="true"></span><span class="jy-badge"><b>' + escapeHtml(st.year) + "</b><i>" + escapeHtml(st.name) + "</i></span>" +
        (reached ? '<span class="jy-visa" aria-hidden="true">' + (st.era === 4 ? "Sealed" : "Visited") + "</span>" : "") +
        (here ? '<span class="jy-here" aria-hidden="true">You are here</span>' : "") + "</button>";
    });
    html += "</div></div>";
    html += '<div class="jy-postcard" id="jy-postcard" hidden></div>';
    html += '<header class="jy-head"><h1 class="jy-word"><span>Last</span> <span>Dividend</span></h1><p class="jy-tag"><span>A brighter tomorrow, privately owned</span></p></header>';
    html += '<button type="button" class="jy-radio' + (soundOn ? " on" : "") + '" id="btn-sound" aria-pressed="' + soundOn + '" aria-label="' + (soundOn ? "Sound on" : "Sound off") + '">' + radioSvg(soundOn) + "</button>";
    html += '<nav class="jy-rail" aria-label="Main menu">';
    html += '<div class="jy-tickets">';
    if (mid) {
      var ma = (LD.actOf ? LD.actOf(Math.min(12, mid.turn || 1)) : 1), me = LD.ERAS && LD.ERAS[ma];
      html += '<button type="button" class="jy-ticket teal" id="btn-continue"><span class="tk-main"><small>Return ticket</small><b>Continue</b><em>Q' + (mid.turn || 1) + " · " + escapeHtml(me ? (ma === 3 ? "Today" : me.year) + " · " + me.name : "") + '</em></span><span class="tk-stub" aria-hidden="true"><small>Seat</small>Q' + (mid.turn || 1) + "</span></button>";
    }
    html += '<button type="button" class="jy-ticket' + (mid ? " ochre" : "") + '" id="btn-new"><span class="tk-main"><small>Admit one · departs 1978</small><b>Begin the Climb</b><em>' + (mid ? "A new run replaces your saved one" : "The Street, Port Calder") + '</em></span><span class="tk-stub" aria-hidden="true"><small>Platform</small>1978</span></button>';
    html += "</div>";
    html += '<div class="jy-stubs">';
    html += '<button type="button" class="jy-stub lounge" id="btn-boardroom"><span class="st-ico" aria-hidden="true">' + doorIco() + '</span><span class="st-t"><b>Summit Lounge</b><em class="div-stamp">' + tok("div") + (meta.dividends || 0) + "</em></span></button>";
    html += '<button type="button" class="jy-stub" id="btn-how"><span class="st-ico" aria-hidden="true">' + brochureIco() + '</span><span class="st-t"><b>Brochure</b><em>How to play</em></span></button>';
    html += '<button type="button" class="jy-stub" id="btn-history"><span class="st-ico" aria-hidden="true">' + passportIco() + '</span><span class="st-t"><b>Passport</b><em>' + (meta.finished ? meta.finished + " stamp" + (meta.finished === 1 ? "" : "s") : "Past climbs") + "</em></span></button>";
    html += '<button type="button" class="jy-stub" id="btn-prosp"><span class="st-ico" aria-hidden="true">' + guideIco() + '</span><span class="st-t"><b>Guidebook</b><em>The collection</em></span></button>';
    html += "</div></nav>";
    html += '<p class="jy-foot">Browser demo' + (meta.finished ? " · " + meta.finished + " climb" + (meta.finished === 1 ? "" : "s") + " · " + (meta.wins | 0) + " evacuated" : "") + "</p>";
    html += "</div>";
    return html;
  }
  function doorIco() { return '<svg viewBox="0 0 32 32"><rect x="8" y="4" width="16" height="25" rx="1.5" class="i-fill"/><path d="M8 29V6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v23M5 29h22M12 9h8M12 14h8" class="i-line"/><circle cx="20" cy="18" r="1.4" class="i-dot"/></svg>'; }
  function brochureIco() { return '<svg viewBox="0 0 32 32"><path d="M4 7l8-2 8 2 8-2v20l-8 2-8-2-8 2z" class="i-fill"/><path d="M4 7l8-2 8 2 8-2v20l-8 2-8-2-8 2zM12 5v20M20 7v20" class="i-line"/></svg>'; }
  function passportIco() { return '<svg viewBox="0 0 32 32"><rect x="7" y="3" width="18" height="26" rx="2" class="i-fill"/><rect x="7" y="3" width="18" height="26" rx="2" class="i-line"/><circle cx="16" cy="14" r="4.5" class="i-line"/><path d="M11.5 14h9M16 9.5c-2 3-2 6 0 9M16 9.5c2 3 2 6 0 9M11 23h10" class="i-line"/></svg>'; }
  function guideIco() { return '<svg viewBox="0 0 32 32"><path d="M6 5h15a3 3 0 0 1 3 3v20H9a3 3 0 0 1-3-3z" class="i-fill"/><path d="M6 25V5h15a3 3 0 0 1 3 3v20H9a3 3 0 0 1-3-3 3 3 0 0 1 3-3h15M11 10h8M11 14h6" class="i-line"/><path d="M19 3v8l2-1.5 2 1.5V3" class="i-dot"/></svg>'; }

  function renderTutorial(pageIndex) {
    var pages = LD.TUTORIAL;
    var p = pages[pageIndex] || pages[0];
    var html = '<div class="page inner tutorial-page jy-brochure-page"><div class="page-inner">';
    html += '<div class="tutorial-copy">';
    html += '<div class="inner-head"><div class="kicker">Travel brochure · page ' + (pageIndex + 1) + " of " + pages.length + '</div><h2>' + escapeHtml(p.title) + "</h2></div>";
    html += "<p>" + escapeHtml(p.body) + "</p>";
    html += '<div class="dots" aria-hidden="true">';
    for (var i = 0; i < pages.length; i++) html += "<i class='" + (i === pageIndex ? "on" : "") + "'></i>";
    html += "</div></div>";
    html += "<div class='btn-row'>";
    if (pageIndex < pages.length - 1) {
      html += '<button class="btn btn-coral" id="btn-next">Next</button>';
      html += '<button class="btn btn-ghost" id="btn-skip">Skip</button>';
    } else {
      html += '<button class="btn btn-coral" id="btn-done">Understood</button>';
    }
    html += "</div></div></div>";
    return html;
  }

  function unlockHint(exec) {
    if (exec.unlock === "finish-run") return "Finish any run to unlock.";
    if (exec.unlock === "win-run") return "Evacuate once, or buy the seat for " + exec.price + " ◈ in the Summit Lounge.";
    if (exec.unlock === "three-runs") return "Finish three runs, or buy the seat for " + exec.price + " ◈ in the Summit Lounge.";
    if (exec.unlock === "buy") return "Buy the seat for " + exec.price + " ◈ in the Summit Lounge.";
    return "Locked.";
  }

  function divBadge(meta) {
    return '<span class="div-badge div-stamp" aria-label="' + (meta.dividends || 0) + ' Dividends">' + tok("div") + (meta.dividends || 0) + "</span>";
  }

  /* ---------- Executive select: swipeable poster carousel (2026-11-14) ---------- */
  var ICONS = ["water", "power", "food", "air", "logistics", "cheaper", "delay", "quiet", "heat", "handshake", "media", "stamp", "permit", "offshore", "engineer", "deed", "lock", "medal"];
  function ico(name, extra) {
    var t = TOKENS.indexOf(name);
    if (t >= 0) return '<i class="ico ico-t ico-' + name + (extra ? " " + extra : "") + '" aria-hidden="true" style="background-position:' + (t * 100 / 7).toFixed(3) + '% 0"></i>';
    var i = ICONS.indexOf(name); if (i < 0) i = 0;
    return '<i class="ico ico-' + name + (extra ? " " + extra : "") + '" aria-hidden="true" style="background-position:' + (i * 100 / (ICONS.length - 1)).toFixed(3) + '% 0"></i>';
  }
  LD.ico = ico;
  /* Three painted badges per executive, from their real starting kit. */
  function execBadges(ex) {
    var s = ex.start || {}, p = ex.perks || {};
    var out = [];
    ["water", "power", "food", "air"].forEach(function (k) { if (s[k]) out.push([k, k.charAt(0).toUpperCase() + k.slice(1) + " room built", "Starts with a Sound " + k + " room already in the bunker."]); });
    ["water", "power", "air"].forEach(function (k) { var d = p[k + "UpgradeDiscount"]; if (d) out.push(["cheaper", k.charAt(0).toUpperCase() + k.slice(1) + " works −$" + d + "M", k.charAt(0).toUpperCase() + k.slice(1) + " upgrades cost $" + d + "M less."]); });
    if (p.foodCollapseRelief) { out.push(["quiet", "Quieter street", "Starts at unrest " + s.unrest + ", the calmest seat at the table."]); out.push(["delay", "Slower Act I", "The collapse clock runs a little slower through 1978."]); }
    if (p.conversionRate) out.push(["offshore", "Private keeps " + Math.round(p.conversionRate * 100) + "%", "Going private keeps " + Math.round(p.conversionRate * 100) + "% of every deal's cash."]);
    if (p.privateWorks) out.push(["cheaper", "Contractors −" + Math.round((1 - p.privateWorks) * 100) + "%", "Private contractors build " + Math.round((1 - p.privateWorks) * 100) + "% cheaper; engineers cost +$" + (p.engineerExtra || 0) + "M."]);
    if (p.delayBonus) { out.push(["unrest", "More heat", "Starts at unrest " + s.unrest + "."]); out.push(["delay", "Bad news +" + p.delayBonus + "Q", "Delayed fallout lands one quarter later."]); }
    if (s.collapse > 20) out.push(["heat", "Hotter clock", "Collapse starts at " + s.collapse + " instead of 20."]);
    out.unshift(["cash", "$" + s.cash + "M float", "Starting cash: $" + s.cash + "M."]);
    /* cash first only when it's the headline (Julian, Cassius); sector rooms lead otherwise */
    if (s.water || s.power || s.food || s.air) out.push(out.shift());
    return out.slice(0, 3);
  }
  LD.execBadges = execBadges;
  var PERK_ICON = { golden: "handshake", media: "media", regulator: "stamp", permits: "permit", offshore: "offshore", retainer: "engineer", legacy: "deed" };
  var PERK_SHORT = { golden: "Handshake", media: "Media", regulator: "Regulator", permits: "Permits", offshore: "Offshore", retainer: "Retainer", legacy: "Legacy" };
  function lockShort(ex) {
    if (ex.unlock === "finish-run") return "Finish any run";
    if (ex.unlock === "win-run") return "Evacuate once · or ◈ " + ex.price;
    if (ex.unlock === "three-runs") return "Finish 3 runs · or ◈ " + ex.price;
    if (ex.unlock === "buy") return "Buy the seat · ◈ " + ex.price;
    return "Locked";
  }
  function posterHtml(meta, ex, o) {
    var open = LD.isExecutiveUnlocked(ex.id, meta);
    var lvx = LD.levelFromXp ? LD.levelFromXp((meta.xp || {})[ex.id] | 0) : null;
    var best = meta.bestRating && meta.bestRating[ex.id] != null ? LD.ratingName(meta.bestRating[ex.id]) : null;
    var a = Math.abs(o);
    var h = '<article class="cx-poster' + (o === 0 ? " on" : "") + (open ? "" : " locked") + '" data-id="' + ex.id + '" style="--o:' + o + ";--a:" + a + '" role="group" aria-roledescription="slide" aria-label="' + escapeHtml(ex.name) + (open ? "" : " (locked)") + '"' + (a > 1 ? ' aria-hidden="true"' : "") + ">";
    h += '<div class="cx-art"><img src="assets/exec/exec-' + ex.id + (open ? "" : "-locked") + '.webp" alt="" draggable="false">';
    if (open && lvx) {
      h += '<div class="cx-lv" title="' + (lvx.need ? lvx.into + "/" + lvx.need + " XP to Lv " + (lvx.level + 1) : "Max level") + '"><b>Lv ' + lvx.level + '</b><i class="cx-xp"><i style="width:' + (lvx.need ? Math.round(100 * lvx.into / lvx.need) : 100) + '%"></i></i>' + (best ? '<small>best ' + best + "</small>" : "") + "</div>";
    }
    h += "</div>";
    h += '<header class="cx-plate"><h3 class="cx-name">' + escapeHtml(ex.name) + '</h3><p class="cx-firm"><span class="cx-title">' + escapeHtml(ex.title) + '</span> · <span class="cx-co">' + escapeHtml(ex.firm) + "</span></p></header>";
    if (!open) h += '<div class="cx-locktag">' + ico("lock") + "<b>Locked</b><span>" + escapeHtml(lockShort(ex)) + "</span></div>";
    h += '<footer class="cx-kit">';
    execBadges(ex).forEach(function (b) { h += '<span class="cx-kit-i" title="' + escapeHtml(b[2]) + '">' + ico(b[0]) + "<b>" + escapeHtml(b[1]) + "</b></span>"; });
    h += "</footer>";
    h += '<p class="cx-trait">' + escapeHtml(ex.trait || "") + "</p>";
    return h + "</article>";
  }
  function execOffset(i, cur, n) { var o = ((i - cur) % n + n) % n; if (o > n / 2) o -= n; return o; }
  LD.execOffset = execOffset;

  /* Right-hand / lower half: modifiers, ticket, depart. Re-rendered on its own when the carousel moves. */
  function renderExecSide(opts) {
    opts = opts || {};
    var meta = LD.migrateMeta(opts.meta || {});
    var selected = opts.selectedExec || "mara";
    var ex = LD.execById(selected);
    var open = LD.isExecutiveUnlocked(selected, meta);
    var rating = opts.rating | 0;
    var maxR = LD.ratingUnlocked(meta, selected);
    var R = LD.RATINGS[rating];
    var html = '<p class="cx-blurb">' + escapeHtml(open ? ex.blurb : unlockHint(ex)) + "</p>";
    html += '<section class="cx-mods" aria-label="Modifiers"><h3 class="cx-h">Modifiers <button class="link-btn fy-explain cx-rules" id="btn-rules" data-explain="ratings">All rules ▸</button></h3>';
    /* Credit rating stamp */
    html += '<div class="cx-rating"><div class="cx-stamp-row">';
    html += '<button class="cx-step" id="cx-r-prev" aria-label="Lower rating"' + (rating <= 0 ? " disabled" : "") + ">◂</button>";
    html += '<div class="cx-stamp t' + Math.min(10, rating) + '" role="status" aria-label="Credit rating ' + R.id + '"><small>Credit rating</small><b>' + R.id + "</b><em>×" + LD.ratingMultiplier(rating).toFixed(1) + " exit ◈</em></div>";
    html += '<button class="cx-step" id="cx-r-next" aria-label="Raise rating"' + (rating >= LD.RATINGS.length - 1 ? " disabled" : rating >= maxR ? ' aria-disabled="true" data-locked="1"' : "") + ">▸</button></div>";
    html += '<div class="cx-ladder" role="radiogroup" aria-label="Credit rating ladder">';
    LD.RATINGS.forEach(function (r, i) {
      var lk = i > maxR || !open;
      html += '<button class="cx-pip' + (i === rating ? " on" : "") + (lk ? " locked" : "") + (i < rating ? " past" : "") + '" role="radio" aria-checked="' + (i === rating) + '" data-rating="' + i + '" title="' + escapeHtml(r.id + (lk ? " · locked: win at " + LD.ratingName(Math.max(0, i - 1)) + " to unlock" : " · " + r.text)) + '"' + (lk ? " disabled" : "") + ">" + r.id + "</button>";
    });
    html += "</div>";
    var rule = rating === 0 ? R.text : R.text + (rating > 1 ? " · +" + (rating - 1) + " earlier rule" + (rating > 2 ? "s" : "") : "");
    html += '<p class="cx-rule"><b>×' + LD.ratingBaseMult(rating).toFixed(1) + " base · ×" + LD.ratingMultiplier(rating).toFixed(1) + " exit ◈</b> " + escapeHtml(rule) + "</p>";
    var nextLocked = rating === maxR && maxR < LD.RATINGS.length - 1;
    var fc = meta.fyClears && LD.FIRST_CLEAR ? (meta.fyClears.indexOf(selected + ":" + rating) === -1 ? "First clear +" + LD.FIRST_CLEAR(rating).div + " ◈" : "Cleared here") : "";
    html += '<p class="cx-next">' + (nextLocked ? ico("lock") + " " + LD.RATINGS[maxR + 1].id + ": win a run at " + R.id + " to unlock" : "") + (fc ? '<span class="cx-fc">' + escapeHtml(fc) + "</span>" : "") + "</p>";
    html += "</div>";
    /* Perquisites as luggage tags */
    var slots = LD.perkSlots(meta, rating);
    var eqN = meta.equipped.filter(function (id) { return meta.owned.indexOf("perk:" + id) !== -1; }).length;
    html += '<div class="cx-perks"><div class="cx-perks-h"><span>Perks</span><b class="cx-slots" aria-label="' + Math.min(eqN, slots) + " of " + slots + ' slots">' + Math.min(eqN, slots) + "/" + slots + "</b>" + (rating >= LD.PERK_CAP_RATING && LD.perkSlots(meta) > 1 ? '<small>1 slot at BB and below</small>' : "") + "</div>";
    html += '<div class="cx-tags">';
    LD.PERKS.forEach(function (p) {
      var owned = meta.owned.indexOf("perk:" + p.id) !== -1, on = owned && meta.equipped.indexOf(p.id) !== -1;
      html += '<button class="cx-tag' + (on ? " on" : "") + (owned ? "" : " locked") + (opts.perkFocus === p.id ? " focus" : "") + '" data-perk-tag="' + p.id + '" aria-pressed="' + on + '" aria-label="' + escapeHtml(p.name + (on ? ", equipped" : owned ? ", owned" : ", locked, " + p.price + " Dividends")) + '">' +
        '<i class="cx-hole"></i>' + ico(PERK_ICON[p.id] || "medal") + "<b>" + escapeHtml(PERK_SHORT[p.id] || p.name) + "</b>" + (on ? '<em class="cx-check">✓</em>' : owned ? "" : '<em class="cx-price">◈' + p.price + "</em>") + "</button>";
    });
    html += "</div>";
    var fp = opts.perkFocus ? LD.PERKS.filter(function (p) { return p.id === opts.perkFocus; })[0] : null;
    if (fp) {
      var fo = meta.owned.indexOf("perk:" + fp.id) !== -1, fon = fo && meta.equipped.indexOf(fp.id) !== -1;
      var fi = LD.PERKS.indexOf(fp);
      html += '<div class="cx-tip" role="dialog" style="--tx:' + ((fi + 0.5) * 100 / LD.PERKS.length).toFixed(2) + '%" aria-label="' + escapeHtml(fp.name) + '"><b>' + escapeHtml(fp.name) + '</b><span class="up">▲ ' + escapeHtml(fp.up) + '</span><span class="down">▼ ' + escapeHtml(fp.down) + "</span>" +
        (fo ? '<button class="cx-tip-btn' + (fon ? "" : " go") + '" data-perk="' + fp.id + '">' + (fon ? "Unequip" : "Equip") + "</button>" : '<span class="cx-tip-lock">' + ico("lock") + " ◈ " + fp.price + " in the Summit Lounge" + (meta.dividends >= fp.price ? " · you can afford it" : "") + "</span>") +
        '<button class="cx-tip-x" id="cx-tip-x" aria-label="Close">×</button></div>';
    }
    var packsOwned = (LD.PACKS || []).filter(function (p) { return meta.owned.indexOf("pack:" + p.id) !== -1; });
    if (packsOwned.length) html += '<button class="cx-packs" id="btn-loadout">Prospectus ' + packsOwned.filter(function (p) { return meta.packsOff.indexOf(p.id) === -1; }).length + "/" + packsOwned.length + " ▸</button>";
    html += "</div></section>";
    /* Hidden loadout content for the Prospectus sheet (old logic, unchanged) */
    html += '<div class="lo-extra" id="lo-extra" hidden>';
    if (packsOwned.length) {
      html += '<h3>Prospectus</h3><div class="perk-row">';
      packsOwned.forEach(function (p) {
        var on2 = meta.packsOff.indexOf(p.id) === -1;
        html += '<button class="pack-chip perk-chip' + (on2 ? " on" : "") + '" data-pack="' + p.id + '" aria-pressed="' + on2 + '"><b>' + escapeHtml(p.name) + "</b><span>" + escapeHtml(p.text) + "</span></button>";
      });
      html += "</div>";
    }
    html += "</div>";
    /* Ticket strip */
    html += '<div class="cx-ticket">';
    html += '<button class="cx-depart" id="btn-start"' + (open ? "" : " disabled") + '><span class="cx-depart-face"><b>' + (open ? "Depart for 1978" : "Seat locked") + "</b><small>" + escapeHtml(open ? ex.name + " · " + R.id + (slots && eqN ? " · " + Math.min(eqN, slots) + " perk" + (Math.min(eqN, slots) > 1 ? "s" : "") : "") : unlockHint(ex)) + "</small></span></button>";
    html += '<div class="cx-stubs">';
    html += '<div class="cx-seed"><label for="seed-input">Ticket No.</label><input id="seed-input" type="text" inputmode="text" autocomplete="off" placeholder="random" value="' + escapeHtml(opts.seedDraft || "") + '"><button class="cx-roll" id="btn-roll" type="button">Roll</button></div>';
    html += '<button class="cx-stub" id="btn-boardroom2"' + (!open && ex.price && (meta.dividends || 0) >= ex.price ? " data-can-buy=\"1\"" : "") + '>Summit Lounge' + ((!open && ex.price) ? "<small>Buy seat ◈" + ex.price + "</small>" : "<small>◈ " + (meta.dividends || 0) + "</small>") + "</button>";
    html += '<button class="cx-stub ghost" id="btn-back">◂ Street</button>';
    html += "</div></div>";
    return html;
  }
  LD.renderExecSide = renderExecSide;

  function renderExec(opts) {
    opts = opts || {};
    var meta = LD.migrateMeta(opts.meta || {});
    var selected = opts.selectedExec || "mara";
    var cur = 0, n = LD.EXECUTIVES.length;
    LD.EXECUTIVES.forEach(function (ex, i) { if (ex.id === selected) cur = i; });
    var html = '<div class="page inner exec-page jy-board cx-page"><div class="page-inner cx-inner">';
    html += '<div class="cx-left"><div class="inner-head cx-head"><div class="kicker">Boarding · departures to 1978 ' + divBadge(meta) + '</div><h2>Who’s making the climb?</h2></div>';
    html += '<div class="cx-stage" id="cx-stage" aria-roledescription="carousel" aria-label="Executives" tabindex="0">';
    html += '<div class="cx-track" id="cx-track">';
    LD.EXECUTIVES.forEach(function (ex, i) { html += posterHtml(meta, ex, execOffset(i, cur, n)); });
    html += "</div>";
    html += '<button class="cx-arrow prev" id="cx-prev" aria-label="Previous executive">◂</button><button class="cx-arrow next" id="cx-next" aria-label="Next executive">▸</button>';
    html += "</div>";
    html += '<div class="cx-dots" role="tablist" aria-label="Choose executive">';
    LD.EXECUTIVES.forEach(function (ex, i) {
      var open = LD.isExecutiveUnlocked(ex.id, meta);
      html += '<button class="cx-dot' + (i === cur ? " on" : "") + (open ? "" : " locked") + '" data-i="' + i + '" role="tab" aria-selected="' + (i === cur) + '" aria-label="' + escapeHtml(ex.name) + '"></button>';
    });
    html += "</div></div>";
    html += '<div class="cx-side" id="cx-side">' + renderExecSide(opts) + "</div>";
    html += "</div></div>";
    return html;
  }

  /* ---------- Summit Lounge: concierge key rack (2026-11-15) ----------
     Every unlock is a key on a hook with a luggage tag. Tap a tag to open the ledger; sign to buy. */
  var LG_ICONS = ["esg", "disaster", "hostile", "sunrise", "golden", "neon", "storm", "gilded", "brutalist", "standard", "yacht", "server", "gold", "redink", "neonsign", "archive", "slot2", "rolodex"];
  function lgIco(name) {
    var i = LG_ICONS.indexOf(name); if (i < 0) i = LG_ICONS.length - 1;
    return '<i class="ico lg-ico" aria-hidden="true" style="background-position:' + (i * 100 / (LG_ICONS.length - 1)).toFixed(3) + '% 0"></i>';
  }
  var LG_ROWS = [["seats", "Seats"], ["perks", "Perks"], ["packs", "Packs"], ["decor", "Decor"]];
  var LG_SLOT_NAME = { light: "Island lighting", rooms: "Room finish", stamp: "Seal stamp" };
  /* Everything in the Lounge, grouped into the four rack rows. Pure. */
  function loungeItems(meta) {
    var shop = LD.shopItems(), by = {};
    shop.forEach(function (it) { by[it.key] = it; });
    var rows = { seats: [], perks: [], packs: [], decor: [] };
    LD.EXECUTIVES.forEach(function (ex) {
      if (ex.unlocked) return;
      var it = by["exec:" + ex.id] || { key: "exec:" + ex.id, name: ex.name, firm: ex.firm, price: 0, text: ex.blurb, alt: "" };
      var o = { key: it.key, row: "seats", name: ex.name, short: ex.name.replace(/^Dr\.\s*/, "").split(" ")[0], firm: ex.firm, price: it.price || 0, text: ex.blurb, up: ex.trait, img: "assets/exec/exec-" + ex.id, exec: ex.id };
      if (ex.unlock === "win-run") o.alt = "or evacuate once";
      else if (ex.unlock === "three-runs") o.alt = "or finish three runs";
      else if (ex.unlock === "finish-run") { o.alt = "Finish one run to earn this seat"; o.earnOnly = true; }
      rows.seats.push(o);
    });
    var PI = { golden: "handshake", media: "media", regulator: "stamp", permits: "permit", offshore: "offshore", retainer: "engineer", legacy: "deed" };
    var PS = { golden: "Handshake", media: "Media", regulator: "Regulator", permits: "Permits", offshore: "Offshore", retainer: "Retainer", legacy: "Legacy" };
    shop.forEach(function (it) {
      if (it.wing === "perks") {
        var id = it.key.indexOf("perk:") === 0 ? it.key.slice(5) : "";
        rows.perks.push({ key: it.key, row: "perks", name: it.name, short: id ? PS[id] : "2nd slot", price: it.price, up: it.up, down: it.down, icon: id ? PI[id] : null, lg: id ? null : "slot2" });
      } else if (it.wing === "prospectus") {
        var pid = it.key.slice(5);
        rows.packs.push({ key: it.key, row: "packs", name: it.name, short: it.name.split(" ")[0], price: it.price, text: it.text, lg: pid, pack: pid });
      }
    });
    rows.packs.push({ key: "rolodex", row: "packs", name: "The Card File", short: "Cards", price: 0, soon: true,
      text: "Card unlocks are coming to the Lounge: cards you earn by winning, beating bosses and meeting mandates will be filed here." });
    LD.COSMETIC_SLOTS.forEach(function (sl) {
      LD.COSMETICS.forEach(function (c) {
        if (c.slot !== sl[0]) return;
        var lg = c.slot === "stamp" && c.id === "gold" ? "gold" : c.id === "neonsign" ? "neonsign" : c.id;
        rows.decor.push({ key: "cos:" + c.slot + ":" + c.id, row: "decor", name: c.name, short: c.name.split(" ")[0], firm: LG_SLOT_NAME[c.slot], price: c.price || 0, free: !!c.free, text: c.text, slot: c.slot, id: c.id, lg: lg });
      });
    });
    var ar = by["annual:history"];
    if (ar) rows.decor.push({ key: ar.key, row: "decor", name: ar.name, short: "Archive", firm: "Passport", price: ar.price, text: ar.text, lg: "archive" });
    LG_ROWS.forEach(function (r) {
      rows[r[0]].forEach(function (o) {
        o.owned = o.soon ? false : o.free ? true : LD.itemOwned(meta, o.key);
        o.afford = !o.owned && !o.soon && !o.earnOnly && o.price > 0 && meta.dividends >= o.price;
        o.state = o.owned ? "owned" : o.soon ? "soon" : o.earnOnly ? "earn" : o.afford ? "afford" : "short";
      });
    });
    return rows;
  }
  LD.loungeItems = loungeItems;
  function lgKeySvg() {
    return '<svg class="lt-key" viewBox="0 0 24 56" aria-hidden="true"><circle cx="12" cy="10" r="7.5" class="k-f"/><circle cx="12" cy="10" r="3" class="k-h"/><path d="M10 17h4v30h-4z" class="k-f"/><path d="M14 36h5v4h-5zM14 43h4v4h-4z" class="k-f"/></svg>';
  }
  function lgArt(o, big) {
    if (o.exec) return '<span class="lt-port' + (big ? " big" : "") + '"><img src="' + o.img + (o.state === "short" || o.state === "earn" ? "-locked" : "") + '.webp" alt="" draggable="false" loading="lazy"></span>';
    if (o.soon) return '<span class="lt-rolo"><img src="assets/journey/lounge-rolodex.webp" alt="" draggable="false"></span>';
    return o.icon ? ico(o.icon) : lgIco(o.lg);
  }
  function lgTag(o, sel, bought) {
    var cls = "lt lt-" + o.state + (o.key === sel ? " sel" : "") + (o.key === bought ? " lt-thunk" : "");
    var price = o.owned ? "" : o.soon ? '<em class="lt-soon">soon</em>' : o.earnOnly ? '<em class="lt-earn">earn it</em>' : '<em class="lt-price">' + tok("div") + o.price + "</em>";
    var label = o.name + (o.owned ? ", yours" : o.soon ? ", coming soon" : o.earnOnly ? ", earn by finishing a run" : ", " + o.price + " Dividends" + (o.afford ? ", affordable" : ", not enough Dividends"));
    return '<button type="button" class="' + cls + '" data-lt="' + o.key + '" aria-pressed="' + (o.key === sel) + '" aria-label="' + escapeHtml(label) + '">' +
      '<span class="lt-hook" aria-hidden="true"></span>' + lgKeySvg() +
      '<span class="lt-tag"><i class="lt-eye" aria-hidden="true"></i>' + lgArt(o) + "<b>" + escapeHtml(o.short) + "</b>" + price +
      (o.owned ? '<span class="lt-stamp" aria-hidden="true">' + (o.free ? "House" : "Yours") + "</span>" : "") +
      (o.state === "short" || o.state === "earn" ? '<span class="lt-grille" aria-hidden="true"></span>' : "") + "</span></button>";
  }
  function lgLedger(meta, o) {
    if (!o) return '<div class="lg-ledger empty"><p>Tap a tag to read its ledger entry.</p></div>';
    var h = '<div class="lg-ledger lg-' + o.state + '" id="lg-ledger" aria-live="polite"><div class="lg-l-art">' + lgArt(o, true) + "</div><div class=\"lg-l-body\">";
    h += '<div class="lg-l-head"><b class="lg-l-name">' + escapeHtml(o.name) + "</b>" + (o.firm ? '<span class="si-firm">' + escapeHtml(o.firm) + "</span>" : "") + "</div>";
    if (o.row === "seats") {
      if (o.up) h += '<div class="lg-up">▲ ' + escapeHtml(o.up) + "</div>";
      h += '<p class="lg-text">' + escapeHtml(o.text) + "</p>";
    } else {
      if (o.up) h += '<div class="lg-up">▲ ' + escapeHtml(o.up) + "</div>";
      if (o.down) h += '<div class="lg-down">▼ ' + escapeHtml(o.down) + "</div>";
      if (o.text) h += '<p class="lg-text">' + escapeHtml(o.text) + "</p>";
    }
    if (o.alt && !o.owned && !o.earnOnly) h += '<p class="lg-alt">' + escapeHtml(o.alt.charAt(0).toUpperCase() + o.alt.slice(1)) + ", and the seat is yours for free.</p>";
    h += '</div><div class="lg-l-act">';
    if (o.soon) h += '<span class="lg-note">Coming soon</span>';
    else if (o.earnOnly && !o.owned) h += '<span class="lg-note">' + escapeHtml(o.alt) + "</span>";
    else if (!o.owned) {
      h += '<button type="button" class="lg-sign" id="lg-sign" data-buy="' + o.key + '"' + (o.afford ? "" : " disabled") + "><b>" + (o.afford ? "Sign for it" : "The board wants " + o.price + " ◈") + "</b><small>" + (o.afford ? tok("div") + o.price + " · leaves " + (meta.dividends - o.price) : "You have " + meta.dividends + " ◈") + "</small></button>";
    } else if (o.row === "packs") {
      var on = (meta.packsOff || []).indexOf(o.pack) === -1;
      h += '<button type="button" class="lg-toggle' + (on ? " on" : "") + '" data-pack-toggle="' + o.pack + '" aria-pressed="' + on + '"><i></i><b>' + (on ? "In every run" : "Left out") + "</b></button>";
    } else if (o.row === "decor" && o.slot) {
      var eq = LD.equippedCosmetics(meta)[o.slot] === o.id;
      h += '<button type="button" class="lg-equip' + (eq ? " on" : "") + '" data-equip="' + o.slot + ":" + o.id + '"' + (eq ? " disabled" : "") + ">" + (eq ? "Equipped" : "Equip") + "</button>";
    } else if (o.row === "perks" && o.key.indexOf("perk:") === 0) {
      var isEq = (meta.equipped || []).indexOf(o.key.slice(5)) !== -1;
      h += '<span class="lg-note">' + (isEq ? "Equipped · swap at the gate" : "Yours · equip at the gate") + "</span>";
    } else if (o.row === "seats") h += '<span class="lg-note">Seated · pick at the gate</span>';
    else h += '<span class="lg-note">Yours</span>';
    return h + "</div></div>";
  }
  function renderBoardroom(opts) {
    opts = opts || {};
    var meta = LD.migrateMeta(opts.meta || {});
    var rows = loungeItems(meta);
    var all = [];
    LG_ROWS.forEach(function (r) { all = all.concat(rows[r[0]]); });
    var sel = null;
    all.forEach(function (o) { if (o.key === opts.sel) sel = o; });
    if (!sel) all.forEach(function (o) { if (!sel && o.afford) sel = o; });
    if (!sel) all.forEach(function (o) { if (!sel && o.state === "short") sel = o; });
    if (!sel) sel = all[0];
    var html = '<div class="page lounge"><div class="lg-inner">';
    html += '<header class="lg-plate"><img class="lg-plate-art" src="assets/journey/lounge-concierge.webp" alt="" draggable="false">' +
      '<div class="lg-title"><small>Members only</small><h2>Summit Lounge</h2></div>' +
      '<span class="lg-bal br-balance" role="status" aria-label="' + meta.dividends + ' Dividends to spend">' + tok("div") + "<b>" + meta.dividends + "</b><small>to spend</small></span></header>";
    html += '<div class="lg-rack" id="lg-rack">';
    LG_ROWS.forEach(function (r) {
      var list = rows[r[0]];
      if (!list.length) return;
      var can = list.filter(function (o) { return o.afford; }).length, own = list.filter(function (o) { return o.owned && !o.free; }).length;
      html += '<section class="lg-row" data-row="' + r[0] + '"><h3 class="lg-plaque"><span>' + r[1] + "</span><small>" + own + "/" + list.filter(function (o) { return !o.free && !o.soon; }).length + (can ? " · " + can + " within reach" : "") + "</small></h3>";
      html += '<div class="lg-hooks" data-hooks="' + r[0] + '">';
      list.forEach(function (o) { html += lgTag(o, sel && sel.key, opts.bought); });
      html += "</div></section>";
    });
    html += "</div>";
    if (opts.notice) html += '<p class="lg-notice br-notice" role="status">' + escapeHtml(opts.notice) + "</p>";
    html += lgLedger(meta, sel);
    html += '<div class="lg-foot"><button type="button" class="lg-ticket go" id="btn-br-play"><b>To the Gate</b><small>Pick your executive</small></button>' +
      '<button type="button" class="lg-ticket back" id="btn-br-back"><b>Back to the Street</b></button></div>';
    html += "</div></div>";
    return html;
  }
  var END_ART = { win: "endrun/bd-win-today-l", lose: "endrun/bd-lose-1978-l" };
  function renderEnd(state, opts) {
    opts = opts || {};
    var e = state.ending;
    var exec = LD.execById(state.executiveId);
    var pay = opts.payout || LD.computeDividends(state);
    var letter = !!opts.letter;
    var html = '<div class="page inner end-page ' + (letter ? "end-letter" : "end-result") + '"><div class="page-inner">';
    if (!letter) {
      html += '<div class="end-mark ' + e.kind + '">' + (e.kind === "win" ? "Evacuation successful" : "The run is over") + " · " + escapeHtml(LD.ratingName(state.rating)) + "</div>";
      html += "<h2>" + escapeHtml(e.title) + "</h2>";
      html += '<div class="end-hero ' + e.kind + '"><img src="' + escapeHtml(assetUrl(END_ART[e.kind] || END_ART.lose)) + '" alt="">';
      if (opts.newRating != null) html += '<div class="end-stamp challenge">New challenge unlocked: ' + escapeHtml(LD.ratingName(opts.newRating)) + "<small>Harder rules for " + escapeHtml(exec.name) + "</small></div>";
      html += "</div>";
      html += '<p class="end-body">' + escapeHtml(e.body) + "</p>";
      var ready = readinessSummary(state);
      html += '<p class="end-tally">' + escapeHtml(ready.tally) + "</p>";
      html += '<p class="end-div-chip">Dividends earned <b>\u25c8 ' + pay.total + "</b>" + (pay.firstClear ? " · first clear +" + pay.firstClear.div : "") + "</p>";
      if (opts.xp) {
        var xa = opts.xp.after;
        html += '<div class="end-xp"><b>' + escapeHtml(exec.name) + " · Lv " + xa.level + "</b> · +" + opts.xp.gain + " XP" + (opts.xp.levelUp ? " · <b>Level up!</b> " + escapeHtml(opts.xp.newPerks.map(function (p) { return p.text; }).join(", ")) : xa.need ? " · " + xa.into + "/" + xa.need + " to Lv " + (xa.level + 1) : "") +
          '<span class="xp-bar" aria-hidden="true"><span style="width:' + (xa.need ? Math.round(100 * xa.into / xa.need) : 100) + '%"></span></span></div>';
      }
      html += '<div class="pending">Q' + state.turn + " · " + escapeHtml(exec.name) + " \u00b7 seed " + escapeHtml(String(state.seedLabel)) + " \u00b7 Cash " + state.cash + " \u00b7 Unrest " + state.unrest + " \u00b7 Collapse " + state.collapse + "</div>";
      if (LD.renderCarried) html += LD.renderCarried(state);
      html += '<div class="btn-row"><button class="btn btn-coral" id="btn-letter">Shareholder Letter</button>';
      html += '<button class="btn btn-ochre" id="btn-end-board">Summit Lounge ' + (opts.meta ? "\u00b7 \u25c8 " + opts.meta.dividends : "") + "</button>";
      html += '<button class="btn" id="btn-again">Same executive, new seed</button>';
      html += '<button class="btn btn-ghost" id="btn-title">Return to title</button></div>';
    } else {
      html += '<section class="letter" aria-label="Shareholder letter"><div class="letter-head"><div class="kicker">Shareholder Letter</div><p>\u201cThe board thanks you for your service. Whatever happened out there.\u201d</p></div><table>';
      pay.lines.forEach(function (l) {
        if (!l.amount || l.kind === "win") return;
        html += "<tr><th>" + escapeHtml(l.label) + "<small>" + escapeHtml(l.note) + "</small></th><td>+" + l.amount + "</td></tr>";
      });
      html += '<tr class="sub"><th>Operations · ' + escapeHtml(LD.ratingName(pay.rating)) + " \u00d7" + (pay.baseMult || 1).toFixed(1) + "</th><td>" + Math.round((pay.baseSubtotal || 0) * (pay.baseMult || 1)) + "</td></tr>";
      if (pay.winSubtotal) {
        pay.lines.forEach(function (l) {
          if (!l.amount || l.kind !== "win") return;
          html += "<tr><th>" + escapeHtml(l.label) + "<small>" + escapeHtml(l.note) + "</small></th><td>+" + l.amount + "</td></tr>";
        });
        html += '<tr class="sub"><th>Exit · ' + escapeHtml(LD.ratingName(pay.rating)) + " \u00d7" + pay.winMult.toFixed(1) + "</th><td>" + Math.round(pay.winSubtotal * pay.winMult) + "</td></tr>";
      }
      if (pay.firstClear) html += '<tr class="fc"><th>First clear · ' + escapeHtml(LD.ratingName(pay.rating)) + "<small>One time per executive and rating</small></th><td>+" + pay.firstClear.div + "</td></tr>";
      html += '<tr class="total"><th>Dividends paid</th><td>\u25c8 ' + pay.total + "</td></tr></table>";
      if (opts.meta) html += '<p class="letter-foot">Balance \u25c8 ' + opts.meta.dividends + " \u00b7 lifetime \u25c8 " + opts.meta.lifetime.dividends + "</p>";
      html += "</section>";
      html += '<div class="btn-row"><button class="btn btn-ghost" id="btn-end-result">Back to result</button>';
      html += '<button class="btn btn-ochre" id="btn-end-board">Summit Lounge ' + (opts.meta ? "\u00b7 \u25c8 " + opts.meta.dividends : "") + "</button>";
      html += '<button class="btn btn-coral" id="btn-again">Same executive, new seed</button>';
      html += '<button class="btn btn-ghost" id="btn-title">Return to title</button></div>';
    }
    html += "</div></div>";
    return html;
  }

  var STAMP_ERA = ["", "1978 · The Street", "2008 · The Middle", "Today · The Top", "The Bunker"];
  function renderHistory(opts) {
    var meta = LD.migrateMeta ? LD.migrateMeta((opts && opts.meta) || { history: [] }) : ((opts && opts.meta) || { history: [] });
    var hist = meta.history || [], prog = journeyProgress(meta);
    var act = LD.actOf || function (t) { return t <= 4 ? 1 : t <= 8 ? 2 : 3; };
    var html = '<div class="page inner jy-passport"><div class="page-inner">';
    html += '<div class="pp-cover"><div class="pp-crest" aria-hidden="true">' + passportIco() + '</div><div><div class="kicker">Passport · logbook of past climbs</div><h2>Previous quarters</h2></div></div>';
    html += '<div class="pp-stats"><span><b>' + hist.length + "</b>climbs</span><span><b>" + (meta.wins | 0) + "</b>evacuated</span><span><b>" + escapeHtml(prog.best ? STAMP_ERA[prog.best].split(" · ")[0] : "—") + "</b>furthest</span><span>" + tok("div") + "<b>" + (meta.lifetime ? meta.lifetime.dividends : 0) + "</b>lifetime</span></div>";
    if (meta.bestRating && Object.keys(meta.bestRating).length && meta.owned && meta.owned.indexOf("annual:history") !== -1) {
      html += '<p class="muted pp-best">Best ratings: ' + Object.keys(meta.bestRating).map(function (id) { return escapeHtml(LD.execById(id).name) + " " + LD.ratingName(meta.bestRating[id]); }).join(" · ") + "</p>";
    }
    html += '<div class="pp-page">';
    if (!hist.length) {
      html += '<div class="pp-empty"><i class="pp-ghost"></i><i class="pp-ghost"></i><i class="pp-ghost"></i><p>No stamps yet. Your passport is fresh. Finish a climb and the border office stamps it here.</p></div>';
    } else {
      html += '<ul class="pp-stamps">';
      hist.forEach(function (h, i) {
        var name = (LD.execById(h.executiveId) || {}).name || h.executiveId;
        var win = h.result === "win", era = win ? 4 : act(Math.min(12, h.turn || 1));
        var rot = ((i * 37) % 9) - 4;
        html += '<li class="pp-stamp ' + (win ? "win" : "lose") + " e" + era + '" style="--rot:' + rot + 'deg"><span class="ps-ring"><b>' + (win ? "Evacuated" : "Denied") + "</b><i>" + escapeHtml(STAMP_ERA[era]) + "</i><em>Q" + (h.turn || "?") + (h.rating != null ? " · " + LD.ratingName(h.rating) : "") + "</em></span>" +
          '<span class="ps-note"><strong>' + escapeHtml(h.title || "") + "</strong><small>" + escapeHtml(name) + (h.dividends != null ? " · " : "") + (h.dividends != null ? tok("div") + h.dividends : "") + " · ticket " + escapeHtml(String(h.seed)) + "</small></span></li>";
      });
      html += "</ul>";
    }
    html += "</div>";
    html += '<div class="btn-row"><button class="btn btn-ghost" id="btn-h-back">◂ Back to the street</button></div></div></div>';
    return html;
  }

  function renderDeals(state, crisisOpen) {
    var html = '<div class="banner"><h2>Three deals. Choose one.</h2><span class="ap">1 AP</span></div>';
    html += '<div class="deals">';
    state.offered.forEach(function (id) {
      var d = LD.dealById(id);
      if (!d) return;
      var art = dealArtKey(id);
      var open = crisisOpen === id;
      html += "<div>";
      html += '<button class="deal' + (d.isCrisis ? " crisis" : "") + '" data-deal="' + id + '">';
      html += '<div class="deal-layout">';
      if (art) {
        html += '<img class="deal-art" src="' + escapeHtml(assetUrl(art)) + '" alt="">';
      } else {
        html += '<div class="deal-fallback" aria-hidden="true"></div>';
      }
      html += '<div class="deal-body"><div class="kicker">' + escapeHtml(d.kicker) + (d.isCrisis ? " · crisis" : "") + "</div>";
      html += "<h3>" + escapeHtml(d.title) + "</h3>";
      html += "<p>" + escapeHtml(d.body) + "</p>";
      var extra = dealExtraHint(state, d);
      html += '<div class="hint">' + escapeHtml(d.hint) + (extra ? " " + escapeHtml(extra) : "") + "</div></div></div></button>";
      if (d.choices && open) {
        html += '<div class="choices">';
        d.choices.forEach(function (c) {
          var poor = c.cost && state.cash < c.cost;
          html += '<button class="choice" data-deal="' + id + '" data-choice="' + c.id + '"' + (poor ? " disabled" : "") + ">";
          html += "<strong>" + escapeHtml(c.label) + (poor ? " — not enough cash" : "") + "</strong>";
          html += "<span>" + escapeHtml(c.hint) + "</span></button>";
        });
        html += "</div>";
      }
      html += "</div>";
    });
    html += "</div>";
    return html;
  }

  function renderDealScreen(state, crisisOpen) {
    var html = '<div class="page play"><div class="page-inner">';
    html += renderChrome(state);
    html += renderContracts(state);
    html += '<div class="hero-frame deal"><img src="' + escapeHtml(assetUrl("hero-deal")) + '" alt="A financial-report spread of municipal works beside a private shelter ledger."></div>';
    html += renderChips(state);
    html += renderPending(state);
    html += renderDeals(state, crisisOpen);
    html += renderLog(state);
    html += renderPlayNav();
    html += "</div></div>";
    return html;
  }

  function renderReadiness(state) {
    var r = readinessSummary(state);
    var html = '<aside class="readiness"><h3>When the doors close</h3><p>' + escapeHtml(r.rule) + "</p><ul>";
    r.lines.forEach(function (line) {
      html += '<li class="' + line.status + '">' + escapeHtml(line.text) + "</li>";
    });
    html += '</ul><p class="tally">' + escapeHtml(r.tally) + "</p></aside>";
    return html;
  }

  function renderBunkerPanel(state) {
    var html = '<div class="banner"><h2>Bunker works</h2><span class="ap">' + (state.bunkerActedThisTurn ? "Action spent" : "1 AP optional") + "</span></div>";
    html += renderReadiness(state);
    if (state.engineer) {
      html += '<p class="muted">A chief engineer is already retained. Discount systems will hold.</p>';
    }
    if (state.converting) {
      html += '<p class="convert-banner">You already converted. Installs below are billed at the clear rate and arrive this quarter. Further deals pay ' + Math.round(LD.conversionRate(state) * 100) + '% cash.</p>';
    } else if (!state.bunkerActedThisTurn && LD.canBeginConversion && LD.canBeginConversion(state)) {
      html += '<div class="upgrade convert-panel"><h3>Begin conversion to private supply</h3>';
      html += '<div class="meta">Spend this bunker action to leave the public networks. Further deals pay ' + Math.round(LD.conversionRate(state) * 100) + '% cash, but every later install ignores strain or disruption and arrives this quarter. You may also secure one system now at the clear rate.</div>';
      html += '<button class="btn btn-ochre" data-convert="">Convert only</button>';
      html += "</div>";
    }
    LD.availableUpgrades(state).forEach(function (u) {
      var evacNote = u.level >= LD.WIN_LEVEL
        ? (u.level === 3 ? "Level 3 redundancy will hold even if earlier work was discount." : "Level 2 reaches the evacuation threshold.")
        : "Level " + u.level + " is a step toward readiness.";
      var shipNote = "";
      if (u.inbound) {
        shipNote = " A shipment is already in transit and arrives Q" + u.inbound.due + ". Sealing before then leaves this system unfinished.";
      } else if (state.converting) {
        shipNote = " Private supply: billed at the clear rate, arrives this quarter.";
      } else if (u.delay > 0) {
        shipNote = " Public " + u.systemId + " is disrupted: +" + u.surcharge + " now, arrives next quarter. Sealing before it lands leaves this system unfinished.";
      } else if (u.surcharge > 0) {
        shipNote = " Public " + u.systemId + " is strained: +" + u.surcharge + " on this shipment.";
      }
      html += '<div class="upgrade"><h3>' + escapeHtml(u.systemName) + " — " + escapeHtml(u.name) + "</h3>";
      html += '<div class="meta">' + evacNote + " Sound holds. Discount is cheaper and at risk at Lv 2." + shipNote + "</div>";
      html += '<div class="btn-row split">';
      html += '<button class="btn" data-up="' + u.systemId + '" data-q="sound"' + (state.bunkerActedThisTurn || !u.canSound ? " disabled" : "") + ">Sound · " + u.soundCost + "</button>";
      html += '<button class="btn" data-up="' + u.systemId + '" data-q="cheap"' + (state.bunkerActedThisTurn || !u.canCheap ? " disabled" : "") + ">Discount · " + u.cheapCost + "</button>";
      html += "</div>";
      if (!state.converting && !state.bunkerActedThisTurn && !u.inbound && LD.canBeginConversion && LD.canBeginConversion(state)) {
        var soundC = conversionSecureCost(state, u.systemId, "sound");
        var cheapC = conversionSecureCost(state, u.systemId, "cheap");
        html += '<div class="meta">Or convert now and secure this system at the clear rate.</div>';
        html += '<div class="btn-row split">';
        html += '<button class="btn" data-convert="' + u.systemId + '" data-q="sound"' + (state.cash < soundC ? " disabled" : "") + ">Convert &amp; secure · Sound · " + soundC + "</button>";
        html += '<button class="btn" data-convert="' + u.systemId + '" data-q="cheap"' + (state.cash < cheapC ? " disabled" : "") + ">Convert &amp; secure · Discount · " + cheapC + "</button>";
        html += "</div>";
      }
      html += "</div>";
    });
    if (!state.engineer) {
      var ec = LD.engineerCost(state);
      html += '<div class="upgrade"><h3>Retain a chief engineer</h3>';
      html += '<div class="meta">Makes every level-2 discount system hold at evacuation.</div>';
      html += '<button class="btn" id="btn-engineer"' + (state.bunkerActedThisTurn || !LD.canHireEngineer(state) ? " disabled" : "") + ">Hire · " + ec + "</button></div>";
    }
    html += '<div class="btn-row">';
    html += '<button class="btn btn-ochre" id="btn-close">Close the quarter</button>';
    if (LD.canEvacuate(state)) {
      html += '<button class="btn btn-danger" id="btn-seal">Seal the bunker</button>';
    } else if (state.turn < LD.MIN_EVAC_TURN) {
      html += '<p class="muted">Sealing is available from quarter ' + LD.MIN_EVAC_TURN + ".</p>";
    }
    html += "</div>";
    return html;
  }

  function renderBunkerScreen(state) {
    var html = '<div class="page play"><div class="page-inner">';
    html += renderChrome(state);
    html += renderContracts(state);
    html += '<div class="hero-frame bunker"><img src="' + escapeHtml(assetUrl("hero-bunker")) + '" alt="A four-room bunker cutaway showing air, water, power, and food."></div>';
    html += renderChips(state);
    html += renderPending(state);
    html += renderBunkerPanel(state);
    html += renderLog(state);
    html += renderPlayNav();
    html += "</div></div>";
    return html;
  }

  function evacConfirmBody(state) {
    var r = readinessSummary(state);
    var html = '<p class="evac-rule" id="evac-rule">' + escapeHtml(r.rule) + "</p>";
    html += '<button class="link-btn evac-why" id="evac-why" type="button" aria-controls="evac-rule">ⓘ Why rooms fail</button>';
    html += '<div class="readiness" style="margin-top:12px"><ul>';
    r.lines.forEach(function (line) {
      html += '<li class="' + line.status + '">' + escapeHtml(line.text) + "</li>";
    });
    html += '</ul><p class="tally">' + escapeHtml(r.tally) + "</p></div>";
    var inbound = (state.pending || []).some(function (p) { return !!p.install; });
    if (inbound) html += "<p>A paid shipment is still in transit. If you seal now, that system will not be installed in time.</p>";
    if (r.canWin) html += "<p class=\"evac-verdict\">All four systems are ready and will hold if you seal now.</p>";
    else html += "<p class=\"evac-verdict\">If you seal now, this run will end in an unfinished or failed bunker.</p>";
    return html;
  }

  LD.DISCOUNT_RULE = DISCOUNT_RULE;
  LD.escapeHtml = escapeHtml;
  LD.assetUrl = assetUrl;
  LD.dealArtKey = dealArtKey;
  LD.systemStatus = systemStatus;
  LD.systemDetail = systemDetail;
  LD.readinessSummary = readinessSummary;
  LD.renderTitle = renderTitle;
  LD.renderTutorial = renderTutorial;
  LD.renderExec = renderExec;
  LD.renderDealScreen = renderDealScreen;
  LD.renderBunkerScreen = renderBunkerScreen;
  LD.renderEnd = renderEnd;
  LD.renderHistory = renderHistory;
  LD.renderBoardroom = renderBoardroom;
  LD.evacConfirmBody = evacConfirmBody;
  LD.renderChrome = renderChrome;
  LD.renderChips = renderChips;
  LD.renderReadiness = renderReadiness;

  if (typeof module !== "undefined" && module.exports) {
    module.exports = LD;
  }
})(typeof globalThis !== "undefined" ? globalThis : this);

  