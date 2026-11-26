
/* Last Dividend — Fiscal Year renderers: draft, Portfolio, boss cards, act chips. Pure string builders. Browser + Node. */
(function (root) {
  var LD = root.LD || (root.LD = {});
  /* Painted icons (assets/icons/*.webp) for Assets, briefcase items, fixers, curses, bosses, memos and encounters; the emoji stays as the fallback. */
  var ICON_ART = ("shell lobby creative vertical regcap press thoughts astro philan narrative bulk prefab oncall redund easement plantmgr utility toll " +
    "hedge chaser short offsets geo consult buyback loyalty toobig overtime penthouse surge influencer brine privgrid disfut futures rolodex chief soundproof holo " +
    "doorman prblitz gala hotline contract rush cloud security liquidity hush pod c_class c_subpoena c_whistle c_leak c_crack c_stranded " +
    "hollis chip pike ines tamsin bryce dex priya gus lorne margo").split(" ");
  ICON_ART = ICON_ART.concat("boss-earnings boss-shortseller boss-strike boss-bid boss-crash boss-reckoning boss-heatdome boss-seawall".split(" "),
    "memo-leak memo-celebrity memo-troll memo-wedding memo-summit memo-union memo-activist memo-space memo-collab memo-taxholiday memo-pension memo-drought memo-headhunter memo-distressed memo-oldfriend".split(" "),
    "enc-regulator enc-rival enc-protest enc-journalist enc-hearing".split(" "));
  var ICON_SET = {}; ICON_ART.forEach(function (k) { ICON_SET[k] = 1; });
  LD.ICON_ART = ICON_ART; LD.ICON_SET = ICON_SET;
  function IA(o, kind, id) {
    if (!o) return "";
    var k = (kind ? kind + "-" : "") + (id || o.id), em = o.icon || "";
    if (!ICON_SET[k]) return em;
    return '<span class="ia"><img src="assets/icons/' + k + '.webp" alt="" draggable="false" onerror="this.parentNode.className+=\' ia-x\'"><i>' + em + "</i></span>";
  }
  LD.iconArt = IA;
  /* Encounters that are also bosses share the boss painting */
  LD.encArt = function (E, id) { if (!E) return ""; return ICON_SET["boss-" + id] ? IA(E, "boss", id) : IA(E, "enc", id); };
  function esc(s) { return LD.escapeHtml(s); }
  function money(n) { return (n < 0 ? "−$" : "$") + Math.abs(n) + "M"; }
  var RCLS = { C: "r-c", U: "r-u", R: "r-r", L: "r-l" };

  function setLine(state, arch, plus) {
    var a = LD.ARCHETYPES[arch];
    if (!a || !a.set) return "";
    var n = LD.fyArchCount(state, arch) + (plus || 0);
    return n >= a.set ? "✓ " + a.setName + ": " + a.setText : a.name + " " + Math.min(n, a.set) + "/" + a.set + " → " + a.setName;
  }

  function card(state, id, sel, rider, idx) {
    var c = LD.assetById(id);
    var h = '<button class="fy-card ' + RCLS[c.r] + (sel ? " sel" : "") + '" data-asset="' + id + '" aria-pressed="' + (sel ? "true" : "false") + '" style="--i:' + (idx | 0) + '">';
    h += '<span class="fy-ico" aria-hidden="true">' + IA(c) + '</span><span class="fy-txt"><b>' + esc(c.name) + "</b>";
    h += '<em><i class="fy-gem" aria-hidden="true"></i>' + esc(LD.RARITY[c.r].name) + " · " + esc(LD.ARCHETYPES[c.arch].name) + "</em>";
    h += '<span class="fy-eff">' + esc(c.text) + "</span>";
    var sl = setLine(state, c.arch, 1);
    if (sl) h += '<span class="fy-set">' + esc(sl) + "</span>";
    h += "</span>";
    if (rider) h += '<span class="fy-stamp" aria-label="Liability rider">Rider</span>';
    return h + "</button>";
  }

  function renderDraft(state, ui) {
    ui = ui || {};
    var f = state.fy, d = f.draft;
    var used = LD.fySlotsUsed(state), full = used >= f.cap;
    var selC = ui.sel ? LD.assetById(ui.sel) : null;
    var h = '<div class="fy-draft' + (ui.replacing ? " replacing" : "") + (ui.reveal ? " reveal" : "") + '" role="dialog" aria-label="Quarterly Acquisitions">';
    h += '<div class="fy-head"><div class="dz-k">Q' + d.closed + " closed · Quarterly Acquisitions</div>";
    h += "<h2>" + (d.rare ? "Boss beaten: a rare draft" : "Choose one Asset") + "</h2>";
    h += '<div class="fy-chips"><button class="fx-chip own fy-pf" id="fy-pf">💼 Portfolio ' + used + "/" + f.cap + '</button><span class="fx-chip good">Cash ' + money(state.cash) + "</span>";
    if (d.rider) h += '<button class="fx-chip bad fy-explain" data-explain="liabilities">⚠ Rider: picking adds a random Liability ⓘ</button>';
    else h += '<span class="fx-chip meh">Free pick · skip pays $' + f.skipCash + "M</span>";
    h += "</div></div>";
    if (ui.replacing && selC) {
      h += '<div class="fy-replace"><p class="fy-rq">Portfolio full. Divest one to make room for <b>' + esc(selC.name) + "</b> (+$" + LD.FY.DIVEST_CASH + "M).</p><div class=\"fy-minis\">";
      f.hand.forEach(function (hd) {
        var c = LD.assetById(hd.id);
        if (!c || c.liability) return;
        h += '<button class="fy-mini ' + RCLS[c.r] + '" data-replace="' + hd.id + '"><span aria-hidden="true">' + IA(c) + "</span><b>" + esc(c.name) + "</b><em>" + esc(c.text) + "</em></button>";
      });
      h += "</div></div>";
      h += '<div class="fy-foot"><button class="btn btn-ghost" id="fy-back">Back</button></div>';
    } else {
      h += '<div class="fy-cards" style="--n:' + Math.max(3, d.offer.length) + '">';
      d.offer.forEach(function (id, i) { h += card(state, id, ui.sel === id, d.rider, i); });
      if (!d.offer.length) h += '<p class="muted">Nothing left to buy. The market is yours.</p>';
      h += "</div>";
      h += '<div class="fy-foot"><button class="btn btn-ghost" id="fy-skip">Skip · +$' + f.skipCash + "M</button>";
      if (f.rerolls > 0) h += '<button class="btn" id="fy-reroll">↻ Reroll (' + f.rerolls + ")</button>";
      h += '<button class="btn btn-coral" id="fy-take"' + (selC ? "" : " disabled") + ">" + (selC ? (full ? "Acquire · divest one ▸" : "Acquire " + esc(selC.name) + " ▸") : "Tap an Asset") + "</button></div>";
    }
    return h + "</div>";
  }

  function itemTile(it, cls, attrs, inner) {
    return '<button class="bc-tile ' + cls + '" ' + attrs + '><span class="bc-ico" aria-hidden="true">' + IA(it) + '</span><span class="bc-nm">' + esc(it.name) + "</span>" + (inner || "") + "</button>";
  }
  /* The briefcase (Portfolio Assets + Liabilities) and the desk drawer (office items). ui.sel = selected id. */
  function renderPortfolio(state, ui) {
    ui = ui || {};
    var f = state.fy;
    var assets = f.hand.filter(function (hd) { var c = LD.assetById(hd.id); return c && !c.liability; });
    var liab = f.hand.filter(function (hd) { var c = LD.assetById(hd.id); return c && c.liability; });
    var sel = ui.sel || (assets[0] && assets[0].id) || ((f.drawer || [])[0] && f.drawer[0].id) || null;
    var h = '<div class="fy-pfsheet bcase"><div class="fy-head"><div class="dz-k">Wall · ' + LD.fySlotsUsed(state) + "/" + f.cap + " · Briefcase " + (f.drawer || []).length + "/" + (f.dcap || 3) + "</div><h2>Trophy wall &amp; briefcase</h2></div>";
    var fc = LD.fyForecast(state);
    h += '<p class="fy-fc"><b>At quarter close:</b> ' + (fc.items.length ? fc.items.map(function (it) { return IA(it) + " " + esc(it.text); }).join(" · ") : "nothing automatic.") + "</p>";
    h += '<div class="bc-grid" style="--n:' + f.cap + '">';
    for (var i = 0; i < f.cap; i++) {
      var hd = assets[i];
      if (!hd) { h += '<div class="bc-tile empty" aria-label="Empty slot"><span class="bc-ico">＋</span><span class="bc-nm">Empty</span></div>'; continue; }
      var c = LD.assetById(hd.id);
      h += itemTile(c, RCLS[c.r] + (sel === c.id ? " sel" : ""), 'data-bsel="' + c.id + '" aria-pressed="' + (sel === c.id) + '"');
    }
    h += "</div>";
    if (liab.length) h += '<div class="bc-liabs">' + liab.map(function (hd) { var c = LD.assetById(hd.id); return '<button class="bc-liab' + (sel === c.id ? " sel" : "") + '" data-bsel="' + c.id + '">' + IA(c) + " " + esc(c.name) + "</button>"; }).join("") + "</div>";
    var sets = [];
    Object.keys(LD.ARCHETYPES).forEach(function (k) {
      var A = LD.ARCHETYPES[k], n = LD.fyArchCount(state, k); if (!A.set || !n) return;
      var on = n >= A.set;
      sets.push('<span class="bc-set' + (on ? " on" : "") + '" title="' + esc(A.setText) + '">' + (on ? "★ " : "") + esc(A.setName) + " " + Math.min(n, A.set) + "/" + A.set + (on ? " · " + esc(A.setText) : "") + "</span>");
    });

    h += '<div class="dz-k bc-dk">Briefcase · items</div><div class="bc-drawer" style="--n:' + (f.dcap || 3) + '">';
    for (var j = 0; j < (f.dcap || 3); j++) {
      var d = (f.drawer || [])[j];
      if (!d) { h += '<div class="bc-tile empty drawer"><span class="bc-ico">＋</span><span class="bc-nm">Empty</span></div>'; continue; }
      var it = LD.itemById(d.id), why = LD.itemBlock(state, d.id);
      var status = it.office ? '<span class="bc-st on">Always on</span>' : !LD.itemReady(state, d) ? '<span class="bc-st used">' + (it.per === "act" ? "Used this act" : "Used") + "</span>" : '<span class="bc-st ready">' + (it.per === "act" ? "Once per act" : "Once per run") + "</span>";
      h += '<div class="bc-dslot ' + RCLS[it.r] + (sel === it.id ? " sel" : "") + '">' + itemTile(it, "drawer", 'data-bsel="' + it.id + '"', status) +
        (it.office ? "" : '<button class="btn bc-use' + (why ? "" : " btn-coral") + '" data-use="' + it.id + '"' + (why ? ' aria-disabled="true"' : "") + ">" + (why ? "Use" : "Use ▸") + "</button>") + "</div>";
    }
    h += "</div>";
    /* Detail line for the selected tile */
    var dc = sel && (LD.assetById(sel) || LD.itemById(sel));
    if (dc) {
      var isItem = !!LD.itemById(sel) && !LD.assetById(sel);
      var w2 = isItem ? LD.itemBlock(state, sel) : null;
      var kind = isItem ? (dc.office ? "Office fixture" : dc.per === "act" ? "Active · once per act" : "Active · once per run") : dc.liability ? "Liability" : LD.RARITY[dc.r].name + " · " + LD.ARCHETYPES[dc.arch].name;
      h += '<p class="bc-detail"><b>' + IA(dc) + " " + esc(dc.name) + "</b> <em>" + esc(kind) + "</em> " + esc(dc.text) + (isItem && w2 && !dc.office ? ' <span class="bc-why">' + esc(w2) + "</span>" : "") + "</p>";
    } else h += '<p class="bc-detail">Tap an Asset or item for details. Assets come from bosses, the Hearing, act openings and calls. Loot rides on fight rewards.</p>';
    return h + "</div>";
  }

  /* Loot reveal */

  /* Office explain sheet: what the room is telling you */
  LD.officeExplain = function (state) {
    var stage = LD.cityStage(state), door = LD.doorLevel(state), m = LD.mods(state), mood = LD.execMood(state);
    var h = '<div class="fy-pfsheet ex-sheet"><div class="fy-head"><div class="dz-k">Your office</div><h2>Reading the room</h2></div><ul class="fy-list ex-list">';
    h += '<li><span class="fy-ico">$</span><div><b>Cash ' + money(state.cash) + "</b><span>The desk ticker. Pays for bunker works, crisis pay-offs, bosses and some items.</span></div></li>";
    h += '<li><span class="fy-ico">✊</span><div><b>Unrest ' + state.unrest + " · " + esc(LD.doorQuiet(state) ? (LD.has(state, "soundproof") ? "Soundproofed" : "Quiet this quarter") : LD.DOOR_NAMES[door]) + "</b><span>The door. Knocks at 20, pounding at 40, the mob at 60. Crises likely from 48, unpayable from " + m.crisisNoPayAt + ", removed at " + LD.MAX_UNREST + ".</span></div></li>";
    h += '<li><span class="fy-ico">☢</span><div><b>Collapse ' + state.collapse + " · " + esc(LD.CITY_NAMES[stage]) + "</b><span>The window. Rises about +" + LD.collapseTickAmountPreview(state) + " a quarter; breach in ~" + LD.forecastQuarters(state) + "Q. Squeeze deals darken the mainland, Soothe deals relight it. From Smog alerts on, the mainland adds unrest each quarter (now +" + Math.max(0, stage - 1) + ").</span></div></li>";
    h += '<li><span class="fy-ico">🙂</span><div><b>Your executive: ' + ({ confident: "confident", nervous: "nervous", panic: "panicking" })[mood] + "</b><span>Nervous from unrest 35 or collapse 55; panicking from unrest 60 or collapse 78.</span></div></li>";
    return h + "</ul></div>";
  };

  /* Asset Prospectus: everything you have seen and found, across runs */
  LD.renderProspectus = function (meta, ui) {
    ui = ui || {};
    var cx = (meta && meta.codex) || { seen: {}, found: {} };
    var tab = ui.tab || "assets";
    var curses = LD.CARDS.filter(function (c) { return c.t === "Curse"; }).map(function (c) { return { id: c.id, icon: c.icon, name: c.name, text: LD.curseText(c.id) }; });
    var list = tab === "items" ? LD.ITEMS : tab === "liabs" ? curses : LD.FY_ASSETS;
    if (tab === "liabs") { cx = { seen: {}, found: {} }; curses.forEach(function (c) { cx.seen[c.id] = 1; }); }
    var found = list.filter(function (x) { return cx.found[x.id]; }).length, seen = list.filter(function (x) { return cx.seen[x.id] || cx.found[x.id]; }).length;
    var h = '<div class="fy-pfsheet prosp"><div class="fy-head"><div class="dz-k">Asset Prospectus · kept across runs</div><h2>The collection</h2></div>';
    h += '<div class="pr-tabs" role="tablist">' + [["assets", "Assets " + LD.FY_ASSETS.length], ["items", "Office items " + LD.ITEMS.length], ["liabs", "Curses 6"]].map(function (t) { return '<button class="lens-btn' + (tab === t[0] ? " on" : "") + '" role="tab" aria-selected="' + (tab === t[0]) + '" data-ptab="' + t[0] + '">' + t[1] + "</button>"; }).join("") + "</div>";
    h += '<p class="pr-count">Found <b>' + found + "</b> · seen <b>" + seen + "</b> of " + list.length + "</p>";
    h += '<div class="pr-grid">';
    list.forEach(function (x) {
      var st = cx.found[x.id] ? "found" : cx.seen[x.id] ? "seen" : "unseen";
      h += '<button class="pr-cell ' + st + " " + (x.r ? RCLS[x.r] : "liab") + (ui.sel === x.id ? " sel" : "") + '" data-psel="' + x.id + '" aria-label="' + esc(st === "unseen" ? "Unknown" : x.name) + '">' + (st === "unseen" ? "?" : IA(x)) + "</button>";
    });
    h += "</div>";
    var dx = ui.sel && (LD.assetById(ui.sel) || LD.itemById(ui.sel) || curses.filter(function (c) { return c.id === ui.sel; })[0]);
    var dst = dx ? (cx.found[dx.id] ? "found" : cx.seen[dx.id] ? "seen" : "unseen") : null;
    h += '<p class="bc-detail">' + (dx ? (dst === "unseen" ? "<b>? Unknown</b> Not seen yet. Keep winning fights, beating bosses and answering calls." : "<b>" + dx.icon + " " + esc(dx.name) + "</b> <em>" + (dst === "found" ? "Found" : "Seen") + (dx.r ? " · " + esc(LD.RARITY[dx.r].name) : "") + "</em> " + esc(dx.text)) : "Tap a cell for details. Glowing cells are ones you have held.") + "</p>";
    return h + "</div>";
  };

  function fcText(fc) {
    var b = [];
    if (fc.cash) b.push((fc.cash > 0 ? "+$" : "−$") + Math.abs(fc.cash) + "M");
    if (fc.unrest) b.push((fc.unrest > 0 ? "+" : "−") + Math.abs(fc.unrest) + " unrest");
    if (fc.collapse) b.push((fc.collapse > 0 ? "+" : "−") + Math.abs(fc.collapse) + " collapse");
    return b.join(" · ");
  }
  /* Quarter-close forecast as a plain tag in the office header (the briefcase button moved to the side rail). */
  function forecastTag(state) {
    if (!state.fy) return "";
    var fc = LD.fyForecast(state), ft = fcText(fc);
    if (!ft) return "";
    return '<span class="of-fc pf-fc ' + (fc.cash - fc.unrest - 2 * fc.collapse >= 0 ? "up" : "down") + '" title="At quarter close: ' + esc(ft) + '" aria-label="At quarter close: ' + esc(ft) + '">▸ ' + esc(ft.split(" · ")[0]) + (ft.indexOf(" · ") > 0 ? " +" : "") + "</span>";
  }

  /* ---------- The office: executive, door (unrest), window on the mainland (collapse), desk (cash) ----------
     Layered markup with data-art slots so painted art can replace each layer later. */
  function ogauge(cls, icon, label, num, isMoney, sub, title) {
    var pct = isMoney ? Math.max(0, Math.min(100, num)) : Math.max(0, Math.min(100, num));
    var lvl = LD.resLevel ? LD.resLevel(cls, num) : "ok";
    return '<div class="meter of-g m-' + cls + " lvl-" + lvl + '" data-num="' + num + '" style="--v:' + pct + '"' + (isMoney ? ' data-money="1"' : "") + ' data-tip="' + esc(title || "") + '" tabindex="0" role="meter" aria-label="' + esc(label) + " " + (isMoney ? money(num) : num) + (isMoney ? "" : " of 100") + '" aria-valuenow="' + num + '" aria-valuemin="0" aria-valuemax="100">' +
      '<span class="m-lab">' + (LD.tok ? LD.tok(cls) : '<i aria-hidden="true">' + icon + "</i>") + '<span class="m-name">' + esc(label) + "</span></span>" +
      '<b class="m-val">' + (isMoney ? money(num) : num) + "</b>" +
      '<div class="m-bar"><span style="width:' + pct + '%"></span></div>' + (sub ? '<small class="m-sub">' + esc(sub) + "</small>" : "") + "</div>";
  }
  LD.renderOffice = function (state, o) {
    o = o || {};
    var f = state.fy || {};
    var mood = LD.execMood ? LD.execMood(state) : "confident";
    var door = LD.doorLevel ? LD.doorLevel(state) : 0;
    var stage = LD.cityStage ? LD.cityStage(state) : 0, decay = LD.cityDecay ? LD.cityDecay(state) : state.collapse;
    var holo = LD.hasItem && LD.has(state, "holo"), padded = LD.hasItem && LD.has(state, "soundproof");
    var quiet = LD.doorQuiet && LD.doorQuiet(state);
    var exec = LD.execById(state.executiveId);
    var m = LD.mods(state);
    var ring = !!(f.memo), ERA = LD.ERAS && LD.eraOf ? LD.ERAS[LD.eraOf(state)] : null;
    var cashG = ogauge("cash", "$", "Cash", state.cash, true, o.cashSub || "", "Cash " + money(state.cash) + ". Buys bunker works, crisis pay-offs and boss demands." + (state.cash < 5 ? " Running dry: you cannot cover most pay-offs." : ""));
    var h = '<div class="panel-k of-head"><span class="of-q">' + (LD.tok ? LD.tok("quarter") : "") + "Q" + state.turn + '<span class="of-ht"> · Office</span></span>' + cashG + '<span class="of-tools">' + forecastTag(state) + "</span></div>";
    var exk = execArt(state.executiveId);
    h += '<div class="of-room ex-' + exk + " mood-" + mood + " door-" + door + " city-" + (holo ? 0 : stage) + (holo ? " holo" : "") + (quiet ? " quiet" : "") + (padded ? " padded" : "") + '" data-door="' + door + '" data-city="' + stage + '" data-mood="' + mood + '">';
    /* The 40s office: office.js paints the room and walks the executive into the slot; the meters stay real DOM on top. */
    var dn4 = quiet ? (padded ? "Soundproofed" : "Quiet (doorman paid)") : LD.DOOR_NAMES[door];
    h = h.replace('<div class="of-room ', '<div class="of-room o4 ');
    h += '<div class="o4-slot"></div>' + (holo ? '<span class="of-tag holo-tag">HOLO-VIEW</span>' : "");
    /* framed assets on the wall: gilt frames, empty ones visible so a fresh pick has somewhere to land */
    if (f.hand) { h += '<div class="of-wallart o4-wa" aria-hidden="true">'; for (var wj = 0; wj < (f.cap || 5); wj++) { var wb = f.hand[wj] && LD.assetById(f.hand[wj].id); h += wb ? '<i title="' + esc(wb.name) + '">' + IA(wb) + "</i>" : '<i class="empty"></i>'; } h += "</div>"; }
    h += '<div class="of-window o4-w">' + ogauge("collapse", "☢", "Collapse", state.collapse, false,
      (holo ? "Holo-View · real: " : "") + LD.CITY_NAMES[stage] + " · ~" + LD.forecastQuarters(state) + "Q to breach",
      "Collapse " + state.collapse + "/100 · rises about +" + LD.collapseTickAmountPreview(state) + " a quarter · breach in ~" + LD.forecastQuarters(state) + " quarters. Crisis deals likely from 55. The mainland: " + LD.CITY_NAMES[stage] + (stage >= 2 ? " (unrest +" + (stage - 1) + " a quarter)" : "") + ".") + "</div>";
    h += '<div class="of-door o4-d">' + (door >= 3 && !quiet ? '<span class="of-voices" aria-hidden="true">“Open up!”</span>' : "") + ogauge("unrest", "✊", "Unrest", state.unrest, false, dn4,
      "Unrest " + state.unrest + "/100 · " + dn4 + ". Crisis deals likely from 48; crises cannot be paid off from " + m.crisisNoPayAt + "; the board removes you at " + LD.MAX_UNREST + ".") + "</div>";
    return h + "</div>";
  };


  /* Board Memo card */
  function memoCard(state) {
    var f = state.fy, m = f && f.memo && LD.memoById(f.memo.id);
    if (!m) return "";
    var h = '<div class="fy-boss fy-memo"><div class="fy-boss-ico" aria-hidden="true">' + IA(m, "memo") + "</div>";
    var ERA = LD.ERAS && LD.eraOf ? LD.ERAS[LD.eraOf(state)] : null;
    h += '<div class="dz-k">' + (ERA ? ERA.phoneIcon + " " + esc(ERA.phone) : m.call ? "Incoming call" : "Board call") + " · Q" + state.turn + "</div><h2>" + esc(m.title) + "</h2>";
    h += '<p class="fy-demand">' + esc(m.body) + "</p>";
    var mm = f.memo;
    if (m.id === "headhunter" && mm.offer) {
      h += '<div class="fy-outs">';
      mm.offer.forEach(function (fid, i) { var x = LD.fixerById(fid); if (!x) return;
        h += '<div class="fy-out good"><b>' + (i ? "Second" : "First") + ": " + IA(x) + " " + esc(x.name) + "</b><span>" + esc(x.t + ", " + x.role + " · $" + x.pay + "M a quarter") + "</span><span>Cards: " + esc(x.cards.map(function (c) { return LD.cardDef(c).name; }).join(", ")) + "</span></div>"; });
      h += "</div>";
      if (f.fixers.length >= LD.DOOR.FIXER_CAP) h += '<p class="fy-note">Your roster is full (' + LD.DOOR.FIXER_CAP + "). Let someone go from the deck view first.</p>";
    }
    if (m.id === "distressed" && mm.asset) { var da = LD.assetById(mm.asset); if (da) h += '<p class="fy-note">On offer: <b>' + IA(da) + " " + esc(da.name) + "</b> · " + esc(da.text) + "</p>"; }
    if (m.id === "oldfriend" && mm.card) { var dc0 = LD.cardDef(mm.card); if (dc0) h += '<p class="fy-note">The favour: <b>' + (dc0.t === "Curse" ? IA(dc0) : dc0.icon) + " " + esc(dc0.name) + "</b> · " + esc(LD.cardText(mm.card, 0)) + "</p>"; }
    return h + "</div>";
  }
  function memoButtons(state) {
    var m = LD.memoById(state.fy.memo.id);
    function b(k, cls) {
      var o = m[k], ok = LD.memoAffordable(state, k);
      return '<button class="btn ' + cls + ' fy-mchoice" id="fy-m-' + k + '"' + (ok ? "" : " disabled") + "><b>" + esc(o.label) + "</b><small>" + esc(ok ? o.text : "Not enough cash · " + o.text) + "</small></button>";
    }
    if (m.id === "headhunter" && state.fy.memo.offer) {
      var off = state.fy.memo.offer, full = state.fy.fixers.length >= LD.DOOR.FIXER_CAP;
      return off.map(function (fid, i) { var x = LD.fixerById(fid); return '<button class="btn ' + (i ? "" : "btn-coral") + ' fy-mchoice" id="fy-m-' + (i ? "b" : "a") + '"' + (full ? " disabled" : "") + "><b>Hire " + esc(x.name.replace(/^Dr\. /, "").split(" ")[0]) + "</b><small>" + esc(x.cards.length + " cards · $" + x.pay + "M/Q") + "</small></button>"; }).join("") +
        '<button class="btn fy-mchoice" id="fy-m-c"><b>Not now</b><small>Let it go to voicemail</small></button>';
    }
    return b("a", "btn-coral") + b("b", "") + (m.c ? b("c", "") : "");
  }
  LD.renderMemo = memoCard;
  LD.renderMemoButtons = memoButtons;

  /* Tap-to-explain sheets */
  LD.explainHtml = function (kind, state) {
    var h = "";
    if (kind === "liabilities") {
      h += '<div class="fy-head"><div class="dz-k">Curses</div><h2>What clogs your deck</h2></div><ul class="fy-list ex-list">';
      LD.CARDS.filter(function (c) { return c.t === "Curse"; }).forEach(function (l) { h += '<li class="liab"><span class="fy-ico" aria-hidden="true">' + IA(l) + "</span><div><b>" + esc(l.name) + "</b><span>" + esc(LD.curseText(l.id)) + "</span></div></li>"; });
      h += "</ul><p class=\"fy-note\">Curses come from audits, leaks, riders and calls. Shred them at a reward, or use Hush Money or Settle Quietly.</p>";
    } else if (kind === "ratings") {
      var cur = state && state.rating != null ? state.rating : null;
      h += '<div class="fy-head"><div class="dz-k">Credit ratings</div><h2>Every tier adds one rule</h2></div><ol class="ex-rules">';
      LD.RATINGS.forEach(function (r, i) { h += "<li" + (cur === i ? ' class="on"' : "") + "><b>" + esc(r.id) + '</b> <span>' + esc(r.text) + "</span> <em>×" + LD.ratingMultiplier(i).toFixed(1) + "</em></li>"; });
      h += '</ol><p class="fy-note">Rules stack: a tier keeps every rule above it. Exits pay ×(1 + 0.3 × tier) Dividends.</p>';
    } else if (kind === "bosses") {
      h += '<div class="fy-head"><div class="dz-k">Boss quarters</div><h2>Who can show up</h2></div><ul class="fy-list ex-list">';
      [["earnings", "shortseller"], ["strike", "crash"], ["reckoning", "heatdome", "seawall"]].forEach(function (grp, ai) {
        grp.forEach(function (id) { var b = LD.BOSSES[id], bo = LD.bossOpp && state && state.fy ? LD.oppById(LD.bossOpp(state, id)) : null, bo0 = !bo && LD.oppById ? LD.oppById({ earnings: "ashby_b", shortseller: "sorel_b", strike: "varga_b", bid: "crowe_b", crash: "ticker_b" }[id]) : null; bo = bo || bo0;
          h += '<li><span class="fy-ico" aria-hidden="true">' + IA(b, "boss", id) + "</span><div><b>" + esc(b.name) + "</b> <em>Act " + LD.ACTS[ai].roman + " · " + esc(LD.ACTS[ai].year) + "</em>" + (bo ? "<span>" + esc(bo.who + " · " + bo.role) + "</span>" : "") + "</div></li>"; });
      });
      h += '</ul><p class="fy-note">Each act draws one boss from its row. The timeline shows yours from the start.</p>';
    }
    return '<div class="fy-pfsheet ex-sheet">' + h + "</div>";
  };

  /* End screen: picks that carried the run */
  LD.renderCarried = function (state) {
    var list = LD.fyRunSummary ? LD.fyRunSummary(state).filter(function (x) { return x.score > 0; }).slice(0, 3) : [];
    if (!list.length) return "";
    return '<div class="end-carried"><b>Carried by</b>' + list.map(function (x) { return '<span class="ec ' + RCLS[x.r] + '"><i aria-hidden="true">' + IA(x) + "</i>" + esc(x.name) + "<small>" + esc(x.text) + "</small></span>"; }).join("") + "</div>";
  };

  function actChip(state) {
    var f = state.fy; if (!f) return "Quarter";
    return "Act " + LD.ACTS[f.act - 1].roman + " · " + LD.ACTS[f.act - 1].year;
  }

  function nextBossQ(state) {
    var qs = LD.bossQuarters(state);
    for (var i = 0; i < qs.length; i++) if (qs[i] >= state.turn) return qs[i];
    return null;
  }

  function bossCard(state, q, mode) {
    var info = LD.bossInfo(state, q);
    if (!info) return "";
    var act = LD.ACTS[LD.actOf(q) - 1];
    var h = '<div class="fy-boss b-' + info.id + '"><div class="fy-boss-ico" aria-hidden="true">' + IA(info, "boss") + "</div>";
    var bopp = LD.bossOpp && !info.final ? LD.oppById(LD.bossOpp(state, info.id)) : null;
    h += '<div class="dz-k">' + (mode === "confirm" ? "Boss quarter · Q" + q : "Act " + act.roman + " · " + esc(act.name) + " (" + esc(act.year) + ") · boss at Q" + q) + ' · <button class="link-btn fy-whoboss fy-explain" data-explain="bosses">ⓘ All bosses</button></div>';
    h += "<h2>" + esc(info.name) + "</h2>";
    if (bopp) h += '<p class="fy-who">' + esc(bopp.who + " · " + bopp.role) + (state.fy && state.fy.strikeSwap && info.id === "strike" ? " · ★ a familiar face" : "") + "</p>";
    h += '<p class="fy-demand">' + esc(info.demand) + "</p>";
    h += '<div class="fy-outs"><div class="fy-out good"><b>Beat it</b><span>' + esc(info.beat) + ' · +10 ◈</span></div><div class="fy-out bad"><b>Miss it</b><span>' + esc(info.miss) + "</span></div></div>";
    if (mode === "confirm" && info.id === "strike") h += '<p class="fy-note">Unrest now ' + state.unrest + (state.unrest >= 40 ? " · the big hit applies" : " · under 40, the small hit applies") + ".</p>";
    if (mode === "confirm" && info.choice) h += '<p class="fy-note">Cash now ' + money(state.cash) + ". It resolves when you end the quarter.</p>";
    if (mode === "confirm" && info.id === "crash") h += '<p class="fy-note">Cash now ' + money(state.cash) + " · after the drop about " + money(state.cash - Math.round(state.cash * 0.3)) + (state.cash - Math.round(state.cash * 0.3) >= info.line ? " · you ride it out" : " · not enough to ride it out") + ".</p>";
    if (mode === "confirm" && info.id === "shortseller" && state.fy.hand.length) { var nw = null; state.fy.hand.forEach(function (hd) { var c0 = LD.assetById(hd.id); if (c0 && !c0.liability) nw = c0; }); if (nw) h += '<p class="fy-note">Your newest Asset: ' + IA(nw) + " " + esc(nw.name) + ".</p>"; }
    if (mode === "confirm" && info.final) h += '<p class="fy-note">' + esc(LD.readinessSummary(state).tally) + ". " + (LD.readinessSummary(state).canWin ? "Your bunker would hold." : "Your bunker would not hold.") + "</p>";
    return h + "</div>";
  }

  /* Executive dossier block: act, next boss, sealing rule. */
  function fyDossier(state) {
    var f = state.fy; if (!f) return "";
    var q = nextBossQ(state), info = q ? LD.bossInfo(state, q) : null;
    var h = '<div class="target fy-target"><span>⚑</span><b>Act ' + LD.ACTS[f.act - 1].roman + " · " + esc(LD.ACTS[f.act - 1].name) + " · " + esc(LD.ACTS[f.act - 1].year) + "</b> Q" + state.turn + " of " + f.rules.finalQ;
    if (info) h += '<button class="fy-bosslink" data-boss-q="' + q + '">' + IA(info, "boss") + " " + esc(info.name) + " · Q" + q + " ▸</button>";
    return h + "</div>";
  }

  /* ---------- Drop 1: the door fight, the reward, the deck (pure string builders) ---------- */
  var TYPE_CLS = { Shared: "t-shared", Silent: "t-silent", Lobbyist: "t-lob", Lawyer: "t-law", PR: "t-pr", Fellow: "t-fel", Curse: "t-curse", Room: "t-room", Private: "t-priv" };
  var METER_ICO = { cash: "$", unrest: "✊", collapse: "☢", heat: "🔥" };
  var METER_NAME = { cash: "Cash", unrest: "Unrest", collapse: "Collapse", heat: "Heat" };
  var CARD_ART = {};
  ["talking","nocomment","externalize","codb","synergy","golden","presence","backup","cutcorners","privsec","carveout","campaign",
   "zoning","stall","whisper","fasttrack","revolving","darkmoney","objection","buryit","billable","nda","discovery","injunction",
   "settle","countersue","astro","oped","spin","tnp","photoop","crisiscomms","study","funded","unsettled","longterm",
   "c_class","c_subpoena","c_whistle","c_leak","c_crack","c_stranded",
   "glance","pause","smirk","watch","chair","handshake","envelope","played","stoop","chainmail","deepfake","dossier","poll","ratio","frontpage",
   "perpwalk","lunch","mortgage","marker","margincall","consent","arbitration","layoff","eviction","gig","boardseat","bothstages","turnwitness","littleleague","botswarm","tab","sunday","grandmas","godparent"].forEach(function (k) { CARD_ART[k] = "assets/cardart/card-" + k + ".webp"; });
  LD.CARD_ART = CARD_ART;
  var RAR_NAME = { S: "Starter", C: "Common", U: "Uncommon", R: "Rare", M: "Fixture", X: "Curse" };
  function cardFace(id, up, opts) {
    opts = opts || {};
    var o = LD.cardValues(id, up), d = LD.cardDef(id); if (!o || !d) return "";
    var tag = opts.tag || "button";
    var rr = String(d.r || "C").toLowerCase();
    var pres = LD.cardPressure ? LD.cardPressure(id) : null, tg = d.tags || {};
    var cls = "dc " + (TYPE_CLS[d.t] || "t-shared") + " r-" + rr + (up ? " up" : "") + (pres ? " pr-" + pres : "") + (/^silent:/.test(tg.voice || "") ? " is-silent" : "") + (opts.cls ? " " + opts.cls : "") + (opts.why ? " no" : "");
    var attrs = (opts.attrs || "") + (tag === "button" ? ' type="button"' : "") + (opts.why && tag === "button" ? ' aria-disabled="true"' : "");
    var cost = o.unplay ? "—" : (o.cash ? "$" + o.cash + "M" + (opts.cost ? "+" + opts.cost + "◆" : "") : (opts.cost != null ? opts.cost : o.cost || 0) + "◆");
    var stats = "";
    if (opts.p || o.p) stats += '<i class="dc-p" title="Pressure"><small>P</small>' + (opts.p != null ? opts.p : o.p) + "</i>";
    if (opts.d || o.d) stats += '<i class="dc-d" title="Deniability"><small>D</small>' + (opts.d != null ? opts.d : o.d) + "</i>";
    var label = (d.name + (up ? "+" : "")) + ". " + cost + ". " + LD.cardText(id, up) + (opts.why ? " " + opts.why : "");
    var art = CARD_ART[id];
    return "<" + tag + ' class="' + cls + '"' + attrs + ' aria-label="' + esc(label) + '">' +
      '<span class="dc-cost' + (o.cash ? " cash" : "") + '"><em>' + esc(cost) + "</em></span>" +
      '<b class="dc-name">' + esc(d.name) + (up ? "<sup>+</sup>" : "") + "</b>" +
      '<span class="dc-art"' + (art ? ' style="background-image:url(' + art + ')"' : "") + '><span class="dc-ico" aria-hidden="true">' + (d.t === "Curse" ? IA(d) : d.icon) + "</span>" +
      (stats ? '<span class="dc-stats">' + stats + "</span>" : "") + "</span>" +
      '<span class="dc-type">' + (pres && d.t !== "Curse" ? '<i class="dc-pres">' + esc(LD.PRESSURE_LABEL[pres]) + "</i> " : "") + esc(d.t === "Curse" ? "Curse" : d.t) + (d.r && d.r !== "X" ? " · " + (RAR_NAME[d.r] || "") : "") + "</span>" +
      '<span class="dc-txt">' + esc(LD.cardText(id, up)) + "</span>" +
      (opts.why ? '<span class="dc-why">' + esc(opts.why) + "</span>" : "") +
      "</" + tag + ">";
  }
  LD.cardFace = cardFace;

  /* ---------- Fight scenes: one shared stage, a room and a face per faction ---------- */
  var FACTIONS = {
    regulator: { who: "Agnes Hale", role: "Federal Regulator", art: "hale", room: "regulator", place: "Her hearing room" },
    rival: { who: "Victor Crowe", role: "Gannet Freight Exchange", art: "crowe", room: "exchange", place: "Gannet Freight Exchange, top floor" },
    bid: { who: "Victor Crowe", role: "Hostile takeover", art: "crowe", room: "exchange", place: "Gannet Freight Exchange, top floor" },
    protest: { who: "Rosa Lind", role: "The People", art: "rosa", room: "protest", place: "Your lobby glass" },
    journalist: { who: "Dev Okafor", role: "The Ledger", art: "okafor", room: "journalist", place: "The Ledger's front steps" },
    hearing: { who: "Sen. Walt Brennan", role: "Senate Committee", art: "brennan", room: "senate", place: "The Senate chamber" },
    earnings: { who: "Gail Ashby", role: "Lead Analyst", art: "ashby", room: "earnings", place: "The broadcast studio" },
    shortseller: { who: "Lena Sorel", role: "Nightjar Capital", art: "sorel", room: "garage", place: "Garage, level B3" },
    strike: { who: "Tomas Varga", role: "United Workers", art: "varga", room: "union", place: "The union hall" },
    crash: { who: "The Ticker", role: "The Market", art: "ticker", room: "crash", place: "The trading floor" }
  };
  var ART_AR = { ashby: 0.575, brennan: 0.69, crowe: 0.571, hale: 0.667, okafor: 0.485, dunn: 0.526, moretti: 0.522, june: 0.575, mickey: 0.534, odell: 0.583, delacroix: 0.521, harrow: 0.52, gray: 0.52, rosa: 0.63, sorel: 0.71, ticker: 0.606, varga: 0.854,
    "back-cassius": 0.817, "back-imani": 0.778, "back-julian": 0.817, "back-mara": 0.778, "back-reid": 0.778, "back-soren": 0.817,
    };
  var POSES = ["idle", "attack", "hit", "block", "defeated"];
  LD.FACTIONS = FACTIONS;
  LD.factionFor = function (enc) { return FACTIONS[enc] || FACTIONS.regulator; };
  function execArt(id) { return ART_AR["back-" + id] ? id : "mara"; }
  /* The face at the door: the act cast (eras.js) or the old faction table for saves from before the eras. */
  LD.fightFace = function (fg) {
    var O = fg && fg.opp && LD.oppById ? LD.oppById(fg.opp) : null;
    if (O) return { who: O.who, short: O.short, role: O.role, art: O.art, room: O.room, place: O.place, ar: O.ar, paid: !!O.paid, opp: O };
    var F = LD.factionFor(fg ? fg.enc : "regulator");
    return { who: F.who, short: F.who.split(" ").slice(-1)[0], role: F.role, art: F.art, room: F.room, place: F.place, ar: ART_AR[F.art], paid: false, opp: null };
  };
  function homeRoom(fg) { var a = LD.actOf ? LD.actOf(Math.min(12, fg.q || 1)) : 3; return a < 3 ? "home-" + a : "home"; }
  /* What they say right now (speech bubble). */
  function bubbleText(state, fg, ui) {
    if (ui.say && ui.say.t) return ui.say;
    if (fg.done) return { t: LD.oppLine(fg, "end"), k: "end" };
    if (fg.round === 1 && !fg.played) return { t: LD.oppLine(fg, "open"), k: "open" };
    var I = fg.intent && LD.INTENTS[fg.intent.k];
    return { t: LD.moveSay ? LD.moveSay(fg, fg.intent.k) : I && I.say ? I.say : "", k: "move" };
  }
  /* Opponent art drawn head to toe (the rest are framed to the old 3/4 crop and stand a little lower, fading at the knee). */
  var FULL_BODY = { benny: 1, dana: 1, gil: 1, grace: 1, honoria: 1, pip: 1, pops: 1, theo: 1 };
  var VENUE_PILL = { home: "At your desk", lobby: "At the glass" };
  /* The fight happens in the scene: a visitor stands in your own office (the live 40s room, borrowed by office.js),
     or you have gone out to their room and stand there full-body. Cards fly into it; the hand stays docked below. */
  function sceneHtml(state, fg, ui) {
    var F = LD.fightFace(fg), venue = LD.fightVenue(fg);
    var room = venue === "home" ? homeRoom(fg) : F.room;
    var stage = LD.cityStage ? LD.cityStage(state) : 0;
    var how = fg.done ? fg.done.how || (fg.done.win ? "crushed" : fg.done.settled ? "paid" : "walked") : null;
    var out = fg.done ? fg.done.out : null;
    var base = !fg.done ? "idle" : out === "martyred" || how === "walked" ? "attack" : out === "bought" || out === "converted" || out === "deal" || how === "paid" ? (F.paid ? "paid" : "idle") : "defeated";
    var ex = execArt(state.executiveId), era = Math.max(1, Math.min(3, LD.eraOf ? LD.eraOf(state) : 3));
    var office = venue === "home" || ui.entering, o4 = !!(LD.O4 && LD.O4_ATLAS);
    var h = '<div class="df-stage sc fb-stage v-' + venue + " room-" + room + (office && o4 ? " fb-office" : " fb-away") + (ui.entering ? " fb-entering" : "") + (ui.enter ? " enter" : "") + '" data-room="' + room + '" data-venue="' + venue + '" data-city="' + stage + '">';
    if (office && o4) h += '<div class="fb-room of-room o4" aria-hidden="true"><div class="o4-slot"></div></div>';
    else h += '<div class="sc-room" aria-hidden="true" style="background-image:url(assets/fight/room-' + room + '.webp)"></div><div class="sc-haze" aria-hidden="true"></div>';
    if (ui.entering) return h;
    h += '<div class="sc-opp ' + (FULL_BODY[F.art] ? "full" : "crop") + '" id="sc-opp" data-base="' + base + '" data-pose="' + base + '" style="--ar:' + (F.ar || ART_AR[F.art] || 0.6) + '" aria-hidden="true">';
    POSES.concat(F.paid ? ["paid"] : []).forEach(function (p) { h += '<img class="p-' + p + '" src="assets/fight/opp-' + F.art + "-" + p + '.webp" alt="" draggable="false">'; });
    h += "</div>";
    if (office && o4) h += '<div class="sc-you fb-you-anchor" id="sc-you" aria-hidden="true"></div>';
    else {
      var fig = o4 && LD.O4.figureHtml ? LD.O4.figureHtml(ex, era, fg.done && !fg.done.win && !fg.done.settled ? "panic" : "idle", 100, true) : "";
      h += '<div class="sc-you fb-exec' + (fig ? "" : " fb-back") + '" id="sc-you" style="--ar:' + ART_AR["back-" + ex] + '" aria-hidden="true">' + (fig || '<img src="assets/fight/back-' + ex + '.webp" alt="" draggable="false">') + "</div>";
    }
    var bt = F.opp && !(ui.cap && ui.cap.t && !fg.done) ? bubbleText(state, fg, ui) : null;
    if (bt && bt.t) h += '<div class="sc-bubble k-' + bt.k + '" id="sc-bubble" role="status" aria-live="polite"><b>' + esc(F.who) + "</b>" + esc(bt.t) + "</div>";
    if (fg.cb && !fg.done && fg.round === 1 && !fg.played && !ui.cbHide) {
      var cb = fg.cb, img = cb.art ? "assets/fight/" + cb.art + ".webp" : "";
      h += '<div class="sc-cb' + (cb.inset ? " is-witness" : "") + '" id="sc-cb" role="note"><div class="sc-cb-k">★ A FAMILIAR FACE ★</div>' +
        (img ? '<img src="' + img + '" alt="" draggable="false">' : "") + '<div class="sc-cb-t"><b>' + esc(cb.who) + '</b><q>' + esc(cb.line) + "</q><em>" + esc(cb.effect) + '</em></div><button class="sc-cb-ok" id="sc-cb-ok">Face them ▸</button></div>';
    }
    if (!fg.done && !fg.played && (fg.round | 0) <= 1 && !(ui.cap && ui.cap.t) && !(fg.cb && !ui.cbHide)) { var opener = LD.fightOpener(state, fg); if (opener) h += '<div class="sc-cap sc-why e' + era + '" id="sc-why" role="note"><span>' + esc(opener) + "</span></div>"; }
    if (ui.cap && ui.cap.t && !fg.done) h += '<div class="sc-cap e' + ui.cap.era + (ui.cap.w4 ? " w4" : "") + '" id="sc-cap" role="note"><span>' + esc(ui.cap.t) + "</span></div>";
    /* the away telemetry plaque (at home the office's own painted meters read out) */
    h += '<div class="df-meters fb-plaque" aria-label="Cash $' + state.cash + "M, unrest " + state.unrest + ", collapse " + state.collapse + '">' +
      '<span data-tip="Cash $' + state.cash + 'M. Settling costs $' + LD.DOOR.SETTLE + 'M per Scrutiny left; some cards cost cash."><small>Cash</small><b>$' + state.cash + "M</b></span>" +
      '<span data-tip="Unrest ' + state.unrest + '/100. Grievance hits that get through raise it."><small>Unrest</small><b>' + state.unrest + "</b></span>" +
      '<span data-tip="Collapse ' + state.collapse + '/100. Hits aimed at collapse land at half strength."><small>Collapse</small><b>' + state.collapse + "</b></span></div>";
    return h;
  }
  /* ---------- Fight opener: the narrator line that used to sit on the intro card. Shown in the fight as the
     yellow caption until your first play (the opponent's own opening words stay in their speech bubble). ---------- */
  var FI_LINES = {
    home: ["The door swings open. {s} doesn't knock twice.", "Nothing on the calendar. {s} walks in anyway.", "No invite, no ping. {s} is already in the room."],
    lobby: ["Down in the lobby, the crowd is pressed to the glass.", "The lobby glass is rattling. Somebody brought a camera.", "The lobby glass is shaking, and it's streaming live."],
    away: ["Out the back stairs, collar up. Next stop: {p}.", "Out the service exit before the press sees. {p}.", "Out the back, phone face-down. {p}."]
  };
  LD.fightIntroKey = function (state) { var fg = state && state.fy && state.fy.fight; return fg ? (fg.q || 0) + ":" + (fg.enc || "") + ":" + (fg.opp || "") : ""; };
  LD.fightOpener = function (state, fg, atVenue) {
    fg = fg || (state && state.fy && state.fy.fight); if (!fg) return "";
    var F = LD.fightFace(fg), venue = atVenue || LD.fightVenue(fg), era = Math.max(1, Math.min(3, LD.eraOf ? LD.eraOf(state) : 3));
    return (F.opp && F.opp.why && LD.missionText ? LD.missionText(F.opp.why, fg) : F.opp && F.opp.why) || (FI_LINES[venue] || FI_LINES.home)[era - 1].replace("{s}", F.short || F.who).replace("{p}", F.place || "their turf");
  };
  /* ---------- Office strip entrance (hub): the visitor walks in to the desk, or you leave by the back door
     and a car / plane pulls away in the window. Pure DOM sprites over the existing strip; CSS does the motion. ---------- */
  var OFX_FAR = { senate: 1, crash: 1, keys: 1 };
  var OFX_VEH = { car: [1, 2, 3].map(function (e) { return '<img src="assets/office/veh-car-e' + e + '.webp" alt="" draggable="false">'; }),
    air: [1, 2, 3].map(function (e) { return '<img src="assets/office/veh-air-e' + e + '.webp" alt="" draggable="false">'; }) };
  /* full-body door poses (the fight art is framed to the old 3/4 crop for some opponents) */
  /* Milestone B: full-body door art per opponent (opp-<id>-door.webp). Held until the restyled opponents ship; empty = door scene uses the idle art. */
  var OPP_DOOR = {}; /* Milestone B list: "ashby benny brennan crowe dana delacroix dunn gil grace gray hale harrow honoria june mickey mina moretti odell okafor pip pops rosa sorel theo ticker varga" */
  LD.officeEntrance = function (state) {
    var fg = state && state.fy && state.fy.fight; if (!fg) return null;
    var F = LD.fightFace(fg), venue = LD.fightVenue(fg), era = Math.max(1, Math.min(3, LD.eraOf ? LD.eraOf(state) : 3));
    var away = venue === "away", air = away && !!OFX_FAR[F.room];
    return { away: away, air: air, era: era, who: F.who, place: F.place || "", opp: "assets/fight/opp-" + F.art + (OPP_DOOR[F.art] ? "-door" : "-idle") + ".webp", ar: F.ar || ART_AR[F.art] || 0.6,
      veh: away ? OFX_VEH[air ? "air" : "car"][era - 1] : "", back: "assets/fight/back-" + execArt(state.executiveId) + ".webp" };
  };
  /* The Gallery: a 7-notch crowd meter between you and them. */
  function galHtml(fg) {
    var g = Math.max(-3, Math.min(3, fg.gal | 0)), h = '<div class="df-gal g' + (g > 0 ? "p" : g < 0 ? "n" : "0") + '" role="meter" aria-label="Gallery ' + (g > 0 ? "+" : "") + g + '" aria-valuemin="-3" aria-valuemax="3" aria-valuenow="' + g + '"><small>Them</small><span class="dg-row">';
    for (var i = -3; i <= 3; i++) h += '<i class="' + (i === 0 ? "mid " : "") + (i === g ? "on" : (i < 0 && g <= i) || (i > 0 && g >= i) ? "lit" : "") + '"></i>';
    return h + '</span><small>You</small><b>' + (g >= 2 ? "The room is with you" : g <= -2 ? "The room is with them" : g > 0 ? "Gallery leans your way" : g < 0 ? "Gallery leans their way" : "Gallery: undecided") + "</b></div>";
  }
  LD.galHtml = galHtml;
  LD.renderFight = function (state, ui) {
    ui = ui || {};
    var f = state.fy, fg = f.fight; if (!fg) return "";
    var it = fg.done || ui.entering ? null : LD.fightIntent(state);
    var F = LD.fightFace(fg), venue = LD.fightVenue(fg);
    var pct = fg.max ? Math.max(0, Math.round(100 * Math.max(0, fg.scrut) / fg.max)) : 0;
    var h = '<div class="door-in fight2 fb' + (fg.boss ? " is-boss" : fg.elite ? " is-elite" : "") + (fg.done ? " is-done" : "") + (ui.entering ? " is-entering" : "") + '" data-enc="' + fg.enc + '" data-venue="' + venue + '">';
    var place = venue === "away" ? (F.opp && F.opp.place ? F.opp.place : F.place || "Their turf") : "";
    var pill = (fg.boss ? "Boss · " : fg.elite ? "Hearing · " : "") + (VENUE_PILL[venue] || "Away · " + place.replace(/^The /, "the ").replace(/,.*$/, ""));
    h += '<header class="df-top fb-head"><div class="df-title"><small class="fb-venue v-' + venue + '" title="Q' + fg.q + " · " + esc(fg.dealTitle || "") + '">' + esc(pill) + "</small><b>" + esc(F.who) + (fg.cb ? ' <i class="df-cbchip" title="A familiar face">★</i>' : "") + "</b><em>" + esc(F.opp ? F.role : F.role + " · " + (fg.encName || fg.name)) + "</em></div>" +
      '<div class="df-scrut lvl-' + (LD.resLevel ? LD.resLevel("scrutiny", fg.max ? Math.max(0, fg.scrut) / fg.max : 0) : "ok") + '"><div class="df-k">' + (LD.tok ? LD.tok("scrutiny") : "") + 'Scrutiny <span class="fb-sn"><b id="df-scrut-n">' + Math.max(0, fg.scrut) + "</b>/" + fg.max + '</span></div><div class="df-bar" role="meter" aria-label="Scrutiny" aria-valuemin="0" aria-valuemax="' + fg.max + '" aria-valuenow="' + Math.max(0, fg.scrut) + '"><i style="width:' + pct + '%"></i></div>' +
      '<div class="df-goal">' + (fg.done ? "" : "Pressure to 0 to win · " + esc(LD.ENCOUNTERS[fg.enc].win)) + "</div></div>" + galHtml(fg) +
      '<div class="df-round" aria-label="Round ' + fg.round + " of " + fg.rounds + '"><small>Round</small> ' + Math.min(fg.round, fg.rounds) + "<i>/" + fg.rounds + "</i></div>" +
      '<button class="icon-btn df-help" id="df-help" aria-label="How fights work">?</button></header>';
    h += sceneHtml(state, fg, ui);
    h += "</div>";
    if (it) {
      var thr = it.through, ico = METER_ICO[it.meter] || "!", pk = LD.fightPeek ? LD.fightPeek(state) : null;
      h += '<div class="df-intent fb-intent m-' + it.meter + (thr ? "" : " blocked") + '" id="df-intent" aria-live="polite">' +
        '<div class="di-main"><span class="df-k">Next:</span> <span class="di-say">' + esc(F.short) + " will <b>" + esc(it.label) + "</b>" + (F.opp && F.opp.sig === it.k ? '<i class="di-sig" title="Signature move">★</i>' : "") + "</span></div>" +
        '<div class="di-chips"><span class="di-chip di-hit m-' + it.meter + '"><span class="di-ico" aria-hidden="true">' + ico + "</span>" + it.n + " → " + esc(METER_NAME[it.meter] || it.meter) + (it.meter === "collapse" ? " ×½" : "") + "</span>" +
        '<span class="di-chip di-math">Blk <b>' + it.block + "</b> · <b>" + thr + "</b> through</span>" +
        (it.rtext ? '<span class="di-chip di-rider' + (it.rider && it.at && thr >= it.at ? " live" : "") + '">' + esc(it.rtext) + "</span>" : "") +
        (it.notes.length ? '<span class="di-chip di-notes">' + esc(it.notes.join(" · ")) + "</span>" : "") +
        (pk ? '<span class="di-chip di-peek">Then: ' + esc(pk.label) + " " + pk.n + "</span>" : "") + "</div></div>";
    }
    var pileN = fg.done ? f.deck.length : fg.draw.length;
    h += '<div class="fb-dock' + (fg.done ? " is-out" : "") + (ui.entering ? " is-wait" : "") + '">';
    h += '<button class="df-pile fb-pile" id="df-deck" aria-label="' + (fg.done ? "Your deck, " + pileN + " cards" : "Draw pile, " + pileN + " cards left") + '. Open the deck list"><img src="assets/ui/card-back.webp" alt="" draggable="false"><em class="rd-count">' + pileN + "</em></button>";
    if (fg.done) {
      var d = fg.done, L = d.leaks, bits = [];
      if (L.cash) bits.push("−$" + L.cash + "M"); if (L.unrest) bits.push("unrest +" + L.unrest); if (L.collapse) bits.push("collapse +" + L.collapse); if (L.heat) bits.push("Heat +" + L.heat);
      var bye = venue === "home" || venue === "lobby" ? "Show them out ▸" : "Back to the office ▸";
      var how2 = d.how, O2 = F.opp, remember = O2 && !O2.boss && O2.act < 3 && how2 !== "walked";
      var out2 = d.out, aside = LD.execAside ? LD.execAside(state) : null;
      var stampT = (out2 && LD.OUT_LABEL && LD.OUT_LABEL[out2]) || LD.HOW_LABEL[how2] || (d.win ? "Deal closed" : d.settled ? "Settled" : "They got through");
      var endLine = '<div class="sc-ending h-' + (how2 || (d.win ? "crushed" : d.settled ? "paid" : "walked")) + (out2 ? " o-" + out2 : "") + '"><i class="sc-end-stamp sc-stamp ' + (how2 || "lost") + (out2 ? " o-" + out2 : "") + '">' + esc(stampT) + "</i></div>";
      var title = (d.win ? "You won the room" : d.settled ? "Settled for $" + d.cost + "M" : "They got through") + (remember ? " · They'll remember this" : "");
      var sub = O2 && out2 && LD.OUT_NOTE && LD.OUT_NOTE[out2] ? LD.OUT_NOTE[out2] : how2 === "walked" && O2 ? F.short + " walks out with what they came for." : "";
      var notes = d.win ? (d.notes.length ? d.notes : ["The deal closes."]) : d.settled ? ["No bonus, no more damage."].concat(d.notes) : ["The deal still signs."].concat(d.notes);
      h += '<div class="df-result fb-out ' + (d.win ? "win" : d.settled ? "settled" : "lost") + '" role="status">' + endLine +
        '<div class="fb-out-t"><b>' + esc(title) + "</b>" + (sub ? "<em>" + esc(sub) + "</em>" : "") + (aside ? '<q class="sc-aside">' + esc(aside.t) + "</q>" : "") + "</div>" +
        '<div class="fb-out-chips">' + notes.filter(Boolean).map(function (n) { return '<span class="fb-chip good">' + esc(n) + "</span>"; }).join("") +
        (bits.length ? '<span class="fb-chip bad df-leaks">This fight cost you: ' + esc(bits.join(", ")) + "</span>" : "") + "</div>" +
        '<button class="btn btn-coral df-close" id="df-close">' + bye + "</button></div>";
    } else if (!ui.entering) {
      h += '<div class="fb-dock-main"><div class="df-hud fb-bar"><div class="df-inf" aria-label="Influence ' + fg.inf + '">';
      for (var i = 0; i < Math.max(fg.inf, LD.DOOR.INF); i++) h += '<i class="' + (i < fg.inf ? "on" : "") + '"></i>';
      h += '<b>' + fg.inf + "/" + LD.DOOR.INF + "◆</b></div>";
      h += '<span class="df-piles fb-piles">Draw ' + fg.draw.length + " · Disc " + fg.disc.length + "</span>";
      var sc = LD.fightSettleCost(state);
      h += '<div class="df-actions"><button class="btn df-settle" id="df-settle"' + (state.cash < sc ? " disabled" : "") + '><b>Settle $' + sc + "M</b><small>" + (state.cash < sc ? "Not enough cash" : "Pay it off now") + "</small></button>" +
        '<button class="btn btn-coral df-end" id="df-end"><b>End round</b><small>' + (it ? (it.through ? esc(it.label) + " hits for " + it.through : "Fully blocked") : "") + (fg.round >= fg.rounds ? " · last round" : "") + "</small></button></div></div>";
      h += '<div class="df-hand" role="group" aria-label="Your hand">';
      fg.hand.forEach(function (u) {
        var ci = LD.fightCardInfo(state, u); if (!ci) return;
        h += cardFace(ci.id, ci.up, { attrs: ' data-u="' + u + '"', why: ci.why, cost: ci.o.cash ? (ci.cost || null) : ci.cost, p: ci.p, d: ci.d, cls: ui.flashU === u ? "pop" : "" });
      });
      if (!fg.hand.length) h += '<p class="df-empty">No cards left. End the round.</p>';
      h += "</div></div>";
    }
    h += "</div>";
    h += '<div class="df-log" id="df-log" aria-live="polite">' + esc(ui.log || "") + "</div>";
    h += '<div class="fx" id="df-fx" aria-hidden="true"></div>';
    return h + "</div>";
  };
  /* ---------- House rules, seated desk: the fight across the table (first person). Same ids and hooks as renderFight;
     the visitor sits in the chair opposite, the played card lies on the table, the hand fans up over your own hands. ---------- */
  LD.renderSeatedFight = function (state, ui) {
    ui = ui || {};
    var f = state.fy, fg = f.fight; if (!fg) return "";
    var it = fg.done ? null : LD.fightIntent(state);
    var F = LD.fightFace(fg), venue = LD.fightVenue(fg);
    var how = fg.done ? fg.done.how || (fg.done.win ? "crushed" : fg.done.settled ? "paid" : "walked") : null, out = fg.done ? fg.done.out : null;
    var base = !fg.done ? "idle" : out === "martyred" || how === "walked" ? "attack" : out === "bought" || out === "converted" || out === "deal" || how === "paid" ? (F.paid ? "paid" : "idle") : "defeated";
    var h = '<div class="door-in sd-fin' + (fg.boss ? " is-boss" : fg.elite ? " is-elite" : "") + (fg.done ? " is-done" : "") + '" data-enc="' + fg.enc + '" data-venue="' + venue + '">';
    h += '<div class="sd-bg" aria-hidden="true"></div>';
    var card = "";
    if (ui.lastCard && !fg.done) card = '<div class="sd-tcard' + (ui.landing ? " is-landing" : "") + '" id="sd-tcard">' + cardFace(ui.lastCard.id, ui.lastCard.up, { cls: "sd-tc" }).replace(/^<button/, "<div").replace(/<\/button>$/, "</div>") + "</div>";
    else card = '<div class="sd-tcard is-empty" id="sd-tcard"></div>';
    h += '<div class="df-stage sd-fstage' + (ui.enter ? " enter" : "") + '" data-venue="' + venue + '">' +
      LD.seatStage({ opp: LD.seatOppHtml(F.art, base, POSES.concat(F.paid ? ["paid"] : [])), card: card, youId: "sc-you", hands: "dip" }) + "</div>";
    h += LD.seatHud(state, { fight: fg, menu: false, nets: false }).replace('class="sd-menu"', 'class="sd-menu" id="df-help" aria-label="How fights work"').replace(' aria-label="Menu"', "");
    /* who, round, gallery */
    var g = Math.max(-3, Math.min(3, fg.gal | 0)), gal = '<span class="df-gal sd-gal" role="meter" aria-label="Gallery ' + (g > 0 ? "+" : "") + g + '" aria-valuemin="-3" aria-valuemax="3" aria-valuenow="' + g + '"><small>Them</small>';
    for (var gi = -3; gi <= 3; gi++) gal += '<i class="' + (gi === 0 ? "mid " : "") + (gi === g ? "on" : (gi < 0 && g <= gi) || (gi > 0 && g >= gi) ? "lit" : "") + '"></i>';
    gal += "<small>You</small></span>";
    h += '<div class="sd-fhead"><span class="sd-who"><small>' + esc(fg.boss ? "Boss" : fg.elite ? "Hearing" : "At your desk") + "</small><b>" + esc(F.who) + (fg.cb ? ' <i title="A familiar face">★</i>' : "") + "</b><em>" + esc(F.role) + "</em></span>" + gal +
      '<span class="sd-round" aria-label="Round ' + fg.round + " of " + fg.rounds + '"><small>Round</small><b>' + Math.min(fg.round, fg.rounds) + "<i>/" + fg.rounds + "</i></b></span></div>";
    var bt = F.opp && !(ui.cap && ui.cap.t && !fg.done) ? bubbleText(state, fg, ui) : null;
    var capT = "";
    if (fg.cb && !fg.done && fg.round === 1 && !fg.played && !ui.cbHide) {
      var cb = fg.cb, im = cb.art ? "assets/fight/" + cb.art + ".webp" : "";
      h += '<div class="sd-cb' + (cb.inset ? " is-witness" : "") + '" id="sc-cb" role="note"><small>★ A familiar face ★</small>' + (im ? '<img src="' + im + '" alt="" draggable="false">' : "") +
        "<b>" + esc(cb.who) + "</b><q>" + esc(cb.line) + "</q><em>" + esc(cb.effect) + '</em><button type="button" class="sd-cb-ok" id="sc-cb-ok">Face them ▸</button></div>';
    } else if (!fg.done && !fg.played && (fg.round | 0) <= 1 && !(ui.cap && ui.cap.t)) capT = LD.fightOpener(state, fg, "home");
    h += '<div class="sd-talk">';
    if (bt && bt.t) h += '<div class="sd-bubble k-' + bt.k + '" id="sc-bubble" role="status" aria-live="polite"><b>' + esc(F.who) + "</b>" + esc(bt.t) + "</div>";
    h += '</div><div class="sd-caps">';
    if (capT) h += '<div class="sd-cap" id="sc-why" role="note"><span>' + esc(capT) + "</span></div>";
    if (ui.cap && ui.cap.t && !fg.done) h += '<div class="sd-cap" id="sc-cap" role="note"><span>' + esc(ui.cap.t) + "</span></div>";
    h += "</div>";
    if (it) {
      var thr = it.through, pk = LD.fightPeek ? LD.fightPeek(state) : null;
      h += '<div class="df-intent sd-intent m-' + it.meter + (thr ? "" : " blocked") + '" id="df-intent" aria-live="polite"><span class="sd-ik">Next</span>' +
        '<span class="sd-isay">' + esc(F.short) + " will <b>" + esc(it.label) + "</b>" + (F.opp && F.opp.sig === it.k ? ' <i title="Signature move">★</i>' : "") + "</span>" +
        '<span class="sd-ichips"><span class="sd-ichip m-' + it.meter + '">' + it.n + " → " + esc(METER_NAME[it.meter] || it.meter) + (it.meter === "collapse" ? " ×½" : "") + "</span>" +
        '<span class="sd-ichip">Block ' + it.block + " · <b>" + thr + "</b> through</span>" +
        (it.rtext ? '<span class="sd-ichip' + (it.rider && it.at && thr >= it.at ? " live" : "") + '">' + esc(it.rtext) + "</span>" : "") +
        (it.notes.length ? '<span class="sd-ichip">' + esc(it.notes.join(" · ")) + "</span>" : "") +
        (pk ? '<span class="sd-ichip">Then: ' + esc(pk.label) + " " + pk.n + "</span>" : "") + "</span></div>";
    }
    var pileN = fg.done ? f.deck.length : fg.draw.length;
    h += '<div class="sd-fdock' + (fg.done ? " is-out" : "") + '">';
    if (fg.done) {
      var d = fg.done, L = d.leaks, bits = [];
      if (L.cash) bits.push("−$" + L.cash + "M"); if (L.unrest) bits.push("unrest +" + L.unrest); if (L.collapse) bits.push("collapse +" + L.collapse); if (L.heat) bits.push("Heat +" + L.heat);
      var O2 = F.opp, remember = O2 && !O2.boss && O2.act < 3 && how !== "walked", aside = LD.execAside ? LD.execAside(state) : null;
      var stampT = (out && LD.OUT_LABEL && LD.OUT_LABEL[out]) || LD.HOW_LABEL[how] || (d.win ? "Deal closed" : d.settled ? "Settled" : "They got through");
      var title = (d.win ? "You won the room" : d.settled ? "Settled for $" + d.cost + "M" : "They got through") + (remember ? " · They'll remember this" : "");
      var sub = O2 && out && LD.OUT_NOTE && LD.OUT_NOTE[out] ? LD.OUT_NOTE[out] : how === "walked" && O2 ? F.short + " walks out with what they came for." : "";
      var notes = d.win ? (d.notes.length ? d.notes : ["The deal closes."]) : d.settled ? ["No bonus, no more damage."].concat(d.notes) : ["The deal still signs."].concat(d.notes);
      h += '<div class="df-result sd-result ' + (d.win ? "win" : d.settled ? "settled" : "lost") + '" role="status"><i class="sd-stamp h-' + (how || "lost") + (out ? " o-" + out : "") + '">' + esc(stampT) + "</i>" +
        "<b>" + esc(title) + "</b>" + (sub ? "<em>" + esc(sub) + "</em>" : "") + (aside ? '<q class="sc-aside">' + esc(aside.t) + "</q>" : "") +
        '<span class="sd-chips">' + notes.filter(Boolean).map(function (n) { return '<span class="sd-chip good">' + esc(n) + "</span>"; }).join("") +
        (bits.length ? '<span class="sd-chip bad df-leaks">This fight cost you: ' + esc(bits.join(", ")) + "</span>" : "") + "</span>" +
        '<span class="sd-rfoot"><button type="button" class="sd-pile" id="df-deck" aria-label="Your deck, ' + pileN + ' cards. Open the deck list"><img src="assets/ui/card-back.webp" alt="" draggable="false"><em>' + pileN + "</em></button>" +
        '<button type="button" class="btn btn-coral df-close" id="df-close">Show them out ▸</button></span></div>';
    } else {
      var sc = LD.fightSettleCost(state);
      h += '<div class="sd-acts"><button type="button" class="sd-pile" id="df-deck" aria-label="Draw pile, ' + pileN + ' cards left. Open the deck list"><img src="assets/ui/card-back.webp" alt="" draggable="false"><em>' + pileN + "</em></button>" +
        '<span class="sd-inf" aria-label="Influence ' + fg.inf + " of " + LD.DOOR.INF + '">';
      for (var i = 0; i < Math.max(fg.inf, LD.DOOR.INF); i++) h += '<i class="' + (i < fg.inf ? "on" : "") + '"></i>';
      h += "<b>" + fg.inf + "/" + LD.DOOR.INF + "</b></span>" +
        '<button type="button" class="sd-btn df-settle" id="df-settle"' + (state.cash < sc ? " disabled" : "") + "><b>Settle $" + sc + "M</b><small>" + (state.cash < sc ? "Not enough cash" : "Pay it off") + "</small></button>" +
        '<button type="button" class="sd-btn hot df-end" id="df-end"><b>End round</b><small>' + (it ? (it.through ? esc(it.label) + " hits " + it.through : "Fully blocked") : "") + (fg.round >= fg.rounds ? " · last" : "") + "</small></button></div>";
      h += '<div class="df-hand sd-fhand" role="group" aria-label="Your hand" style="--n:' + Math.max(1, fg.hand.length) + '">';
      fg.hand.forEach(function (u, k) {
        var ci = LD.fightCardInfo(state, u); if (!ci) return;
        h += cardFace(ci.id, ci.up, { attrs: ' data-u="' + u + '" style="--c:' + k + '"', why: ci.why, cost: ci.o.cash ? (ci.cost || null) : ci.cost, p: ci.p, d: ci.d, cls: ui.flashU === u ? "pop" : "" });
      });
      if (!fg.hand.length) h += '<p class="sd-empty">No cards left. End the round.</p>';
      h += "</div>";
    }
    h += "</div>";
    h += '<div class="sd-log df-log" id="df-log" aria-live="polite">' + esc(ui.log || "") + "</div>";
    h += '<div class="fx" id="df-fx" aria-hidden="true"></div>';
    return h + "</div>";
  };
  LD.renderReward = function (state, ui) {
    ui = ui || {};
    var f = state.fy, r = f.reward; if (!r) return "";
    var lf = r.from || {}, E = LD.ENCOUNTERS[lf.enc] || { name: "The door" }, LO = lf.opp && LD.oppById ? LD.oppById(lf.opp) : null;
    var head = '<header class="rw-head"><small>' + (lf.how && LD.HOW_LABEL[lf.how] ? LD.HOW_LABEL[lf.how].charAt(0) + LD.HOW_LABEL[lf.how].slice(1).toLowerCase() + " · " : lf.win ? "Won · " : lf.settled ? "Settled · " : "Lost · ") + esc(LO ? LO.who : E.name) + " · Q" + (lf.q || state.turn) + "</small>";
    var h = '<div class="rw-in">';
    if (!r.itemDone && r.item) {
      var it = LD.itemById(r.item), full = f.drawer.length >= f.dcap;
      h += head + "<h2>Loot on the desk</h2></header>";
      h += '<div class="rw-item r-' + String(it.r).toLowerCase() + '"><span class="rw-ico" aria-hidden="true">' + IA(it) + "</span><b>" + esc(it.name) + "</b><span>" + esc(it.text || "") + "</span><em>Briefcase " + f.drawer.length + "/" + f.dcap + "</em></div>";
      if (full && ui.replaceItem) {
        h += '<p class="rw-q">Briefcase full. Sell one to make room:</p><div class="rw-minis">';
        f.drawer.forEach(function (d) { var x = LD.itemById(d.id); h += '<button class="fy-mini" data-isell="' + d.id + '"><span>' + IA(x) + "</span><b>" + esc(x.name) + "</b><em>Sell $" + LD.ITEM_SELL[x.r] + "M</em></button>"; });
        h += "</div>";
        h += '<div class="rw-foot"><button class="btn" id="rw-back">Back</button></div>';
      } else h += '<div class="rw-foot"><button class="btn" id="rw-sell">Sell for $' + LD.ITEM_SELL[it.r] + 'M</button><button class="btn btn-coral" id="rw-keep">' + (full ? "Keep (swap one)" : "Into the briefcase") + "</button></div>";
      return h + "</div>";
    }
    if (!r.assetDone && r.asset) {
      var wallFull = LD.fySlotsUsed(state) >= f.cap;
      h += head + "<h2>" + (r.why === "boss" ? "Boss beaten: frame an Asset" : r.why === "elite" ? "The Hearing is over: frame an Asset" : lf.q === 1 ? "Your first trophy: frame an Asset" : "A new act: frame an Asset") + "</h2><p class=\"rw-sub\">Wall " + LD.fySlotsUsed(state) + "/" + f.cap + (wallFull ? " · full: pick one to take down (+$" + LD.FY.DIVEST_CASH + "M)" : "") + "</p></header>";
      if (ui.replaceFor) {
        h += '<div class="rw-minis">';
        f.hand.forEach(function (c) { var a = LD.assetById(c.id); if (!a) return; h += '<button class="fy-mini" data-areplace="' + a.id + '"><span>' + IA(a) + "</span><b>" + esc(a.name) + "</b><em>" + esc(a.text) + "</em></button>"; });
        h += '</div><div class="rw-foot"><button class="btn" id="rw-back">Back</button></div>';
        return h + "</div>";
      }
      h += '<div class="rw-assets">';
      r.asset.forEach(function (id) { var a = LD.assetById(id); if (!a) return;
        h += '<button class="fy-card rw-asset r-' + String(a.r).toLowerCase() + '" data-asset="' + id + '"><span class="fy-ico" aria-hidden="true">' + IA(a) + '</span><span class="fy-txt"><b>' + esc(a.name) + "</b><em><i class=\"fy-gem\"></i>" + ({ C: "Common", U: "Uncommon", R: "Rare", L: "Legendary" })[a.r] + '</em><span class="fy-eff">' + esc(a.text) + "</span></span></button>"; });
      h += '</div><div class="rw-foot"><button class="btn" id="rw-apass">Pass</button></div>';
      return h + "</div>";
    }
    /* Cards */
    h += head + "<h2>" + (r.rare ? "A rare pick" : "Add a card") + '</h2><p class="rw-sub">Deck ' + f.deck.length + " cards" + (r.rider ? " · ⚠ activist rider: taking a card adds a curse" : "") + (lf.win || lf.settled ? "" : " · lost fights offer 2") + "</p></header>";
    if (ui.shredding) {
      h += '<p class="rw-q">Shred one card for $' + LD.shredCost(state) + 'M:</p><div class="rw-deck">';
      f.deck.forEach(function (c) { var why = LD.shredBlock(state, c.u); h += cardFace(c.id, c.up, { attrs: ' data-shred="' + c.u + '"', why: why, cls: "chip" }); });
      h += '</div><div class="rw-foot"><button class="btn" id="rw-back">Back</button></div>';
      return h + "</div>";
    }
    if (ui.upgrading) {
      h += '<p class="rw-q">Upgrade one card (once per card):</p><div class="rw-deck">';
      f.deck.forEach(function (c) { var why = LD.upgradeBlock(state, c.u); if (LD.isCurse(c.id)) return; h += cardFace(c.id, c.up, { attrs: ' data-upg="' + c.u + '"', why: why, cls: "chip" }); });
      h += '</div><div class="rw-foot"><button class="btn" id="rw-back">Back</button></div>';
      return h + "</div>";
    }
    h += '<div class="rw-cards">';
    r.cards.forEach(function (id) { h += cardFace(id, 0, { attrs: ' data-card="' + id + '"', cls: "big" + (ui.sel === id ? " sel" : "") }); });
    h += "</div>";
    var scost = LD.shredCost(state), canShred = state.cash >= scost && f.deck.length > 6;
    h += '<div class="rw-foot">' +
      (f.rerolls > 0 ? '<button class="btn" id="rw-reroll">Reroll (' + f.rerolls + ")</button>" : "") +
      (f.upTokens > 0 ? '<button class="btn" id="rw-upg">Upgrade (' + f.upTokens + ")</button>" : "") +
      '<button class="btn" id="rw-shred"' + (canShred ? "" : " disabled") + ">Shred a card $" + scost + "M</button>" +
      '<button class="btn" id="rw-skip">Skip +$' + (f.skipCash || LD.DOOR.SKIP) + "M</button>" +
      '<button class="btn btn-coral" id="rw-take"' + (ui.sel ? "" : " disabled") + ">" + (ui.sel ? "Take " + esc(LD.cardDef(ui.sel).name) : "Pick a card") + "</button></div>";
    return h + "</div>";
  };
  LD.renderDeck = function (state, ui) {
    ui = ui || {};
    var f = state.fy; if (!f || !f.deck) return "";
    var h = '<div class="dk-in"><header class="rw-head"><small>Your deck · ' + f.deck.length + " cards" + (f.upTokens ? " · " + f.upTokens + " upgrade" + (f.upTokens > 1 ? "s" : "") : "") + (f.freeShreds ? " · " + f.freeShreds + " free shred" + (f.freeShreds > 1 ? "s" : "") : "") + "</small><h2>Deck and fixers</h2></header>";
    h += '<div class="dk-fixers">';
    f.fixers.forEach(function (r) { var x = LD.fixerById(r.id); if (!x) return;
      h += '<div class="dk-fixer"><span class="dk-fi" aria-hidden="true">' + IA(x) + "</span><div><b>" + esc(x.name) + "</b><em>" + esc(x.t + " · " + x.role + " · $" + x.pay + "M/Q") + '</em><span class="dk-heat">Heat ' + "🔥".repeat(r.heat || 0) + (r.heat ? "" : "0") + "/3" + (f.hearing === r.id ? " · Hearing due" : "") + "</span></div>" +
        (f.fixers.length > 1 ? '<button class="btn dk-fire" data-fire="' + r.id + '">Let go</button>' : "") + "</div>"; });
    h += "</div>";
    var mode = ui.mode || "";
    if (mode) h += '<p class="rw-q">' + (mode === "shred" ? "Tap a card to shred it (free)." : "Tap a card to upgrade it.") + "</p>";
    h += '<div class="dk-cards">';
    var order = f.deck.slice().sort(function (a, b) { var A = LD.cardDef(a.id), B = LD.cardDef(b.id); return (A.t === "Curse") - (B.t === "Curse") || A.name.localeCompare(B.name); });
    order.forEach(function (c) {
      var why = mode === "shred" ? LD.shredBlock(state, c.u) : mode === "upgrade" ? LD.upgradeBlock(state, c.u) : null;
      h += cardFace(c.id, c.up, { tag: mode ? "button" : "div", attrs: mode ? ' data-dk="' + c.u + '"' : "", why: why, cls: "mini" });
    });
    h += "</div></div>";
    return h;
  };
  LD.fightHelpHtml = function (state) {
    var T = state && LD.execTraits ? LD.execTraits(state.executiveId) : null;
    return '<div class="fy-explain"><h2>Door fights</h2><ul class="fy-list">' +
      '<li><span class="fy-ico">👥</span><div><b>The Gallery</b><span>The crowd meter under Scrutiny. Shame, Rumour, Crowd and Favour cards win it; Debt and Precarity lose it, and so do hard hits that get through. With the room at +2 their moves land 2 softer; against you, 2 harder.</span></div></li>' +
      '<li><span class="fy-ico">🎭</span><div><b>How you win matters</b><span>The pressure that did most of the work picks the ending: Debt buys them, Legal breaks them, Shame with the room on your side exposes them. Win with the room against you and you make a martyr.</span></div></li>' +
      (T ? '<li><span class="fy-ico">🪞</span><div><b>' + esc(T.good.name) + " · " + esc(T.bad.name) + "</b><span>" + esc(T.good.text) + " " + esc(T.bad.text) + "</span></div></li>" : "") +
      '<li><span class="fy-ico">🎯</span><div><b>Win: Scrutiny to 0</b><span>Pressure cards lower Scrutiny. Hit 0 and they leave. Each encounter pays a bonus.</span></div></li>' +
      '<li><span class="fy-ico">🛡️</span><div><b>Block the intent</b><span>The badge shows what lands when you end the round, and on which meter. Deniability blocks it point for point.</span></div></li>' +
      '<li><span class="fy-ico">◆</span><div><b>3 Influence a round</b><span>Cards cost ◆ (some cost cash). 5 cards a round. Unplayed cards go to the discard.</span></div></li>' +
      '<li><span class="fy-ico">🤝</span><div><b>Settle or lose</b><span>Settle pays $' + LD.DOOR.SETTLE + 'M per Scrutiny left and ends it with no more damage. Losing still signs the deal, but the region takes stress.</span></div></li>' +
      '<li><span class="fy-ico">🃏</span><div><b>Then a reward</b><span>Pick a card, shred one, or skip for cash. Fixers bring their own cards. Curses clog your hand until shredded.</span></div></li></ul></div>';
  };

  LD.renderDraft = renderDraft;
  LD.renderPortfolio = renderPortfolio;
  LD.actChip = actChip;
  LD.renderBossCard = bossCard;
  LD.fyDossier = fyDossier;
  LD.nextBossQ = nextBossQ;
  if (typeof module !== "undefined" && module.exports) module.exports = LD;
})(typeof globalThis !== "undefined" ? globalThis : this);

  
/* ---------- "What can I do now": one source of truth for highlights ----------
   LD.actionable(state, ctx) returns { ids, prio, dim, badges }.
   ids    : every action that is truly available right now (UI maps them to elements).
   prio   : ordered candidates for the single pointing-hand marker (UI shows the first that is on screen).
   dim    : things on screen you cannot act on yet.
   badges : map tabs that hold something new since you last looked (needs ctx.lensSeen). */
(function (root) {
  var LD = root.LD;
  function lensSig(state, lens) {
    var w = state.world || {}, regs = w.regions || {};
    if (lens === "mood") return Object.keys(regs).filter(function (id) { return (LD.willRevolt && LD.willRevolt(state, id)) || (regs[id].stress | 0) >= LD.STRESS_STRIKE; }).sort().join(",");
    if (lens === "networks") return (LD.SYSTEMS || []).map(function (s) { return s.id + ":" + LD.gridLabel(LD.gridLevel(state, s.id)); }).join(",");
    if (lens === "holdings") return Object.keys(regs).filter(function (id) { return regs[id].owned; }).sort().join(",");
    return "";
  }
  LD.LENSES = ["mood", "networks", "holdings"];
  LD.lensSig = lensSig;
  LD.actionable = function (state, ctx) {
    ctx = ctx || {};
    var out = { ids: [], prio: [], dim: [], badges: [] };
    if (!state || state.ended) return out;
    function add(id) { if (out.ids.indexOf(id) < 0) out.ids.push(id); }
    var f = state.fy || null;
    /* A fight in progress owns the screen. */
    if (f && f.fight) {
      var fg = f.fight;
      if (fg.done) { add("fightclose"); out.prio.push("fightclose"); return out; }
      add("door");
      var playable = (fg.hand || []).filter(function (u) { var ci = LD.fightCardInfo(state, u); return ci && !ci.why; });
      playable.forEach(function (u) { add("card:" + u); });
      if (!playable.length) { add("endround"); out.prio.push("endround"); }
      out.prio.push("door");
      return out;
    }
    if (f && f.reward) { add("reward"); out.prio.push("reward-take", "reward"); return out; }
    if (f && f.memo) {
      add("phone");
      ["a", "b", "c"].forEach(function (k) {
        if (k === "c") return; /* "Not now" is always there; never pushed */
        var m = LD.memoById(f.memo.id); if (!m) return;
        if (m.id === "headhunter") { if (f.memo.offer && f.memo.offer[k === "a" ? 0 : 1] && f.fixers.length < LD.DOOR.FIXER_CAP) add("memo:" + k); return; }
        if (m[k] && LD.memoAffordable(state, k)) add("memo:" + k);
      });
      out.prio.push("phone");
    }
    /* Office items in the briefcase that can be used right now. */
    var usable = ((f && f.drawer) || []).filter(function (d) { return LD.itemReady(state, d) && !LD.itemBlock(state, d.id); });
    usable.forEach(function (d) { add("item:" + d.id); });
    if (usable.length) add("briefcase");
    if (state.phase === "deal") {
      (state.offered || []).forEach(function (id) { add("deal:" + id); });
      out.dim.push("endq", "bunker");
    } else if (state.phase === "bunker") {
      var orders = [];
      if (!state.bunkerActedThisTurn) (LD.availableUpgrades(state) || []).forEach(function (u) {
        if (u.inbound) return;
        if (u.canSound) orders.push("order:" + u.systemId + ":sound");
        if (u.canCheap) orders.push("order:" + u.systemId + ":cheap");
        if (u.canSound || u.canCheap) add("room:" + u.systemId);
      });
      if (orders.length) {
        add("bunker"); orders.forEach(add);
        out.prio.push("order-sound", "room", "bunker");
        out.dim.push("endq-soft");
      } else {
        add("endq"); out.prio.push("endq");
      }
    }
    if (ctx.lensSeen) LD.LENSES.forEach(function (l) {
      if (ctx.lensSeen[l] != null && ctx.lensSeen[l] !== lensSig(state, l)) { out.badges.push("tab:" + l); }
    });
    return out;
  };
})(typeof globalThis !== "undefined" ? globalThis : this);
