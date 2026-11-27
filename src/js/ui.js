
/* Last Dividend — B3 touch-first UI. No hover-only actions. */
(function () {
  var state = null;
  var screen = "title";
  var tutorialPage = 0;
  var selectedExec = "mara";
  var seedDraft = "";
  var crisisOpen = null;
  var lastFired = [];
  var screenIntent = "title";
  var selectedRating = null;
  var lastEnd = null;
  var boardBack = "title";
  var boardNotice = "";
  var boardSel = null;
  var boardBought = null;
  var endLetter = false;

  function $(id) { return document.getElementById(id); }

  function defaultMeta() {
    return LD.migrateMeta({ seenTutorial: false, history: [], midRun: null, finished: 0, wins: 0 });
  }

  function loadMeta() {
    try {
      var raw = localStorage.getItem(LD.SAVE_KEY);
      if (!raw) return defaultMeta();
      var parsed = JSON.parse(raw);
      var meta = defaultMeta();
      Object.keys(parsed).forEach(function (k) { meta[k] = parsed[k]; });
      if (!Array.isArray(meta.history)) meta.history = [];
      return LD.migrateMeta(meta);
    } catch (e) {
      return defaultMeta();
    }
  }

  function saveMeta(meta) {
    try { localStorage.setItem(LD.SAVE_KEY, JSON.stringify(meta)); } catch (e) {}
  }

  /* Asset Prospectus: remember what the player has seen and found (meta, across runs). */
  function codexMark(ids, found) {
    if (!ids || !ids.length) return;
    var meta = loadMeta(); var cx = meta.codex || (meta.codex = { seen: {}, found: {} });
    cx.seen = cx.seen || {}; cx.found = cx.found || {};
    var ch = false;
    ids.forEach(function (id) { if (!id) return; if (!cx.seen[id]) { cx.seen[id] = 1; ch = true; } if (found && !cx.found[id]) { cx.found[id] = 1; ch = true; } });
    if (ch) saveMeta(meta);
  }
  function persistRun() {
    var meta = loadMeta();
    meta.midRun = state && !state.ended ? state : null;
    saveMeta(meta);
  }

  function clearMidRun() {
    var meta = loadMeta();
    meta.midRun = null;
    saveMeta(meta);
  }

  /* What this run newly opened: seats, harder ratings, level perks, mandates, and Lounge items now within reach. */
  function unlockDiff(before, after, applied, st) {
    var out = [];
    /* the seal bonus unlock leads: it is this run's headline */
    if (applied.payout && applied.payout.sealUnlock) {
      var cz = (LD.COSMETICS || []).filter(function (c) { return "cos:" + c.slot + ":" + c.id === applied.payout.sealUnlock; })[0];
      if (cz) out.push({ kind: "bonus", name: cz.name, text: "Fortress seal · yours in the Portfolio" });
    }
    LD.EXECUTIVES.forEach(function (ex) {
      if (!LD.isExecutiveUnlocked(ex.id, before) && LD.isExecutiveUnlocked(ex.id, after)) out.push({ kind: "seat", name: ex.name, text: ex.firm });
    });
    if (applied.newRating != null) out.push({ kind: "rating", name: LD.ratingName(applied.newRating), text: "Harder rules for " + LD.execById(st.executiveId).name });
    ((applied.xp && applied.xp.newPerks) || []).forEach(function (p) { out.push({ kind: "perk", name: "Lv " + p.lv, text: p.text }); });
    if (applied.payout && applied.payout.mandateMet && (before.mandatesDone || []).indexOf(st.mandate) === -1) {
      var md = (LD.MANDATES || []).filter(function (m) { return m.id === st.mandate; })[0];
      if (md) out.push({ kind: "mandate", name: md.text, text: "Board mandate" });
    }
    try {
      var n = 0;
      LD.shopItems().forEach(function (it) {
        if (n >= 2 || !it.price || LD.itemOwned(after, it.key)) return;
        if (it.price > (before.dividends | 0) && it.price <= (after.dividends | 0)) { out.push({ kind: "afford", name: it.name, text: "\u25c8 " + it.price + " in the Lounge" }); n++; }
      });
    } catch (e) {}
    return out;
  }
  function recordEnding() {
    var before = loadMeta();
    var applied = LD.applyRunEnd(before, state);
    var meta = applied.meta;
    lastEnd = { payout: applied.payout, newRating: applied.newRating, seed: state.seed, turn: state.turn, xp: applied.xp, toastShown: false };
    meta.finished += 1;
    if (state.ending && state.ending.kind === "win") meta.wins += 1;
    lastEnd.unlocks = unlockDiff(before, meta, applied, state);
    meta.midRun = null;
    meta.history.unshift({
      at: Date.now(),
      seed: state.seedLabel,
      executiveId: state.executiveId,
      result: state.ending.kind,
      reason: state.ending.reason,
      title: state.ending.title,
      turn: state.turn,
      cash: state.cash,
      unrest: state.unrest,
      collapse: state.collapse,
      rating: state.rating | 0,
      dividends: applied.payout.total
    });
    var cap = meta.owned.indexOf("annual:history") !== -1 ? 50 : 12;
    if (meta.history.length > cap) meta.history.length = cap;
    saveMeta(meta);
  }

  /* ---------- Sound: generated WebAudio, starts after the first gesture, mute persists ---------- */
  var SFX = (function () {
    var KEY = "lastDividend.audio";
    var ctx = null, master = null, amb = null, unlocked = false;
    var muted = false;
    try { muted = localStorage.getItem(KEY) === "off"; } catch (e) {}
    function ensure() {
      if (!unlocked) return null;
      if (!ctx) {
        var Ctx = window.AudioContext || window.webkitAudioContext;
        if (!Ctx) return null;
        try { ctx = new Ctx(); } catch (e) { return null; }
        master = ctx.createGain(); master.gain.value = muted ? 0 : 0.7; master.connect(ctx.destination);
      }
      if (ctx.state === "suspended") { try { ctx.resume(); } catch (e) {} }
      return ctx;
    }
    function env(g, t, a, peak, d) { g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + a + d); }
    function tone(f, dur, type, vol, delay, slide) {
      var c = ensure(); if (!c || muted) return;
      var t = c.currentTime + (delay || 0), o = c.createOscillator(), g = c.createGain();
      o.type = type || "sine"; o.frequency.setValueAtTime(f, t);
      if (slide) o.frequency.exponentialRampToValueAtTime(slide, t + dur);
      env(g, t, 0.008, vol || 0.08, dur); o.connect(g); g.connect(master); o.start(t); o.stop(t + dur + 0.05);
    }
    var nbuf = null;
    function noise(dur, vol, delay, freq, q, type) {
      var c = ensure(); if (!c || muted) return;
      if (!nbuf) { nbuf = c.createBuffer(1, c.sampleRate, c.sampleRate); var d = nbuf.getChannelData(0); for (var i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; }
      var t = c.currentTime + (delay || 0), src = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
      src.buffer = nbuf; f.type = type || "bandpass"; f.frequency.value = freq || 1200; f.Q.value = q || 1;
      env(g, t, 0.005, vol || 0.1, dur); src.connect(f); f.connect(g); g.connect(master); src.start(t); src.stop(t + dur + 0.05);
    }
    var lib = {
      tick: function () { tone(660, 0.05, "triangle", 0.035); },
      flip: function (i) { noise(0.09, 0.09, (i || 0) * 0.12, 2600, 0.8, "highpass"); tone(880 + 120 * (i || 0), 0.08, "triangle", 0.03, (i || 0) * 0.12 + 0.03); },
      rare: function () { [1046, 1318, 1568].forEach(function (f, i) { tone(f, 0.25, "sine", 0.05, 0.45 + i * 0.07); }); },
      pick: function () { tone(523, 0.09, "triangle", 0.06); tone(784, 0.14, "triangle", 0.06, 0.07); noise(0.05, 0.05, 0, 4000, 1, "highpass"); },
      stamp: function () { tone(150, 0.08, "square", 0.05); tone(95, 0.14, "triangle", 0.06, 0.03); },
      coin: function () { tone(1318, 0.07, "square", 0.025); tone(1760, 0.12, "square", 0.025, 0.06); },
      endq: function () { tone(196, 0.5, "sawtooth", 0.035, 0, 98); noise(0.35, 0.05, 0, 400, 0.7, "lowpass"); tone(392, 0.3, "triangle", 0.04, 0.05); },
      seal: function () { noise(0.5, 0.25, 0, 180, 0.8, "lowpass"); tone(70, 0.6, "sine", 0.2, 0, 40); noise(0.08, 0.12, 0.42, 900, 2); tone(110, 0.3, "square", 0.04, 0.45, 55); },
      boss: function () { tone(110, 0.9, "sawtooth", 0.05, 0, 104); tone(165, 0.9, "sawtooth", 0.04, 0.02, 156); tone(233, 0.7, "square", 0.025, 0.25); noise(0.6, 0.08, 0, 300, 0.6, "lowpass"); tone(55, 1.1, "sine", 0.12, 0.05); },
      levelup: function () { [523, 659, 784, 1046, 1318].forEach(function (f, i) { tone(f, 0.22, "triangle", 0.06, i * 0.08); }); tone(1568, 0.6, "sine", 0.05, 0.42); },
      win: function () { [392, 523, 659, 784].forEach(function (f, i) { tone(f, 0.5, "triangle", 0.05, i * 0.14); }); tone(1046, 0.9, "sine", 0.05, 0.6); },
      lose: function () { [330, 294, 262, 196].forEach(function (f, i) { tone(f, 0.45, "sawtooth", 0.035, i * 0.2, f * 0.97); }); noise(0.9, 0.06, 0.2, 250, 0.5, "lowpass"); },
      bad: function () { tone(180, 0.18, "square", 0.03, 0, 150); },
      good: function () { tone(784, 0.1, "triangle", 0.04); tone(1046, 0.14, "triangle", 0.04, 0.06); },
      knock: function (lv) {
        lv = lv | 0;
        var n = [2, 3, 4, 6][lv], gap = [0.3, 0.2, 0.15, 0.1][lv], vol = [0.06, 0.12, 0.2, 0.28][lv];
        for (var i = 0; i < n; i++) { noise(0.07, vol, i * gap, 260 + lv * 40, 1.2, "lowpass"); tone(95 - lv * 6, 0.09, "sine", vol * 0.9, i * gap, 55); }
        if (lv >= 2) noise(0.25, vol * 0.4, n * gap, 1200, 3);
        if (lv >= 3) { for (var k = 0; k < 4; k++) noise(0.35, 0.05, 0.1 + k * 0.28, 520 + k * 90, 6); }
      },
      item: function () { tone(660, 0.08, "triangle", 0.05); tone(990, 0.12, "triangle", 0.05, 0.07); noise(0.12, 0.05, 0.04, 3000, 1, "highpass"); },
      loot: function () { noise(0.3, 0.06, 0, 2200, 0.8, "highpass"); [784, 988, 1175, 1568].forEach(function (f, i) { tone(f, 0.3, "sine", 0.05, 0.25 + i * 0.08); }); }
    };
    function ambStart() {
      var c = ensure(); if (!c || amb || muted) return;
      var g = c.createGain(); g.gain.value = 0.0001; g.connect(master);
      var lp = c.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 420; lp.connect(g);
      var o1 = c.createOscillator(), o2 = c.createOscillator(), o3 = c.createOscillator();
      o1.type = "sine"; o1.frequency.value = 55; o2.type = "sine"; o2.frequency.value = 82.6; o3.type = "triangle"; o3.frequency.value = 110.4;
      var g3 = c.createGain(); g3.gain.value = 0.25; o3.connect(g3); g3.connect(lp);
      o1.connect(lp); o2.connect(lp);
      var lfo = c.createOscillator(), lg = c.createGain(); lfo.frequency.value = 0.07; lg.gain.value = 160; lfo.connect(lg); lg.connect(lp.frequency);
      [o1, o2, o3, lfo].forEach(function (o) { o.start(); });
      g.gain.exponentialRampToValueAtTime(0.045, c.currentTime + 3);
      amb = { g: g, nodes: [o1, o2, o3, lfo] };
    }
    function ambStop() {
      if (!amb || !ctx) return;
      var a = amb; amb = null;
      a.g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.6);
      setTimeout(function () { a.nodes.forEach(function (o) { try { o.stop(); } catch (e) {} }); }, 700);
    }
    function unlock() {
      if (unlocked) return;
      unlocked = true; ensure();
      if (!muted) ambStart();
    }
    ["pointerdown", "keydown", "touchstart"].forEach(function (ev) { window.addEventListener(ev, unlock, { capture: true, passive: true }); });
    document.addEventListener("visibilitychange", function () { if (!ctx) return; if (document.hidden) { try { ctx.suspend(); } catch (e) {} } else if (!muted) { try { ctx.resume(); } catch (e) {} } });
    return {
      play: function (name, arg) { if (muted || !unlocked) return; try { if (lib[name]) lib[name](arg); } catch (e) {} },
      muted: function () { return muted; },
      toggle: function () {
        muted = !muted;
        try { localStorage.setItem(KEY, muted ? "off" : "on"); } catch (e) {}
        if (master && ctx) master.gain.setTargetAtTime(muted ? 0 : 0.7, ctx.currentTime, 0.05);
        if (muted) ambStop(); else { unlock(); ambStart(); }
        return muted;
      },
      label: function () { return muted ? "🔇 Sound off" : "🔊 Sound on"; }
    };
  })();
  LD.SFX = SFX;
  function tick() { SFX.play("tick"); }
  /* Crisis flavor on short screens: one clamped line; tap to read it whole. */
  document.addEventListener("click", function (e) {
    var b = e.target && e.target.closest ? e.target.closest(".deal-dz .dz-body") : null;
    Array.prototype.forEach.call(document.querySelectorAll(".deal-dz .dz-body.open"), function (o) { if (o !== b) o.classList.remove("open"); });
    if (b && (b.classList.contains("open") || b.scrollHeight > b.clientHeight + 2)) { b.classList.toggle("open"); }
  });

  function hideLevelUpToast() {
    var t = document.querySelector(".lvup-burst");
    if (t && t.parentNode) t.parentNode.removeChild(t);
  }
  /* Era skin: run screens wear the act's era (1978 / 2008 / now); title, rulebook, Summit Lounge and history stay timeless Art Deco. */
  function syncEra(name) {
    var nm = name || screen, run = !!(state && !state.ended && (nm === "desk" || nm === "bunker" || nm === "deal"));
    var act = run && LD.actOf ? LD.actOf(Math.min(12, state.turn || 1)) : 0;
    if (LD.applyEra) LD.applyEra(act);
    [1, 2, 3].forEach(function (n) { document.body.classList.toggle("era-" + n, act === n); });
    return act;
  }
  function show(name) {
    hideLevelUpToast();
    if (typeof hideTip === "function") hideTip();
    syncEra(name);
    if (typeof PN !== "undefined" && PN.on && (name !== "desk" || PN.mode === "tip")) pennyStop();
    screen = name;
    document.body.classList.toggle("on-desk", name === "desk");
    ["title", "tutorial", "exec", "deal", "bunker", "desk", "end", "history", "boardroom"].forEach(function (id) {
      var el = $("screen-" + id);
      if (!el) return;
      el.classList.toggle("on", id === name);
    });
    hideOverlay();
    if (name !== "desk" && typeof hideDoor === "function") hideDoor();
    window.scrollTo(0, 0);
  }

  /* ---------- Journey title ---------- */
  var JY = { mq: null, land: null };
  function jyLand() { return window.innerWidth / Math.max(1, window.innerHeight) >= 1.05; }
  function jyApplyStage() {
    var jy = $("jy"); if (!jy) return;
    var land = jyLand();
    if (JY.land === land && jy.getAttribute("data-ready")) return;
    JY.land = land;
    jy.classList.toggle("land", land); jy.classList.toggle("port", !land);
    jy.setAttribute("data-ready", "1");
    var key = land ? "landscape" : "portrait";
    var img = $("jy-poster"), vid = $("jy-video");
    if (img) img.src = "assets/journey/journey-" + key + ".webp";
    var still = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (vid) {
      if (still) { vid.removeAttribute("src"); vid.hidden = true; return; }
      vid.hidden = false;
      vid.classList.remove("playing");
      vid.poster = "assets/journey/journey-" + key + ".webp";
      vid.src = "assets/journey/journey-" + key + ".mp4";
      vid.muted = true;
      vid.onplaying = function () { vid.classList.add("playing"); };
      var pr = vid.play && vid.play(); if (pr && pr.catch) pr.catch(function () {});
    }
  }
  window.addEventListener("resize", function () { if (screen === "title") jyApplyStage(); });
  function jyPostcard(era) {
    var pc = $("jy-postcard"); if (!pc) return;
    var st = (LD.JOURNEY_STOPS || []).filter(function (x) { return x.era === era; })[0];
    Array.prototype.forEach.call(document.querySelectorAll(".jy-stop"), function (b) { b.classList.toggle("open", +b.getAttribute("data-era") === era && pc.hidden !== false || false); });
    if (!st || (!pc.hidden && +pc.getAttribute("data-era") === era)) { pc.hidden = true; pc.removeAttribute("data-era"); Array.prototype.forEach.call(document.querySelectorAll(".jy-stop"), function (b) { b.classList.remove("open"); }); return; }
    var prog = LD.journeyProgress(loadMeta());
    var status = prog.best >= era ? (era === 4 ? "You have sealed the hatch before." : "Stamped: you have climbed this far.") : era === 1 ? "Every climb departs from here." : "Not reached yet. Climb further to stamp it.";
    pc.innerHTML = '<div class="pc-k">Postcard from</div><h3>' + LD.escapeHtml(st.year + " · " + st.name) + "</h3><p>" + LD.escapeHtml(st.blurb) + '</p><p class="pc-st">' + LD.escapeHtml(status) + '</p><button type="button" class="pc-x" id="jy-pc-x" aria-label="Close postcard">×</button>';
    pc.setAttribute("data-era", era);
    pc.hidden = false;
    $("jy-pc-x").addEventListener("click", function (e) { e.stopPropagation(); tick(); jyPostcard(era); });
  }
  function renderTitle() {
    $("screen-title").innerHTML = LD.renderTitle({ meta: loadMeta(), seedDraft: seedDraft });
    JY.land = null;
    jyApplyStage();
    $("btn-new").addEventListener("click", function () {
      tick();
      selectedExec = "mara";
      goExec();
    });
    var cont = $("btn-continue");
    if (cont) {
      cont.addEventListener("click", function () {
        tick();
        var mr = loadMeta().midRun;
        jyDepart({ label: "Return ticket", stamp: "Resumed", era: mr && LD.actOf ? LD.actOf(Math.min(12, mr.turn || 1)) : 1, sub: mr ? "Q" + mr.turn : "" }, function () {
          state = loadMeta().midRun;
          if (state && LD.adoptRun) LD.adoptRun(state);
          if (state && LD.ensureSupply) LD.ensureSupply(state);
          if (state && LD.ensureWorld) LD.ensureWorld(state);
          if (state && LD.ensureFY) LD.ensureFY(state);
          crisisOpen = null;
          enterPlay();
          if (state && !state.ended) fyAfterOpen();
        });
      });
    }
    Array.prototype.forEach.call(document.querySelectorAll(".jy-stop"), function (b) {
      b.addEventListener("click", function (e) { e.stopPropagation(); tick(); jyPostcard(+b.getAttribute("data-era")); });
    });
    $("btn-how").addEventListener("click", function () { tick(); openHowTo(false); });
    var pro = $("btn-prosp");
    if (pro) pro.addEventListener("click", function () { tick(); openProspectus("assets"); });
    var snd = $("btn-sound");
    if (snd) snd.addEventListener("click", function () {
      SFX.toggle(); tick();
      var on = !/off/i.test(SFX.label());
      snd.classList.toggle("on", on); snd.setAttribute("aria-pressed", on); snd.setAttribute("aria-label", on ? "Sound on" : "Sound off");
      snd.innerHTML = LD.radioSvg(on);
    });
    $("btn-history").addEventListener("click", function () { tick(); show("history"); renderHistory(); });
    var devH = $("dev-house");
    if (devH) {
      devH.checked = !!LD.HOUSE_RULES;
      devH.addEventListener("change", function () { LD.HOUSE_RULES = devH.checked; });
    }
    $("btn-boardroom").addEventListener("click", function () { tick(); openBoardroom("title"); });
  }

  /* Departure: ticket punch + stamp, then a push up the path into the era. Tap to skip. */
  var JD = { busy: false };
  function jyDepart(o, run) {
    o = o || {};
    var still = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (still || JD.busy) { run(); return; }
    JD.busy = true;
    var ER = LD.ERAS && LD.ERAS[o.era || 1], year = o.era === 3 ? "Today" : ER ? ER.year : "1978";
    var fx = document.createElement("div");
    fx.className = "jy-fx" + (jyLand() ? " land" : "");
    fx.setAttribute("role", "presentation");
    fx.innerHTML = '<div class="jf-bg"></div><div class="jf-ticket"><span class="jf-main"><small>' + LD.escapeHtml(o.label || "Admit one") + "</small><b>" + LD.escapeHtml(year + " · " + (ER ? ER.name : "The Street")) + "</b><em>" + LD.escapeHtml(o.sub || "Port Calder") + '</em></span><span class="jf-stub"><i class="jf-hole"></i></span><span class="jf-stamp">' + LD.escapeHtml(o.stamp || "Departed") + "<small>" + LD.escapeHtml(year) + "</small></span></div>";
    document.body.appendChild(fx);
    var done = false, t1, t2;
    function go() { if (done) return; done = true; try { run(); } catch (e) { setTimeout(function () { throw e; }); } fx.classList.add("out"); t2 = setTimeout(end, 480); }
    function end() { JD.busy = false; if (fx.parentNode) fx.parentNode.removeChild(fx); }
    fx.addEventListener("click", function () { clearTimeout(t1); if (!done) go(); else { clearTimeout(t2); end(); } });
    SFX.play && SFX.play("stamp");
    t1 = setTimeout(go, 400);
  }

  /* ---------- The Summit Lounge (concierge key rack) ---------- */
  function openBoardroom(back) {
    boardBack = back || "title";
    boardNotice = "";
    boardSel = null;
    boardBought = null;
    show("boardroom");
    renderBoardroom();
  }
  function renderBoardroom(keepScroll) {
    var root = $("screen-boardroom");
    var scroll = null;
    if (keepScroll) {
      scroll = { rack: (root.querySelector("#lg-rack") || {}).scrollTop || 0, rows: {} };
      Array.prototype.forEach.call(root.querySelectorAll("[data-hooks]"), function (h) { scroll.rows[h.getAttribute("data-hooks")] = h.scrollLeft; });
    }
    root.innerHTML = LD.renderBoardroom({ meta: loadMeta(), notice: boardNotice, sel: boardSel, bought: boardBought });
    if (scroll) {
      var rk = root.querySelector("#lg-rack"); if (rk) rk.scrollTop = scroll.rack;
      Array.prototype.forEach.call(root.querySelectorAll("[data-hooks]"), function (h) { var v = scroll.rows[h.getAttribute("data-hooks")]; if (v) h.scrollLeft = v; });
    } else {
      /* First open: make sure the selected tag is in view in its row. */
      var s0 = root.querySelector(".lt.sel");
      if (s0) { var hk = s0.parentNode, hr = hk.getBoundingClientRect(), sr = s0.getBoundingClientRect(); if (sr.right > hr.right) hk.scrollLeft += sr.left - hr.left - 12; }
    }
    /* Rows that hold more tags than fit get a soft right-edge fade and a "swipe" cue until scrolled to the end. */
    Array.prototype.forEach.call(root.querySelectorAll("[data-hooks]"), function (h) {
      var row = h.parentNode;
      function upd() { row.classList.toggle("more", h.scrollWidth - h.clientWidth - h.scrollLeft > 6); }
      upd();
      h.addEventListener("scroll", upd, { passive: true });
    });
    if (boardBought) { setTimeout(function () { boardBought = null; var t = root.querySelector(".lt-thunk"); if (t) t.classList.remove("lt-thunk"); }, 900); }
    Array.prototype.forEach.call(root.querySelectorAll("[data-lt]"), function (b) {
      b.addEventListener("click", function () {
        tick();
        boardSel = b.getAttribute("data-lt");
        boardNotice = "";
        renderBoardroom(true);
      });
    });
    var sign = root.querySelector("#lg-sign");
    if (sign) sign.addEventListener("click", function () {
      var key = sign.getAttribute("data-buy");
      var res = LD.buyItem(loadMeta(), key);
      if (!res.ok) { tick(); boardNotice = res.error; renderBoardroom(true); return; }
      var m = res.meta;
      if (res.item.wing === "perks" && res.item.key.indexOf("perk:") === 0 && m.equipped.length < LD.perkSlots(m)) m.equipped.push(res.item.key.slice(5));
      if (res.item.wing === "portfolio") { m.cosmetics[res.item.slot] = res.item.id; }
      saveMeta(m);
      applyCosmetics();
      SFX.play && SFX.play("stamp");
      boardSel = key;
      boardBought = key;
      boardNotice = "Signed: " + res.item.name + ". The concierge hands you the key.";
      renderBoardroom(true);
    });
    Array.prototype.forEach.call(root.querySelectorAll("[data-equip]"), function (b) {
      b.addEventListener("click", function () {
        tick();
        var parts = b.getAttribute("data-equip").split(":");
        var m = loadMeta();
        m.cosmetics[parts[0]] = parts[1];
        saveMeta(m);
        applyCosmetics();
        boardNotice = "";
        renderBoardroom(true);
      });
    });
    Array.prototype.forEach.call(root.querySelectorAll("[data-pack-toggle]"), function (b) {
      b.addEventListener("click", function () {
        tick();
        var id = b.getAttribute("data-pack-toggle");
        var m = loadMeta();
        if (!Array.isArray(m.packsOff)) m.packsOff = [];
        var i = m.packsOff.indexOf(id);
        if (i === -1) m.packsOff.push(id); else m.packsOff.splice(i, 1);
        saveMeta(m);
        boardNotice = "";
        renderBoardroom(true);
      });
    });
    $("btn-br-play").addEventListener("click", function () { tick(); seedDraft = ""; goExec(); });
    setTimeout(function () { if (screen === "boardroom") pennyTip("dividends"); }, 400);
    $("btn-br-back").addEventListener("click", function () {
      tick();
      if (boardBack === "exec") goExec();
      else if (boardBack === "end" && state && state.ended) showEnd();
      else { show("title"); renderTitle(); }
    });
  }

  function applyCosmetics() {
    var eq = LD.equippedCosmetics(loadMeta());
    var cls = document.body.className.split(" ").filter(function (c) { return c && c.indexOf("cos-") !== 0; });
    Object.keys(eq).forEach(function (k) { cls.push("cos-" + k + "-" + eq[k]); });
    document.body.className = cls.join(" ");
  }

  function renderTutorial() {
    LD.TUTORIAL = (state && !state.ended ? LD.isHouse(state) : LD.HOUSE_RULES) ? LD.TUTORIAL_HOUSE : LD.TUTORIAL_SHOP;
    $("screen-tutorial").innerHTML = LD.renderTutorial(tutorialPage);
    function finish() {
      var meta = loadMeta();
      meta.seenTutorial = true;
      saveMeta(meta);
      if (screenIntent === "exec") goExec();
      else if ((screenIntent === "deal" || screenIntent === "bunker" || screenIntent === "play") && state) enterPlay();
      else { show("title"); renderTitle(); }
    }
    var next = $("btn-next");
    if (next) next.addEventListener("click", function () { tick(); tutorialPage += 1; renderTutorial(); });
    var skip = $("btn-skip");
    if (skip) skip.addEventListener("click", function () { tick(); tutorialPage = LD.TUTORIAL.length - 1; finish(); });
    var done = $("btn-done");
    if (done) done.addEventListener("click", function () { tick(); finish(); });
  }

  function goExec() {
    var meta = loadMeta();
    screenIntent = "exec";
    if (false && !meta.seenTutorial) {
      tutorialPage = 0;
      show("tutorial");
      renderTutorial();
      return;
    }
    show("exec");
    renderExec();
  }

  function currentRating(meta) {
    var max = LD.ratingUnlocked(meta, selectedExec);
    if (selectedRating == null || selectedRating > max) selectedRating = max;
    return selectedRating;
  }

  var perkFocus = null;
  function execIndex(id) { for (var i = 0; i < LD.EXECUTIVES.length; i++) if (LD.EXECUTIVES[i].id === id) return i; return 0; }
  function execOpts(meta) { return { meta: meta, selectedExec: selectedExec, rating: currentRating(meta), seedDraft: seedDraft, perkFocus: perkFocus }; }
  function renderExec() {
    var meta = loadMeta();
    if (!LD.execById(selectedExec)) selectedExec = "mara";
    $("screen-exec").innerHTML = LD.renderExec(execOpts(meta));
    bindExecCarousel();
    bindExecSide();
    if ((meta.finished | 0) >= 1) setTimeout(function () { if (screen === "exec") pennyTip("ratings"); }, 400);
  }
  function renderExecSide() {
    var side = $("cx-side"); if (!side) return renderExec();
    var meta = loadMeta();
    side.innerHTML = LD.renderExecSide(execOpts(meta));
    bindExecSide();
  }
  /* Move the carousel without rebuilding it, so the posters slide. */
  function selectExec(i, opts) {
    var n = LD.EXECUTIVES.length;
    i = ((i % n) + n) % n;
    var id = LD.EXECUTIVES[i].id;
    if (id === selectedExec && !(opts && opts.force)) return;
    selectedExec = id; selectedRating = null; perkFocus = null;
    var track = $("cx-track");
    if (!track) return renderExec();
    Array.prototype.forEach.call(track.querySelectorAll(".cx-poster"), function (p, k) {
      var o = LD.execOffset(k, i, n), a = Math.abs(o);
      var prev = +p.style.getPropertyValue("--o");
      if (Math.abs(prev - o) > 1.5) p.classList.add("cx-jump"); else p.classList.remove("cx-jump");
      p.style.setProperty("--o", o); p.style.setProperty("--a", a);
      p.classList.toggle("on", o === 0);
      if (a > 1) p.setAttribute("aria-hidden", "true"); else p.removeAttribute("aria-hidden");
    });
    requestAnimationFrame(function () { Array.prototype.forEach.call(track.querySelectorAll(".cx-jump"), function (p) { p.classList.remove("cx-jump"); }); });
    Array.prototype.forEach.call(document.querySelectorAll(".cx-dot"), function (d, k) { d.classList.toggle("on", k === i); d.setAttribute("aria-selected", String(k === i)); });
    if (!(opts && opts.silent)) tick();
    renderExecSide();
  }
  LD.selectExec = function (id) { selectExec(execIndex(id)); };
  function bindExecCarousel() {
    var stage = $("cx-stage"), track = $("cx-track");
    if (!stage || !track) return;
    $("cx-prev").addEventListener("click", function () { selectExec(execIndex(selectedExec) - 1); });
    $("cx-next").addEventListener("click", function () { selectExec(execIndex(selectedExec) + 1); });
    Array.prototype.forEach.call(document.querySelectorAll(".cx-dot"), function (d) {
      d.addEventListener("click", function () { selectExec(+d.getAttribute("data-i")); });
    });
    Array.prototype.forEach.call(track.querySelectorAll(".cx-poster"), function (p, k) {
      p.addEventListener("click", function () { if (drag.moved) return; if (k !== execIndex(selectedExec)) selectExec(k); });
    });
    /* Touch / mouse swipe with snap */
    var drag = { id: null, x0: 0, y0: 0, dx: 0, moved: false, t0: 0 };
    stage.addEventListener("pointerdown", function (e) {
      if (e.target.closest(".cx-arrow")) return;
      drag.id = e.pointerId; drag.x0 = e.clientX; drag.y0 = e.clientY; drag.dx = 0; drag.moved = false; drag.t0 = Date.now();
    });
    stage.addEventListener("pointermove", function (e) {
      if (drag.id !== e.pointerId) return;
      var dx = e.clientX - drag.x0, dy = e.clientY - drag.y0;
      if (!drag.moved && Math.abs(dx) > 8 && Math.abs(dx) > Math.abs(dy)) { drag.moved = true; stage.classList.add("dragging"); try { stage.setPointerCapture(e.pointerId); } catch (er) {} }
      if (drag.moved) {
        drag.dx = dx;
        var ps = track.querySelectorAll(".cx-poster"), on = track.querySelector(".cx-poster.on") || ps[0];
        var stepPx = Math.max(60, on.offsetWidth * (parseFloat(getComputedStyle(track).getPropertyValue("--step")) || 76) / 100);
        Array.prototype.forEach.call(ps, function (p) { var f = (+p.style.getPropertyValue("--o")) + dx / stepPx; p.style.setProperty("--f", f.toFixed(3)); p.style.setProperty("--af", Math.abs(f).toFixed(3)); });
      }
    });
    function end(e) {
      if (drag.id !== e.pointerId) return;
      drag.id = null;
      stage.classList.remove("dragging");
      Array.prototype.forEach.call(track.querySelectorAll(".cx-poster"), function (p) { p.style.removeProperty("--f"); p.style.removeProperty("--af"); });
      if (drag.moved) {
        var w = stage.getBoundingClientRect().width, fast = Math.abs(drag.dx) / Math.max(1, Date.now() - drag.t0) > 0.45;
        if (Math.abs(drag.dx) > Math.min(70, w * 0.12) || (fast && Math.abs(drag.dx) > 24)) selectExec(execIndex(selectedExec) + (drag.dx < 0 ? 1 : -1));
        setTimeout(function () { drag.moved = false; }, 0);
      }
    }
    stage.addEventListener("pointerup", end);
    stage.addEventListener("pointercancel", end);
    stage.addEventListener("keydown", function (e) { if (e.key === "Enter") { var b = $("btn-start"); if (b && !b.disabled) b.click(); } });
  }
  document.addEventListener("keydown", function (e) {
    if (screen !== "exec" || !$("cx-stage")) return;
    var t = e.target; if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA")) return;
    if ($("overlay") && !$("overlay").hidden && $("overlay").classList.contains("on")) return;
    if (e.key === "ArrowLeft") { e.preventDefault(); selectExec(execIndex(selectedExec) - 1); }
    else if (e.key === "ArrowRight") { e.preventDefault(); selectExec(execIndex(selectedExec) + 1); }
  });
  function bindExecSide() {
    var meta = loadMeta();
    var si = $("seed-input");
    if (si) si.addEventListener("input", function () { seedDraft = this.value.trim(); });
    var roll = $("btn-roll");
    if (roll) roll.addEventListener("click", function () { tick(); seedDraft = String((Math.floor(Math.random() * 900000) + 100000)); $("seed-input").value = seedDraft; });
    var max = LD.ratingUnlocked(meta, selectedExec);
    var rp = $("cx-r-prev"), rn = $("cx-r-next");
    if (rp) rp.addEventListener("click", function () { var r = currentRating(loadMeta()); if (r > 0) { tick(); selectedRating = r - 1; renderExecSide(); } });
    if (rn) rn.addEventListener("click", function () {
      var r = currentRating(loadMeta());
      if (r < max) { tick(); selectedRating = r + 1; renderExecSide(); return; }
      var nx = document.querySelector(".cx-next"); if (nx) { nx.classList.remove("cx-shake"); void nx.offsetWidth; nx.classList.add("cx-shake"); }
    });
    Array.prototype.forEach.call(document.querySelectorAll(".cx-pip"), function (btn) {
      btn.addEventListener("click", function () { tick(); selectedRating = +btn.getAttribute("data-rating"); renderExecSide(); });
    });
    Array.prototype.forEach.call(document.querySelectorAll(".cx-tag"), function (btn) {
      btn.addEventListener("click", function () {
        tick(); var id = btn.getAttribute("data-perk-tag"), m = loadMeta();
        /* One tap: an owned perk equips (or unequips) straight away, and its tip opens so you see what it does. Locked perks just show the tip. */
        if (m.owned.indexOf("perk:" + id) !== -1) {
          var i = m.equipped.indexOf(id);
          if (i !== -1) m.equipped.splice(i, 1);
          else { m.equipped.push(id); var slots = LD.perkSlots(m, currentRating(m)); if (m.equipped.length > slots) m.equipped = m.equipped.slice(-slots); }
          saveMeta(m); perkFocus = id;
        } else perkFocus = perkFocus === id ? null : id;
        renderExecSide();
      });
    });
    var tx = $("cx-tip-x"); if (tx) tx.addEventListener("click", function () { tick(); perkFocus = null; renderExecSide(); });
    bindLoadoutChips($("cx-side"), false);
    bindExplain($("screen-exec"), null, { rating: currentRating(meta) });
    var lo = $("btn-loadout");
    if (lo) lo.addEventListener("click", function () { tick(); openLoadoutSheet(); });
    $("btn-boardroom2").addEventListener("click", function () { tick(); openBoardroom("exec"); });
    $("btn-start").addEventListener("click", function () {
      if (!LD.isExecutiveUnlocked(selectedExec, loadMeta())) return;
      tick(); var si2 = $("seed-input"); if (si2) seedDraft = si2.value.trim();
      jyDepart({ label: "Admit one · " + LD.execById(selectedExec).name, stamp: "Departed", era: 1, sub: "Port Calder · " + LD.ratingName(currentRating(loadMeta())) }, startRun);
    });
    $("btn-back").addEventListener("click", function () { tick(); show("title"); renderTitle(); });
  }
  function openLoadoutSheet() {
    var ex = $("lo-extra");
    if (!ex) return;
    showFy('<div class="lo-sheet"><div class="kicker">Executive loadout</div>' + ex.innerHTML + "</div>", '<button class="btn btn-coral" id="lo-done">Done</button>', function () {
      bindLoadoutChips($("overlay"), true);
      $("lo-done").addEventListener("click", function () { tick(); hideOverlay(); });
    });
  }
  function bindLoadoutChips(root, inSheet) {
    if (!root) return;
    var after = function () { if (inSheet) { renderExec(); openLoadoutSheet(); } else renderExecSide(); };
    Array.prototype.forEach.call(root.querySelectorAll(".perk-chip[data-perk], .cx-tip-btn[data-perk]"), function (btn) {
      btn.addEventListener("click", function () {
        tick();
        var m = loadMeta();
        var id = btn.getAttribute("data-perk");
        var i = m.equipped.indexOf(id);
        if (i !== -1) m.equipped.splice(i, 1);
        else {
          m.equipped.push(id);
          var slots = LD.perkSlots(m);
          if (m.equipped.length > slots) m.equipped = m.equipped.slice(-slots);
        }
        saveMeta(m);
        after();
      });
    });
    Array.prototype.forEach.call(root.querySelectorAll(".pack-chip"), function (btn) {
      btn.addEventListener("click", function () {
        tick();
        var m = loadMeta();
        var id = btn.getAttribute("data-pack");
        var i = m.packsOff.indexOf(id);
        if (i === -1) m.packsOff.push(id); else m.packsOff.splice(i, 1);
        saveMeta(m);
        after();
      });
    });
  }

  function startRun() {
    var meta = loadMeta();
    var rating = currentRating(meta);
    state = LD.createRun({ seed: seedDraft, executiveId: selectedExec, rating: rating, perks: meta.equipped.slice(0, LD.perkSlots(meta, rating)), packs: LD.activePacks(meta), level: LD.execLevel ? LD.execLevel(meta, selectedExec) : 1 });
    if (state.fy) state.fy.actIntro = 1;
    lastEnd = null;
    crisisOpen = null;
    lastFired = [];
    clearSel();
    hidePins = false;
    persistRun();
    enterPlay();
    var startTour = false;
    if (PN.forceStart) { PN.forceStart = false; pennySave(function (p) { p.offered = true; }); startTour = true; }
    else if (rating === 0 && pennyShouldOffer()) { pennySave(function (p) { p.offered = true; }); startTour = true; }
    PN.pendingOffer = startTour;
    fyAfterOpen();
    if (PN.pendingOffer && !($("overlay") && $("overlay").classList.contains("on"))) {
      PN.pendingOffer = false;
      pennyStart({ offer: true });
    }
  }

  function enterPlay() {
    if (!state) { show("title"); renderTitle(); return; }
    if (LD.ensureWorld) LD.ensureWorld(state);
    if (state.ended) { showEnd(); return; }
    show("desk");
    renderDesk();
  }

  /* ---------- Desk (world map) ---------- */
  var sel = { deal: null, region: null, net: null, choice: null };
  var hidePins = false;
  var lens = "none";
  var mq = window.matchMedia ? window.matchMedia("(orientation: landscape) and (min-width: 900px)") : null;
  var rmq = window.matchMedia ? window.matchMedia("(prefers-reduced-motion: reduce)") : null;
  function isPhone() { return !(mq && mq.matches); }
  function reduced() { return !!(rmq && rmq.matches); }

  function coachInfo() {
    var meta = loadMeta();
    if (meta.coachDone || !state || state.turn !== 1 || PN.on) return {};
    if (state.phase === "deal") {
      if (sel.deal) return {};
      var pick = state.offered[0];
      state.offered.forEach(function (id) { if (LD.dealKind(LD.dealById(id)) === "claim") pick = id; });
      return { coach: "pin", coachDeal: pick, coachText: "Tap the glowing pin to open a deal" };
    }
    if (!(LD.isHouse && LD.isHouse(state)) && !state.bunkerActedThisTurn) return { coach: "bunker", coachText: "Build your bunker (optional)" };
    return { coach: "end", coachText: "End the quarter and watch the world react" };
  }

  function uiOpts() {
    var c = coachInfo();
    var phone = isPhone();
    return { selDeal: seatedNow() && pkOn() ? null : sel.deal, selRegion: sel.region, selNet: sel.net, coach: c.coach, coachDeal: c.coachDeal, coachText: c.coachText,
      hidePins: hidePins, lens: lens, interactive: true, phone: phone, globe: !phone };
  }

  function renderDesk(from) {
    syncEra("desk");
    if (LD.seatedOn && LD.seatedOn(state)) { renderSeatedDesk(from); return; }
    var el = $("screen-desk");
    el.innerHTML = LD.renderDesk(state, uiOpts());
    bindDesk();
    if (LD.O4) LD.O4.mount(state);
    armTicker();
    if (from) animateMeters(from);
    if (LD.isHouse && LD.isHouse(state)) {
      preloadHousePlates();
      attachHousePeek();
      if (HV.facing && !HV.turning) refreshHouseChrome();
    }
  }
  var tickerTimer = null;
  function armTicker() {
    if (tickerTimer) { clearInterval(tickerTimer); tickerTimer = null; }
    var wrap = document.querySelector(".desk .tick-wrap");
    if (!wrap) return;
    var items = wrap.querySelectorAll(".tick-msg");
    if (items.length < 2) return;
    var i = 0;
    tickerTimer = setInterval(function () {
      if (!document.body.contains(wrap)) { clearInterval(tickerTimer); tickerTimer = null; return; }
      items[i].classList.remove("on");
      if (items[i].tagName === "BUTTON") items[i].tabIndex = -1;
      i = (i + 1) % items.length;
      items[i].classList.add("on");
      if (items[i].tagName === "BUTTON") items[i].tabIndex = 0;
    }, 4200);
  }

  function animateMeters(from) {
    var map = { cash: from.cash, unrest: from.unrest, collapse: from.collapse };
    Array.prototype.forEach.call(document.querySelectorAll(".desk .meter"), function (m) {
      var key = m.className.match(/m-(\w+)/)[1];
      var to = +m.getAttribute("data-num");
      var start = map[key];
      if (start == null || start === to) return;
      var bar = m.querySelector(".m-bar span");
      var val = m.querySelector(".m-val");
      var money = m.getAttribute("data-money");
      bar.style.transition = "none";
      bar.style.width = Math.max(0, Math.min(100, start)) + "%";
      /* office fixtures (dials, LED strips) read --v */
      if (m.style.getPropertyValue("--v")) m.style.setProperty("--v", Math.max(0, Math.min(100, start)));
      void bar.offsetWidth;
      bar.style.transition = "";
      bar.style.width = Math.max(0, Math.min(100, to)) + "%";
      if (m.style.getPropertyValue("--v")) requestAnimationFrame(function () { m.style.setProperty("--v", Math.max(0, Math.min(100, to))); });
      m.classList.add(to > start ? "rise" : "fall");
      var d = to - start, pop = document.createElement("span");
      var goodUp = key === "cash";
      pop.className = "m-pop " + ((d > 0) === goodUp ? "up" : "down");
      pop.textContent = (d > 0 ? "+" : "−") + (money ? LD.formatMoney(Math.abs(d)) : Math.abs(d));
      m.appendChild(pop);
      setTimeout(function () { if (pop.parentNode) pop.parentNode.removeChild(pop); }, 1700);
      if (key === "cash" && d > 0) SFX.play("coin");
      var t0 = null;
      function stepFn(t) {
        if (!t0) t0 = t;
        var k = Math.min(1, (t - t0) / 900);
        var v = Math.round(start + (to - start) * (1 - Math.pow(1 - k, 3)));
        val.textContent = money ? LD.formatMoney(v) : v;
        if (k < 1) requestAnimationFrame(stepFn);
      }
      requestAnimationFrame(stepFn);
    });
  }


  /* ---------- House rules, seated desk (B): first person at the 1978 desk. Only LD.seatedOn(state) runs reach this. ---------- */
  var SD = { fan: false, t: 0, raf: 0, pull: null };
  function seatedNow() { return !!(state && LD.seatedOn && LD.seatedOn(state) && document.querySelector("#screen-desk .desk.sd")); }
  function seatK(W, H) { return W <= 500 ? 1 : LD.seatLandscape(W, H) ? 1.15 : 1.25; }
  function seatedUi() {
    return { sel: { deal: sel.deal, region: sel.region, net: sel.net }, fan: SD.fan, closing: hidePins, land: LD.seatLandscape(window.innerWidth, window.innerHeight),
      dossier: LD.renderDossier(state, uiOpts()), peek: !!(LD.houseCanPeek && LD.houseCanPeek(state)), badge: state.phase === "bunker" && !state.bunkerActedThisTurn && houseCardKind() ? "!" : "" };
  }
  function renderSeatedDesk(from) {
    var el = $("screen-desk");
    if (tickerTimer) { clearInterval(tickerTimer); tickerTimer = null; }
    seatPeekKill();
    el.innerHTML = LD.renderSeatedDesk(state, seatedUi());
    bindSeated();
    placeSeated();
    if (from) seatDeltas(from);
    preloadHousePlates();
    if (el.querySelector(".desk.sd.has-props")) { LD.seatPropsFor(state).forEach(function (q) { pkPreload(q.art); }); pkPreload("stamp"); }
    if (HV.facing && !HV.turning) refreshHouseChrome();
  }
  /* cash / unrest / collapse changes float off the HUD */
  function seatDeltas(from) {
    [["cash", state.cash - from.cash, true], ["unrest", state.unrest - from.unrest, false], ["collapse", state.collapse - from.collapse, false]].forEach(function (x, i) {
      if (!x[1]) return;
      var host = document.querySelector(".desk.sd .sd-hud " + (x[0] === "cash" ? ".sd-cash" : ".m-" + x[0]));
      if (!host) return;
      var pop = document.createElement("span"), good = x[2] ? x[1] > 0 : x[1] < 0;
      pop.className = "sd-pop " + (good ? "up" : "down");
      pop.textContent = (x[1] > 0 ? "+" : "−") + (x[0] === "cash" ? LD.formatMoney(Math.abs(x[1])) : Math.abs(x[1]));
      pop.style.animationDelay = i * 140 + "ms";
      host.appendChild(pop);
      setTimeout(function () { if (pop.parentNode) pop.parentNode.removeChild(pop); }, 1900);
      if (x[0] === "cash" && x[1] > 0) SFX.play("coin");
    });
  }
  /* Plate -> screen for the rig and every data-plate element. */
  function placeSeated() {
    var desk = document.querySelector("#screen-desk .desk.sd"); if (!desk) return;
    var W = window.innerWidth, H = window.innerHeight, k = seatK(W, H), f = LD.seatFrame(W, H), land = f.land;
    desk.style.setProperty("--k", k);
    desk.classList.toggle("is-land", land);
    var col = LD.seatColumn(W, H);
    desk.style.setProperty("--col-l", Math.round(col[0]) + "px"); desk.style.setProperty("--col-r", Math.round(W - col[1]) + "px");
    var hud = desk.querySelector(".sd-hud"), hb = hud ? hud.getBoundingClientRect().bottom : 0;
    desk.style.setProperty("--hud", Math.round(hb) + "px");
    seatApplyPose(desk, SD.t);
    layoutFan(desk);
    var ui = desk.querySelector(".sd-ui"); if (!ui) return;
    Array.prototype.forEach.call(ui.querySelectorAll("[data-plate]"), function (n) {
      var p = n.getAttribute("data-plate").split(",").map(Number), q = LD.seatToScreen(f, p[0], p[1]);
      n.style.left = q[0].toFixed(1) + "px"; n.style.top = q[1].toFixed(1) + "px";
      var pw = n.getAttribute("data-pw");
      if (pw) { pw = pw.split(",").map(Number); n.style.width = (pw[0] * f.s).toFixed(1) + "px"; n.style.height = (pw[1] * f.s).toFixed(1) + "px"; }
      var r = n.getAttribute("data-r");
      if (r) { r = r.split(",").map(Number); n.style.width = (2 * r[0] * f.s).toFixed(1) + "px"; n.style.height = (2 * r[1] * f.s).toFixed(1) + "px"; }
    });
    /* prop stickers: keep each one inside the stage (the rim props sit near the edges) */
    Array.prototype.forEach.call(ui.querySelectorAll(".sd-stk"), function (t) {
      t.style.marginLeft = "0px"; t.style.marginTop = ""; var r = t.getBoundingClientRect(), dx = 0;
      if (r.left < 4) dx = 4 - r.left; else if (r.right > W - 4) dx = W - 4 - r.right;
      if (dx) t.style.marginLeft = dx.toFixed(1) + "px";
      /* paper tags sit low on the props: slide one clear of the chair-arm buttons (Case / Phone / Bunker) when they meet */
      r = t.getBoundingClientRect();
      Array.prototype.forEach.call(desk.querySelectorAll(".sd-left .sd-brass, .sd-bunker:not([hidden])"), function (b) {
        var q = b.getBoundingClientRect(); if (!q.width || q.bottom < r.top || q.top > r.bottom || q.right < r.left || q.left > r.right) return;
        var right = q.left + q.width / 2 < W / 2, m = parseFloat(t.style.marginLeft) || 0;
        m += right ? q.right + 4 - r.left : q.left - 4 - r.right;
        t.style.marginLeft = m.toFixed(1) + "px"; r = t.getBoundingClientRect();
      });
    });
    /* and never on each other: nudge a tag that meets its left neighbour apart, half each way (lower one down a touch if no room) */
    var tg = Array.prototype.slice.call(ui.querySelectorAll(".sd-prop .sd-stk")).sort(function (a, b) { return a.getBoundingClientRect().left - b.getBoundingClientRect().left; });
    for (var ti = 1; ti < tg.length; ti++) {
      var A = tg[ti - 1].getBoundingClientRect(), B = tg[ti].getBoundingClientRect();
      var ox = A.right + 3 - B.left, oy = Math.min(A.bottom, B.bottom) - Math.max(A.top, B.top);
      if (ox <= 0 || oy <= 0) continue;
      var ma = parseFloat(tg[ti - 1].style.marginLeft) || 0, mb = parseFloat(tg[ti].style.marginLeft) || 0;
      var leftRoom = Math.max(0, A.left - 4), rightRoom = Math.max(0, W - 4 - B.right);
      var gb = Math.min(rightRoom, ox / 2), ga = Math.min(leftRoom, ox - gb); gb = Math.min(rightRoom, ox - ga);
      tg[ti - 1].style.marginLeft = (ma - ga).toFixed(1) + "px"; tg[ti].style.marginLeft = (mb + gb).toFixed(1) + "px";
      if (ga + gb < ox - 0.5) tg[ti].style.marginTop = (oy + 3).toFixed(1) + "px"; else tg[ti].style.marginTop = "";
    }
  }
  /* Landscape: the room carries on behind the side panels (a wider painting of the same office, lined up with the plate). */
  function seatWide(root, f, t) {
    var bg = root && root.querySelector(".sd-bg"); if (!bg) return;
    var im = bg.querySelector(".sd-wide");
    if (!f.land) { if (im) im.style.display = "none"; return; }
    if (!im) { im = document.createElement("img"); im.className = "sd-wide"; im.alt = ""; im.draggable = false; im.src = LD.SEAT.roomWide.src; bg.appendChild(im); }
    var X0 = LD.SEAT.roomWide.x0;
    im.style.display = "";
    im.style.transform = "translate(" + (f.tx - X0 * f.s).toFixed(2) + "px," + f.ty.toFixed(2) + "px) scale(" + f.s.toFixed(5) + ")";
    im.style.opacity = String(Math.max(0, 1 - (t || 0) * 1.4).toFixed(3));
  }
  /* Pose of the desk rig: t 0 = first person, 1 = the turn rig's frame 1 (Mara in, hands out). */
  function seatApplyPose(root, t) {
    if (!root) return;
    var W = window.innerWidth, H = window.innerHeight, a = LD.seatFrame(W, H), b = LD.seatRigFrame(W, H), P = LD.seatPullAt(t);
    var f = t <= 0 ? a : t >= 1 ? b : LD.seatLerpFrame(a, b, P.e);
    var rig = root.querySelector(".sd-rig"); if (!rig) return;
    rig.style.transform = "translate(" + f.tx.toFixed(2) + "px," + f.ty.toFixed(2) + "px) scale(" + f.s.toFixed(5) + ")";
    seatWide(root, { land: a.land, tx: f.tx, ty: f.ty, s: f.s }, t);
    var m = rig.querySelector(".sd-mara"), hs = rig.querySelectorAll(".sd-hands");
    if (m) {
      if (P.mara.a <= 0.001) { m.style.opacity = "0"; m.style.transform = ""; m.style.filter = ""; }
      else { m.style.opacity = P.mara.a.toFixed(3); m.style.transform = "translate(0," + P.mara.dy.toFixed(1) + "px) scale(" + P.mara.k.toFixed(4) + ")"; m.style.filter = P.mara.blur > 0.05 ? "blur(" + (P.mara.blur / f.s).toFixed(2) + "px)" : ""; }
    }
    Array.prototype.forEach.call(hs, function (n) {
      if (t <= 0) { n.style.transform = ""; n.style.filter = ""; n.style.removeProperty("--ha"); return; }
      n.style.setProperty("--ha", P.hands.a.toFixed(3));
      n.style.transform = "translate(0," + P.hands.dy.toFixed(1) + "px)"; n.style.filter = P.hands.blur > 0.05 ? "blur(" + (P.hands.blur / f.s).toFixed(2) + "px)" : "";
    });
    root.classList.toggle("is-pulling", t > 0);
    root.style.setProperty("--pull", t.toFixed(3));
  }
  LD.seatPose = function (t) { SD.t = t; seatApplyPose(document.querySelector("#screen-desk .desk.sd"), t); };
  /* Animate the pose. dir "out" 0 -> 1 (into the chair turn), "in" 1 -> 0 (back to the desk). Tap skips. */
  function seatPull(dir, done) {
    if (SD.raf) { cancelAnimationFrame(SD.raf); SD.raf = 0; }
    var from = dir === "out" ? 0 : 1, to = 1 - from, dur = LD.SEAT_PULL_MS || 620;
    if (reduced() || !seatedNow()) { SD.t = to; seatApplyPose(document.querySelector("#screen-desk .desk.sd"), to); if (done) done(); return; }
    var t0 = performance.now(), finished = false;
    var shield = document.createElement("div"); shield.id = "sd-shield"; document.body.appendChild(shield);
    function end() { if (finished) return; finished = true; if (SD.raf) cancelAnimationFrame(SD.raf); SD.raf = 0; SD.t = to; seatApplyPose(document.querySelector("#screen-desk .desk.sd"), to); if (shield.parentNode) shield.parentNode.removeChild(shield); SD.pull = null; if (done) done(); }
    shield.addEventListener("pointerdown", function (e) { e.preventDefault(); end(); });
    SD.pull = { end: end };
    function step(now) {
      var u = Math.min(1, (now - t0) / dur);
      SD.t = from + (to - from) * u;
      seatApplyPose(document.querySelector("#screen-desk .desk.sd"), SD.t);
      if (u >= 1) end(); else SD.raf = requestAnimationFrame(step);
    }
    SD.raf = requestAnimationFrame(step);
  }
  LD.SEAT_PULL_MS = 620;
  function seatSetFan(on) {
    SD.fan = !!on;
    var desk = document.querySelector("#screen-desk .desk.sd"); if (!desk) return;
    var fan = $("sd-fan"), tab = $("sd-tab"), all = $("run-deck");
    if (SD.fan && fan && !fan.children.length) {
      /* one card per kind with a count, so the fan stays small enough to read; past the cap a +N opens the full list */
      var groups = [], byKey = {};
      (state.fy && state.fy.deck || []).forEach(function (c, i) { var key = c.id + (c.up ? "+" : ""); if (!byKey[key]) { byKey[key] = { c: c, i: i, n: 0 }; groups.push(byKey[key]); } byKey[key].n++; });
      var W0 = window.innerWidth, cap = LD.seatFanCap(W0, window.innerHeight), shown = groups.length > cap ? groups.slice(0, cap - 1) : groups, rest = groups.length - shown.length;
      var restN = 0; groups.slice(shown.length).forEach(function (g) { restN += g.n; });
      fan.innerHTML = shown.map(function (g, i) { return LD.cardFace(g.c.id, g.c.up, { attrs: ' data-deck="' + g.i + '" style="--c:' + i + '"', cls: "sd-fc" }).replace(/<\/(button|div)>$/, (g.n > 1 ? '<span class="sd-fcn">\u00d7' + g.n + "</span>" : "") + "</$1>"); }).join("") +
        (rest > 0 ? '<button type="button" class="dc sd-fmore" data-more="1" aria-label="' + restN + ' more cards: open the deck list"><b>+' + restN + "</b><span>more</span></button>" : "");
      fan.style.setProperty("--n", Math.max(1, fan.children.length));
      Array.prototype.forEach.call(fan.querySelectorAll(".dc"), function (b) {
        b.addEventListener("click", function (e) {
          e.stopPropagation(); tick();
          if (b.hasAttribute("data-more")) { openDeck(); return; }
          var was = b.classList.contains("is-lift");
          Array.prototype.forEach.call(fan.querySelectorAll(".dc.is-lift"), function (o) { o.classList.remove("is-lift"); });
          if (!was) b.classList.add("is-lift"); layoutFan(desk);
        });
      });
    }
    if (fan && !fan._dropBound) { fan._dropBound = true; desk.addEventListener("click", function (e) { if (fan.contains(e.target)) return; var lf = fan.querySelectorAll(".dc.is-lift"); if (lf.length) { Array.prototype.forEach.call(lf, function (o) { o.classList.remove("is-lift"); }); layoutFan(desk); } }, true); }
    if (!SD.fan && fan) Array.prototype.forEach.call(fan.querySelectorAll(".dc.is-lift"), function (o) { o.classList.remove("is-lift"); });
    desk.classList.toggle("is-fan", SD.fan);
    layoutFan(desk);
    if (tab) { tab.setAttribute("aria-expanded", SD.fan ? "true" : "false"); var ic = tab.querySelector(".sd-tabl i"); if (ic) ic.textContent = SD.fan ? "▼" : "▲"; }
    if (all) all.hidden = !SD.fan;
  }
  /* The fan as an arc held in the hand: total spread up to 56deg, radius chosen so the outer cards just fit the stage width. */
  function layoutFan(desk) {
    var fan = desk && desk.querySelector(".sd-fan"); if (!fan) return;
    var W = window.innerWidth, H = window.innerHeight, k = seatK(W, H), land = LD.seatLandscape(W, H);
    var col = LD.seatColumn(W, H), l = land ? col[0] : 0, r = land ? W - col[1] : 0, avail = W - l - r - 16;
    var cards = fan.querySelectorAll(".dc"), n = cards.length, cw = 96 * k, ch = 134 * k;
    /* every card whole on screen: the outer corners of the tilted end cards stay inside the stage */
    var A = Math.min(26, Math.max(0, (n - 1) * 4.5)) * Math.PI / 180, ext = (cw / 2) * Math.cos(A / 2) + ch * Math.sin(A / 2);
    var span = Math.max(0, Math.min(avail - 2 * ext, (n - 1) * cw * 0.7)), R = n > 1 && A > 0 ? (span / 2) / Math.sin(A / 2) : 0, drop = R * (1 - Math.cos(A / 2));
    var lifted = -1, LS = W > 500 ? 1.25 : 1.4;
    Array.prototype.forEach.call(cards, function (c, i) {
      var ph = n > 1 ? -A / 2 + (A * i) / (n - 1) : 0, x = R * Math.sin(ph), y = R * (1 - Math.cos(ph)), up = c.classList.contains("is-lift");
      if (up) { lifted = i; var lim = Math.max(0, avail / 2 - (cw * LS) / 2); x = Math.max(-lim, Math.min(lim, x)); y = 0; }
      c.style.setProperty("--x", x.toFixed(1) + "px");
      c.style.setProperty("--y", y.toFixed(1) + "px");
      c.style.setProperty("--r", (up ? 0 : ph * 180 / Math.PI).toFixed(2) + "deg");
      c.style.setProperty("--s", up ? String(LS) : "1");
      c.style.zIndex = String(up ? 60 : i + 1);
    });
    fan.classList.toggle("has-lift", lifted >= 0);
    desk.style.setProperty("--fan-l", l + "px"); desk.style.setProperty("--fan-r", r + "px");
    var base = 10 * k + drop * 1.1 + 4;
    desk.style.setProperty("--fan-b", Math.round(base) + "px");
    desk.style.setProperty("--fan-h", Math.round(ch + base + 8) + "px");
    var lab = desk.querySelector(".sd-tabl"); if (lab) desk.style.setProperty("--tab-hw", Math.round(lab.offsetWidth / 2) + "px");
  }
  /* ---------- House desk deal props: tap a prop and it lifts and opens (the typed slip on it is the deal); tap another to compare;
     drag it to your hands (or tap Sign on the slip) and the slip grows into the contract, is signed and stamped.
     Every move is one object tweened (WAAPI); the open and the stamp are <video> slots that start and end on the exact stills,
     with a hard cut when the clip is missing. Never a crossfade between two paintings. ---------- */
  var PK = { id: null, busy: false, gen: 0 };
  function pkOn() { return !!document.querySelector("#screen-desk .desk.sd.has-props"); }
  function pkProp(id) { return LD.seatPropsFor(state).filter(function (p) { return p.id === id; })[0] || null; }
  function pkRoot() {
    var desk = document.querySelector("#screen-desk .desk.sd"); if (!desk) return null;
    var r = desk.querySelector(".sd-peek");
    if (!r) { r = document.createElement("div"); r.className = "sd-peek"; r.id = "sd-peek"; r.innerHTML = '<svg class="pk-thread" aria-hidden="true"><path/></svg>'; desk.appendChild(r); }
    return r;
  }
  function pkAnim(el, frames, ms, ease) {
    if (!el || !el.animate || reduced()) { var last = frames[frames.length - 1]; Object.keys(last).forEach(function (k) { if (k !== "offset") el.style[k] = last[k]; }); return Promise.resolve(); }
    var a = el.animate(frames, { duration: ms, easing: ease || "cubic-bezier(.2,.75,.25,1)", fill: "forwards" });
    return a.finished.then(function () { var last = frames[frames.length - 1]; Object.keys(last).forEach(function (k) { if (k !== "offset") el.style[k] = last[k]; }); try { a.cancel(); } catch (e) {} }, function () {});
  }
  function pkPose(p) { return "translate(" + p.x.toFixed(1) + "px," + p.y.toFixed(1) + "px) rotate(" + (p.r || 0).toFixed(2) + "deg) skewX(" + (p.sk || 0).toFixed(2) + "deg) scale(" + (p.s == null ? 1 : p.s).toFixed(4) + ")"; }
  function pkWait(ms) { return new Promise(function (res) { setTimeout(res, reduced() ? 0 : ms); }); }
  /* geometry of one peek for this viewport */
  function pkLayout(pr) {
    var W = window.innerWidth, H = window.innerHeight, f = LD.seatFrame(W, H), land = f.land, col = LD.seatColumn(W, H), P = LD.SEAT_PROPS;
    var desk = document.querySelector("#screen-desk .desk.sd"), hud = desk.querySelector(".sd-hud"), rib = desk.querySelector(".sd-ribbon");
    var top = Math.max(hud ? hud.getBoundingClientRect().bottom : 0, rib && rib.offsetParent ? rib.getBoundingClientRect().bottom : 0) + 8;
    var L = land ? col[0] + 10 : 8, R = land ? col[1] - 10 : W - 8, rimTop = 1e4;
    LD.seatPropsFor(state).forEach(function (q) { rimTop = Math.min(rimTop, LD.seatToScreen(f, q.x, q.y - q.h * 0.42)[1]); });
    var pinEl = desk.querySelector('.sd-pin[data-deal="' + pr.id + '"]'), pin = null;
    if (pinEl) { var pb = pinEl.getBoundingClientRect(); pin = [pb.left + pb.width / 2, pb.top + pb.height / 2]; }
    var nat = P.size[pr.open], r = nat[1] / nat[0];
    var box = LD.seatPeekBox({ r: r, pin: pin, top: top, bottom: Math.min(rimTop - 4, H * 0.74), left: L, right: R, maxW: land ? Math.min(470, (R - L) * 0.86) : Math.min(470, W * 0.9) }) || { x: L, y: top, w: (R - L) * 0.6, h: (R - L) * 0.6 * r };
    var ci = P.closedIn[pr.type], cw = ci[2] * box.w, ch = cw * P.size[pr.art][1] / P.size[pr.art][0];
    var rimC = LD.seatToScreen(f, pr.x, pr.y), rimW = pr.w * f.s;
    /* the closed art at the rim and inside the box must be the same picture at the same pose: solve the box transform that lands it on the rim */
    var lc = [ci[0] * box.w + cw / 2, ci[1] * box.h + ch / 2], k = rimW / cw, a = pr.rot * Math.PI / 180;
    var from = { x: rimC[0] - k * (Math.cos(a) * lc[0] - Math.sin(a) * lc[1]), y: rimC[1] - k * (Math.sin(a) * lc[0] + Math.cos(a) * lc[1]), r: pr.rot, s: k };
    var g = P.slip[pr.type], kk = W > 500 && !land ? 1.12 : 1;
    var sw = Math.min(box.w * 0.94, Math.max(g.w * box.w, (g.min || 196) * kk));
    var slip = { x: box.x + g.x * box.w, y: box.y + g.y * box.h, r: g.r, sk: g.sk, s: 1, w: sw };
    if (slip.x + sw * Math.cos(g.r * Math.PI / 180) > R) slip.x = Math.max(L, R - sw);
    var hands = LD.seatToScreen(f, 410, 940);
    return { W: W, H: H, f: f, land: land, box: box, from: from, closed: { x: ci[0], y: ci[1], w: ci[2] }, pin: pin, slip: slip, top: top, L: L, R: R, hands: hands, kk: kk };
  }
  function pkThread(root, lay, on) {
    var svg = root.querySelector(".pk-thread"), path = svg && svg.querySelector("path"); if (!path) return;
    if (!on || !lay.pin) { path.setAttribute("d", ""); return; }
    svg.setAttribute("viewBox", "0 0 " + lay.W + " " + lay.H); svg.setAttribute("width", lay.W); svg.setAttribute("height", lay.H);
    var b = lay.box, p = lay.pin, ex = Math.max(b.x + 16, Math.min(b.x + b.w - 16, p[0])), ey = b.y + b.h - 6;
    if (lay.box.side === "left") { ex = b.x + b.w - 6; ey = Math.max(b.y + 16, Math.min(b.y + b.h - 16, p[1])); }
    if (lay.box.side === "right") { ex = b.x + 6; ey = Math.max(b.y + 16, Math.min(b.y + b.h - 16, p[1])); }
    path.setAttribute("d", "M" + p[0].toFixed(1) + "," + p[1].toFixed(1) + " Q" + ((p[0] + ex) / 2).toFixed(1) + "," + (Math.max(p[1], ey) + 10).toFixed(1) + " " + ex.toFixed(1) + "," + ey.toFixed(1));
  }
  /* The living map while a prop is open: its region lights fully, the other props dim, money runs along the thread to the prop,
     small smoke marks rise from the region when the deal costs unrest, and one caption sits under the pin:
     "North America · +$28M · unrest +6". Touch-first: this is the tap state (no hover). id null clears it. */
  function pkUnrest(sd) {
    var rows = [].concat(sd.now || [], sd.later || []), u = null;
    rows.forEach(function (r) { if (u == null && /unrest/i.test(r.t)) { var m = /([+\u2212-]\s*\d+)/.exec(r.t); if (m) u = m[1].replace(/\s/g, "").replace("-", "\u2212"); } });
    return u;
  }
  function pkLive(id, lay) {
    var desk = document.querySelector("#screen-desk .desk.sd"); if (!desk) return;
    Array.prototype.forEach.call(desk.querySelectorAll(".sd-th, .sd-rglow"), function (n) { n.classList.toggle("is-on", !!id && n.getAttribute("data-deal") === id); });
    Array.prototype.forEach.call(desk.querySelectorAll(".sd-propimg, .sd-propref, .sd-prop"), function (n) { n.classList.toggle("is-dim", !!id && n.getAttribute("data-deal") !== id); });
    desk.classList.toggle("is-peeking", !!id);
    var root = desk.querySelector(".sd-peek");
    Array.prototype.forEach.call(desk.querySelectorAll(".sd-mcap, .pk-marks"), function (n) { n.parentNode.removeChild(n); });
    var tr = root && root.querySelector(".pk-trail"); if (tr) tr.setAttribute("d", "");
    if (!id || !root || !lay || !lay.pin) return;
    var sd = LD.dealSlip(state, id); if (!sd) return;
    var now = sd.now || [], money0 = now.length && /\$/.test(now[0].t) ? now[0].t : sd.choices ? sd.tag : sd.tag, un = sd.choices ? null : pkUnrest(sd);
    var parts = [sd.region || "", money0 || "", un ? "unrest " + un : ""].filter(Boolean);
    if (parts.length) {
      var cap = document.createElement("div"); cap.className = "sd-mcap"; cap.setAttribute("role", "status");
      cap.innerHTML = parts.map(function (t, i) { return '<span class="' + (i === 1 ? (/^[\u2212-]/.test(t) ? "c-neg" : "c-cash") : i === 2 ? "c-un" : "c-reg") + '">' + (i === 0 ? LD.escapeHtml(t) : t) + "</span>"; }).join("<i> · </i>");
      root.appendChild(cap);
      var W = lay.W, cw = cap.offsetWidth, ch = cap.offsetHeight, x = Math.max(lay.L + 2, Math.min(lay.R - cw - 2, lay.pin[0] - cw / 2)), y = lay.pin[1] + 16;
      /* never over the open prop: on a side layout it sits under the pin, which is always clear of the box */
      cap.style.left = x.toFixed(1) + "px"; cap.style.top = y.toFixed(1) + "px";
      if (W && x + cw > W) cap.style.left = Math.max(2, W - cw - 2) + "px";
    }
    /* money along the thread (the same curve pkThread drew), toward the prop */
    var th = root.querySelector(".pk-thread path"), svg = root.querySelector(".pk-thread");
    if (th && svg && th.getAttribute("d")) {
      if (!tr) { tr = document.createElementNS("http://www.w3.org/2000/svg", "path"); tr.setAttribute("class", "pk-trail"); tr.setAttribute("pathLength", "100"); svg.appendChild(tr); }
      tr.setAttribute("d", th.getAttribute("d"));
      tr.classList.remove("run"); void tr.getBoundingClientRect(); tr.classList.add("run");
    }
    if (un && !/^\u2212/.test(un)) {
      var mk = document.createElement("div"); mk.className = "pk-marks"; mk.setAttribute("aria-hidden", "true");
      var k = lay.f.s, xs = [-16, 2, 17];
      mk.innerHTML = xs.map(function (dx, i) { return '<svg class="pk-puff" style="left:' + (lay.pin[0] + dx * Math.max(0.8, k) - 6).toFixed(1) + "px;top:" + (lay.pin[1] - 30 * Math.max(0.8, k) - (i % 2) * 5).toFixed(1) + "px;--i:" + i + '" viewBox="0 0 12 20"><circle class="sm" cx="7" cy="4" r="2.6"/><circle class="sm" cx="4.6" cy="1.8" r="1.6"/><path class="fl" d="M6 19c-3 0-4.5-2-4.5-4.2 0-2.3 2-3.4 2.4-5.6 1.6 1 2 2.4 1.9 3.6 1-.5 1.6-1.6 1.6-2.8 1.8 1.2 3.1 3 3.1 5 0 2.3-1.6 4-4.5 4z"/></svg>'; }).join("");
      root.appendChild(mk);
    }
  }
  function pkRibbon(text) {
    var rib = document.querySelector("#screen-desk .desk.sd .sd-ribbon"); if (!rib) return;
    if (!rib.hasAttribute("data-base")) rib.setAttribute("data-base", rib.textContent);
    rib.textContent = text == null ? rib.getAttribute("data-base") : text;
  }
  function pkRim(id, show) {
    Array.prototype.forEach.call(document.querySelectorAll('#screen-desk .sd-propimg[data-deal="' + id + '"], #screen-desk .sd-propref[data-deal="' + id + '"], #screen-desk .sd-prop[data-deal="' + id + '"]'), function (n) { n.style.visibility = show ? "" : "hidden"; });
  }
  /* reveal / stamp clips: VP9-alpha WebM, fetched into memory when the desk renders so a tap never waits on the network.
     A clip only plays once it is fully loaded; otherwise (or on Apple WebKit, which has no WebM alpha) the move is the hard cut. */
  var PKV = {};
  function pkClipsOk() {
    if (PKV.ok != null) return PKV.ok;
    var v = document.createElement("video"), can = false;
    try { can = !!(v.canPlayType && v.canPlayType('video/webm; codecs="vp9"')); } catch (e) {}
    PKV.ok = can && !/Apple/.test(navigator.vendor || "") && !!window.fetch && !!(window.URL && URL.createObjectURL);
    return PKV.ok;
  }
  function pkClipFile(art) { return LD.PROP_CLIP_DIR + (art === "stamp" ? "stamp.webm" : art + "-open.webm"); }
  function pkPreload(art) {
    if (!LD.PROP_CLIPS || !LD.PROP_CLIPS[art] || PKV[art] || !pkClipsOk() || reduced()) return;
    var rec = PKV[art] = { url: null };
    fetch(pkClipFile(art)).then(function (r) { return r.ok ? r.blob() : null; }).then(function (b) { if (b && b.size) rec.url = URL.createObjectURL(b); }).catch(function () {});
  }
  function pkClip(art) { var r = PKV[art]; return r && r.url ? r.url : null; }
  LD.seatClipUrl = function (art) { return pkClip(art); };
  LD.seatClipState = function () { var o = { ok: pkClipsOk(), ready: [] }; for (var k in PKV) if (k !== "ok" && PKV[k] && PKV[k].url) o.ready.push(k); return o; };
  /* play a clip over its held stills, or resolve at once (hard cut) when there is none. The clip's first frame is the
     still under it, so the still is only hidden once the video has put a frame up; its last frame is the still that replaces it.
     nat = the still's pixel size (the encode is padded to even sizes, so the video is stretched by its own size / nat) */
  function pkPlay(host, src, nat) {
    if (!src || reduced()) return Promise.resolve();
    return new Promise(function (res) {
      var v = document.createElement("video"), done = false;
      v.className = "pk-vid"; v.muted = true; v.playsInline = true; v.setAttribute("playsinline", ""); v.preload = "auto"; v.disablePictureInPicture = true;
      function end() { if (done) return; done = true; res(v); }
      function shown() { if (!done) host.classList.add("is-vid"); }
      v.addEventListener("loadedmetadata", function () {
        if (nat && v.videoWidth) { v.style.width = (v.videoWidth / nat[0] * 100).toFixed(3) + "%"; v.style.height = (v.videoHeight / nat[1] * 100).toFixed(3) + "%"; }
      });
      /* frame 0 and 1 are the closed still (1 is pulled onto it), so the still only steps aside once the clip has truly moved on */
      if (v.requestVideoFrameCallback) { var wait = function (now, md) { if (md && md.mediaTime > 0.02 && v.readyState >= 2) shown(); else if (!done) v.requestVideoFrameCallback(wait); }; v.requestVideoFrameCallback(wait); }
      else v.addEventListener("playing", function () { setTimeout(shown, 40); });
      v.addEventListener("ended", end); v.addEventListener("error", end); setTimeout(end, 2500 / (LD.PK_RATE || 1));
      v.src = src; host.appendChild(v); if (LD.PK_RATE) { try { v.defaultPlaybackRate = v.playbackRate = LD.PK_RATE; } catch (e) {} } /* test hook: slow clips to inspect the swaps */
      var pr = v.play(); if (pr && pr.catch) pr.catch(end);
    });
  }
  function seatPeekKill() {
    PK.gen++; PK.id = null; PK.busy = false; PK.lay = null; PK.el = null; PK.slip = null;
    var r = document.querySelector("#screen-desk .sd-peek"); if (r) r.parentNode.removeChild(r);
    Array.prototype.forEach.call(document.querySelectorAll("#screen-desk .sd-propimg, #screen-desk .sd-prop"), function (n) { n.style.visibility = ""; n.style.transform = n.classList.contains("sd-propimg") ? n.style.transform : ""; });
    Array.prototype.forEach.call(document.querySelectorAll("#screen-desk .sd-propref"), function (n) { n.style.visibility = ""; });
    pkLive(null);
  }
  /* close the open prop back to its rim slot (slip in, hard cut / clip to closed, one tween home) */
  function seatPeekClose(instant) {
    var id = PK.id, el = PK.el, slip = PK.slip, lay = PK.lay, root = pkRoot(); if (!id || !el) return Promise.resolve();
    PK.id = null; PK.el = null; PK.slip = null; PK.lay = null;
    pkRibbon(null); pkThread(root, lay, false); pkLive(null);
    Array.prototype.forEach.call(document.querySelectorAll('#screen-desk .sd-pin'), function (n) { n.classList.remove("sel"); });
    if (instant || reduced()) { if (el.parentNode) el.parentNode.removeChild(el); if (slip && slip.parentNode) slip.parentNode.removeChild(slip); pkRim(id, true); return Promise.resolve(); }
    var s0 = lay.slip;
    var a = slip ? pkAnim(slip, [{ transform: pkPose(s0), clipPath: "inset(0 0 0 0)" }, { transform: pkPose({ x: s0.x, y: s0.y + 26, r: s0.r, sk: s0.sk }), clipPath: "inset(0 0 100% 0)" }], 130, "ease-in") : Promise.resolve();
    return a.then(function () {
      if (slip && slip.parentNode) slip.parentNode.removeChild(slip);
      el.classList.remove("is-open");
      return pkAnim(el, [{ transform: pkPose({ x: lay.box.x, y: lay.box.y }) }, { transform: pkPose(lay.from) }], 200, "cubic-bezier(.4,0,.6,1)");
    }).then(function () { pkRim(id, true); if (el.parentNode) el.parentNode.removeChild(el); });
  }
  function seatPeek(id) {
    if (PK.busy) return;
    if (PK.id === id) { seatPeekClose(); clearSel(); seatSelSync(); return; }
    var pr = pkProp(id); if (!pr) return;
    if (PK.id) seatPeekClose();
    var root = pkRoot(), lay = pkLayout(pr), gen = ++PK.gen, b = lay.box;
    PK.id = id; PK.lay = lay; PK.pr = pr;
    var el = document.createElement("div");
    el.className = "pk t-" + pr.type; el.setAttribute("data-deal", id);
    el.style.width = b.w.toFixed(1) + "px"; el.style.height = b.h.toFixed(1) + "px";
    el.innerHTML = '<img class="pk-closed" src="' + LD.propSrc(pr.art) + '" alt="" draggable="false" style="left:' + (lay.closed.x * 100).toFixed(2) + "%;top:" + (lay.closed.y * 100).toFixed(2) + "%;width:" + (lay.closed.w * 100).toFixed(2) + '%">' +
      '<img class="pk-open" src="' + LD.propSrc(pr.open) + '" alt="" draggable="false">';
    el.style.transform = pkPose(lay.from);
    root.appendChild(el); PK.el = el;
    var tmp = document.createElement("div"); tmp.innerHTML = LD.seatSlipHtml(state, id, pr.type); var slip = tmp.firstChild;
    slip.style.width = lay.slip.w.toFixed(1) + "px"; slip.style.setProperty("--kk", lay.kk); slip.style.transform = pkPose(lay.slip); slip.style.clipPath = "inset(0 0 100% 0)"; slip.style.visibility = "hidden";
    root.appendChild(slip); PK.slip = slip;
    /* a tall slip (a crisis with three responses) never runs down over the deal's own pin or the rim props: it rides up instead */
    var sh = slip.offsetHeight, lim = Math.min(lay.pin ? (lay.box.side === "above" ? lay.pin[1] - 20 : 1e4) : 1e4, lay.H * 0.74);
    if (lay.slip.y + sh > lim) { lay.slip.y = Math.max(lay.top - 2, lim - sh); slip.style.transform = pkPose(lay.slip); }
    bindPeek(el, slip, id);
    pkRim(id, false);
    Array.prototype.forEach.call(document.querySelectorAll('#screen-desk .sd-pin'), function (n) { n.classList.toggle("sel", n.getAttribute("data-deal") === id); });
    pkThread(root, lay, true); pkLive(id, lay);
    pkRibbon(lay.land ? null : (LD.dealById(id).choices ? "Tap a response to answer it" : "Drag to your hands to sign · or tap another"));
    SFX.play("tick");
    /* 1 lift (tween) -> 2 open (clip or hard cut) -> 3 slip slides out of its holder (tween) */
    pkAnim(el, [{ transform: pkPose(lay.from) }, { transform: pkPose({ x: b.x, y: b.y }) }], 230).then(function () {
      if (gen !== PK.gen) return;
      return pkPlay(el, pkClip(pr.art), LD.SEAT_PROPS.size[pr.open]).then(function (v) {
        if (gen !== PK.gen) return;
        el.classList.add("is-open"); el.classList.remove("is-vid"); if (v && v.parentNode) v.parentNode.removeChild(v);
        slip.style.visibility = "";
        var s0 = lay.slip;
        return pkAnim(slip, [{ transform: pkPose({ x: s0.x, y: s0.y + 26, r: s0.r, sk: s0.sk }), clipPath: "inset(0 0 100% 0)" }, { transform: pkPose(s0), clipPath: "inset(0 0 0% 0)" }], 190);
      });
    });
  }
  /* drag the open prop (slip rides with it) to your hands; tap the slip to read it at full size */
  function bindPeek(el, slip, id) {
    var st = null;
    function pose(dx, dy, sc, o) { var lay = PK.lay, b = lay.box, s = lay.slip;
      el.style.transform = pkPose({ x: o[0] + (b.x - o[0]) * sc + dx, y: o[1] + (b.y - o[1]) * sc + dy, s: sc });
      slip.style.transform = pkPose({ x: o[0] + (s.x - o[0]) * sc + dx, y: o[1] + (s.y - o[1]) * sc + dy, r: s.r, sk: s.sk, s: sc }); }
    function zone(y) { return y > PK.lay.H * (PK.lay.land ? 0.72 : 0.7); }
    function down(e) {
      if (PK.busy || PK.id !== id || !el.classList.contains("is-open") || (e.button && e.button > 0)) return;
      if (e.target.closest && e.target.closest("button")) return;
      st = { x: e.clientX, y: e.clientY, moved: false, pid: e.pointerId, src: e.currentTarget };
      try { e.currentTarget.setPointerCapture(e.pointerId); } catch (x) {}
    }
    function move(e) {
      if (!st || e.pointerId !== st.pid) return;
      var dx = e.clientX - st.x, dy = e.clientY - st.y;
      if (!st.moved && Math.abs(dx) + Math.abs(dy) < 9) return;
      st.moved = true; e.preventDefault();
      var lay = PK.lay, prog = Math.max(0, Math.min(1, dy / Math.max(1, lay.hands[1] - lay.box.y - lay.box.h * 0.5))), sc = 1 - 0.3 * prog;
      pose(dx, dy, sc, [st.x, st.y]); st.dx = dx; st.dy = dy; st.sc = sc;
      var over = zone(e.clientY); if (over !== st.over) { st.over = over; pkRibbon(lay.land ? null : over ? "Let go to sign" : "Drag to your hands to sign · or tap another"); document.querySelector("#screen-desk .desk.sd").classList.toggle("pk-over", over); }
    }
    function up(e) {
      if (!st || e.pointerId !== st.pid) return;
      var s = st; st = null;
      document.querySelector("#screen-desk .desk.sd").classList.remove("pk-over");
      if (!s.moved) { if (s.src === slip) pkRead(slip); return; }
      if (zone(e.clientY)) { if (LD.dealById(id).choices) { flash("Pick a response on the telegram first."); pkBack(s); return; } seatSign(id, null, s); return; }
      pkBack(s);
    }
    function pkBack(s) { var lay = PK.lay, b = lay.box, sl = lay.slip, o = [s.x, s.y], sc = s.sc || 1;
      pkRibbon(lay.land ? null : "Drag to your hands to sign · or tap another");
      pkAnim(el, [{ transform: pkPose({ x: o[0] + (b.x - o[0]) * sc + s.dx, y: o[1] + (b.y - o[1]) * sc + s.dy, s: sc }) }, { transform: pkPose({ x: b.x, y: b.y }) }], 180);
      pkAnim(slip, [{ transform: pkPose({ x: o[0] + (sl.x - o[0]) * sc + s.dx, y: o[1] + (sl.y - o[1]) * sc + s.dy, r: sl.r, sk: sl.sk, s: sc }) }, { transform: pkPose(sl) }], 180); }
    [el, slip].forEach(function (n) { n.addEventListener("pointerdown", down); n.addEventListener("pointermove", move); n.addEventListener("pointerup", up); n.addEventListener("pointercancel", function () { if (st) pkBack(st); st = null; }); n.addEventListener("click", function (e) { e.stopPropagation(); }); });
    var sign = slip.querySelector("#btn-sign");
    if (sign) sign.addEventListener("click", function (e) { e.stopPropagation(); tick(); seatSign(id, null); });
    Array.prototype.forEach.call(slip.querySelectorAll(".ps-ch"), function (b) { b.addEventListener("click", function (e) { e.stopPropagation(); tick(); seatSign(id, b.getAttribute("data-choice")); }); });
  }
  /* the contract pose: the same slip, straightened and grown (its extra rows unfold) */
  function pkBig(lay) {
    var W = lay.W, w = lay.land ? Math.min((lay.R - lay.L) * 0.86, 430) : Math.min(W * 0.9, 430), s = w / lay.slip.w;
    return { x: (lay.land ? (lay.L + lay.R) / 2 : W / 2) - w / 2, y: lay.top + 6, r: -0.8, sk: 0, s: s };
  }
  function pkRead(slip) {
    var lay = PK.lay; if (!lay || PK.busy) return;
    var more = slip.querySelector(".ps-more"), big = slip.classList.toggle("is-big");
    var to = big ? pkBig(lay) : lay.slip, fr = big ? lay.slip : pkBig(lay);
    if (more) { var hh = more.scrollHeight; pkAnim(more, [{ maxHeight: (big ? 0 : hh) + "px" }, { maxHeight: (big ? hh : 0) + "px" }], 260); }
    pkAnim(slip, [{ transform: pkPose(fr) }, { transform: pkPose(to) }], 260);
    pkRibbon(lay.land ? null : big ? "Tap Sign, or tap the slip to put it back" : "Drag to your hands to sign · or tap another");
  }
  /* sign: others leave the table, the prop goes to your hands, the slip grows into the contract, pen, stamp (clip or tween), then the real deal */
  function seatSign(id, choice, drag) {
    if (PK.busy || PK.id !== id) return;
    var d = LD.dealById(id), sd = LD.dealSlip(state, id);
    if (!choice && sd && sd.poor) { flash("Need " + sd.poor + " to sign this."); return; }
    PK.busy = true;
    var gen = PK.gen, lay = PK.lay, el = PK.el, slip = PK.slip, root = pkRoot(), f = lay.f;
    root.classList.add("is-signing"); pkThread(root, lay, false); pkLive(null); pkRibbon(lay.land ? null : "Signing…");
    if (reduced()) { PK.busy = false; seatPeekKill(); applyDeal(id, choice || undefined); return; }
    /* the others slide off the table edge (one tween each) */
    LD.seatPropsFor(state).forEach(function (p) {
      if (p.id === id) return;
      var dir = p.x < 410 ? -1 : 1;
      Array.prototype.forEach.call(document.querySelectorAll('#screen-desk .sd-propimg[data-deal="' + p.id + '"]'), function (n) {
        pkAnim(n, [{ transform: "rotate(" + p.rot + "deg)" }, { transform: "translateX(" + (dir * 560) + "px) rotate(" + (p.rot * 3) + "deg)" }], 260, "cubic-bezier(.5,0,.8,.4)"); });
      var btn = document.querySelector('#screen-desk .sd-prop[data-deal="' + p.id + '"]'); if (btn) btn.style.visibility = "hidden";
      var rf = document.querySelector('#screen-desk .sd-propref[data-deal="' + p.id + '"]'); if (rf) rf.style.visibility = "hidden";
    });
    /* the prop settles into your hands */
    var b = lay.box, hs = 0.6, cur = drag ? { x: drag.x + (b.x - drag.x) * (drag.sc || 1) + drag.dx, y: drag.y + (b.y - drag.y) * (drag.sc || 1) + drag.dy, s: drag.sc || 1 } : { x: b.x, y: b.y, s: 1 };
    var held = { x: lay.hands[0] - b.w * hs / 2, y: lay.hands[1] - b.h * hs * 0.62, s: hs };
    pkAnim(el, [{ transform: pkPose(cur) }, { transform: pkPose(held) }], 260);
    /* the slip grows into the contract (one object: pose + its folded rows) */
    var big = pkBig(lay), sc0 = slip.classList.contains("is-big") ? big : drag ? { x: drag.x + (lay.slip.x - drag.x) * (drag.sc || 1) + drag.dx, y: drag.y + (lay.slip.y - drag.y) * (drag.sc || 1) + drag.dy, r: lay.slip.r, sk: lay.slip.sk, s: drag.sc || 1 } : lay.slip;
    var more = slip.querySelector(".ps-more");
    if (more && !slip.classList.contains("is-big")) { var hh = more.scrollHeight; pkAnim(more, [{ maxHeight: "0px" }, { maxHeight: hh + "px" }], 320); }
    slip.classList.add("is-big", "is-contract");
    if (choice) Array.prototype.forEach.call(slip.querySelectorAll(".ps-ch"), function (n) { n.classList.toggle("is-chosen", n.getAttribute("data-choice") === choice); });
    pkAnim(slip, [{ transform: pkPose(sc0) }, { transform: pkPose(big) }], 320).then(function () {
      if (gen !== PK.gen) return;
      slip.classList.add("is-pen");
      return pkWait(420);
    }).then(function () {
      if (gen !== PK.gen) return;
      return seatStamp(root, slip);
    }).then(function () {
      if (gen !== PK.gen) return;
      return pkWait(260);
    }).then(function () {
      if (gen !== PK.gen) return;
      PK.busy = false; seatPeekKill();
      applyDeal(id, choice || undefined);
    });
  }
  /* the stamp: clip slot (starts and ends on the stamp held above the slip) or a two-tween fallback; the ink is live text and cuts in at impact */
  function seatStamp(root, slip) {
    var sr = slip.getBoundingClientRect(), w = Math.min(150, sr.width * 0.36), x = sr.right - w * 1.02, yHover = sr.bottom - w * 1.55 - 40, yDown = sr.bottom - w * 1.18;
    var st = document.createElement("img"); st.className = "pk-stamp"; st.src = LD.propSrc("stamp"); st.alt = ""; st.style.width = w + "px";
    st.style.transform = "translate(" + x.toFixed(1) + "px," + yHover.toFixed(1) + "px) rotate(-8deg)";
    root.appendChild(st);
    var clip = pkClip("stamp");
    if (clip) {
      /* clip frame: w x 2w, stamp held at the top (stamp-start.png), impact with its foot 0.62w lower, ends empty (stamp-end.png) */
      var host = document.createElement("div"); host.className = "pk-stamphost"; host.style.transform = "translate(" + x.toFixed(1) + "px," + (yDown - 0.62 * w).toFixed(1) + "px) rotate(-8deg)"; host.style.width = w + "px"; host.style.height = (w * 2) + "px"; root.appendChild(host);
      st.style.visibility = "hidden";
      setTimeout(function () { slip.classList.add("is-inked"); }, LD.PROP_CLIPS.stampImpactMs || 300);
      return pkPlay(host, clip, [512, 1024]).then(function (v) { if (v && v.parentNode) v.parentNode.removeChild(v); slip.classList.add("is-inked"); host.parentNode.removeChild(host); st.parentNode.removeChild(st); });
    }
    return pkAnim(st, [{ transform: "translate(" + x.toFixed(1) + "px," + yHover.toFixed(1) + "px) rotate(-8deg)" }, { transform: "translate(" + x.toFixed(1) + "px," + yDown.toFixed(1) + "px) rotate(-6deg) scale(.96)" }], 150, "cubic-bezier(.6,0,.9,.5)").then(function () {
      slip.classList.add("is-inked"); SFX.play("pick");
      var desk = document.querySelector("#screen-desk .desk.sd"); if (desk) { desk.classList.remove("pk-thud"); void desk.offsetWidth; desk.classList.add("pk-thud"); }
      /* impact: one squash of the same stamp (wider, shorter, foot planted) and back, then the lift */
      var dn = "translate(" + x.toFixed(1) + "px," + yDown.toFixed(1) + "px) rotate(-6deg) ";
      return pkAnim(st, [{ transform: dn + "scale(.96)" }, { transform: "translate(" + (x - w * 0.03).toFixed(1) + "px," + (yDown + w * 0.13).toFixed(1) + "px) rotate(-6deg) scale(1.02,.86)" }, { transform: dn + "scale(.97)" }], 120, "ease-out");
    }).then(function () {
      return pkAnim(st, [{ transform: "translate(" + x.toFixed(1) + "px," + yDown.toFixed(1) + "px) rotate(-6deg) scale(.97)" }, { transform: "translate(" + (x + 60).toFixed(1) + "px," + (yHover - 140).toFixed(1) + "px) rotate(-14deg)" }], 230, "cubic-bezier(.2,.6,.3,1)");
    }).then(function () { if (st.parentNode) st.parentNode.removeChild(st); });
  }
  LD.seatPeek = function (id) { seatPeek(id); };
  LD.seatPeekState = function () { return { id: PK.id, busy: PK.busy, box: PK.lay ? PK.lay.box : null, pin: PK.lay ? PK.lay.pin : null }; };
  function seatSelSync() {
    var desk = document.querySelector("#screen-desk .desk.sd"); if (!desk) return;
    Array.prototype.forEach.call(desk.querySelectorAll("[data-deal]"), function (n) { n.classList.toggle("sel", n.getAttribute("data-deal") === sel.deal); });
    Array.prototype.forEach.call(desk.querySelectorAll(".sd-region"), function (n) { n.classList.toggle("sel", n.getAttribute("data-region") === sel.region); });
    Array.prototype.forEach.call(desk.querySelectorAll(".sd-net[data-net], .sd-nrow"), function (n) { n.classList.toggle("sel", n.getAttribute("data-net") === sel.net); });
    var dz = $("dossier"); if (dz) dz.classList.toggle("on", !!((sel.deal && !pkOn()) || sel.region || sel.net));
    if (sel.deal || sel.region || sel.net) seatSetFan(false);
    if (PK.id && sel.deal !== PK.id) seatPeekClose();
  }
  function bindSeated() {
    var desk = document.querySelector("#screen-desk .desk.sd"); if (!desk) return;
    function on(selr, fn) { Array.prototype.forEach.call(desk.querySelectorAll(selr), function (n) { n.addEventListener("click", function (e) { e.stopPropagation(); fn(n, e); }); }); }
    on(".sd-pin, .sd-qrow, .sd-prop", function (n) { tick(); selectDealPin(n.getAttribute("data-deal")); });
    on(".sd-region", function (n) { tick(); selectRegion(n.getAttribute("data-region")); });
    on(".sd-net[data-net]", function (n) { tick(); selectNet(n.getAttribute("data-net")); });
    on(".sd-nrow[data-net]", function (n) { tick(); selectNet(n.getAttribute("data-net")); });
    on("#btn-menu", function () { tick(); openMenu(); });
    on("#btn-endq", function () { tick(); endQuarter(); });
    on("#house-peek", function () { tick(); if (document.body.classList.contains("in-fight") || doorOpen()) { flash("Finish the fight first."); return; } openHouse({ peek: true }); });
    on("#sd-tab", function () { tick(); seatSetFan(!SD.fan); });
    var stage = desk.querySelector(".sd-clip"), bg = desk.querySelector(".sd-ui");
    [stage, bg].forEach(function (n) { if (n) n.addEventListener("click", function (e) {
      if (e.target.closest && e.target.closest("button")) return;
      if (SD.fan) { seatSetFan(false); return; }
      if (PK.busy) return;
      if (PK.id) { clearSel(); seatSelSync(); return; }
      if (sel.deal || sel.region || sel.net) { clearSel(); refreshSelection(); }
    }); });
    /* swipe up on the tab opens the fan; down closes */
    var hand = $("sd-hand"), y0 = null;
    if (hand) {
      hand.addEventListener("pointerdown", function (e) { y0 = e.clientY; });
      hand.addEventListener("pointerup", function (e) { if (y0 == null) return; var dy = e.clientY - y0; y0 = null; if (dy < -24 && !SD.fan) seatSetFan(true); else if (dy > 24 && SD.fan) seatSetFan(false); });
    }
    bindFyDesk();
    bindDossier();
    if (SD.fan) { SD.fan = false; seatSetFan(true); }
  }
  window.addEventListener("resize", function () { if (seatedNow()) { if (PK.id && !PK.busy) { seatPeekClose(true); clearSel(); seatSelSync(); } placeSeated(); } if (document.querySelector("#door.sd-fight")) placeSeatFight(); });
  /* the fight uses the same framing as the desk, so the room does not move when the visitor sits down */
  function placeSeatFight() {
    var d = doorEl(); if (!d || !d.classList.contains("sd-fight")) return;
    var W = window.innerWidth, H = window.innerHeight, col = LD.seatColumn(W, H);
    d.style.setProperty("--k", seatK(W, H));
    /* frame the visitor's head below the name bar (the bar sits under the HUD, not on the rig, so measure it first) */
    var op0 = d.querySelector("#sc-opp"), fh0 = d.querySelector(".sd-fhead");
    var f = LD.seatFightFrame(W, H, op0 && LD.SEAT.opp[op0.getAttribute("data-art")], fh0 ? fh0.getBoundingClientRect().bottom : 0);
    d.style.setProperty("--col-l", Math.round(col[0]) + "px"); d.style.setProperty("--col-r", Math.round(W - col[1]) + "px");
    d.classList.toggle("is-land", f.land);
    var rig = d.querySelector(".sd-rig"); if (rig) rig.style.transform = "translate(" + f.tx.toFixed(2) + "px," + f.ty.toFixed(2) + "px) scale(" + f.s.toFixed(5) + ")";
    seatWide(d, f, 0);
    var hud = d.querySelector(".sd-hud"); if (hud) d.style.setProperty("--hud", Math.round(hud.getBoundingClientRect().bottom) + "px");
    var rim = LD.seatToScreen(f, 0, 548)[1]; d.style.setProperty("--rim", Math.round(rim) + "px");
    /* portrait: speech and intent stand in a column beside the visitor, never over their face; captions lie on the table */
    var op = d.querySelector("#sc-opp"), box = op && LD.SEAT.opp[op.getAttribute("data-art")], it = $("df-intent"), talk = d.querySelector(".sd-talk");
    if (!f.land && box) {
      var hx = LD.seatToScreen(f, box[0] + box[2] * 0.5, 0)[0], right = LD.seatToScreen(f, box[0] + box[2] * 0.82, 0)[0];
      var hd = (LD.SEAT.head || {})[op.getAttribute("data-art")], headR = hd ? LD.seatToScreen(f, box[0] + box[2] * hd[1], 0)[0] : hx + 34;
      var cl = Math.round(Math.max(W * 0.46, hx + 34, headR + 8, Math.min(W - 200 * (W > 500 ? 1.3 : 1), right - 6)));
      d.style.setProperty("--tcol", cl + "px"); d.style.setProperty("--headx", Math.round(hx) + "px");
      var head = LD.seatToScreen(f, 0, box[1] + 40)[1]; d.style.setProperty("--heady", Math.round(head) + "px");
      /* the Next move stands beside them (under the name bar); their speech hangs under them on the table, tail up */
      var fh = d.querySelector(".sd-fhead"), fhb = fh ? fh.getBoundingClientRect().bottom : rim * 0.4;
      if (it) it.style.top = Math.round(fhb + 8) + "px";
      if (talk) talk.style.top = Math.round(rim + 10) + "px";
      var tbb = talk && talk.children.length ? talk.getBoundingClientRect().bottom : rim;
      d.style.setProperty("--tbot", Math.round(tbb + 8) + "px");
    } else if (it) {
      /* landscape: the intent stands under the speech in the left panel column */
      var tb2 = talk && talk.children.length ? talk.getBoundingClientRect().bottom : (d.querySelector(".sd-fhead") || d).getBoundingClientRect().bottom;
      it.style.top = Math.round(tb2 + 10) + "px";
      d.style.setProperty("--tbot", Math.round(it.getBoundingClientRect().bottom + 10) + "px");
    }
  }

  /* In-place update: dossier, selection classes, map preview and rail. No map rebuild. */
  function refreshSelection() {
    var desk = document.querySelector(".desk");
    if (!desk) return;
    var dz = $("dossier");
    dz.innerHTML = LD.renderDossier(state, uiOpts());
    desk.classList.toggle("has-sel", !!(sel.deal || sel.region || sel.net));
    Array.prototype.forEach.call(desk.querySelectorAll(".pin"), function (n) {
      n.classList.toggle("sel", n.getAttribute("data-deal") === sel.deal);
      if (sel.deal) n.classList.remove("coach");
    });
    Array.prototype.forEach.call(desk.querySelectorAll(".region"), function (n) {
      n.classList.toggle("sel", n.getAttribute("data-region") === sel.region);
    });
    Array.prototype.forEach.call(desk.querySelectorAll(".net-chip"), function (n) { n.classList.toggle("sel", n.getAttribute("data-net") === sel.net); });
    updatePreview(sel.deal, null);
    var cb = desk.querySelector(".coach-bubble.c-pin");
    if (cb && sel.deal) cb.remove();
    bindDossier();
    dz.classList.remove("pop");
    void dz.offsetWidth;
    dz.classList.add("pop");
    if (desk.classList.contains("sd")) { seatSelSync(); return; }
    if (isPhone() && (sel.deal || sel.region)) {
      var board = desk.querySelector(".board");
      if (board) window.scrollTo({ top: Math.max(0, board.getBoundingClientRect().top + window.scrollY - 8), behavior: reduced() ? "auto" : "smooth" });
    }
  }

  function updatePreview(dealId, choiceId) {
    var o = uiOpts();
    var pv = document.querySelector("#screen-desk #map-preview");
    if (pv) pv.innerHTML = LD.renderMapPreview(state, dealId, choiceId, o).replace(/href="#rg-/g, 'href="#mrg-');
    var rail = $("rail-wrap");
    if (rail) { rail.innerHTML = LD.renderRail(state, dealId, choiceId); bindBossLinks(rail); }
  }

  function clearSel() { sel.deal = null; sel.region = null; sel.net = null; }
  function selectDealPin(id) {
    if (state.phase !== "deal") return;
    if (seatedNow() && pkOn()) { if (PK.busy) return; var again = PK.id === id; clearSel(); if (!again) sel.deal = id; seatSelSync(); if (again) return; seatPeek(id); pennyEmit("pin"); if (!again && LD.dealKind(LD.dealById(id)) === "crisis") pennyTip("crisis"); return; }
    clearSel();
    sel.deal = id;
    refreshSelection();
    pennyEmit("pin");
    if (LD.dealKind(LD.dealById(id)) === "crisis") pennyTip("crisis");
  }
  function selectRegion(id) { clearSel(); sel.region = id; refreshSelection(); pennyTip("region"); }
  function selectNet(id) { clearSel(); sel.net = id; refreshSelection(); }

  function activateOnKey(n, fn) {
    n.addEventListener("keydown", function (e) {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); fn(); }
    });
  }

  function flashRegion(id) {
    var g = document.querySelector('.desk .region[data-region="' + id + '"]');
    if (!g) return;
    g.classList.remove("flash");
    void g.getBoundingClientRect();
    g.classList.add("flash");
    setTimeout(function () { g.classList.remove("flash"); }, 1600);
  }

  function bindDesk() {
    var pins = Array.prototype.slice.call(document.querySelectorAll(".desk .pin"));
    pins.forEach(function (n, i) {
      function open() { tick(); selectDealPin(n.getAttribute("data-deal")); }
      n.addEventListener("click", function (e) { e.stopPropagation(); open(); });
      activateOnKey(n, open);
      /* Drag a pin to preview what it does; dropping it opens the deal. */
      n.addEventListener("pointerdown", function (e) {
        if (state.phase !== "deal" || (e.button && e.button > 0)) return;
        e.stopPropagation();
        var svg = n.ownerSVGElement;
        if (!svg || !svg.viewBox || !svg.viewBox.baseVal) return;
        var vb = svg.viewBox.baseVal, rr = svg.getBoundingClientRect();
        var k = Math.max(vb.width / Math.max(1, rr.width), vb.height / Math.max(1, rr.height));
        var orig = n.getAttribute("transform");
        var m = /translate\(([-\d.]+)[ ,]+([-\d.]+)\)/.exec(orig || "");
        if (!m) return;
        var sx = e.clientX, sy = e.clientY, moved = false, id = n.getAttribute("data-deal");
        function mv(ev) {
          var dx = ev.clientX - sx, dy = ev.clientY - sy;
          if (!moved && Math.sqrt(dx * dx + dy * dy) < 8) return;
          if (!moved) { moved = true; n.classList.add("dragging"); hideTip(); updatePreview(id, null); }
          n.setAttribute("transform", "translate(" + (+m[1] + dx * k).toFixed(1) + " " + (+m[2] + dy * k).toFixed(1) + ")");
        }
        function up() {
          window.removeEventListener("pointermove", mv);
          window.removeEventListener("pointerup", up);
          window.removeEventListener("pointercancel", up);
          if (moved) { n.setAttribute("transform", orig); n.classList.remove("dragging"); selectDealPin(id); }
        }
        window.addEventListener("pointermove", mv);
        window.addEventListener("pointerup", up);
        window.addEventListener("pointercancel", up);
      });
      n.addEventListener("keydown", function (e) {
        if (e.key === "ArrowRight" || e.key === "ArrowDown") { e.preventDefault(); pins[(i + 1) % pins.length].focus(); }
        if (e.key === "ArrowLeft" || e.key === "ArrowUp") { e.preventDefault(); pins[(i + pins.length - 1) % pins.length].focus(); }
      });
    });
    Array.prototype.forEach.call(document.querySelectorAll(".desk .sr-deal"), function (n) {
      n.addEventListener("click", function () { tick(); selectDealPin(n.getAttribute("data-deal")); var dz = $("dossier"); var f = dz && dz.querySelector("button:not(.dz-x)"); if (f) f.focus(); });
    });
    Array.prototype.forEach.call(document.querySelectorAll(".desk .region, .desk .plant-node"), function (n) {
      function open() { if (Date.now() < suppressTap) return; tick(); selectRegion(n.getAttribute("data-region")); }
      n.addEventListener("click", function (e) { e.stopPropagation(); open(); });
      if (n.classList.contains("region")) activateOnKey(n, open);
    });
    Array.prototype.forEach.call(document.querySelectorAll(".desk .net-chip"), function (n) {
      n.addEventListener("click", function () { tick(); selectNet(n.getAttribute("data-net")); });
    });
    Array.prototype.forEach.call(document.querySelectorAll(".desk .lens-btn"), function (n) {
      n.addEventListener("click", function () {
        tick();
        lens = n.getAttribute("data-lens");
        var svg = document.querySelector(".desk .map");
        if (svg) svg.setAttribute("class", svg.getAttribute("class").replace(/lens-\w+/, "lens-" + lens));
        Array.prototype.forEach.call(document.querySelectorAll(".desk .lens-btn"), function (b) {
          var on = b.getAttribute("data-lens") === lens;
          b.classList.toggle("on", on);
          b.setAttribute("aria-pressed", on);
        });
      });
    });
    Array.prototype.forEach.call(document.querySelectorAll(".desk .tick-item"), function (n) {
      n.addEventListener("click", function () { tick(); flashRegion(n.getAttribute("data-region")); });
    });
    var bunkerBtn = $("bunker-card");
    if (bunkerBtn) bunkerBtn.addEventListener("click", function (e) {
      tick();
      if (document.body.classList.contains("in-fight") || doorOpen()) { flash("Finish the fight first."); return; }
      var rm = e.target && e.target.closest ? e.target.closest("[data-room]") : null;
      openBunker(rm ? rm.getAttribute("data-room") : null);
    });
    $("btn-endq").addEventListener("click", function () { tick(); endQuarter(); });
    $("btn-menu").addEventListener("click", function () { tick(); openMenu(); });
    bindFyDesk();
    bindTips();
    bindZoom();
    bindDossier();
  }

  /* Region tooltip: hover on desktop, long-press on touch. */
  var suppressTap = 0;
  function showTip(id, x, y) {
    var tip = $("map-tip");
    var board = document.querySelector(".desk .board");
    if (!tip || !board) return;
    var b = board.getBoundingClientRect();
    tip.innerHTML = LD.regionTip(state, id);
    tip.hidden = false;
    tip.style.left = Math.min(b.width - 230, Math.max(6, x - b.left + 14)) + "px";
    tip.style.top = Math.max(6, y - b.top - 10) + "px";
  }
  function hideTip() { var tip = $("map-tip"); if (tip) tip.hidden = true; }
  function bindTips() {
    Array.prototype.forEach.call(document.querySelectorAll(".desk .region"), function (n) {
      var id = n.getAttribute("data-region");
      n.addEventListener("mousemove", function (e) { if (e.pointerType === "touch") return; showTip(id, e.clientX, e.clientY); });
      n.addEventListener("mouseleave", hideTip);
      n.addEventListener("focus", function () { var r = n.getBoundingClientRect(); showTip(id, r.left + r.width / 2, r.top + r.height / 2); });
      n.addEventListener("blur", hideTip);
      var timer = null;
      n.addEventListener("touchstart", function (e) {
        if (e.touches.length !== 1) return;
        var t = e.touches[0];
        timer = setTimeout(function () { suppressTap = Date.now() + 600; showTip(id, t.clientX, t.clientY); setTimeout(hideTip, 2600); }, 480);
      }, { passive: true });
      ["touchend", "touchmove", "touchcancel"].forEach(function (ev) { n.addEventListener(ev, function () { clearTimeout(timer); }, { passive: true }); });
    });
  }

  /* Phone: pinch to zoom, drag to pan, double-tap to reset. */
  var zoom = { s: 1, x: 0, y: 0 };
  function applyZoom(el) {
    el.style.transform = zoom.s === 1 ? "" : "translate(" + zoom.x + "px," + zoom.y + "px) scale(" + zoom.s + ")";
  }
  function bindZoom() {
    var el = $("map-zoom");
    if (!el) return;
    applyZoom(el);
    var pts = {}, start = null, lastTap = 0;
    function count() { return Object.keys(pts).length; }
    function clampZoom() {
      zoom.s = Math.max(1, Math.min(3, zoom.s));
      var w = el.offsetWidth, h = el.offsetHeight;
      zoom.x = Math.min(0, Math.max(w - w * zoom.s, zoom.x));
      zoom.y = Math.min(0, Math.max(h - h * zoom.s, zoom.y));
      if (zoom.s === 1) { zoom.x = 0; zoom.y = 0; }
    }
    el.addEventListener("pointerdown", function (e) {
      if (e.pointerType !== "touch") return;
      pts[e.pointerId] = { x: e.clientX, y: e.clientY };
      var now = Date.now();
      if (count() === 1 && now - lastTap < 300 && zoom.s > 1) { zoom = { s: 1, x: 0, y: 0 }; applyZoom(el); }
      lastTap = now;
      start = { zoom: { s: zoom.s, x: zoom.x, y: zoom.y }, pts: JSON.parse(JSON.stringify(pts)) };
    });
    el.addEventListener("pointermove", function (e) {
      if (!pts[e.pointerId] || !start) return;
      pts[e.pointerId] = { x: e.clientX, y: e.clientY };
      var ids = Object.keys(pts);
      var r = el.parentNode.getBoundingClientRect();
      if (ids.length >= 2 && start.pts[ids[0]] && start.pts[ids[1]]) {
        var a0 = start.pts[ids[0]], b0 = start.pts[ids[1]], a1 = pts[ids[0]], b1 = pts[ids[1]];
        var d0 = Math.hypot(a0.x - b0.x, a0.y - b0.y) || 1, d1 = Math.hypot(a1.x - b1.x, a1.y - b1.y);
        var k = d1 / d0;
        var cx = (a0.x + b0.x) / 2 - r.left, cy = (a0.y + b0.y) / 2 - r.top;
        var nx = (a1.x + b1.x) / 2 - r.left, ny = (a1.y + b1.y) / 2 - r.top;
        zoom.s = start.zoom.s * k;
        zoom.x = nx - (cx - start.zoom.x) * k;
        zoom.y = ny - (cy - start.zoom.y) * k;
        suppressTap = Date.now() + 400;
      } else if (ids.length === 1 && start.zoom.s > 1) {
        var p0 = start.pts[ids[0]], p1 = pts[ids[0]];
        if (!p0) return;
        if (Math.abs(p1.x - p0.x) + Math.abs(p1.y - p0.y) > 8) suppressTap = Date.now() + 300;
        zoom.x = start.zoom.x + (p1.x - p0.x);
        zoom.y = start.zoom.y + (p1.y - p0.y);
      } else return;
      clampZoom();
      applyZoom(el);
    });
    function up(e) {
      delete pts[e.pointerId];
      start = count() ? { zoom: { s: zoom.s, x: zoom.x, y: zoom.y }, pts: JSON.parse(JSON.stringify(pts)) } : null;
    }
    el.addEventListener("pointerup", up);
    el.addEventListener("pointercancel", up);
  }

  function bindDossier() {
    var x = $("dz-close");
    if (x) x.addEventListener("click", function () { tick(); clearSel(); refreshSelection(); });
    bindBossLinks($("dossier"));
    var sign = $("btn-sign");
    if (sign) sign.addEventListener("click", function () { tick(); applyDeal(sign.getAttribute("data-deal")); });
    Array.prototype.forEach.call(document.querySelectorAll(".dz-choice"), function (b) {
      b.addEventListener("click", function () { tick(); applyDeal(b.getAttribute("data-deal"), b.getAttribute("data-choice")); });
      function pv() { updatePreview(b.getAttribute("data-deal"), b.getAttribute("data-choice")); }
      b.addEventListener("mouseenter", pv);
      b.addEventListener("focus", pv);
      b.addEventListener("mouseleave", function () { updatePreview(sel.deal, null); });
    });
    var build = $("btn-build");
    if (build) build.addEventListener("click", function () {
      tick();
      var rid = build.getAttribute("data-region");
      var prev = state;
      var res = LD.buildPlant(state, rid);
      if (!res.ok) { flash(res.error); return; }
      state = res.state;
      persistRun();
      renderDesk(prev);
      floatAt(rid, "Plant opened −" + LD.formatMoney(res.cost), "cost");
      popRegion(rid, "built");
    });
    var calm = $("btn-calm");
    if (calm) calm.addEventListener("click", function () {
      tick();
      var rid = calm.getAttribute("data-region");
      var prev = state;
      var res = LD.calmRegion(state, rid);
      if (!res.ok) { flash(res.error); return; }
      state = res.state;
      persistRun();
      renderDesk(prev);
      floatAt(rid, "Stress −" + LD.PR_PUSH.calm, "good");
      popRegion(rid, "calmed");
    });
    var aim = $("btn-aim");
    if (aim) aim.addEventListener("click", function () {
      tick();
      var res = LD.aimDeal(state, aim.getAttribute("data-deal"), aim.getAttribute("data-region"));
      if (!res.ok) { flash(res.error); return; }
      state = res.state;
      persistRun();
      var id = aim.getAttribute("data-deal");
      clearSel();
      renderDesk();
      selectDealPin(id);
    });
  }

  function boardPoint(regionId) {
    var sd = document.querySelector("#screen-desk .desk.sd");
    if (sd) { var rg = LD.SEAT.regions[regionId], f0 = LD.seatFrame(window.innerWidth, window.innerHeight); if (!rg) return null; var q = LD.seatToScreen(f0, rg[0], rg[1]); return { x: q[0], y: q[1] }; }
    var board = document.querySelector(".desk .board");
    var a = document.querySelector('.desk .anc[data-anc="' + regionId + '"]');
    if (!board || !a) return null;
    var b = board.getBoundingClientRect();
    var r = a.getBoundingClientRect();
    return { x: r.left + r.width / 2 - b.left, y: r.top + r.height / 2 - b.top };
  }

  var floatStack = {};
  function floatAt(regionId, text, cls, delay) {
    var fx = $("fx");
    var p = boardPoint(regionId);
    if (!fx || !p) return;
    var now = Date.now();
    var st = floatStack[regionId];
    if (!st || now - st.t > 1600) st = floatStack[regionId] = { n: 0, t: now };
    var k = st.n++;
    st.t = now;
    placeFloat(fx, p.x, p.y + k * 34, text, cls, delay);
  }
  function floatCenter(text, cls, delay, dy) {
    var fx = $("fx");
    if (document.querySelector("#screen-desk .desk.sd")) { if (!fx) return; var c0 = LD.seatToScreen(LD.seatFrame(window.innerWidth, window.innerHeight), 380, 600); placeFloat(fx, c0[0], c0[1] + (dy || 0), text, cls, delay); return; }
    var slab = document.querySelector(".desk .board-slab");
    var board = document.querySelector(".desk .board");
    if (!fx || !slab || !board) return;
    var b = board.getBoundingClientRect(), r = slab.getBoundingClientRect();
    placeFloat(fx, r.left - b.left + r.width / 2, r.top - b.top + r.height * 0.18 + (dy || 0), text, cls, delay);
  }
  /* Seated quarter close: the beats file into a short ledger under the HUD instead of piling up on the map. */
  function seatLedger(fx, text, cls, delay) {
    var lg = fx.querySelector(".sd-ledger");
    if (!lg) { lg = document.createElement("div"); lg.className = "sd-ledger"; var hud = document.querySelector("#screen-desk .desk.sd .sd-hud"); var sk = document.getElementById("btn-skip-react"), top0 = Math.max(hud ? hud.getBoundingClientRect().bottom : 110, sk ? sk.getBoundingClientRect().bottom : 0); lg.style.top = Math.round(top0 + 10) + "px"; fx.appendChild(lg); }
    var n = document.createElement("div");
    n.className = "sd-lrow " + (cls || "");
    n.textContent = text;
    setTimeout(function () {
      lg.appendChild(n);
      var rows = lg.querySelectorAll(".sd-lrow:not(.out)"), cap = window.innerHeight < 700 ? 3 : 4;
      for (var i = 0; i < rows.length - cap; i++) { (function (o) { o.classList.add("out"); setTimeout(function () { if (o.parentNode) o.parentNode.removeChild(o); }, 260); })(rows[i]); }
      setTimeout(function () { n.classList.add("out"); setTimeout(function () { if (n.parentNode) n.parentNode.removeChild(n); }, 260); }, 3200);
    }, delay || 0);
  }
  function placeFloat(fx, x, y, text, cls, delay) {
    if (closing && document.querySelector("#screen-desk .desk.sd")) { seatLedger(fx, text, cls, delay); return; }
    var n = document.createElement("div");
    n.className = "float " + (cls || "");
    n.textContent = text;
    n.style.left = x + "px";
    n.style.top = y + "px";
    if (delay) n.style.animationDelay = delay + "ms";
    fx.appendChild(n);
    setTimeout(function () { if (n.parentNode) n.parentNode.removeChild(n); }, 2600 + (delay || 0));
  }

  function popRegion(regionId, cls, delay) {
    var g = document.querySelector('.desk .region[data-region="' + regionId + '"]');
    if (!g) return;
    setTimeout(function () {
      g.classList.add(cls);
      var p = boardPoint(regionId);
      var fx = $("fx");
      if (p && fx) {
        var ring = document.createElement("div");
        ring.className = "burst " + cls;
        ring.style.left = p.x + "px";
        ring.style.top = p.y + "px";
        fx.appendChild(ring);
        setTimeout(function () { if (ring.parentNode) ring.parentNode.removeChild(ring); }, 1400);
      }
    }, delay || 0);
  }

  function applyDeal(id, choice) {
    var prev = state;
    var res = LD.selectDeal(state, id, choice);
    if (!res.ok) { if (state.fy && state.fy.fight) { openFight(); return; } if (state.fy && state.fy.reward) { openReward(); return; } if (state.fy && state.fy.memo) { openMemo(); return; } flash(res.error); return; }
    state = res.state;
    clearSel();
    persistRun();
    renderDesk(prev);
    if (LD.O4) LD.O4.on("deal", state);
    SFX.play("pick");
    pennyEmit("signed");
    var dcash = state.cash - prev.cash, dun = state.unrest - prev.unrest, dco = state.collapse - prev.collapse;
    if (dcash >= 15) officeReact("glee"); else if (dun >= 8 || dco >= 5) officeReact("shock");
    if (state.fy && state.fy.fight) { DF.start = prev; setTimeout(function () { if (screen === "desk" && state && state.fy && state.fy.fight && !doorOpen() && !FI.on) { setTimeout(function () { if (screen === "desk" && state && state.fy && state.fy.fight) startFight(); }, reduced() ? 120 : 200); } }, reduced() ? 200 : 450); }
    else setTimeout(function () { maybeAutoHouse(); }, reduced() ? 80 : 400);
    var rid = res.region ? res.region.regionId : (prev.world && prev.world.pins[id]);
    if (rid) {
      var dc = state.cash - prev.cash;
      if (dc) floatAt(rid, (dc > 0 ? "+" : "−") + LD.formatMoney(Math.abs(dc)), dc > 0 ? "cash" : "cost");
      if (res.region && res.region.claim) {
        popRegion(rid, "claimed", 150);
        floatAt(rid, "Claimed!", "own", 350);
      } else if (res.region && res.region.stress > 0) {
        floatAt(rid, "Stress +" + res.region.stress, "bad", 350);
      } else if (res.region && res.region.stress < 0) {
        floatAt(rid, "Calmer", "good", 350);
      }
      var du = state.unrest - prev.unrest;
      if (du) floatAt(rid, "Unrest " + (du > 0 ? "+" : "−") + Math.abs(du), du > 0 ? "bad" : "good", 650);
    }
  }

  /* ---------- Bunker: zoomed, tappable cutaway ---------- */
  var bk = { focus: null, mode: "install", justBuilt: null };

  function bunkerUi(extra) {
    var u = { focus: bk.focus, mode: state.converting ? "install" : bk.mode, justBuilt: bk.justBuilt };
    if (extra) Object.keys(extra).forEach(function (k) { u[k] = extra[k]; });
    return u;
  }

  function openBunker(focus) {
    if (LD.isHouse && LD.isHouse(state)) { openHouse({ peek: true }); return; }
    bk.focus = focus || null;
    bk.justBuilt = null;
    if (state.converting) bk.mode = "install";
    var card = $("bunker-card");
    var from = card ? card.getBoundingClientRect() : null;
    var ov = $("overlay");
    ov.hidden = false;
    ov.className = "overlay on bunker-mode";
    ov.innerHTML = LD.renderBunkerView(state, bunkerUi());
    ov.onclick = function (e) { if (e.target === ov) { tick(); closeBunker(); } };
    bindBunkerView();
    zoomFrom(ov.querySelector(".bk-view"), from);
    pennyEmit("bunker-open");
  }

  function zoomFrom(view, from) {
    if (!view || !from) return;
    var to = view.getBoundingClientRect();
    if (!to.width) return;
    var sx = from.width / to.width, sy = from.height / to.height;
    var dx = from.left - to.left, dy = from.top - to.top;
    view.style.transformOrigin = "0 0";
    view.style.transition = "none";
    view.style.transform = "translate(" + dx + "px," + dy + "px) scale(" + sx + "," + sy + ")";
    view.style.opacity = "0.4";
    void view.offsetWidth;
    view.style.transition = "transform 0.42s cubic-bezier(.2,.9,.25,1), opacity 0.3s";
    view.style.transform = "none";
    view.style.opacity = "1";
  }

  function closeBunker(after) {
    var ov = $("overlay");
    var view = ov.querySelector(".bk-view");
    var card = $("bunker-card");
    if (!view || !card) { hideOverlay(); if (after) after(); return; }
    var to = card.getBoundingClientRect();
    var fr = view.getBoundingClientRect();
    view.style.transformOrigin = "0 0";
    view.style.transition = "transform 0.35s cubic-bezier(.5,0,.8,.4), opacity 0.35s";
    view.style.transform = "translate(" + (to.left - fr.left) + "px," + (to.top - fr.top) + "px) scale(" + (to.width / fr.width) + "," + (to.height / fr.height) + ")";
    view.style.opacity = "0.2";
    ov.classList.add("closing");
    setTimeout(function () { hideOverlay(); if (after) after(); }, 360);
  }

  function refreshBunkerPanel() {
    var ov = $("overlay");
    var stage = ov.querySelector(".bk-stage");
    var panel = $("bk-panel");
    if (!stage || !panel) return;
    Array.prototype.forEach.call(stage.querySelectorAll("[data-room],[data-spot]"), function (n) {
      var key = n.getAttribute("data-room") || n.getAttribute("data-spot");
      n.classList.toggle("sel", key === bk.focus);
    });
    ov.querySelector(".bk-view").classList.toggle("convert-mode", bk.mode === "convert" && !state.converting);
    panel.innerHTML = LD.renderBunkerPanel(state, bk.focus, state.converting ? "install" : bk.mode);
    panel.classList.remove("pop");
    void panel.offsetWidth;
    panel.classList.add("pop");
    bindBunkerPanel();
  }


  /* ---------- Phase 2 house view (1978 Mara chair-turn) ---------- */
  var HV = { open: false, facing: false, turning: false, dir: "to", auto: false, leaveId: null, card: null, promiseId: null, raf: 0, t0: 0, clipGen: 0, vid: null, clipPlayed: 0, clipFell: 0 };

  function houseCardKind() {
    if (!state || !(LD.isHouse && LD.isHouse(state)) || state.ended) return null;
    if (state.phase !== "bunker") return null;
    if (!state.bunkerActedThisTurn && LD.houseDuePromise && LD.houseDuePromise(state)) return "word";
    if (!state.bunkerActedThisTurn && LD.houseArrival && LD.houseArrival(state)) return "arrival";
    return null;
  }
  function houseCanEndQ() {
    return !!(state && !state.ended && state.phase === "bunker" && !(LD.fyBusy && LD.fyBusy(state)));
  }
  function preloadHousePlates() {
    var srcs = state && LD.housePlates ? LD.housePlates(state) : (LD.HOUSE_FRAMES || []).map(function (f) { return f.src; });
    var t = state && LD.maraTurn ? LD.maraTurn(state) : null;
    if (t && t.fg) srcs = srcs.concat([t.fg]);
    srcs.forEach(function (src, i) { if (srcs.indexOf(src) === i) { var img = new Image(); img.src = src; } });
    turnClipPreload();
  }
  /* Mara's era turn clips (LD.maraTurn): fetched into memory when the desk renders, so a turn never waits on the network.
     A clip plays only once fully loaded; missing, failed, slow to start, skipped or reduced motion = the plate crossfade.
     MP4 (H.264) where it plays (Safari/iOS, Chrome, Android), else the VP9 WebM. */
  var TC = {};
  function tcType() {
    if (TC.type !== undefined) return TC.type;
    var v = document.createElement("video"), t = null;
    try {
      if (v.canPlayType && v.canPlayType('video/mp4; codecs="avc1.640028"')) t = "mp4";
      else if (v.canPlayType && v.canPlayType('video/webm; codecs="vp9"')) t = "webm";
    } catch (e) {}
    if (!window.fetch || !(window.URL && URL.createObjectURL)) t = null;
    TC.type = t;
    return t;
  }
  function turnClipPreload() {
    var t = state && LD.maraTurn ? LD.maraTurn(state) : null;
    if (!t || !t.clip || reduced() || !tcType() || TC["c:" + t.clip]) return;
    var rec = TC["c:" + t.clip] = { url: null, bad: false };
    fetch(LD.MARA_TURN_DIR + t.clip + "." + tcType()).then(function (r) { return r.ok ? r.blob() : null; })
      .then(function (b) { if (b && b.size) rec.url = URL.createObjectURL(b); else rec.bad = true; })
      .catch(function () { rec.bad = true; });
  }
  function turnClipUrl() {
    var t = state && LD.maraTurn ? LD.maraTurn(state) : null, r = t && t.clip ? TC["c:" + t.clip] : null;
    return r && r.url && !r.bad && !reduced() ? r.url : null;
  }
  function setTurnOverlays(show) {
    var screen = document.querySelector("#house-root .hv-screen");
    var band = document.querySelectorAll("#house-root .hv-band, #house-root .hv-goal, #house-root .hv-fg");
    if (screen) { screen.style.opacity = String(show); screen.style.filter = "brightness(" + (0.45 + 0.55 * show) + ")"; }
    for (var b2 = 0; b2 < band.length; b2++) band[b2].style.opacity = String(show);
  }
  /* the clip over the start plate: shown once it has put up a frame (its first frame is the start plate), then it fades out over the
     end plate while the feed / era layer, band and goal fade in */
  function playTurnClip(url) {
    var plates = document.querySelector("#house-root .hv-rig .hv-plates");
    if (!plates) return false;
    var gen = ++HV.clipGen, v = document.createElement("video"), started = false, landed = false, tStart = 0, tAll = 0;
    v.className = "hv-vid"; v.muted = true; v.defaultMuted = true; v.playsInline = true; v.setAttribute("playsinline", ""); v.setAttribute("muted", "");
    v.preload = "auto"; v.disablePictureInPicture = true; v.setAttribute("aria-hidden", "true");
    plates.parentNode.insertBefore(v, plates.nextSibling);
    HV.vid = v;
    setTurnOverlays(0);
    function live() { return gen === HV.clipGen && HV.turning && HV.dir === "to"; }
    function drop() { if (v.parentNode) v.parentNode.removeChild(v); if (HV.vid === v) HV.vid = null; }
    function fallback() {
      if (!live() || started) return;
      clearTimeout(tStart); clearTimeout(tAll); HV.clipGen++; drop(); HV.clipFell++;
      plateTurn();
    }
    function shown() { if (!live() || started) return; started = true; clearTimeout(tStart); v.classList.add("is-on"); HV.clipPlayed++; }
    function land() {
      if (!live() || landed) return;
      if (!started) { fallback(); return; }
      landed = true; clearTimeout(tAll);
      setPlateOpacities(1); setTurnOverlays(0);
      v.classList.add("is-out");
      var t0 = performance.now();
      function fade(now) {
        if (!live()) return;
        var u = Math.min(1, (now - t0) / 240);
        setTurnOverlays(u);
        if (u >= 1) { drop(); finishHouseTurn(); } else HV.raf = requestAnimationFrame(fade);
      }
      HV.raf = requestAnimationFrame(fade);
    }
    if (v.requestVideoFrameCallback) { var wait = function (now, md) { if (md && md.mediaTime > 0.01 && v.readyState >= 2) shown(); else if (live()) v.requestVideoFrameCallback(wait); }; v.requestVideoFrameCallback(wait); }
    else v.addEventListener("playing", function () { setTimeout(shown, 40); });
    v.addEventListener("ended", land);
    v.addEventListener("error", function () { if (started) land(); else fallback(); });
    v.addEventListener("loadedmetadata", function () { clearTimeout(tAll); tAll = setTimeout(land, ((v.duration || 2) * 1000) / (LD.TURN_CLIP_RATE || 1) + 1500); });
    tStart = setTimeout(fallback, LD.TURN_CLIP_START_MS || 900);
    v.src = url;
    if (LD.TURN_CLIP_RATE) { try { v.defaultPlaybackRate = v.playbackRate = LD.TURN_CLIP_RATE; } catch (e) {} } /* test hook */
    var pr = v.play(); if (pr && pr.catch) pr.catch(function () { if (started) land(); else fallback(); });
    return true;
  }
  /* The plate is 720x1280 portrait. Phones show the whole width bar a sliver of left bezel (Mara's head stays in), with the top blended into
     the backdrop when the screen is taller than the plate. Landscape shows the full chair base and trims only the ceiling.
     On shorter portrait (a tablet with browser chrome, ~800x1130) a width-fit would slide the board / island chips / Now panel under the
     cash bar and the goal ribbon; sizeHouseRig then shifts (and only if needed, scales) so a keep-region of plate px stays in the safe
     band below the HUD and goal. The clip lives in the same .hv-rig, so it lands on the same framing. */
  function houseIsLandscape() { return window.innerWidth >= window.innerHeight * 1.2; }
  /* plate-px [top, bottom] that must stay clear of the HUD, the goal ribbon and the dock */
  function housePlateKeep() {
    var root = document.querySelector("#house-root .hv-root");
    if (root && root.classList.contains("is-now-panel")) return [220, 660]; /* wall panel (74,226)–(527,650) */
    if (root && root.classList.contains("is-era-full") && root.classList.contains("is-era-2")) return [330, 860]; /* island chips + pips */
    if (root && root.classList.contains("is-era-full")) return [288, 640]; /* 1978 board panels and their pips */
    return [318, 642]; /* shared CRT glass */
  }
  function sizeHouseRig() {
    var clip = document.querySelector("#house-root .hv-clip");
    var rig = document.querySelector("#house-root .hv-rig");
    if (!clip || !rig) return;
    var r = clip.getBoundingClientRect();
    var w = r.width, h = r.height, s, tx, ty, land = houseIsLandscape();
    if (land) {
      s = h / 1090; tx = (w - 720 * s) / 2; ty = -190 * s;
      if (document.querySelector("#house-root .hv-root.is-era-full")) ty = -110 * s;
    } else {
      s = Math.min(w / 658, Math.max(w / 720, h / 1280));
      tx = Math.max(w - 720 * s, Math.min(0, w - 713 * s));
      ty = h - 1280 * s;
    }
    var keep = housePlateKeep();
    /* portrait: goal sits at 116px, ~28px tall; tablet HUD is 100px, phone 112px. Landscape: the seated HUD still spans the plate, goal is at the bottom. */
    var safeTop = land ? 112 : 156, safeBot = land ? h - 50 : h - 72;
    if (keep[0] * s + ty < safeTop) ty = safeTop - keep[0] * s;
    if (keep[1] * s + ty > safeBot) {
      var need = keep[1] * s + ty - safeBot;
      var slack = keep[0] * s + ty - safeTop;
      if (need <= slack) ty -= need;
      else {
        s = (safeBot - safeTop) / (keep[1] - keep[0]);
        if (land) tx = (w - 720 * s) / 2;
        else tx = Math.max(w - 720 * s, Math.min(0, w - 713 * s));
        ty = safeTop - keep[0] * s;
      }
    }
    rig.style.transform = "translate(" + tx + "px," + ty + "px) scale(" + s + ")";
  }
  function houseModeNow() {
    if (HV.turning) return HV.dir === "back" ? "back" : "turning";
    return HV.facing ? "after" : "before";
  }
  function paintHouse(mode) {
    var root = $("house-root");
    if (!root || !state) return;
    Array.prototype.forEach.call(document.querySelectorAll(".boss-banner"), function (b) { if (b.parentNode) b.parentNode.removeChild(b); });
    HV.card = houseCardKind();
    var ckey = HV.card ? HV.card + ":" + state.turn + ":" + ((HV.card === "arrival" ? (LD.houseArrival(state) || {}).id : (LD.houseDuePromise(state) || {}).id) || "") : null;
    if (ckey !== HV.cardKey) { HV.cardKey = ckey; HV.cardOpen = false; }
    var land = houseIsLandscape();
    root.hidden = false;
    root.classList.add("is-open");
    root.innerHTML = LD.renderHouseStage(state, {
      mode: mode || houseModeNow(),
      auto: HV.auto,
      card: (HV.facing && !HV.turning) ? HV.card : null,
      leaveId: (HV.facing && !HV.turning) ? HV.leaveId : null,
      promiseId: HV.promiseId,
      canEnd: houseCanEndQ(),
      seated: !!(LD.seatedOn && LD.seatedOn(state)),
      eraSlot: HV.eraSlot || null,
      cardOpen: !!HV.cardOpen,
      info: !!HV.info,
      feed: HV.feed || null,
      land: land
    });
    var stage = root.querySelector(".hv-root");
    if (stage && land) stage.classList.add("is-landscape");
    if (stage && LD.seatedOn && LD.seatedOn(state)) stage.classList.add("is-seated");
    sizeHouseRig();
    bindHouseChrome();
    housePulsePlace();
  }
  /* One-time "Tap a screen" pulse per act (replaces Penny's era popup, which sat over the card it pointed at). */
  function housePulseKey() { return state && LD.eraAct ? "pulse" + LD.eraAct(state) : null; }
  function housePulseArm() {
    var k = housePulseKey(), m = pennyMeta();
    if (!k || m.penny.tipsOff || m.penny.tips[k] || PN.mode === "tour") return;
    HV.pulse = k;
    housePulsePlace();
  }
  function housePulseDone() {
    if (!HV.pulse) return;
    var k = HV.pulse;
    HV.pulse = null;
    pennySave(function (p) { p.tips = p.tips || {}; p.tips[k] = true; });
    Array.prototype.forEach.call(document.querySelectorAll("#house-root .hv-tapme"), function (n) { n.parentNode.removeChild(n); });
    Array.prototype.forEach.call(document.querySelectorAll("#house-root .is-pulse"), function (n) { n.classList.remove("is-pulse"); });
  }
  function housePulsePlace() {
    Array.prototype.forEach.call(document.querySelectorAll("#house-root .hv-tapme"), function (n) { n.parentNode.removeChild(n); });
    if (!HV.pulse || !HV.facing || HV.turning) return;
    var root = document.querySelector("#house-root .hv-root");
    if (!root || root.classList.contains("has-card") || root.classList.contains("has-sheet")) return;
    var t = root.querySelector(".hv-eslot.is-sel") || root.querySelector('.hv-cell[data-feed="' + (LD.housePickFeed ? LD.housePickFeed(state, HV.feed) : "power") + '"]') || root.querySelector(".hv-cell");
    if (!t) return;
    t.classList.add("is-pulse");
    var r = t.getBoundingClientRect(), R = root.getBoundingClientRect();
    var tag = document.createElement("span");
    tag.className = "hv-tapme";
    tag.setAttribute("aria-hidden", "true");
    tag.innerHTML = '<i></i>' + (LD.eraShows && LD.eraShows(state) ? "Tap a screen" : "Tap a feed");
    tag.style.left = Math.round(Math.max(R.left + 76, Math.min(R.right - 76, r.left + r.width / 2)) - R.left) + "px";
    tag.style.top = Math.round(r.bottom - R.top + 18) + "px";
    root.appendChild(tag);
  }
  function setPlateOpacities(t) {
    /* t 0 = before, 1 = after. Six plates at one camera distance, crossfaded in order; no blur needed to hide a jump. */
    var frames = document.querySelectorAll("#house-root .hv-plate");
    var n = frames.length;
    if (!n) return;
    var group = document.querySelector("#house-root .hv-plates");
    var i, op;
    if (t <= 0) { for (i = 0; i < n; i++) frames[i].style.opacity = i === 0 ? "1" : "0"; if (group) { group.style.filter = ""; group.style.transform = ""; } return; }
    if (t >= 1) { for (i = 0; i < n; i++) frames[i].style.opacity = i === n - 1 ? "1" : "0"; if (group) { group.style.filter = ""; group.style.transform = ""; } return; }
    /* stops: frame index and the t at which it is fully shown (LD.HOUSE_FRAMES[].at) */
    var stops = LD.HOUSE_FRAMES.map(function (f, ix) { return [ix, f.at]; });
    var a = 0;
    for (var k = 0; k < stops.length - 1; k++) if (t >= stops[k][1]) a = k;
    var lo = stops[a], hi = stops[a + 1];
    var u = Math.max(0, Math.min(1, (t - lo[1]) / (hi[1] - lo[1])));
    u = u * u * (3 - 2 * u);
    for (i = 0; i < n; i++) frames[i].style.opacity = "0";
    if (lo[0] === hi[0]) frames[lo[0]].style.opacity = "1";
    else { frames[lo[0]].style.opacity = String(1 - u); frames[hi[0]].style.opacity = String(u); }
    if (group) { group.style.filter = ""; group.style.transform = ""; }
    setTurnOverlays(t >= 0.7 ? Math.min(1, (t - 0.7) / 0.22) : 0);
  }
  function stopHouseAnim() {
    if (HV.raf) { cancelAnimationFrame(HV.raf); HV.raf = 0; }
    if (HV.vid) { HV.clipGen++; var v = HV.vid; HV.vid = null; try { v.pause(); } catch (e) {} if (v.parentNode) v.parentNode.removeChild(v); }
  }
  function finishHouseTurn() {
    stopHouseAnim();
    HV.turning = false;
    if (HV.dir === "to") {
      HV.facing = true;
      setPlateOpacities(1);
      paintHouse("after");
      if (state && state.house && state.house.era && LD.eraAct) setTimeout(function () { if (HV.facing && !HV.turning) housePulseArm(); }, 400);
    } else {
      HV.facing = false;
      HV.open = false;
      HV.auto = false;
      HV.leaveId = null;
      var root = $("house-root");
      if (root) { root.innerHTML = ""; root.hidden = true; root.classList.remove("is-open"); }
      attachHousePeek();
      if (seatedNow() && SD.t > 0) seatPull("in");
    }
  }
  function runHouseTurn(dir) {
    HV.dir = dir || "to";
    HV.turning = true;
    HV.open = true;
    stopHouseAnim();
    if (reduced()) { setPlateOpacities(HV.dir === "to" ? 1 : 0); finishHouseTurn(); return; }
    paintHouse(HV.dir === "back" ? "back" : "turning");
    setPlateOpacities(HV.dir === "to" ? 0 : 1);
    if (HV.dir === "to") { var url = turnClipUrl(); if (url && playTurnClip(url)) return; }
    plateTurn();
  }
  function plateTurn() {
    HV.t0 = performance.now();
    var dur = LD.HOUSE_TURN_MS || 1000;
    function step(now) {
      var t = Math.min(1, (now - HV.t0) / dur);
      setPlateOpacities(HV.dir === "to" ? t : 1 - t);
      if (t >= 1) finishHouseTurn();
      else HV.raf = requestAnimationFrame(step);
    }
    HV.raf = requestAnimationFrame(step);
  }
  function openHouse(opts) {
    opts = opts || {};
    if (!state || !(LD.isHouse && LD.isHouse(state))) return;
    if (document.body.classList.contains("in-fight") || (typeof doorOpen === "function" && doorOpen())) return;
    if (HV.facing && !HV.turning) { paintHouse("after"); return; }
    if (HV.turning) return;
    preloadHousePlates();
    Array.prototype.forEach.call(document.querySelectorAll(".boss-banner"), function (b) { if (b.parentNode) b.parentNode.removeChild(b); });
    HV.open = true;
    HV.auto = !!opts.auto;
    HV.leaveId = null;
    HV.promiseId = null;
    function go() { paintHouse("before"); setPlateOpacities(0); runHouseTurn("to"); }
    if (seatedNow() && SD.t < 1) { HV.turning = true; HV.dir = "to"; seatSetFan(false); seatPull("out", function () { HV.turning = false; go(); }); return; }
    go();
  }
  function closeHouse() {
    if (!HV.open && !HV.facing) return;
    if (HV.turning && HV.dir === "back") return;
    if (!HV.facing && !HV.turning) { finishHouseTurn(); return; }
    HV.leaveId = null;
    runHouseTurn("back");
  }
  function skipHouseTurn() {
    if (!HV.turning) return;
    setPlateOpacities(HV.dir === "to" ? 1 : 0);
    finishHouseTurn();
  }
  function refreshHouseChrome() {
    if (HV.facing && !HV.turning) paintHouse("after");
  }
  function maybeAutoHouse() {
    if (!state || !(LD.isHouse && LD.isHouse(state)) || state.ended) return;
    if (HV.facing || HV.turning || HV.open) return;
    if (document.body.classList.contains("in-fight") || (typeof doorOpen === "function" && doorOpen())) return;
    var ov = $("overlay");
    if (ov && ov.classList.contains("on")) return;
    if (!(LD.houseCanAutoTurn && LD.houseCanAutoTurn(state))) return;
    openHouse({ auto: true });
  }
  function attachHousePeek() {
    if (state && LD.isHouse && LD.isHouse(state)) turnClipPreload();
    if (seatedNow()) { var sb = $("house-peek"); if (sb) sb.hidden = !(LD.houseCanPeek && LD.houseCanPeek(state)) || HV.open || HV.facing || HV.turning; return; }
    Array.prototype.forEach.call(document.querySelectorAll("#house-peek"), function (n) { if (n.parentNode) n.parentNode.removeChild(n); });
    if (!state || !(LD.isHouse && LD.isHouse(state)) || HV.open || HV.facing || HV.turning) return;
    if (!(LD.houseCanPeek && LD.houseCanPeek(state))) return;
    var host = document.querySelector(".dash-meters.office") || document.querySelector(".of-room") || document.querySelector("#screen-desk .desk") || $("screen-desk");
    if (!host) return;
    if (window.getComputedStyle(host).position === "static") host.style.position = "relative";
    var b = document.createElement("button");
    b.type = "button";
    b.className = "house-peek";
    b.id = "house-peek";
    b.setAttribute("aria-label", "Look back at the house");
    b.textContent = "Look back";
    b.addEventListener("click", function (e) { e.stopPropagation(); tick(); openHouse({ peek: true }); });
    host.appendChild(b);
  }
  function applyHouseVerb(res, okMsg) {
    if (!res || !res.ok) { if (res && res.error) flash(res.error); return; }
    state = res.state;
    persistRun();
    HV.leaveId = null;
    HV.promiseId = null;
    refreshHouseChrome();
    if (okMsg) flash(okMsg);
  }
  function selectedPromiseId() {
    var on = document.querySelector("#house-root input[name='hv-prom']:checked");
    return on && on.value ? on.value : null;
  }
  function bindHouseChrome() {
    var skip = $("hv-skip");
    if (skip) skip.addEventListener("click", function () { tick(); skipHouseTurn(); });
    var back = $("hv-back");
    if (back) back.addEventListener("click", function () { tick(); closeHouse(); });
    var endq = $("hv-endq");
    if (endq) endq.addEventListener("click", function () {
      tick();
      stopHouseAnim();
      HV.facing = false; HV.open = false; HV.turning = false; HV.auto = false;
      var hr = $("house-root");
      if (hr) { hr.innerHTML = ""; hr.hidden = true; hr.classList.remove("is-open"); }
      if (seatedNow() && SD.t > 0) seatPull("in");
      endQuarter();
    });
    var admit = $("hv-admit");
    if (admit) admit.addEventListener("click", function () {
      tick();
      var arr = LD.houseArrival(state);
      if (!arr) return;
      var verb = admit.getAttribute("data-verb");
      var fn = verb === "replace" ? LD.houseReplace : LD.houseAdmit;
      applyHouseVerb(fn(state, { id: arr.id, promiseId: selectedPromiseId() }));
    });
    var pay = $("hv-payoff");
    if (pay) pay.addEventListener("click", function () {
      tick();
      var arr = LD.houseArrival(state);
      if (!arr) return;
      applyHouseVerb(LD.housePayOff(state, { id: arr.id }));
    });
    var away = $("hv-turnaway");
    if (away) away.addEventListener("click", function () {
      tick();
      var arr = LD.houseArrival(state);
      if (!arr) return;
      applyHouseVerb(LD.houseTurnAway(state, { id: arr.id }));
    });
    var keep = $("hv-keep");
    if (keep) keep.addEventListener("click", function () { tick(); applyHouseVerb(LD.houseKeepPromise(state)); });
    var post = $("hv-postpone");
    if (post) post.addEventListener("click", function () { tick(); applyHouseVerb(LD.housePostponePromise(state)); });
    var brk = $("hv-break");
    if (brk) brk.addEventListener("click", function () { tick(); applyHouseVerb(LD.houseBreakPromise(state)); });
    Array.prototype.forEach.call(document.querySelectorAll("#house-root .hv-prom input"), function (inp) {
      inp.addEventListener("change", function () {
        HV.promiseId = selectedPromiseId();
        Array.prototype.forEach.call(document.querySelectorAll("#house-root .hv-prom"), function (lab) {
          lab.classList.toggle("on", !!(lab.querySelector("input") && lab.querySelector("input").checked));
        });
      });
    });
    Array.prototype.forEach.call(document.querySelectorAll("#house-root [data-leave]"), function (n) {
      n.addEventListener("click", function (e) {
        e.stopPropagation();
        tick();
        if (state.phase !== "bunker") { flash("Choose a deal first."); return; }
        if (state.bunkerActedThisTurn) { flash("Bunker action already taken this quarter."); return; }
        HV.leaveId = n.getAttribute("data-leave");
        refreshHouseChrome();
      });
    });
    var ok = $("hv-leave-ok");
    if (ok) ok.addEventListener("click", function () {
      tick();
      var id = HV.leaveId;
      applyHouseVerb(LD.houseAskToLeave(state, { id: id }));
    });
    var no = $("hv-leave-no");
    if (no) no.addEventListener("click", function () { tick(); HV.leaveId = null; refreshHouseChrome(); });
    Array.prototype.forEach.call(document.querySelectorAll("#house-root .hv-eslot[data-eslot]"), function (n) {
      n.addEventListener("click", function (e) {
        e.stopPropagation();
        tick();
        HV.eraSlot = n.getAttribute("data-eslot");
        refreshHouseChrome();
      });
    });
    Array.prototype.forEach.call(document.querySelectorAll("#house-root .hv-era-up[data-eslot]"), function (n) {
      n.addEventListener("click", function (e) {
        e.stopPropagation();
        tick();
        var k = n.getAttribute("data-eslot");
        HV.eraSlot = k;
        var why = n.getAttribute("data-why");
        if (why) { flash(why); return; }
        var r = LD.eraUpgrade(state, k);
        if (r && r.ok) pennyEmit("era-order");
        applyHouseVerb(r);
      });
    });
    var stage = $("hv-stage");
    if (stage) stage.addEventListener("click", function (e) {
      if (HV.turning) { tick(); skipHouseTurn(); }
    });
    if (stage) stage.addEventListener("pointerdown", function () { if (HV.pulse && HV.facing) housePulseDone(); }, true);
    var help = $("hv-help");
    if (help) help.addEventListener("click", function (e) { e.stopPropagation(); tick(); housePulseDone(); if (LD.eraAct) pennyTip("era" + LD.eraAct(state), true); });
    var knock = $("hv-knock");
    if (knock) knock.addEventListener("click", function (e) { e.stopPropagation(); tick(); HV.cardOpen = true; refreshHouseChrome(); });
    var cx = $("hv-card-x");
    if (cx) cx.addEventListener("click", function (e) { e.stopPropagation(); tick(); HV.cardOpen = false; refreshHouseChrome(); });
    var info = $("hv-info");
    if (info) info.addEventListener("click", function (e) { e.stopPropagation(); tick(); HV.info = !HV.info; refreshHouseChrome(); });
    Array.prototype.forEach.call(document.querySelectorAll("#house-root .hv-cell[data-feed]"), function (n) {
      n.addEventListener("click", function () { HV.feed = n.getAttribute("data-feed"); if (n.hasAttribute("data-pick")) { tick(); refreshHouseChrome(); } });
    });
  }
  window.addEventListener("resize", function () { if (HV.open || HV.facing) sizeHouseRig(); });
  LD.houseUi = {
    open: openHouse, close: closeHouse, skip: skipHouseTurn, refresh: refreshHouseChrome,
    facing: function () { return HV.facing; }, turning: function () { return HV.turning; },
    clip: function () {
      var t = state && LD.maraTurn ? LD.maraTurn(state) : null;
      return { key: t ? t.key : null, clip: t ? t.clip : null, type: tcType(), ready: !!turnClipUrl(), playing: !!(HV.vid && HV.vid.classList.contains("is-on")), played: HV.clipPlayed, fell: HV.clipFell };
    },
    seek: function (t) {
      stopHouseAnim();
      HV.open = true; HV.auto = true; HV.leaveId = null;
      t = Number(t);
      if (isNaN(t)) t = 0;
      t = Math.max(0, Math.min(1, t));
      if (t <= 0) { HV.facing = false; HV.turning = false; HV.dir = "to"; paintHouse("before"); setPlateOpacities(0); sizeHouseRig(); return; }
      if (t >= 1) { HV.facing = true; HV.turning = false; HV.dir = "to"; paintHouse("after"); setPlateOpacities(1); sizeHouseRig(); return; }
      HV.facing = false; HV.turning = true; HV.dir = "to";
      paintHouse("turning");
      setPlateOpacities(t);
      sizeHouseRig();
    }
  };


  function bindBunkerView() {
    var x = $("bs-close");
    if (x) x.addEventListener("click", function () { tick(); closeBunker(); });
    Array.prototype.forEach.call(document.querySelectorAll(".bk-view [data-room], .bk-view [data-spot]"), function (n) {
      n.addEventListener("click", function (e) {
        e.stopPropagation();
        tick();
        bk.focus = n.getAttribute("data-room") || n.getAttribute("data-spot");
        refreshBunkerPanel();
        if (n.getAttribute("data-room")) pennyEmit("room");
        if (bk.focus === "private" && !state.converting) pennyTip("private");
      });
    });
    bindBunkerPanel();
  }

  function afterBunker(prev, focus, msg) {
    var ot = !!(state.fy && state.fy.otNow);
    if (ot) { state.fy.otNow = false; msg += " · 🌙 Overtime Crew: order once more"; }
    persistRun();
    bk.justBuilt = focus;
    var ov = $("overlay");
    ov.innerHTML = LD.renderBunkerView(state, bunkerUi({ focus: focus }));
    bindBunkerView();
    var stage = ov.querySelector(".bk-stage");
    if (stage) {
      var t = document.createElement("div");
      t.className = "toast";
      t.textContent = msg;
      stage.appendChild(t);
    }
    renderDeskBehind(prev);
    pennyEmit("built");
    if (ot) { SFX.play("good"); return; }
    setTimeout(function () {
      if ($("overlay").classList.contains("bunker-mode")) closeBunker(function () { animateMeters(prev); var c = $("bunker-card"); if (c) c.classList.add("installed"); if (LD.O4) LD.O4.on("bunker", state); });
    }, 1700);
  }

  function renderDeskBehind(prev) {
    var el = $("screen-desk");
    el.innerHTML = LD.renderDesk(state, uiOpts());
    bindDesk();
    if (LD.O4) LD.O4.mount(state);
  }

  function bindBunkerPanel() {
    Array.prototype.forEach.call(document.querySelectorAll("#bk-panel [data-roster]"), function (b) {
      b.addEventListener("click", function (e) {
        e.stopPropagation(); tick();
        bk.focus = b.getAttribute("data-roster");
        refreshBunkerPanel();
        pennyEmit("room");
      });
    });
    Array.prototype.forEach.call(document.querySelectorAll("#bk-panel [data-up]"), function (b) {
      b.addEventListener("click", function () {
        tick();
        var prev = state;
        var id = b.getAttribute("data-up");
        var res = LD.buyUpgrade(state, id, b.getAttribute("data-q"));
        if (!res.ok) { flash(res.error); return; }
        state = res.state;
        afterBunker(prev, id, res.delayed ? "Paid · arrives Q" + res.due : "Installed ✓");
      });
    });
    Array.prototype.forEach.call(document.querySelectorAll("#bk-panel [data-convert]"), function (b) {
      b.addEventListener("click", function () {
        tick();
        var prev = state;
        var sys = b.getAttribute("data-convert") || "";
        var res = LD.beginConversion(state, sys || null, sys ? b.getAttribute("data-q") : null);
        if (!res.ok) { flash(res.error); return; }
        state = res.state;
        bk.mode = "install";
        afterBunker(prev, sys || "private", sys ? "Private supply ✓ room secured" : "Private supply ✓");
      });
    });
    var cs = $("bp-convert-secure");
    if (cs) cs.addEventListener("click", function () {
      tick();
      bk.mode = bk.mode === "convert" ? "install" : "convert";
      refreshBunkerPanel();
    });
    var hire = $("btn-engineer");
    if (hire) hire.addEventListener("click", function () {
      tick();
      var prev = state;
      var res = LD.hireEngineer(state);
      if (!res.ok) { flash(res.error); return; }
      state = res.state;
      afterBunker(prev, "engineer", "Engineer hired ✓");
    });
    var seal = $("btn-seal");
    if (seal) seal.addEventListener("click", function () { tick(); showEvacConfirm(); });
  }

  function showSealed() {
    SFX.play("seal");
    var ov = $("overlay");
    ov.hidden = false;
    ov.className = "overlay on bunker-mode";
    ov.onclick = null;
    ov.innerHTML = LD.renderBunkerView(state, { sealed: true });
    var x = $("bs-close");
    if (x) x.addEventListener("click", function () { tick(); hideOverlay(); showEnd(); });
    setTimeout(function () { if (screen === "desk") { hideOverlay(); showEnd(); } }, 2600);
  }

  /* ---------- Quarter close: the world reacts, one beat at a time, then the report ---------- */
  var closing = false;
  var seq = null;
  function endQuarter(opts) {
    opts = opts || {};
    if (closing) return;
    if (state.fy && state.fy.fight && !state.ended) { openFight(); return; }
    if (state.fy && state.fy.reward && !state.ended) { openReward(); return; }
    if (state.fy && state.fy.memo && !state.ended) { openMemo(); return; }
    if (state.phase !== "deal" && !opts.confirmed && LD.bossInfo && LD.bossInfo(state, state.turn) && !LD.bossInfo(state, state.turn).fight) { showBossConfirm(); return; }
    if (state.phase !== "deal") SFX.play("endq");
    if (state.phase === "deal") {
      var desk = document.querySelector(".desk");
      var btn = $("btn-endq");
      btn.classList.remove("shake");
      void btn.offsetWidth;
      btn.classList.add("shake");
      Array.prototype.forEach.call(desk.querySelectorAll(".pin"), function (p) { p.classList.add("coach"); });
      return;
    }
    var prev = state;
    var res = LD.closeQuarter(state, { bossChoice: opts.bossChoice });
    if (!res.ok) { flash(res.error); return; }
    closing = true;
    state = res.state;
    pennyEmit("endq");
    if (state.ended) recordEnding();
    else persistRun();
    var meta = loadMeta();
    if (!meta.coachDone) { meta.coachDone = true; saveMeta(meta); }
    var desk = document.querySelector(".desk");
    if (desk) desk.classList.add("closing");
    var fx = $("fx");
    if (!fx && desk) { fx = document.createElement("div"); fx.className = "fx"; fx.id = "fx"; desk.appendChild(fx); }
    var stamp = document.createElement("div");
    stamp.className = "stamp";
    stamp.innerHTML = "Q" + prev.turn + " <span>closed</span>";
    fx.appendChild(stamp);
    var step = reduced() ? 260 : 620;
    seq = { timers: [], done: false };
    function later(fn, ms) { seq.timers.push(setTimeout(fn, ms)); }
    function finish() {
      if (!seq || seq.done) return;
      seq.done = true;
      seq.timers.forEach(clearTimeout);
      var f = $("fx");
      if (f) f.innerHTML = "";
      closing = false;
      showReport(prev, res);
    }
    later(function () {
      clearSel();
      hidePins = true;
      renderDesk(prev);
      if (LD.O4) LD.O4.on("endq", state);
      var skip = document.createElement("button");
      skip.className = "skip-btn";
      skip.id = "btn-skip-react";
      skip.textContent = "Skip ▸";
      skip.addEventListener("click", function () { tick(); finish(); });
      var board = document.querySelector(isPhone() ? ".desk .board-tilt" : ".desk .board") || document.querySelector(".desk .board") || document.querySelector("#screen-desk .desk.sd");
      if (board) board.appendChild(skip);
      var beats = [];
      /* 1. Delayed effects land (from the rail). */
      (res.fired || []).forEach(function (f) {
        if (f.world) return;
        if (f.fy) {
          var ft = f.fy === "boss" ? (f.beaten ? "⚑ " + (LD.BOSSES[f.boss] || {}).name + " beaten!" : "⚑ " + (LD.BOSSES[f.boss] || {}).name + ": missed") : f.text.replace(/\.$/, "");
          beats.push(function (dy) { floatCenter(ft, f.fy === "boss" ? (f.beaten ? "good big boss" : "bad big boss") : f.fy === "liability" ? "bad" : "cash", 0, dy); });
          return;
        }
        var short = (f.source || "Delayed effect") + (f.item ? " arrives" : " lands");
        var m = /\(([^)]*)\)/.exec(f.text || "");
        beats.push(function (dy) { floatCenter(short + (m ? " · " + m[1] : ""), f.item ? "good" : "bad", 0, dy); });
      });
      /* 2. Regions react, one at a time, never overlapping. */
      (res.world || []).forEach(function (ev) {
        var label = ev.kind === "income" ? "+" + LD.formatMoney(ev.cash) : ev.kind === "strike" ? "Strike!" : ev.kind === "riot" ? "Riots +" + ev.unrest :
          ev.kind === "protest" ? "Protest +" + ev.unrest : ev.kind === "revolt" ? "Nationalised! Unrest +" + ev.unrest : ev.kind === "spread" ? "Crisis spreads" : ev.text;
        var cls = ev.kind === "income" ? "cash" : "bad";
        if (ev.regionId) beats.push(function () { floatAt(ev.regionId, label, cls); popRegion(ev.regionId, "ev-" + ev.kind, 0); });
        else beats.push(function (dy) { floatCenter(label, "bad", 0, dy); });
      });
      /* 3. Collapse drifts: the world visibly worsens. */
      if (res.tick) beats.push(function (dy) { floatCenter("Collapse +" + res.tick, "bad", 0, dy); var sl = document.querySelector(".desk .board-slab"); if (sl) sl.classList.add("worsen"); });
      beats.forEach(function (b, i) { later(function () { b((i % 3) * 38); }, 150 + i * step); });
      later(finish, Math.max(1100, 150 + beats.length * step + 700));
    }, reduced() ? 300 : 850);
  }

  function showReport(prev, res) {
    var body = LD.renderReport(prev, state, res.fired, res.tick);
    showOverlay("", body,
      '<button class="btn btn-coral" id="ov-ok">' + (state.ended ? "See how it ends" : "Open Q" + state.turn) + "</button>",
      function () {
        if (document.querySelector("#screen-desk .desk.sd")) $("overlay").classList.add("sd-ov");
        $("ov-ok").addEventListener("click", function () {
          tick();
          hideOverlay();
          hidePins = false;
          if (state.ended) showEnd();
          else { renderDesk(); pennyEmit("report-closed"); fyAfterOpen(); }
        });
        $("ov-ok").focus();
      });
    $("overlay").classList.add("report-mode");
    pennyEmit("report");
  }


  /* ---------- Fiscal Year: draft, Portfolio, bosses ---------- */
  var dr = { sel: null, replacing: false };
  function showFy(body, actions, bind, narrow) {
    showOverlay("", body, actions || "", bind);
    var ov = $("overlay");
    ov.classList.add("fy-mode");
    if (narrow) ov.classList.add("fy-narrow");
  }
  function fyAfterOpen() {
    if (!state || state.ended || !state.fy) return;
    if (LD.upgradeFY) { LD.upgradeFY(state); persistRun(); }
    codexMark(state.fy.hand.map(function (h) { return h.id; }).concat((state.fy.drawer || []).map(function (d) { return d.id; })), true);
    if (state.fy.fight) { startFight(); return; }
    if (state.fy.reward) { openReward(); return; }
    if (state.fy.memo) { openMemo(); return; }
    if (state.fy.actIntro) { showActIntro(); return; }
    if (LD.bossInfo(state, state.turn) && state.fy.bannerQ !== state.turn) { state.fy.bannerQ = state.turn; persistRun(); bossBanner(LD.bossInfo(state, state.turn)); }
    maybeAutoHouse();
  }
  function fyNext(ms) { setTimeout(function () { if (screen === "desk" && state && !state.ended && !$("overlay").classList.contains("on") && !doorOpen()) fyAfterOpen(); }, ms || 700); }
  function bossBanner(info) {
    var desk = document.querySelector(".desk");
    if (!desk) return;
    var b = document.createElement("div");
    b.className = "boss-banner b-" + info.id;
    b.setAttribute("role", "status");
    b.innerHTML = '<div class="bb-in"><span class="bb-ico" aria-hidden="true">' + LD.iconArt(info, "boss") + '</span><div><small>Boss quarter · Q' + info.q + (info.fight ? " · knocks when you sign" : "") + "</small><b>" + LD.escapeHtml(info.name) + "</b><em>" + LD.escapeHtml(info.demand) + "</em></div></div>";
    document.body.appendChild(b);
    SFX.play("boss");
    var sl = document.querySelector(".desk .board-slab"); if (sl) { sl.classList.remove("boss-shake"); void sl.offsetWidth; sl.classList.add("boss-shake"); }
    b.addEventListener("click", function () { if (b.parentNode) b.parentNode.removeChild(b); });
    setTimeout(function () { if (b.parentNode) b.parentNode.removeChild(b); }, reduced() ? 2600 : 3200);
  }
  function openMemo() {
    showFy(LD.renderMemo(state), LD.renderMemoButtons(state), function () {
      ["a", "b", "c"].forEach(function (k) {
        var btn = $("fy-m-" + k);
        if (btn) btn.addEventListener("click", function () {
          tick();
          var prev = state;
          var res = LD.fyMemo(state, k);
          if (!res.ok) { flash(res.error); return; }
          state = res.state; persistRun(); hideOverlay(); renderDesk(prev);
          floatCenter(res.memo.icon + " " + res.text, "good big");
          fyNext(900);
        });
      });
    }, true);
    $("overlay").classList.add("memo-mode");
    SFX.play("flip");
  }
  function paintDraft() {
    showFy(LD.renderDraft(state, dr), "", function () {
      Array.prototype.forEach.call(document.querySelectorAll("#overlay [data-asset]"), function (b) {
        b.addEventListener("click", function () { tick(); dr.sel = b.getAttribute("data-asset"); paintDraft(); var t = $("fy-take"); if (t) try { t.focus({ preventScroll: true }); } catch (e) {} });
      });
      bindExplain($("overlay"));
      var take = $("fy-take");
      if (take) take.addEventListener("click", function () {
        tick();
        if (!dr.sel) return;
        if (LD.fySlotsUsed(state) >= state.fy.cap) { dr.replacing = true; paintDraft(); return; }
        doPick(dr.sel, null);
      });
      Array.prototype.forEach.call(document.querySelectorAll("#overlay [data-replace]"), function (b) {
        b.addEventListener("click", function () { tick(); doPick(dr.sel, b.getAttribute("data-replace")); });
      });
      var back = $("fy-back");
      if (back) back.addEventListener("click", function () { tick(); dr.replacing = false; paintDraft(); });
      var skip = $("fy-skip");
      if (skip) skip.addEventListener("click", function () { tick(); doPick(null, null); });
      var rr = $("fy-reroll");
      if (rr) rr.addEventListener("click", function () {
        tick();
        var res = LD.fyReroll(state);
        if (!res.ok) { flash(res.error); return; }
        state = res.state; persistRun(); dr.sel = null; paintDraft();
      });
      var pf = $("fy-pf");
      if (pf) pf.addEventListener("click", function () { tick(); openPortfolio(true); });
    });
  }
  function doPick(id, replaceId) {
    var prev = state;
    var res = LD.fyPick(state, id, replaceId);
    if (!res.ok) { flash(res.error); return; }
    state = res.state;
    persistRun();
    hideOverlay();
    renderDesk(prev);
    if (res.skipped) floatCenter("Cash back +$" + state.fy.skipCash + "M", "cash");
    else {
      SFX.play("pick");
      codexMark([res.asset.id, res.rider && res.rider.id], true);
      floatCenter(res.asset.icon + " " + res.asset.name + " acquired", "good big");
      if (res.divested) floatCenter("Divested " + res.divested.name + " +$" + LD.FY.DIVEST_CASH + "M", "cash", 400, 40);
      if (res.rider) floatCenter("⚠ Rider: " + res.rider.name, "bad", 700, 80);
    }
    var chip = $("btn-portfolio");
    if (chip) { chip.classList.remove("pop"); void chip.offsetWidth; chip.classList.add("pop"); }
    fyNext(900);
  }
  function openPortfolio(fromDraft, sel) {
    showFy(LD.renderPortfolio(state, { sel: sel }), '<button class="btn btn-coral" id="fy-pf-close">' + (fromDraft ? "Back to the draft" : "Close") + "</button>", function () {
      $("fy-pf-close").addEventListener("click", function () { tick(); if (fromDraft) paintDraft(); else hideOverlay(); });
      Array.prototype.forEach.call(document.querySelectorAll("#overlay [data-bsel]"), function (b) {
        b.addEventListener("click", function (e) { e.stopPropagation(); tick(); openPortfolio(fromDraft, b.getAttribute("data-bsel")); });
      });
      Array.prototype.forEach.call(document.querySelectorAll("#overlay [data-use]"), function (b) {
        b.addEventListener("click", function (e) { e.stopPropagation(); useItem(b.getAttribute("data-use"), fromDraft); });
      });
      if (!fromDraft) $("overlay").onclick = function (e) { if (e.target === $("overlay")) { tick(); hideOverlay(); } };
    }, true);
  }
  function useItem(id, fromDraft) {
    var why = LD.itemBlock(state, id);
    if (why) { SFX.play("bad"); openPortfolio(fromDraft, id); var bd = document.querySelector("#overlay .bc-why"); if (bd) { bd.classList.remove("flash"); void bd.offsetWidth; bd.classList.add("flash"); } return; }
    var prev = state;
    var res = LD.fyUseItem(state, id);
    if (!res.ok) { flash(res.error); return; }
    state = res.state;
    persistRun();
    hideOverlay();
    if (id === "hotline") clearSel();
    renderDesk(prev);
    SFX.play("item");
    floatCenter(res.item.icon + " " + res.item.name, "good big");
    floatCenter(res.text, "cash", 350, 40);
    if (id === "doorman" || id === "security") officeReact("glee");
    if (fromDraft && state.fy.draft) setTimeout(paintDraft, 900);
  }
  /* ---------- Drop 1: the door, the reward, the deck ---------- */
  var DF = { logT: null, busy: false, start: null, arm: 0, say: null, cbHide: false };
  var RW = { sel: null, shredding: false, upgrading: false, replaceItem: false, replaceFor: null };
  function doorEl() { return $("door"); }
  function doorOpen() { var d = doorEl(); return !!(d && d.classList.contains("on")); }
  /* The door element now hosts two in-run layers, never a separate screen:
     df-mode = the fight bay, laid over the board / office area of the live desk (the header, side rail and dossier stay put);
     rw-mode = the Discover veil, a dim + blur over the whole run screen with three floating choices. */
  function showDoor(html, mode) {
    var d = doorEl(); d.hidden = false;
    var fb = mode === "df-mode", keep = d.classList.contains("lifting") && !fb ? " lifting" : "";
    var seat = fb && LD.seatedOn && LD.seatedOn(state);
    d.className = "door-screen on " + (mode || "") + (seat ? " sd-fight" : fb ? " fb-mode" : mode === "rw-mode" ? " disc-mode" + (LD.seatedOn && LD.seatedOn(state) ? " sd-rw" : "") : "") + keep;
    d.setAttribute("aria-label", fb ? "Fight" : mode === "rw-mode" ? "Pick a reward" : "At the door");
    d.setAttribute("aria-modal", fb ? "false" : "true");
    d.innerHTML = html;
    document.body.classList.toggle("in-fight", fb);
    if (seat) placeSeatFight(); else if (fb) placeBay();
  }
  function hideDoor() {
    var d = doorEl(); if (!d) return;
    var wasFight = d.classList.contains("fb-mode") || d.classList.contains("sd-fight");
    d.className = "door-screen"; d.hidden = true; d.innerHTML = ""; d.removeAttribute("style");
    document.body.classList.remove("in-fight");
    if (wasFight && LD.O4 && LD.O4.exitFight) LD.O4.exitFight();
  }
  /* The bay covers what the board, dash and End Quarter hold on the desk: below the header, left of the side rail, right of a
     side-by-side dossier (desktop). Measured from the live desk so every layout gets it right. */
  function placeBay() {
    var d = doorEl(); if (!d || !d.classList.contains("fb-mode")) return;
    var desk = document.querySelector("#screen-desk .desk"), vw = window.innerWidth, vh = window.innerHeight;
    var head = desk && desk.querySelector(".desk-head"), rail = desk && desk.querySelector(".side-rail"), dos = desk && desk.querySelector(".dossier"), board = desk && desk.querySelector(".board");
    var g = vw >= 700 ? 10 : 8, t = g, l = g, r = vw - g, b = vh - g;
    if (head) { var hb = head.getBoundingClientRect(); t = Math.max(t, hb.bottom + g); l = Math.max(g, hb.left); }
    if (rail) { var rb = rail.getBoundingClientRect(); if (rb.width && rb.left > vw / 2) r = Math.min(r, rb.left - (vw >= 700 ? 10 : 6)); }
    if (dos) { var db = dos.getBoundingClientRect(), bb = board ? board.getBoundingClientRect() : null; if (db.width && db.height > 120 && bb && db.right <= bb.left + 4) l = Math.max(l, db.right + g); }
    d.style.setProperty("--fb-l", Math.round(l) + "px"); d.style.setProperty("--fb-t", Math.round(t) + "px");
    d.style.setProperty("--fb-w", Math.max(200, Math.round(r - l)) + "px"); d.style.setProperty("--fb-h", Math.max(300, Math.round(b - t)) + "px");
  }
  window.addEventListener("resize", function () { placeBay(); setTimeout(placeBubble, 60); });
  /* the speech bubble hangs over the speaker's head, tail down at them; with no headroom it sits beside the head */
  function placeBubble() {
    var b = $("sc-bubble"), o = $("sc-opp"), st = document.querySelector("#door .fb-stage");
    if (!b || !o || !st) return;
    var sr = st.getBoundingClientRect(), r = o.getBoundingClientRect(); if (!r.width || !sr.width) return;
    var img = o.querySelector('img.p-' + (o.getAttribute("data-pose") || "idle")) || o.querySelector("img");
    var bw = b.offsetWidth, bh = b.offsetHeight, hx = r.left + r.width * 0.5 - sr.left, hy = r.top - sr.top + r.height * 0.03;
    var top = hy - bh - 14, side = top < 4;
    b.classList.toggle("side", side);
    if (!side) { var left = Math.max(6, Math.min(sr.width - bw - 6, hx - bw * 0.3)); b.style.left = left.toFixed(0) + "px"; b.style.top = top.toFixed(0) + "px"; b.style.setProperty("--tail", Math.max(12, Math.min(bw - 26, hx - left - 8)).toFixed(0) + "px"); }
    else { var lx = Math.min(sr.width - bw - 6, hx + r.width * 0.22); b.style.left = Math.max(6, lx).toFixed(0) + "px"; b.style.top = Math.max(6, hy + r.height * 0.02).toFixed(0) + "px"; b.style.setProperty("--tailY", "18px"); }
    void img;
  }
  /* visitor fights: hand the bay's room slot to office.js (the live office, its executive and the visitor in it) */
  function adoptScene(settle) {
    var slot = document.querySelector("#door .fb-room .o4-slot");
    if (!slot || !LD.O4 || !LD.O4.adopt) return false;
    var foe = $("sc-opp"), you = $("sc-you");
    return LD.O4.adopt(slot, state, { foe: foe, you: you, full: !!(foe && foe.classList.contains("full")), settle: !!settle });
  }
  function dfLog(t) {
    var root = document.querySelector(".door-in");
    if (root && root.classList.contains("is-done")) return;
    var el = $("df-log"); if (!el || !t) return;
    el.textContent = t; el.classList.add("on");
    clearTimeout(DF.logT); DF.logT = setTimeout(function () { var e2 = $("df-log"); if (e2) e2.classList.remove("on"); }, 2400);
  }
  function dfFloat(text, cls, sel, delay) {
    var fx = $("df-fx"), a = document.querySelector(sel || ".df-scrut"), root = document.querySelector(".door-in");
    if (!a && doorEl().classList.contains("sd-fight")) a = document.querySelector({ ".df-scrut": "#door .m-scrutiny", ".df-meters": "#door .sd-cash" }[sel || ".df-scrut"] || "#none");
    if (!fx || !a || !root) return;
    var r = a.getBoundingClientRect(), b = root.getBoundingClientRect();
    /* Scrutiny deltas float out below the panel's bar, never over its label or number. */
    if (!sel || sel === ".df-scrut") { placeFloat(fx, r.left - b.left + Math.min(r.width - 70, r.width * 0.72), r.bottom - b.top + 16, text, (cls || "") + " below", delay); scrutTick(); return; }
    placeFloat(fx, r.left - b.left + r.width / 2, r.top - b.top + r.height / 2, text, cls, delay);
  }
  function scrutTick() {
    var n = $("df-scrut-n"); if (!n) return;
    n.classList.remove("tick"); void n.offsetWidth; n.classList.add("tick");
  }
  /* ---------- Resource tooltips: tap any [data-tip] (meters, pills) to read it. Touch-first, no hover. ---------- */
  var TIP = { el: null, t: null, src: null };
  function hideTip() { clearTimeout(TIP.t); if (TIP.el && TIP.el.parentNode) TIP.el.parentNode.removeChild(TIP.el); TIP.el = null; TIP.src = null; }
  function showTip(src) {
    var text = src.getAttribute("data-tip"); if (!text) return;
    if (TIP.src === src) { hideTip(); return; }
    hideTip();
    var el = document.createElement("div");
    el.className = "rs-tip lvl-" + ((src.className.match(/lvl-(\w+)/) || [])[1] || "ok");
    el.setAttribute("role", "tooltip");
    el.textContent = text;
    document.body.appendChild(el);
    var r = src.getBoundingClientRect(), w = el.offsetWidth, h = el.offsetHeight;
    var x = Math.max(8, Math.min(window.innerWidth - w - 8, r.left + r.width / 2 - w / 2));
    var below = r.top < h + 24;
    var y = below ? r.bottom + 10 : r.top - h - 10;
    el.style.left = x + "px"; el.style.top = y + "px";
    el.style.setProperty("--ax", Math.max(14, Math.min(w - 14, r.left + r.width / 2 - x)) + "px");
    el.classList.add(below ? "below" : "above");
    TIP.el = el; TIP.src = src;
    TIP.t = setTimeout(hideTip, 4200);
  }
  document.addEventListener("click", function (e) {
    var src = e.target && e.target.closest && e.target.closest("[data-tip]");
    if (src && !(src.closest && src.closest("button:not([data-tip]), a"))) { e.preventDefault(); e.stopPropagation(); tick(); showTip(src); return; }
    if (TIP.el) hideTip();
  }, true);
  document.addEventListener("keydown", function (e) { if ((e.key === "Enter" || e.key === " ") && e.target && e.target.getAttribute && e.target.getAttribute("data-tip")) { e.preventDefault(); showTip(e.target); } });
  window.addEventListener("resize", hideTip);

  /* ---------- Fight scene animation: card flies, opponent reacts; their intent lunges back ---------- */
  var SC = { t: null };
  function scPose(pose, ms, extra) {
    var o = $("sc-opp"); if (!o) return;
    clearTimeout(SC.t);
    o.setAttribute("data-pose", pose);
    o.classList.remove("shake", "lunge", "brace"); void o.offsetWidth;
    if (extra) o.classList.add(extra);
    SC.t = setTimeout(function () { var o2 = $("sc-opp"); if (!o2) return; o2.setAttribute("data-pose", o2.getAttribute("data-base") || "idle"); o2.classList.remove("shake", "lunge", "brace"); }, ms || 420);
  }
  function scLayer() {
    var l = document.getElementById("sc-fxlayer");
    if (!l) { l = document.createElement("div"); l.id = "sc-fxlayer"; l.setAttribute("aria-hidden", "true"); document.body.appendChild(l); }
    return l;
  }
  function scBurst(text, cls, target, delay) {
    var t = typeof target === "string" ? document.querySelector(target) : target;
    if (!t || !doorOpen()) return;
    var r = t.getBoundingClientRect();
    var el = document.createElement("div");
    el.className = "sc-burst " + (cls || "");
    el.innerHTML = "<span>" + text + "</span>";
    el.style.left = (r.left + r.width * 0.5) + "px";
    el.style.top = (r.top + r.height * 0.3) + "px";
    if (delay) el.style.animationDelay = delay + "ms";
    scLayer().appendChild(el);
    setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, 650 + (delay || 0));
  }
  function scPlayAnim(cardHtml, rect, dS, dB) {
    var opp = $("sc-opp"), you = $("sc-you"), root = document.querySelector(".door-in"), fx = scLayer();
    var hitPose = dS > 0 ? "hit" : dB > 0 ? "block" : null;
    var react = function () {
      if (hitPose === "hit") { scPose("hit", 440, "shake"); scBurst("−" + dS + " Scrutiny!", "pow", opp); }
      else if (hitPose === "block") { scPose("block", 440, "brace"); scBurst("Block +" + dB, "shield", you || opp); }
    };
    if (LD.O4 && LD.O4.fightPose) LD.O4.fightPose(hitPose === "block" ? "watch" : "snap", 650);
    if (you) { you.classList.remove("flick"); void you.offsetWidth; you.classList.add("flick"); }
    var tc = $("sd-tcard");
    if (tc) {
      var land = function () { DF.landing = false; var t2 = $("sd-tcard"); if (t2) { t2.classList.remove("is-landing"); t2.classList.add("landed"); } };
      if (reduced() || !rect || !cardHtml || !fx) { land(); react(); return; }
      var tb = tc.getBoundingClientRect(), fl = document.createElement("div");
      fl.className = "sc-fly sd-fly"; fl.innerHTML = cardHtml.replace(/^<button/, "<div").replace(/<\/button>$/, "</div>");
      fl.style.left = rect.left + "px"; fl.style.top = rect.top + "px"; fl.style.width = rect.width + "px"; fl.style.height = rect.height + "px";
      fx.appendChild(fl);
      var ddx = (tb.left + tb.width / 2) - (rect.left + rect.width / 2), ddy = (tb.top + tb.height / 2) - (rect.top + rect.height / 2), k2 = tb.width / Math.max(1, rect.width);
      requestAnimationFrame(function () { requestAnimationFrame(function () { fl.classList.add("go"); fl.style.transform = "translate(" + ddx.toFixed(1) + "px," + ddy.toFixed(1) + "px) rotate(-5deg) scale(" + k2.toFixed(3) + ")"; }); });
      setTimeout(function () { if (fl.parentNode) fl.parentNode.removeChild(fl); land(); react(); }, 300);
      return;
    }
    if (reduced() || !rect || !cardHtml || !opp || !root || !fx) { react(); return; }
    var b = { left: 0, top: 0 }, tr = (hitPose === "block" && you ? you : opp).getBoundingClientRect();
    var fly = document.createElement("div");
    fly.className = "sc-fly";
    fly.innerHTML = cardHtml.replace(/^<button/, "<div").replace(/<\/button>$/, "</div>");
    fly.style.left = (rect.left - b.left) + "px"; fly.style.top = (rect.top - b.top) + "px";
    fly.style.width = rect.width + "px"; fly.style.height = rect.height + "px";
    fx.appendChild(fly);
    var dx = (tr.left + tr.width * 0.5) - (rect.left + rect.width * 0.5), dy = (tr.top + tr.height * (hitPose === "block" ? 0.4 : 0.38)) - (rect.top + rect.height * 0.5);
    var ang = Math.atan2(dy, dx) * 180 / Math.PI;
    fly.style.setProperty("--ang", ang + "deg");
    requestAnimationFrame(function () { requestAnimationFrame(function () {
      fly.classList.add("go");
      fly.style.transform = "translate(" + dx + "px," + dy + "px) rotate(" + (dx > 0 ? 14 : -14) + "deg) scale(0.42)";
    }); });
    setTimeout(function () { if (fly.parentNode) fly.parentNode.removeChild(fly); react(); }, 290);
  }
  function scAttackAnim(n) {
    var you = $("sc-you");
    scPose("attack", 460, "lunge");
    if (LD.O4 && LD.O4.fightPose) setTimeout(function () { LD.O4.fightPose(n ? "panic" : "nervous", 800); }, reduced() ? 0 : 200);
    setTimeout(function () {
      if (you) { you.classList.remove("recoil"); void you.offsetWidth; if (n) you.classList.add("recoil"); }
      scBurst(n ? "Hit " + n : "Blocked!", n ? "ouch" : "shield", you || "#sc-opp");
    }, reduced() ? 0 : 200);
  }
  /* Fight start: on the hub the office strip plays the arrival (visitor walks in / you leave by the back door),
     then the fight opens directly. Tap skips the strip. FI.key makes it once per fight (a resume doesn't replay it). */
  var FI = { on: false, key: null };
  function fightIntroWanted() {
    var fg = state && state.fy && state.fy.fight;
    return !!(fg && !fg.done && !fg.played && (fg.round | 0) <= 1 && FI.key !== LD.fightIntroKey(state));
  }
  function startFight() {
    if (FI.on) return;
    var want = false; try { want = fightIntroWanted(); } catch (e) { want = false; }
    if (!want || reduced() || screen !== "desk" || (LD.seatedOn && LD.seatedOn(state))) { if (want) FI.key = LD.fightIntroKey(state); openFight(); return; }
    try {
      FI.on = true;
      var go = function () { FI.on = false; FI.key = LD.fightIntroKey(state); DF.settle = true; openFight(); };
      if (LD.O4 && LD.O4.adopt && LD.O4_ATLAS) bayEntrance(go); else playOfficeEntrance(go);
    } catch (e) {
      if (window.console) console.error(e);
      FI.on = false; openFight();
    }
  }
  /* In-scene arrival: the bay opens on your own office (the room zooms up from the desk panel), you walk to the door,
     and the visitor steps in, or you walk out and the bay cuts to their room. Tap skips. */
  function bayEntrance(done) {
    var E = LD.officeEntrance ? LD.officeEntrance(state) : null;
    if (!E || screen !== "desk") { done(false); return; }
    var from = document.querySelector(".desk .office .of-room"), fr = from ? from.getBoundingClientRect() : null;
    if (!DF.start) DF.start = state;
    showDoor(LD.renderFight(state, { entering: true }), "df-mode");
    if (!adoptScene(false)) { done(false); return; }
    var bay = doorEl(), room = document.querySelector("#door .fb-room");
    if (fr && fr.width && bay.animate) {
      var br = bay.getBoundingClientRect();
      try { bay.animate([{ clipPath: "inset(" + Math.max(0, fr.top - br.top) + "px " + Math.max(0, br.right - fr.right) + "px " + Math.max(0, br.bottom - fr.bottom) + "px " + Math.max(0, fr.left - br.left) + "px round 14px)", opacity: 0.6 },
        { clipPath: "inset(0px 0px 0px 0px round 14px)", opacity: 1 }], { duration: 380, easing: "cubic-bezier(.3,.7,.2,1)" }); } catch (e) {}
    }
    setTimeout(function () { o4Entrance(room, E, function () { done(true); }); }, reduced() ? 0 : 380);
  }
  /* Hub office strip: the actual opponent walks in through the strip door to your desk, or you leave by the back
     door and a car / plane pulls away in the window. ~2 s, tap anywhere to skip; then straight into the fight. */
  function playOfficeEntrance(done) {
    var room = document.querySelector(".desk .office .of-room");
    var E = LD.officeEntrance ? LD.officeEntrance(state) : null;
    if (!room || !E || screen !== "desk") { done(false); return; }
    if (LD.O4 && LD.O4.active() && room.classList.contains("o4")) { o4Entrance(room, E, done); return; }
    var office = room.closest(".office"), rb = room.getBoundingClientRect();
    if (rb.width < 120 || rb.height < 40) { done(false); return; }
    try { room.scrollIntoView({ block: "nearest", inline: "nearest" }); } catch (e) {}
    rb = room.getBoundingClientRect();
    var ex = room.querySelector(".of-exec .of-portrait") || room.querySelector(".of-exec"), dr = room.querySelector(".of-door .of-doorsvg") || room.querySelector(".of-door");
    var eb = ex.getBoundingClientRect(), db = dr.getBoundingClientRect();
    var added = [], ended = false, timers = [];
    function add(parent, html) { var t = document.createElement("div"); t.innerHTML = html; var n = t.firstChild; parent.appendChild(n); added.push(n); return n; }
    var shield = add(document.body, '<div id="ofx-shield" role="button" aria-label="Skip"><span class="ofx-skip">Tap to skip</span></div>');
    var cls = E.away ? "ofx-away" : "ofx-visit";
    if (office) { var ob = office.getBoundingClientRect(), vw0 = window.innerWidth, vh0 = window.innerHeight;
      var sc = rb.height >= 110 ? 1 : Math.max(1, Math.min(1.45, (vw0 - 12) / ob.width, (vh0 - 12) / ob.height));
      /* keep the scaled strip on screen: shift the origin toward the nearest edge */
      office.style.setProperty("--ofx-s", sc.toFixed(3));
      var ox = Math.max(0, Math.min(100, ((ob.left + ob.width / 2) - vw0 / 2) / Math.max(1, vw0 - ob.width) * 100 + 50));
      var oy = ob.top + ob.height * sc > vh0 - 6 ? 100 : ob.top - ob.height * (sc - 1) / 2 < 6 ? 0 : 50;
      office.style.transformOrigin = ox.toFixed(0) + "% " + oy + "%"; }
    room.classList.add("ofx", cls, "ofx-e" + E.era); if (office) office.classList.add("ofx-focus");
    var h = rb.height;
    if (!E.away) {
      /* visitor sprite: their own fight art, scaled to the strip, walking from the door to the desk */
      var vh = Math.round(h * 0.8), vw = Math.round(vh * E.ar);
      var x0 = Math.round(db.left + db.width / 2 - rb.left - vw / 2), x1 = Math.round(eb.right - rb.left + 4);
      if (x1 > x0) x1 = x0;
      add(room, '<span class="ofx-visitor" style="--x0:' + x0 + "px;--x1:" + x1 + "px;height:" + vh + "px;width:" + vw + 'px"><img src="' + E.opp + '" alt="" draggable="false"><b class="ofx-tag">' + LD.escapeHtml(E.who) + "</b></span>");
    } else {
      /* back door at the left of the exec's wall; the exec walks to it; a vehicle leaves in the window */
      var bw = Math.max(18, Math.round(h * 0.34)), bx = Math.round(eb.left - rb.left - bw - 10);
      var win = room.querySelector(".of-window .of-glass") || room.querySelector(".of-window");
      var wb = win.getBoundingClientRect(); win.style.setProperty("--ww", Math.round(wb.width) + "px");
      /* only dodge the window when it shares the exec's row (phone strip); on the tablet stack the window sits above */
      var sameRow = wb.bottom > eb.top + 4;
      if (sameRow && bx < wb.right - rb.left + 2) bx = Math.round(wb.right - rb.left + 4);
      if (bx < 2) bx = 2;
      var btop = sameRow ? "" : "top:" + Math.max(0, Math.round(eb.top - rb.top - 14)) + "px;";
      add(room, '<span class="ofx-back" style="' + btop + "left:" + bx + "px;width:" + bw + 'px"><i class="ofx-bleaf"></i><b>EXIT</b></span>');
      /* the executive turns their back (their own back-<id> art) on the way out */
      if (ex && ex.tagName === "IMG" && E.back) { ex.dataset.front = ex.getAttribute("src"); ex.setAttribute("src", E.back); }
      var dx = Math.round(bx + bw / 2 - (eb.left + eb.width / 2 - rb.left));
      room.style.setProperty("--ofx-dx", dx + "px");
      add(win, '<span class="ofx-veh ' + (E.air ? "ofx-air" : "ofx-car") + '">' + E.veh + "</span>");
      add(win, '<b class="ofx-dest">→ ' + LD.escapeHtml(E.place) + "</b>");
    }
    function finish(skipped) {
      if (ended) return; ended = true; timers.forEach(clearTimeout);
      shield.removeEventListener("pointerdown", onSkip); document.removeEventListener("keydown", onKey, true);
      added.forEach(function (n) { if (n.parentNode) n.parentNode.removeChild(n); });
      if (ex && ex.dataset && ex.dataset.front) { ex.setAttribute("src", ex.dataset.front); delete ex.dataset.front; }
      room.classList.remove("ofx", "ofx-go", cls, "ofx-e" + E.era); room.style.removeProperty("--ofx-dx"); if (office) { office.classList.remove("ofx-focus"); office.style.removeProperty("--ofx-s"); office.style.transformOrigin = ""; }
      done(true, skipped);
    }
    function onSkip(e) { if (e) { e.preventDefault(); e.stopPropagation(); } finish(true); }
    function onKey(e) { if (e.key === "Escape" || e.key === " " || e.key === "Enter") onSkip(e); }
    shield.addEventListener("pointerdown", onSkip); document.addEventListener("keydown", onKey, true);
    void room.offsetWidth; room.classList.add("ofx-go");
    if (!E.away) { knockNow(); timers.push(setTimeout(function () { SFX.play("flip"); officeReact("shock"); }, 450)); }
    else timers.push(setTimeout(function () { SFX.play("pick"); }, 900));
    timers.push(setTimeout(function () { finish(false); }, E.away ? 2300 : 2150));
    timers.push(setTimeout(function () { finish(false); }, 5000));
  }
  /* 40s office: the executive walks to the door and the visitor steps in (or the executive heads out). Tap to skip. */
  function o4Entrance(room, E, done) {
    var rb = room.getBoundingClientRect();
    if (rb.width < 120 || rb.height < 60) { done(false); return; }
    try { room.scrollIntoView({ block: "nearest", inline: "nearest" }); } catch (e) {}
    var t = document.createElement("div"); t.innerHTML = '<div id="ofx-shield" role="button" aria-label="Skip"><span class="ofx-skip">Tap to skip</span></div>';
    var shield = t.firstChild; document.body.appendChild(shield);
    var tag = document.createElement("b"); tag.className = "o4-who" + (E.away ? " away" : ""); tag.textContent = E.away ? "→ " + (E.place || E.who) : E.who; room.appendChild(tag);
    var ended = false, guard = null, ctl = null;
    function finish(skipped) {
      if (ended) return; ended = true; clearTimeout(guard);
      shield.removeEventListener("pointerdown", onSkip); document.removeEventListener("keydown", onKey, true);
      if (shield.parentNode) shield.parentNode.removeChild(shield); if (tag.parentNode) tag.parentNode.removeChild(tag);
      done(true, skipped);
    }
    function onSkip(e) { if (e) { e.preventDefault(); e.stopPropagation(); } if (ctl) ctl.skip(); finish(true); }
    function onKey(e) { if (e.key === "Escape" || e.key === " " || e.key === "Enter") onSkip(e); }
    shield.addEventListener("pointerdown", onSkip); document.addEventListener("keydown", onKey, true);
    SFX.play("knock", Math.max(1, LD.doorLevel(state)));
    if (!E.away) setTimeout(function () { if (!ended) SFX.play("flip"); }, 900);
    ctl = LD.O4.entrance(E, function () { finish(false); });
    guard = setTimeout(function () { if (ctl) ctl.skip(); finish(false); }, 5000);
  }
  function openFight() {
    if (!state || !state.fy || !state.fy.fight || FI.on) return;
    hideOverlay();
    if (!DF.start) DF.start = state;
    DF.busy = false; DF.arm = 0; DF.say = null; DF.cbHide = false; DF.cap = null; DF.reacted = {};
    DF.deal = true;
    paintFight(null, true);
    SFX.play("knock", Math.max(1, LD.doorLevel(state)));
    if (!state.fy.fight.done) setTimeout(function () { if (doorOpen() && PN.mode !== "tour") pennyTip("fight"); }, 700);
  }
  function paintFight(flashU, enter) {
    if (state && state.fy && state.fy.fight && state.fy.fight.done && PN.mode === "tip") pennyCloseTip();
    var seat = LD.seatedOn && LD.seatedOn(state), fgp = state.fy && state.fy.fight;
    if (seat && fgp && !(fgp.rp > 0)) DF.lastCard = null;
    var fui = { flashU: flashU, enter: !!enter && !reduced(), say: DF.say, cbHide: DF.cbHide, cap: DF.cap, lastCard: DF.lastCard, landing: !!DF.landing };
    showDoor(seat ? LD.renderSeatedFight(state, fui) : LD.renderFight(state, fui), "df-mode");
    var root = doorEl();
    if (!seat) { adoptScene(DF.settle); placeBubble(); }
    DF.settle = false;
    /* deal the hand out of the pile (fight start and each new round) */
    if (DF.deal && !reduced()) { var hand = root.querySelector(".df-hand"); if (hand) hand.classList.add("dealing"); }
    DF.deal = false;
    var cbo = $("sc-cb-ok"); if (cbo) cbo.addEventListener("click", function () { tick(); DF.cbHide = true; var cb = $("sc-cb"), stg = cb && cb.parentNode; if (stg) stg.removeChild(cb);
      /* the familiar-face card held the stage; now show the opener caption it was covering */
      var fg1 = state.fy && state.fy.fight, op = fg1 && !fg1.played && !$("sc-cap") && !$("sc-why") && LD.fightOpener ? LD.fightOpener(state, fg1) : "";
      if (seat) { stg = document.querySelector("#door .sd-caps"); op = fg1 && !fg1.played && !$("sc-cap") && !$("sc-why") ? LD.fightOpener(state, fg1, "home") : ""; }
      if (stg && op) { var w = document.createElement("div"); w.className = seat ? "sd-cap" : "sc-cap sc-why e" + Math.max(1, Math.min(3, LD.eraOf ? LD.eraOf(state) : 3)); w.id = "sc-why"; w.setAttribute("role", "note"); w.innerHTML = "<span>" + LD.escapeHtml(op) + "</span>"; stg.appendChild(w); } });
    Array.prototype.forEach.call(root.querySelectorAll(".df-hand [data-u]"), function (b) {
      b.addEventListener("click", function () { playCard(+b.getAttribute("data-u")); });
    });
    var e = $("df-end"); if (e) e.addEventListener("click", function () { tick(); endRound(); });
    var s = $("df-settle"); if (s) s.addEventListener("click", function () { tick(); settleFight(); });
    var c = $("df-close"); if (c) { c.addEventListener("click", function () { tick(); closeFight(); }); try { c.focus({ preventScroll: true }); } catch (x) {} }
    var hp = $("df-help"); if (hp) hp.addEventListener("click", function () { tick(); showFy(LD.fightHelpHtml(state), '<button class="btn btn-coral" id="fy-ex-back">Back to the door</button>', function () { $("fy-ex-back").addEventListener("click", function () { tick(); hideOverlay(); }); }, true); });
    var dk = $("df-deck"); if (dk) dk.addEventListener("click", function () { tick(); openDeck(); });
    var caps = root.querySelector(".sd-caps"); if (caps) caps.addEventListener("click", function (e) { var c = e.target.closest && e.target.closest(".sd-cap"); if (c) { tick(); c.classList.toggle("open"); } });
  }
  function playCard(u) {
    if (DF.busy || !state.fy.fight || state.fy.fight.done) return;
    var ci = LD.fightCardInfo(state, u); if (!ci) return;
    if (ci.why) {
      SFX.play("bad"); dfLog(ci.o.name + ": " + ci.why);
      var bn = document.querySelector('.df-hand [data-u="' + u + '"]'); if (bn) { bn.classList.remove("shake"); void bn.offsetWidth; bn.classList.add("shake"); }
      return;
    }
    var prev = state, fg0 = state.fy.fight, s0 = fg0.scrut, b0 = fg0.block;
    var cardEl = document.querySelector('.df-hand [data-u="' + u + '"]');
    var cardRect = cardEl ? cardEl.getBoundingClientRect() : null, cardHtml = cardEl ? cardEl.outerHTML : "";
    var res = LD.fightPlay(state, u);
    if (!res.ok) { SFX.play("bad"); dfLog(res.error); return; }
    state = res.state; persistRun();
    if (LD.seatedOn && LD.seatedOn(state)) { DF.lastCard = { id: ci.id, up: ci.up }; DF.landing = !reduced() && !!cardRect; }
    SFX.play("flip");
    var fg = state.fy.fight;
    var dS = s0 - Math.max(0, fg.scrut), dB = fg.block - b0;
    DF.cbHide = true;
    /* Silent cards: no speech, a narrator caption and a small reaction from the face. Others: a line that answers the kind of pressure. */
    DF.cap = res.silent && LD.silentFor ? LD.silentFor(state, res.silent) : null;
    var fam = res.pres && LD.PRESSURE_FAMILY ? LD.PRESSURE_FAMILY[res.pres] : null, react = !DF.cap && fam && !(DF.reacted || {})[fam] && LD.oppReact ? LD.oppReact(fg, res.pres) : null;
    if (react) (DF.reacted = DF.reacted || {})[fam] = 1;
    DF.say = fg.done || !LD.oppLine || DF.cap ? null : react && (dS > 0 || dB > 0) ? { t: react, k: "hit" } : dS > 0 ? { t: LD.oppLine(fg, "hit", fg.played), k: "hit" } : dB > 0 ? { t: LD.oppLine(fg, "block", fg.played), k: "block" } : DF.say;
    paintFight();
    if (DF.cap && !reduced()) { var so = $("sc-opp"); if (so) { so.classList.remove("sfx-" + DF.cap.fx); void so.offsetWidth; so.classList.add("sfx-" + DF.cap.fx); } var st = document.querySelector(".df-stage"); if (st) st.classList.add("sfx-st-" + DF.cap.fx); }
    if (res.gal) dfFloat("Gallery " + (res.gal > 0 ? "+" : "−") + Math.abs(res.gal), res.gal > 0 ? "good" : "bad", ".df-gal", 200);
    scPlayAnim(cardHtml, cardRect, dS, dB);
    if (dS > 0) dfFloat("−" + dS + " Scrutiny", "good big", ".df-scrut");
    if (dB > 0) dfFloat("Block +" + dB, "good", "#df-intent");
    if (state.cash !== prev.cash) dfFloat((state.cash > prev.cash ? "+$" : "−$") + Math.abs(state.cash - prev.cash) + "M", state.cash > prev.cash ? "cash" : "cost", ".df-meters", 120);
    var msgs = (res.fx || []).map(function (x) { return x.text; }).filter(Boolean);
    dfLog(ci.o.name + (dS > 0 ? " · Scrutiny −" + dS : "") + (dB > 0 ? " · block +" + dB : "") + (msgs.length ? " · " + msgs.join(" ") : ""));
    pennyEmit("fight-card");
    if (fg.done) fightOver();
  }
  function endRound() {
    if (DF.busy || !state.fy.fight || state.fy.fight.done) return;
    var prev = state;
    var res = LD.fightEndRound(state);
    if (!res.ok) { dfLog(res.error); return; }
    DF.busy = true; DF.cbHide = true;
    var ie = $("df-intent"); if (ie) ie.classList.add("firing");
    var bub = $("sc-bubble"), I0 = res.intent && LD.INTENTS[res.intent.k];
    if (bub && I0) { bub.className = (doorEl().classList.contains("sd-fight") ? "sd-bubble" : "sc-bubble") + " k-attack"; bub.innerHTML = "<b>" + LD.escapeHtml(res.intent.label) + "!</b>" + LD.escapeHtml(LD.moveSay ? LD.moveSay(state.fy.fight || {}, res.intent.k) : I0.say || ""); placeBubble(); }
    DF.say = null; DF.cap = null;
    var cp = $("sc-cap"); if (cp && cp.parentNode) cp.parentNode.removeChild(cp);
    scAttackAnim(res.hit && res.hit.n);
    SFX.play(res.hit.n ? "bad" : "tick");
    setTimeout(function () {
      DF.busy = false;
      state = res.state; persistRun();
      DF.deal = !!(state.fy.fight && !state.fy.fight.done);
      paintFight();
      dfLog(res.hit.text + (res.hit.riders.length ? " " + res.hit.riders.join(" ") : ""));
      var d = [];
      if (state.cash !== prev.cash) d.push((state.cash > prev.cash ? "+$" : "−$") + Math.abs(state.cash - prev.cash) + "M");
      if (state.unrest !== prev.unrest) d.push("Unrest " + signed(state.unrest - prev.unrest));
      if (state.collapse !== prev.collapse) d.push("Collapse " + signed(state.collapse - prev.collapse));
      d.forEach(function (t, i) { dfFloat(t, "bad", ".df-meters", i * 160); });
      if (!d.length && !res.hit.n) dfFloat("Blocked!", "good big", ".df-stage");
      if (res.rumour) dfFloat("The rumour lands: Scrutiny −" + res.rumour, "good big", ".df-scrut", 300);
      if (state.fy.fight.done) fightOver();
    }, reduced() ? 60 : 420);
  }
  function signed(n) { return (n > 0 ? "+" : "−") + Math.abs(n); }
  function settleFight() {
    var cost = LD.fightSettleCost(state);
    if (Date.now() - DF.arm > 3000) {
      DF.arm = Date.now();
      var b = $("df-settle"); if (b) { b.classList.add("armed"); b.innerHTML = "<b>Pay $" + cost + "M?</b><small>Tap again to settle</small>"; }
      return;
    }
    DF.arm = 0;
    var res = LD.fightSettle(state);
    if (!res.ok) { SFX.play("bad"); dfLog(res.error); return; }
    state = res.state; persistRun();
    SFX.play("coin");
    paintFight();
    fightOver();
  }
  function fightOver() {
    var d = state.fy.fight && state.fy.fight.done; if (!d) return;
    SFX.play(d.win ? "win" : d.settled ? "coin" : "bad");
    /* the hand and the discard go back onto the pile */
    var pl = $("df-deck"); if (pl) { pl.classList.remove("landed"); void pl.offsetWidth; pl.classList.add("landed"); }
    pennyEmit("fight-done");
  }
  function closeFight() {
    var res = LD.fightClose(state);
    if (!res.ok) { flash(res.error); return; }
    state = res.state; persistRun();
    if (state.fy.reward) {
      /* the bay folds away and the reward is picked over the live run screen (no reward room) */
      var from = DF.start; hideDoor(); renderDesk(from); DF.start = state;
      openReward();
    }
    else finishDoor();
    pennyEmit("reward-open");
  }
  function finishDoor() {
    var from = DF.start; DF.start = null;
    hideDoor(); renderDesk(from);
    if (state && state.fy && state.fy.lastFight && state.fy.lastFight.q === state.turn) officeReact(state.fy.lastFight.win ? "glee" : "shock");
    fyNext(700);
  }
  function openReward() {
    if (PN.mode === "tip") pennyCloseTip();
    if (!state.fy.reward) { finishDoor(); return; }
    if (!DF.start) DF.start = state;
    RW = { sel: null, shredding: false, upgrading: false, replaceItem: false, replaceFor: null };
    var r = state.fy.reward;
    if (r.item) codexMark([r.item], false);
    if (r.asset) codexMark(r.asset, false);
    paintReward();
    SFX.play(r.rare ? "rare" : "loot");
    setTimeout(function () { if (doorOpen() && PN.mode !== "tour") pennyTip("reward"); }, 600);
  }
  function rwAct(a, onNeed) {
    var res = LD.fyReward(state, a);
    if (!res.ok) { if (res.needReplace && onNeed) { onNeed(); return null; } SFX.play("bad"); flash(res.error); return null; }
    state = res.state; persistRun();
    RW = { sel: null, shredding: false, upgrading: false, replaceItem: false, replaceFor: null };
    return res;
  }
  /* Discover pick: the chosen card flies to the deck pile, an asset to its frame on the office wall, an item to the
     briefcase. When it was the last pick the veil lifts while it flies. */
  var rwBusy = false; /* a pick is flying or the veil is lifting: further taps on the old choices are ignored */
  function rwFly(src, target, done) {
    rwBusy = true;
    var tgt = typeof target === "string" ? document.querySelector(target) : target, last = !state.fy.reward, d = doorEl();
    if (last && d) d.classList.add("lifting");
    if (!src || !tgt || reduced()) { done(); return; }
    var a = src.getBoundingClientRect(), b = tgt.getBoundingClientRect();
    if (!a.width || !b.width) { done(); return; }
    var c = src.cloneNode(true); c.removeAttribute("id"); c.classList.remove("sel"); c.classList.add("disc-fly");
    c.style.left = a.left + "px"; c.style.top = a.top + "px"; c.style.width = a.width + "px"; c.style.height = a.height + "px";
    document.body.appendChild(c);
    src.style.visibility = "hidden";
    if (d) d.classList.add("picking");
    var sc = Math.max(0.12, Math.min(b.width / a.width, b.height / a.height));
    requestAnimationFrame(function () { requestAnimationFrame(function () {
      c.classList.add("go");
      c.style.transform = "translate(" + (b.left + b.width / 2 - a.left - a.width / 2).toFixed(1) + "px," + (b.top + b.height / 2 - a.top - a.height / 2).toFixed(1) + "px) scale(" + sc.toFixed(3) + ") rotate(-6deg)";
    }); });
    setTimeout(function () {
      if (c.parentNode) c.parentNode.removeChild(c); if (d) d.classList.remove("picking");
      done();
      var land = typeof target === "string" ? document.querySelector(target) : null;
      if (land) { land.classList.remove("landed"); void land.offsetWidth; land.classList.add("landed"); }
    }, 620);
  }
  function wallSlot() { return document.querySelector(".desk .office .of-wallart i.empty") || document.querySelector(".desk .office .of-wallart") || "#btn-portfolio"; }
  function paintReward() {
    rwBusy = false;
    if (!state.fy.reward) { pennyEmit("reward-done"); finishDoor(); return; }
    showDoor(LD.renderReward(state, RW), "rw-mode");
    var root = doorEl();
    function on(id, fn) { var n = $(id); if (n) n.addEventListener("click", function () { if (rwBusy) return; tick(); fn(); }); }
    function each(sel, fn) { Array.prototype.forEach.call(root.querySelectorAll(sel), function (n) { n.addEventListener("click", function () { if (rwBusy) return; tick(); fn(n); }); }); }
    on("rw-keep", function () { var src = root.querySelector(".rw-item"); var r = rwAct({ kind: "item", keep: true }, function () { RW.replaceItem = true; paintReward(); }); if (r) { SFX.play("item"); codexMark([r.item.id], true); rwFly(src, "#btn-portfolio", paintReward); } });
    on("rw-sell", function () { if (rwAct({ kind: "item", keep: false })) { SFX.play("coin"); paintReward(); } });
    each("[data-isell]", function (n) { var r = rwAct({ kind: "item", keep: true, replace: n.getAttribute("data-isell") }); if (r) { SFX.play("item"); paintReward(); } });
    each("[data-asset]", function (n) {
      var id = n.getAttribute("data-asset");
      if (LD.fySlotsUsed(state) >= state.fy.cap) { RW.replaceFor = id; paintReward(); return; }
      var slot = wallSlot();
      var r = rwAct({ kind: "asset", id: id }); if (r) { SFX.play("rare"); codexMark([id], true); rwFly(n, slot, paintReward); }
    });
    each("[data-areplace]", function (n) { var id = RW.replaceFor; var r = rwAct({ kind: "asset", id: id, replace: n.getAttribute("data-areplace") }); if (r) { codexMark([id], true); SFX.play("rare"); paintReward(); } });
    on("rw-apass", function () { if (rwAct({ kind: "assetPass" })) paintReward(); });
    each("[data-card]", function (n) { RW.sel = n.getAttribute("data-card"); paintReward(); var t = $("rw-take"); if (t) try { t.focus({ preventScroll: true }); } catch (x) {} });
    on("rw-take", function () { if (!RW.sel) return; var src = root.querySelector('[data-card="' + RW.sel + '"]'); var r = rwAct({ kind: "card", id: RW.sel }); if (r) { SFX.play("item"); rwFly(src, "#run-deck", paintReward); } });
    on("rw-skip", function () { if (rwAct({ kind: "skip" })) { rwBusy = true; SFX.play("coin"); if (!state.fy.reward) doorEl().classList.add("lifting"); setTimeout(paintReward, reduced() ? 0 : 260); } });
    on("rw-shred", function () { RW.shredding = true; paintReward(); });
    on("rw-upg", function () { RW.upgrading = true; paintReward(); });
    on("rw-reroll", function () { if (rwAct({ kind: "reroll" })) paintReward(); });
    on("rw-back", function () { RW = { sel: null, shredding: false, upgrading: false, replaceItem: false, replaceFor: null }; paintReward(); });
    each("[data-shred]", function (n) { var u = +n.getAttribute("data-shred"); var why = LD.shredBlock(state, u); if (why) { SFX.play("bad"); flash(why); return; } if (rwAct({ kind: "shred", u: u })) { SFX.play("bad"); paintReward(); } });
    each("[data-upg]", function (n) { var u = +n.getAttribute("data-upg"); var why = LD.upgradeBlock(state, u); if (why) { SFX.play("bad"); flash(why); return; } if (rwAct({ kind: "upgrade", u: u })) { SFX.play("rare"); paintReward(); } });
  }
  /* Deck view: a collection, so it may scroll. Fire fixers, spend free shreds and upgrade tokens. */
  var DK = { mode: "" };
  function openDeck(mode) {
    DK.mode = typeof mode === "string" ? mode : "";
    var f = state.fy, inFight = !!(f.fight && !f.fight.done), atReward = !!f.reward;
    var acts = "";
    if (!inFight && !atReward && f.freeShreds > 0) acts += '<button class="btn" id="dk-shred">' + (DK.mode === "shred" ? "Stop shredding" : "Free shred (" + f.freeShreds + ")") + "</button>";
    if (!inFight && f.upTokens > 0) acts += '<button class="btn" id="dk-upg">' + (DK.mode === "upgrade" ? "Stop upgrading" : "Upgrade (" + f.upTokens + ")") + "</button>";
    acts += '<button class="btn btn-coral" id="dk-close">Close</button>';
    showFy(LD.renderDeck(state, { mode: DK.mode }), acts, function () {
      $("dk-close").addEventListener("click", function () { tick(); hideOverlay(); if (!doorOpen()) renderDesk(); });
      var s = $("dk-shred"); if (s) s.addEventListener("click", function () { tick(); openDeck(DK.mode === "shred" ? "" : "shred"); });
      var u = $("dk-upg"); if (u) u.addEventListener("click", function () { tick(); openDeck(DK.mode === "upgrade" ? "" : "upgrade"); });
      Array.prototype.forEach.call(document.querySelectorAll("#overlay [data-fire]"), function (b) {
        b.addEventListener("click", function () {
          tick();
          if (inFight) { flash("Not in the middle of a fight."); return; }
          var x = LD.fixerById(b.getAttribute("data-fire"));
          if (!b.classList.contains("armed")) { b.classList.add("armed"); b.textContent = "Sure? Cards leave"; return; }
          var res = LD.fyFire(state, x.id); if (!res.ok) { flash(res.error); return; }
          state = res.state; persistRun(); SFX.play("bad"); openDeck(DK.mode);
        });
      });
      Array.prototype.forEach.call(document.querySelectorAll("#overlay [data-dk]"), function (b) {
        b.addEventListener("click", function () {
          tick();
          var uu = +b.getAttribute("data-dk");
          var res = DK.mode === "shred" ? LD.fyReward(state, { kind: "shred", u: uu }) : LD.fyReward(state, { kind: "upgrade", u: uu });
          if (!res.ok) { SFX.play("bad"); flash(res.error); return; }
          state = res.state; persistRun(); SFX.play(DK.mode === "shred" ? "bad" : "rare");
          var f2 = state.fy; openDeck((DK.mode === "shred" && f2.freeShreds > 0) || (DK.mode === "upgrade" && f2.upTokens > 0) ? DK.mode : "");
        });
      });
    });
    $("overlay").classList.add("deck-mode");
  }

  function openOfficeExplain() {
    showFy(LD.officeExplain(state), '<button class="btn btn-coral" id="of-ex-close">Close</button>', function () {
      $("of-ex-close").addEventListener("click", function () { tick(); hideOverlay(); });
      $("overlay").onclick = function (e) { if (e.target === $("overlay")) { tick(); hideOverlay(); } };
    }, true);
  }
  function openProspectus(tab, sel) {
    var guide = screen !== "desk";
    showFy((guide ? '<div class="gb-spine" aria-hidden="true"><span>Guidebook</span></div>' : "") + LD.renderProspectus(loadMeta(), { tab: tab, sel: sel }), '<button class="btn btn-coral" id="pr-close">' + (guide ? "Close the guidebook" : "Close") + "</button>", function () {
      if (guide) $("overlay").classList.add("guide-mode");
      $("pr-close").addEventListener("click", function () { tick(); hideOverlay(); });
      Array.prototype.forEach.call(document.querySelectorAll("#overlay [data-ptab]"), function (b) { b.addEventListener("click", function () { tick(); openProspectus(b.getAttribute("data-ptab")); }); });
      Array.prototype.forEach.call(document.querySelectorAll("#overlay [data-psel]"), function (b) { b.addEventListener("click", function () { tick(); openProspectus(tab, b.getAttribute("data-psel")); }); });
    }, true);
  }
  /* Office: executive reactions and the door */
  function officeReact(kind) {
    var room = document.querySelector(".desk .office .of-room"); if (!room) return;
    room.classList.remove("react-glee", "react-shock"); void room.offsetWidth; room.classList.add("react-" + kind);
    setTimeout(function () { room.classList.remove("react-" + kind); }, 1800);
    if (LD.O4) LD.O4.react(kind);
  }
  var KN = { last: 0, q: null };
  function knockNow() {
    if (!state || !state.fy || state.ended) return;
    var door = document.querySelector(".desk .office .of-door"), sd = !door && document.querySelector("#screen-desk .desk.sd");
    if (!door && !sd) return;
    var lv = LD.doorLevel(state);
    if (door) {
      door.classList.remove("knocking"); void door.offsetWidth; door.classList.add("knocking");
      setTimeout(function () { door.classList.remove("knocking"); }, 700);
    } else seatKnock(sd, lv);
    if (LD.O4) LD.O4.knock(lv);
    SFX.play("knock", lv);
    KN.last = Date.now();
  }
  /* the seated desk has no office door element: the knock lands on the painted door behind the visitor's chair */
  function seatKnock(sd, lv) {
    var k = sd.querySelector(".sd-knock");
    if (!k) { k = document.createElement("span"); k.className = "sd-knock"; k.setAttribute("aria-hidden", "true"); sd.appendChild(k); k.addEventListener("animationend", function () { k.classList.remove("show"); }); }
    k.textContent = lv >= 3 ? "BANG BANG!" : lv >= 2 ? "KNOCK KNOCK" : "tap tap";
    k.setAttribute("data-lv", String(lv));
    var q = LD.seatToScreen(LD.seatFrame(window.innerWidth, window.innerHeight), 362, 300), r = sd.getBoundingClientRect(), top = 64;
    /* on the door, but always clear of the HUD and the quarter ribbon */
    Array.prototype.forEach.call(sd.querySelectorAll(".sd-hud, .sd-ribbon"), function (e) { var b = e.getBoundingClientRect(); if (b.height && b.top < r.top + r.height * 0.4) top = Math.max(top, b.bottom - r.top + 26); });
    k.style.left = Math.round(q[0] - r.left) + "px"; k.style.top = Math.round(Math.max(top, q[1] - r.top)) + "px";
    k.classList.remove("show"); void k.offsetWidth; k.classList.add("show");
    clearTimeout(KN.st); KN.st = setTimeout(function () { k.classList.remove("show"); }, 1100);
  }
  setInterval(function () {
    if (screen !== "desk" || !state || state.ended || !state.fy || document.hidden) return;
    if ($("overlay").classList.contains("on") || closing || doorOpen() || FI.on) return;
    if (LD.doorQuiet(state)) return;
    var lv = LD.doorLevel(state), every = [0, 18000, 10000, 6000][lv];
    if (KN.q !== state.turn) { KN.q = state.turn; if (Date.now() - KN.last > 2500) setTimeout(knockNow, 1200); return; }
    if (every && Date.now() - KN.last > every) knockNow();
  }, 1000);
  LD.knockNow = knockNow;
  function showBossCard(q, after) {
    showFy(LD.renderBossCard(state, q, "intro"), '<button class="btn btn-coral" id="fy-boss-ok">Understood</button>', function () {
      $("fy-boss-ok").addEventListener("click", function () { tick(); hideOverlay(); if (after) after(); });
      bindExplain($("overlay"), function () { showBossCard(q, after); });
      $("fy-boss-ok").focus();
    }, true);
  }
  function showActIntro() {
    var f = state.fy;
    var act = f.actIntro;
    f.actIntro = 0;
    persistRun();
    var q = [4, 8, f.rules.finalQ][act - 1];
    showBossCard(q, function () {
      if (PN.pendingOffer) { PN.pendingOffer = false; pennyStart({ offer: true }); }
      else if (act === 1) pennyTip("boss");
      fyNext(500);
    });
  }
  function showBossConfirm() {
    var info = LD.bossInfo(state, state.turn);
    var acts;
    if (info.choice) {
      var can = state.cash >= info.ask;
      acts = '<button class="btn btn-coral" id="fy-b-pay"' + (can ? "" : " disabled") + ">" + (can ? LD.escapeHtml(info.beat) + " · end quarter" : "Need $" + info.ask + "M to pay") + "</button>" +
        '<button class="btn btn-danger" id="fy-b-refuse">Refuse · ' + LD.escapeHtml(info.miss) + "</button>";
    } else {
      acts = '<button class="btn btn-coral" id="fy-b-go">' + (info.final ? "Face the Reckoning · end the year" : info.id === "crash" ? "Ride out the crash · end quarter" : "Face the strike · end quarter") + "</button>";
    }
    acts += '<button class="btn btn-ghost" id="fy-b-wait">Not yet</button>';
    showFy(LD.renderBossCard(state, state.turn, "confirm"), acts, function () {
      function go(choice) { tick(); hideOverlay(); endQuarter({ confirmed: true, bossChoice: choice }); }
      var p = $("fy-b-pay"); if (p) p.addEventListener("click", function () { go("pay"); });
      var r = $("fy-b-refuse"); if (r) r.addEventListener("click", function () { go("refuse"); });
      var g = $("fy-b-go"); if (g) g.addEventListener("click", function () { go(null); });
      $("fy-b-wait").addEventListener("click", function () { tick(); hideOverlay(); });
      bindExplain($("overlay"), showBossConfirm);
    }, true);
    SFX.play("boss");
  }
  /* Tap-to-explain: [data-explain] opens a sheet; Back returns to where you were. */
  function bindExplain(root, back, ctx) {
    if (!root) return;
    Array.prototype.forEach.call(root.querySelectorAll("[data-explain]"), function (b) {
      b.addEventListener("click", function (e) {
        e.stopPropagation(); tick();
        var kind = b.getAttribute("data-explain");
        var ret = back || (kind === "liabilities" ? paintDraft : null);
        showFy(LD.explainHtml(kind, ctx || state || { rating: currentRating(loadMeta()) }), '<button class="btn btn-coral" id="fy-ex-back">' + (ret ? "Back" : "Close") + "</button>", function () {
          $("fy-ex-back").addEventListener("click", function () { tick(); if (ret) ret(); else hideOverlay(); });
        }, true);
      });
    });
  }
  function bindBossLinks(root) {
    if (!root) return;
    Array.prototype.forEach.call(root.querySelectorAll("[data-boss-q]"), function (b) {
      b.addEventListener("click", function (e) { e.stopPropagation(); tick(); showBossCard(+b.getAttribute("data-boss-q")); });
    });
  }
  function bindFyDesk() {
    var pf = $("btn-portfolio");
    if (pf) pf.addEventListener("click", function (e) { e.stopPropagation(); tick(); if (doorOpen()) return; openPortfolio(false); });
    var bd = $("btn-deck"); if (bd) bd.addEventListener("click", function (e) { e.stopPropagation(); tick(); openDeck(); });
    var rdk = $("run-deck"); if (rdk) rdk.addEventListener("click", function (e) { e.stopPropagation(); tick(); openDeck(); });
    var ph = $("btn-phone"); if (ph) ph.addEventListener("click", function (e) { e.stopPropagation(); tick(); if (doorOpen()) return; if (state.fy.memo) openMemo(); else railTip(ph, "No calls right now. When it rings, the call waits here."); });
    var room = document.querySelector(".desk .office .of-room");
    if (room) { room.setAttribute("role", "button"); room.setAttribute("tabindex", "0"); room.setAttribute("aria-label", "Your office: tap to read the room");
      room.addEventListener("click", function (e) { e.stopPropagation(); tick(); openOfficeExplain(); });
      room.addEventListener("keydown", function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); tick(); openOfficeExplain(); } }); }
    var cg = document.querySelector(".desk .office > .m-cash");
    if (cg) cg.addEventListener("click", function (e) { e.stopPropagation(); tick(); openOfficeExplain(); });
    bindBossLinks($("rail-wrap"));
  }

  function openMenu() {
    showOverlay("Menu", "<p class='muted'>Seed " + LD.escapeHtml(String(state.seedLabel)) + " · Q" + state.turn + "</p>",
      '<button class="btn btn-coral" id="mn-resume">Resume</button>' +
      '<button class="btn" id="mn-penny">Replay Penny\'s tour</button>' +
      '<button class="btn" id="mn-how">How to play</button>' +
      '<button class="btn" id="mn-sound">' + SFX.label() + "</button>" +
      '<button class="btn" id="mn-title">Save &amp; exit to title</button>' +
      '<button class="btn btn-danger" id="mn-abandon">Abandon run</button>',
      function () {
        $("mn-resume").addEventListener("click", function () { tick(); hideOverlay(); });
        $("mn-how").addEventListener("click", function () { tick(); hideOverlay(); openHowTo(true); });
        $("mn-penny").addEventListener("click", function () { tick(); hideOverlay(); pennyStart(); });
        $("mn-sound").addEventListener("click", function () { SFX.toggle(); tick(); this.textContent = SFX.label(); });
        $("mn-title").addEventListener("click", function () { tick(); persistRun(); show("title"); renderTitle(); });
        $("mn-abandon").addEventListener("click", function () {
          tick();
          state = null;
          clearMidRun();
          hideOverlay();
          show("title");
          renderTitle();
        });
      });
  }

  function showEvacConfirm() {
    showOverlay(
      "Seal the bunker now?",
      LD.evacConfirmBody(state),
      '<button class="btn btn-danger" id="ov-seal">Seal now</button><button class="btn btn-ghost" id="ov-wait">Keep working</button>',
      function () {
        $("overlay").classList.add("evac-mode");
        var why = $("evac-why");
        if (why) why.addEventListener("click", function () { tick(); var ov = $("overlay"); ov.classList.toggle("evac-why-on"); why.textContent = ov.classList.contains("evac-why-on") ? "◂ Back to the rooms" : "ⓘ Why rooms fail"; });
        $("ov-seal").addEventListener("click", function () {
          tick();
          var res = LD.attemptEvacuation(state);
          if (!res.ok) { hideOverlay(); flash(res.error); return; }
          state = res.state;
          recordEnding();
          showSealed();
        });
        $("ov-wait").addEventListener("click", function () { tick(); hideOverlay(); });
      }
    );
  }

  function showEnd() {
    show("end");
    endLetter = false;
    paintEnd();
  }
  /* ---------- End of run: the animated recap (first view), then its final page ---------- */
  var RECAP_KEY = "lastDividend.recapSeen", recapMode = null, recapPlayer = null;
  function recapKey() { return [state.executiveId, state.seed, state.turn, state.ending && state.ending.reason].join(":"); }
  function recapSeen() { try { return localStorage.getItem(RECAP_KEY) === recapKey(); } catch (e) { return false; } }
  function markRecapSeen() { try { localStorage.setItem(RECAP_KEY, recapKey()); } catch (e) {} }
  function reducedMotion() { try { return !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches); } catch (e) { return false; } }
  function endInfo() { return lastEnd && lastEnd.seed === state.seed && lastEnd.turn === state.turn ? lastEnd : null; }
  function paintEnd() {
    hideLevelUpToast();
    if (recapPlayer) { recapPlayer.end = function () {}; recapPlayer = null; }
    var meta = loadMeta();
    var info = endInfo();
    if (endLetter) {
      $("screen-end").innerHTML = LD.renderEnd(state, { payout: info ? info.payout : null, newRating: info ? info.newRating : null, meta: meta, letter: true, xp: info ? info.xp : null });
      $("screen-end").classList.remove("rc-host");
      var brs = $("btn-end-result");
      if (brs) brs.addEventListener("click", function () { tick(); endLetter = false; recapMode = "final"; paintEnd(); });
      bindEndButtons();
      setTimeout(function () { if (screen === "end") pennyTip("dividends"); }, 200);
      return;
    }
    var d = LD.recapData(state, info || {}, meta);
    var tpl = LD.recapTemplate(state.executiveId, d.era);
    var mode = recapMode || (DEBUG_RECAP && DEBUG_RECAP.final ? "final" : DEBUG_RECAP ? "play" : recapSeen() || reducedMotion() ? "final" : "play");
    recapMode = null;
    var host = $("screen-end");
    host.classList.add("rc-host");
    host.innerHTML = LD.renderRecap(d, tpl, { final: mode === "final" });
    if (LD.recapScrollCue) LD.recapScrollCue(host);
    if (info && !info.soundDone && mode === "final") { info.soundDone = true; SFX.play(d.win ? "win" : "lose"); }
    var fontsReady = LD.recapLoadFonts(tpl);
    bindEndButtons();
    var rp = $("btn-replay");
    if (rp) rp.addEventListener("click", function () { tick(); recapMode = "play"; paintEnd(); });
    if (mode === "play") {
      if (info) info.soundDone = true;
      markRecapSeen();
      var go = function () {
        if (screen !== "end" || !host.querySelector("#rc")) return;
        recapPlayer = LD.playRecap(host, d, { clack: tpl.skin === "wire", sfx: function (n) { SFX.play(n); }, onEnd: function () { recapPlayer = null; } });
        LD._recap = recapPlayer;
      };
      var started = false, once = function () { if (!started) { started = true; go(); } };
      fontsReady.then(once); setTimeout(once, 450);
    }
  }
  function bindEndButtons() {
    var bl = $("btn-letter");
    if (bl) bl.addEventListener("click", function () { tick(); endLetter = true; paintEnd(); });
    $("btn-end-board").addEventListener("click", function () { tick(); openBoardroom("end"); });
    $("btn-again").addEventListener("click", function () {
      tick();
      if (DEBUG_RECAP) { DEBUG_RECAP = null; try { history.replaceState(null, "", location.pathname); } catch (e) {} }
      selectedExec = state.executiveId;
      selectedRating = state.rating | 0;
      seedDraft = "";
      startRun();
    });
    $("btn-title").addEventListener("click", function () {
      tick();
      if (DEBUG_RECAP) { DEBUG_RECAP = null; try { history.replaceState(null, "", location.pathname); } catch (e) {} }
      show("title");
      renderTitle();
    });
  }

  /* Debug/test: ?recap=reid&end=lose|win&era=1|2|3[&reason=unfinished|failed-systems][&final=1][&lvup=1][&lv3=0-4] opens a sample recap. Never saves. */
  var DEBUG_RECAP = null;
  function demoRecap() {
    var q = null;
    try { q = new URLSearchParams(location.search); } catch (e) { return false; }
    var ex = q.get("recap"); if (!ex || !LD.execById(ex) || LD.execById(ex).id !== ex) return false;
    var win = q.get("end") === "win", era = Math.max(1, Math.min(3, +q.get("era") || (win ? 3 : 2)));
    if (win) era = 3;
    var reason = win ? "evacuated" : q.get("reason") || "unrest";
    var turn = era === 1 ? 3 : era === 2 ? 6 : win ? 11 : 10;
    var st = LD.createRun({ seed: "recap-demo-" + era, executiveId: ex, rating: 0, perks: [], packs: [], level: 1 });
    st.turn = turn;
    st.track = { v: 1, q: [], eraQ: { 1: 1 }, deals: [] };
    if (turn >= 5) st.track.eraQ[2] = 5;
    if (turn >= 9) st.track.eraQ[3] = 9;
    for (var t = 1; t <= turn; t++) st.track.q.push({ t: t, cash: 30 + t * 4, unrest: Math.min(100, 14 + t * (win ? 6 : 14)), collapse: 20 + t * 7 });
    st.track.deals = [{ q: 1, id: "demo1", title: "Blackout Insurance", cash: 18 }, { q: 2, id: "demo2", title: "Divert the Filters", cash: 26 }, { q: Math.min(turn, 4), id: "demo3", title: "Sell the Reserves", cash: 12 }];
    var F = st.fy || (st.fy = {});
    F.fates = { dunn: { how: "paid", out: "bought", q: 1, act: 1 }, mickey: { how: "crushed", out: "exposed", q: 2, act: 1 }, june: { how: "walked", out: "walked", q: 3, act: 1 } };
    if (era === 2) { F.fates.dunn.q = 2; F.fates.mickey.q = 3; F.fates.june.q = 4; }
    if (era === 3) { F.fates.dunn.q = 2; F.fates.mickey.q = 3; F.fates.june.q = 4; F.fates.delacroix = { how: "paid", out: "reconciled", q: 7, act: 2 }; }
    F.bosses = era >= 2 ? 1 : 0;
    LD.SYSTEMS.forEach(function (s, i) { st.bunker[s.id].level = win ? 2 : i < 2 ? 2 : i === 2 ? 1 : 0; st.bunker[s.id].quality = "sound"; });
    if (!win && reason === "failed-systems") LD.SYSTEMS.forEach(function (s) { st.bunker[s.id].level = 2; st.bunker[s.id].quality = "cheap"; });
    var END = {
      unrest: { kind: "lose", reason: "unrest", title: "The street is in the lobby", body: "The board is still in session. You do not reach the car." },
      unfinished: { kind: "lose", reason: "unfinished", title: "The countdown expired in an unfinished room", body: "Collapse reached 100 before the bunker was ready." },
      "failed-systems": { kind: "lose", reason: "failed-systems", title: "The cheapest filters failed first", body: "You sealed on time. The bargain work did not hold." },
      evacuated: { kind: "win", reason: "evacuated", title: "The doors close on time", body: "Air, water, power, and food all hold. The last dividend is silence." }
    };
    var lv3 = Math.max(0, Math.min(4, +q.get("lv3") || 0)); /* &lv3=N: N rooms overbuilt to Lv 3 (seal bonus) */
    if (win && lv3) LD.SYSTEMS.forEach(function (s, i) { if (i < lv3) st.bunker[s.id].level = 3; });
    st.ending = win && lv3 ? LD.evacuationResult(st) : END[reason] || END.unrest;
    st.unrest = reason === "unrest" ? 100 : 46; st.collapse = reason === "unfinished" ? 100 : win ? 72 : 58; st.cash = 24;
    st.ended = true; st.phase = "ended";
    var meta = loadMeta();
    var applied = LD.applyRunEnd(meta, st);
    var after = applied.meta; after.finished += 1; if (win) after.wins += 1;
    lastEnd = { payout: applied.payout, newRating: applied.newRating, seed: st.seed, turn: st.turn, xp: applied.xp, toastShown: true, soundDone: false };
    if (q.get("lvup") === "1" && lastEnd.xp) { lastEnd.xp = JSON.parse(JSON.stringify(lastEnd.xp)); lastEnd.xp.levelUp = true; lastEnd.xp.before = { level: lastEnd.xp.after.level, into: Math.round((lastEnd.xp.after.need || 100) * 0.7), need: lastEnd.xp.after.need || 100 }; lastEnd.xp.after = { level: lastEnd.xp.after.level + 1, into: 12, need: (lastEnd.xp.after.need || 100) + 20 }; lastEnd.xp.newPerks = [LD.LEVEL_PERKS[1]]; }
    var un = unlockDiff(meta, after, applied, st);
    if (!un.length) un = win ? [{ kind: "seat", name: "Dr. Imani Okoye", text: "Yield & Residue PLC" }, { kind: "rating", name: "AA+", text: "Harder rules" }] : [{ kind: "afford", name: "Media Buy", text: "\u25c8 60 in the Lounge" }];
    lastEnd.unlocks = un;
    state = st;
    DEBUG_RECAP = { final: q.get("final") === "1" };
    show("end");
    endLetter = false;
    paintEnd();
    return true;
  }
  LD.demoRecap = demoRecap;

  function renderHistory() {
    $("screen-history").innerHTML = LD.renderHistory({ meta: loadMeta() });
    $("btn-h-back").addEventListener("click", function () { tick(); show("title"); renderTitle(); });
  }

  function showOverlay(title, body, actions, bind) {
    hideLevelUpToast();
    var ov = $("overlay");
    ov.hidden = false;
    ov.className = "overlay on";
    ov.onclick = null;
    ov.innerHTML = '<div class="panel">' + (title ? "<h2>" + LD.escapeHtml(title) + "</h2>" : "") + body + '<div class="btn-row">' + actions + "</div></div>";
    if (bind) bind();
  }

  function hideOverlay() {
    var ov = $("overlay");
    ov.className = "overlay";
    ov.onclick = null;
    ov.hidden = true;
    ov.innerHTML = "";
  }

  /* Small note beside a side-rail button (no overlay): quiet phone, etc. */
  function railTip(btn, msg) {
    var old = document.getElementById("sr-tip"); if (old) old.remove();
    if (!btn) return;
    var t = document.createElement("div");
    t.id = "sr-tip"; t.className = "sr-tip"; t.setAttribute("role", "status"); t.textContent = msg;
    document.body.appendChild(t);
    var r = btn.getBoundingClientRect(), tw = t.getBoundingClientRect();
    t.style.top = Math.max(6, Math.min(window.innerHeight - tw.height - 6, r.top + r.height / 2 - tw.height / 2)) + "px";
    t.style.left = Math.max(6, r.left - tw.width - 10) + "px";
    setTimeout(function () { t.classList.add("out"); }, 1800);
    setTimeout(function () { if (t.parentNode) t.remove(); }, 2300);
  }
  function flash(msg) {
    showOverlay("Cannot do that", "<p>" + LD.escapeHtml(msg || "That action is not available.") + "</p>",
      '<button class="btn btn-coral" id="ov-ok">OK</button>',
      function () { $("ov-ok").addEventListener("click", function () { tick(); hideOverlay(); }); }
    );
  }

  /* ---------- Penny · Onboarding: guided first quarter + one-time contextual tips ---------- */
  var PN = { on: false, mode: null, idx: -1, cur: null, loop: null, typer: null, typed: true, el: null, shownFor: null, scrolled: false, waitSince: 0 };
  var PENNY_FACES = { wink: "penny-wink", excited: "penny-excited", worried: "penny-worried", smug: "penny-smug" };
  function pq(s) { return document.querySelector(s); }
  function pvis(n) { if (!n) return false; var r = n.getBoundingClientRect(); return r.width > 0 && r.height > 0; }
  function pennyMeta() { var m = loadMeta(); if (!m.penny || typeof m.penny !== "object") m.penny = {}; if (!m.penny.tips || typeof m.penny.tips !== "object") m.penny.tips = {}; return m; }
  function pennySave(fn) { var m = pennyMeta(); fn(m.penny); saveMeta(m); }
  function bunkerOpen() { return !!pq("#overlay.bunker-mode .bk-view"); }
  function reportOpen() { return !!pq("#overlay.report-mode #ov-ok"); }
  function pennyPin() {
    var best = null;
    Array.prototype.forEach.call(document.querySelectorAll(".desk .pin"), function (p) {
      var d = LD.dealById(p.getAttribute("data-deal"));
      if (!best) best = p;
      if (LD.dealKind(d) === "claim" && LD.dealKind(LD.dealById(best.getAttribute("data-deal"))) !== "claim") best = p;
    });
    return best;
  }
  function pennyRoom() {
    var best = null, bestScore = 1e9;
    LD.availableUpgrades(state).forEach(function (u) {
      var n = pq('#overlay .bk-view [data-room="' + u.systemId + '"]');
      if (!n || u.inbound || !(u.canSound || u.canCheap)) return;
      var score = state.bunker[u.systemId].level * 10 + (u.canSound ? 0 : 5);
      if (score < bestScore) { best = n; bestScore = score; }
    });
    return best || pq('#overlay .bk-view [data-room]');
  }
  function isRoom(k) { return !!(k && LD.BUNKER_ROOMS && LD.BUNKER_ROOMS[k]); }
  function clickEl(n) { if (n) n.dispatchEvent(new MouseEvent("click", { bubbles: true })); }
  function pennyCard(kind) {
    if (!state || !state.fy || !state.fy.fight) return null;
    var cs = Array.prototype.slice.call(document.querySelectorAll("#door .df-hand .dc:not(.no), #door .sd-fhand .dc:not(.no)"));
    if (kind === "p") cs = cs.filter(function (c) { return c.querySelector(".dc-p"); });
    return cs[0] || null;
  }

  /* Penny's guided first quarter (rewritten 2026-11-19 for the eras / office hub / door fight / side rail build).
     n = group shown as "n / TOUR_TOTAL". on = event that advances. act = what "Do it for me" does. Targets are the real controls. */
  function pennyExec() { return (state && LD.execById(state.executiveId)) || {}; }
  function pennyEra() { return (LD.ERAS && LD.eraOf && state) ? LD.ERAS[LD.eraOf(state)] : null; }
  /* A target made of several controls: one box around all of them (Penny cuts one hole). */
  function pennyUnion(sel) {
    var ns = Array.prototype.filter.call(document.querySelectorAll(sel), pvis);
    if (!ns.length) return null;
    return { getBoundingClientRect: function () { var L = 1e9, T = 1e9, R = -1e9, B = -1e9; ns.forEach(function (n) { var r = n.getBoundingClientRect(); L = Math.min(L, r.left); T = Math.min(T, r.top); R = Math.max(R, r.right); B = Math.max(B, r.bottom); }); return { left: L, top: T, right: R, bottom: B, width: R - L, height: B - T }; },
      scrollIntoView: function () {} };
  }
  function fightLive() { return !!(state && state.fy && state.fy.fight && !state.fy.fight.done); }
  var TOUR = [
    { id: "era", n: 1, face: "wink", next: true,
      text: function () { var E = pennyEra(); return "Welcome to Port Calder, <b>" + (E ? E.year + ", " + E.name : "1978") + "</b> ✦ Your climb runs 12 quarters through three eras: <b>1978</b>, <b>2008</b> and <b>today</b>. Each quarter you sign <b>one deal</b> and place <b>one bunker order</b>."; },
      skip: function () { return state.phase !== "deal"; },
      target: function () { return pq("#rail-wrap"); } },
    { id: "pin", n: 2, face: "excited", on: "pin", label: "Pick one for me ▸",
      text: "These glowing pins are this quarter's <b>deals</b>. Tap one to see what it pays… and who pays for it!",
      skip: function () { return state.phase !== "deal"; },
      target: function () { return pennyPin(); },
      act: function () { var t = pennyPin(); if (t) selectDealPin(t.getAttribute("data-deal")); } },
    { id: "preview", n: 2, face: "smug", next: true, back: "pin",
      text: "<b>Now</b> is what lands in your account. <b>Later</b> is the bill, parked on the timeline. And every deal sends someone to your <b>door</b>: the sheet says who.",
      skip: function () { return state.phase !== "deal"; },
      lost: function () { return !sel.deal; },
      target: function () { return pq("#dossier .deal-dz") || pq("#dossier"); }, glow: ".desk .pv-plate, .desk .pv-outline" },
    { id: "sign", n: 2, face: "excited", on: "signed", back: "pin", label: "Sign it for me ▸",
      text: "Love it. Pure synergy! <b>Sign the deal</b>. One signature per quarter, so make it count ♡",
      skip: function () { return state.phase !== "deal"; },
      lost: function () { return !sel.deal; },
      target: function () { return pq("#btn-sign:not([disabled])") || pq("#dossier .dz-choice:not([disabled])"); },
      act: function () { clickEl(pq("#btn-sign:not([disabled])") || pq("#dossier .dz-choice:not([disabled])")); } },
    { id: "door", n: 3, face: "worried", on: "fight-card", label: "Play one for me ▸",
      text: "Knock knock! They're here. Cards cost <b>◆ Influence</b> (3 a round). <b>Pressure</b> knocks down their <b>Scrutiny</b>: hit 0 and you win the room. Tap a <b>Talking Points</b>.",
      skip: function () { return !fightLive(); },
      wait: function () { return !doorOpen(); },
      target: function () { return pennyCard("p") || pq("#door .df-hand"); },
      act: function () { var c = pennyCard("p") || pennyCard(); if (c) clickEl(c); } },
    { id: "intent", n: 3, face: "smug", next: true, back: "door",
      text: "The red badge is their <b>intent</b>: what hits your cash, unrest or collapse when the round ends. <b>Deniability</b> (No Comment) blocks it point for point. The <b>Gallery</b> shows who the room is with.",
      skip: function () { return !fightLive(); },
      target: function () { return pq("#df-intent"); } },
    { id: "win", n: 3, face: "excited", on: "fight-done", label: "Play for me ▸",
      text: "Finish them! Play more <b>Pressure</b>, <b>Settle</b> (pay cash to make it go away), or <b>End round</b>. Win or lose, the deal still signs. Losing just lets their intent land.",
      skip: function () { return !fightLive(); },
      target: function () { return pennyCard("p") || pq("#df-end"); },
      act: function () { var c = pennyCard("p") || pennyCard(); if (c) clickEl(c); else clickEl(pq("#df-end")); } },
    { id: "close", n: 3, face: "wink", on: "reward-open", label: "Close it ▸",
      text: "Done! How you won stamps their portrait, and they remember it later. <b>Close the door</b> for your reward ✧",
      skip: function () { return !(state.fy && state.fy.fight); },
      target: function () { return pq("#df-close"); },
      act: function () { clickEl(pq("#df-close")); } },
    { id: "reward", n: 4, face: "excited", on: "reward-done", label: "Pick for me ▸",
      text: function () { if (pq("#door .rw-item")) return "Loot! An <b>item</b> for your briefcase: keep it for a rainy quarter (the Case button), or sell it for cash. Assets and cards come next."; return pq("#door .rw-assets") ? "Loot! Frame one <b>Asset</b> on your office wall: it pays every quarter (read the small print). Next comes a card: add one, <b>shred</b> one, or skip for cash." : "Your <b>reward</b>: add a card to your deck, <b>shred</b> a weak one, or skip for cash. A lean deck draws its best cards more often!"; },
      skip: function () { return !(state.fy && state.fy.reward); },
      target: function () { return (pq("#door .rw-item") ? pennyUnion("#door .rw-item, #door .rw-foot .btn") : null) || pennyUnion("#door .rw-assets [data-asset]") || pennyUnion("#door .rw-cards [data-card]") || pq("#door .rw-in"); },
      act: function () { var a = pq("#door [data-asset]"); if (a) { clickEl(a); return; } var k = pq("#rw-keep"); if (k) { clickEl(k); return; } var c = pq("#door [data-card]"); if (c) { clickEl(c); setTimeout(function () { clickEl(pq("#rw-take")); }, 80); } } },
    { id: "bunker", n: 5, face: "wink", on: "bunker-open", label: "Open it ▸",
      text: function () { var x = pennyExec(); return "Back at the desk. That hatch on the side is your way down to <b>" + LD.escapeHtml(x.compound || "your bunker") + "</b>. One bunker order per quarter: open it up!"; },
      skip: function () { return (LD.isHouse && LD.isHouse(state)) || state.phase !== "bunker" || state.bunkerActedThisTurn; },
      wait: function () { return bunkerOpen() || !!pq("#overlay.on") || doorOpen(); },
      target: function () { return pq("#bunker-card"); },
      act: function () { clickEl(pq("#bunker-card")); } },
    { id: "room", n: 5, face: "excited", on: "room", back: "bunker", label: "Pick for me ▸",
      text: "Four rooms: <b>Air, Water, Power, Food</b>. The doors only close for you once all four work. Tap a room ✧",
      skip: function () { return state.bunkerActedThisTurn || (bk.focus && isRoom(bk.focus) && bunkerOpen()); },
      lost: function () { return !bunkerOpen(); },
      target: function () { return pennyRoom(); },
      act: function () { clickEl(pennyRoom()); } },
    { id: "order", n: 5, face: "worried", on: "built", back: "room", label: "Order it for me ▸",
      text: "<b>Sound</b> work costs more and <i>holds</i>. <b>Discount</b> is cheaper… but at Lv 2 it cracks at sealing unless you hire an engineer or reach Lv 3. Ehehe… choose wisely!",
      skip: function () { return state.bunkerActedThisTurn; },
      lost: function () { return !bunkerOpen() || !bk.focus || !isRoom(bk.focus); },
      target: function () { return pq("#bk-panel .bp-buy") || pq("#bk-panel"); },
      act: function () { clickEl(pq('#bk-panel [data-up][data-q="sound"]:not([disabled])') || pq("#bk-panel [data-up]:not([disabled])")); } },
    { id: "office", n: 6, face: "smug", next: true,
      text: "Your office holds your three numbers. <b>Cash</b> sits on the desk. <b>Unrest</b> is the door: the angrier the street, the harder they knock. <b>Collapse</b> is the city out the window. Either one at 100 ends you.",
      wait: function () { return bunkerOpen() || !!pq("#overlay.on"); },
      target: function () { return pq(".desk .dash-meters"); } },
    { id: "rail", n: 6, face: "wink", next: true,
      text: "Your desk drawer, on the side: your <b>Deck</b>, your <b>Case</b> (Assets on the wall, items in the drawer) and the <b>Phone</b>. When it rings, take the call: headhunters hire fixers, old friends offer a <b>Favour</b>.",
      wait: function () { return !!pq("#overlay.on"); },
      target: function () { return pq("#side-rail .sr-top"); } },
    { id: "endq", n: 7, face: "excited", on: "endq", label: "End Quarter ▸",
      text: "Ready? Press <b>End Quarter</b> and watch the world react to your genius.",
      skip: function () { return state.phase === "deal" || state.turn > PN.startTurn; },
      wait: function () { return !!pq("#overlay.on"); },
      target: function () { return pq("#btn-endq"); },
      act: function () { clickEl(pq("#btn-endq")); } },
    { id: "react", n: 7, face: "wink", passive: true, on: "report",
      text: "Here it comes… income, protests, Collapse ticking up. Busy being visionary? <b>Skip</b> any time.",
      skip: function () { return reportOpen(); },
      target: function () { return null; } },
    { id: "report", n: 7, face: "smug", on: "report-closed", label: "Next quarter ▸",
      text: "Your <b>quarterly report</b>. Numbers went up! Some of them were the bad ones.",
      skip: function () { return !reportOpen() && state.phase === "deal" && state.turn > PN.startTurn; },
      target: function () { return pq("#overlay.report-mode #ov-ok"); },
      act: function () { clickEl(pq("#ov-ok")); } },
    { id: "goal", n: 8, face: "excited", next: true, last: true,
      text: function () { return "The goal: all <b>4 rooms at Lv 2+</b>, then <b>seal the bunker from Q" + LD.MIN_EVAC_TURN + "</b>, before Collapse or Unrest hit 100. Bosses knock at Q4 and Q8. Between climbs, spend your Dividends ◈ in the <b>Summit Lounge</b>. Go get 'em, Executive! ✦"; },
      wait: function () { return !!pq("#overlay.on") || doorOpen(); },
      target: function () { return pq("#bunker-card"); } }
  ];
  var TOUR_TOTAL = 8;
  /* The same guided first quarter on the seated house desk (the default game since the flip): deal props instead of map
     pins + dossier, the Bunker behind the chair instead of the rail hatch. The fight, reward and report steps are the
     shop's own (the fight is the same game). */
  function tourStep(id) { for (var i = 0; i < TOUR.length; i++) if (TOUR[i].id === id) return TOUR[i]; return null; }
  function pennyProp() {
    var best = null;
    Array.prototype.forEach.call(document.querySelectorAll(".desk.sd .sd-prop[data-deal]"), function (p) {
      if (!pvis(p)) return;
      var d = LD.dealById(p.getAttribute("data-deal"));
      if (!best) best = p;
      if (LD.dealKind(d) === "claim" && LD.dealKind(LD.dealById(best.getAttribute("data-deal"))) !== "claim") best = p;
    });
    return best;
  }
  var TOUR_HOUSE = [
    { id: "era", n: 1, face: "wink", next: true,
      text: function () { var E = pennyEra(); return "Welcome to Port Calder, <b>" + (E ? E.year + ", " + E.name : "1978") + "</b> ✦ Your climb runs 12 quarters through three eras, each with its own goal: build the <b>company</b> in 1978, buy the <b>island</b> in 2008, then seal the <b>bunker</b> today. Each quarter you sign <b>one deal</b> from the props on your desk."; },
      skip: function () { return state.phase !== "deal"; },
      target: function () { return pq(".desk.sd .sd-hud"); } },
    { id: "pin", n: 2, face: "excited", on: "pin", label: "Pick one for me ▸",
      text: "These are this quarter's <b>deals</b>, one on each prop. Tap one to open it and see what it pays… and who pays for it!",
      skip: function () { return state.phase !== "deal" || !!pq("#sd-peek #btn-sign"); },
      target: function () { return pennyProp(); },
      act: function () { var t = pennyProp(); if (t) selectDealPin(t.getAttribute("data-deal")); } },
    { id: "sign", n: 2, face: "excited", on: "signed", back: "pin", label: "Sign it for me ▸",
      text: "The slip says what lands <b>now</b>, what it costs <b>later</b>, and who comes to your <b>door</b>. Love it. Pure synergy! <b>Sign</b> it ♡",
      skip: function () { return state.phase !== "deal"; },
      lost: function () { return !pq("#sd-peek #btn-sign"); },
      target: function () { return pq("#sd-peek #btn-sign"); },
      act: function () { clickEl(pq("#sd-peek #btn-sign")); } },
    tourStep("door"), tourStep("intent"), tourStep("win"), tourStep("close"), tourStep("reward"),
    { id: "bunker", n: 5, face: "wink", next: true,
      text: function () { var x = pennyExec(); var era = LD.eraAct ? LD.eraAct(state) : 3; return era === 1 ? "Back at the desk. Behind your chair is your <b>holdings board</b>: tap <b>Bunker</b> to turn round. One <b>order</b> a quarter builds the four facilities, and the people at the door still pick their rooms for later." : era === 2 ? "Behind your chair is <b>the island</b>: tap <b>Bunker</b> to turn round. One order a quarter builds its four sites, paid from Offshore first." : "Back at the desk. Behind your chair is <b>" + LD.escapeHtml(x.compound || "your bunker") + "</b>: tap <b>Bunker</b> any time to turn round and run the house: rooms, stores and who comes with you."; },
      wait: function () { return !!pq("#overlay.on") || doorOpen(); },
      target: function () { return pq("#house-peek"); } },
    { id: "office", n: 6, face: "smug", next: true,
      text: "Your three numbers sit up top. <b>Cash</b> pays for everything. <b>Unrest</b> is the street: the angrier it gets, the harder they knock. <b>Collapse</b> is the city out the window. Either one at 100 ends you.",
      wait: function () { return !!pq("#overlay.on") || doorOpen(); },
      target: function () { return pq(".desk.sd .sd-hud"); } },
    { id: "rail", n: 6, face: "wink", next: true,
      text: "Your <b>Deck</b> is under your hands. The <b>Case</b> holds Assets and items, and when the <b>Phone</b> rings, take the call: headhunters hire fixers, old friends offer a <b>Favour</b>.",
      wait: function () { return !!pq("#overlay.on") || doorOpen(); },
      target: function () { return pennyUnion("#btn-portfolio, #btn-phone, #sd-tab"); } },
    tourStep("endq"), tourStep("react"),
    /* the house report closes into the chair turn (the TV), not straight back to the deal phase */
    (function () { var r = tourStep("report"); if (!r) return null; var c = {}; for (var k in r) c[k] = r[k];
      c.skip = function () { return !reportOpen() && state.turn > PN.startTurn; }; return c; })(),
    { id: "goal", n: 8, face: "excited", next: true, last: true,
      text: function () { return "The goals: all four <b>facilities</b> running by Q4, the <b>island</b> built by Q8, and both feed the bunker. In the end, get all four rooms <b>on</b> and holding, then <b>seal the doors from Q" + LD.MIN_EVAC_TURN + "</b>, before Collapse or Unrest hit 100. Bosses knock at Q4 and Q8. Between climbs, spend your Dividends ◈ in the <b>Summit Lounge</b>. Go get 'em, Executive! ✦"; },
      wait: function () { return !!pq("#overlay.on") || doorOpen(); },
      target: function () { return pq("#house-peek"); } }
  ].filter(Boolean);
  function curTour() { return (state && LD.isHouse && LD.isHouse(state)) ? TOUR_HOUSE : TOUR; }

  var PENNY_TIPS = {
    crisis: { face: "worried", text: function () { return "Uh-oh, a <b>crisis</b>! You pick a response instead of a plain signature. Paying it off works… until Unrest hits " + LD.mods(state).crisisNoPayAt + ". Then the street stops cashing cheques."; },
      target: function () { return pq("#dossier .deal-dz") || pq("#dossier"); } },
    "private": { face: "smug", text: function () { return "<b>Go private</b>: run your own supply! Installs ignore public network damage and never arrive late… but every deal pays only " + Math.round(LD.conversionRate(state) * 100) + "% from then on. Once per run!"; },
      target: function () { return pq("#bk-panel") || pq('#overlay [data-spot="private"]'); } },
    region: { face: "wink", text: function () { return "A <b>region dossier</b>! Regions you own take one regional order per quarter: plants and soothing. The <b>Mood / Networks / Holdings</b> lenses up top read the whole map at a glance."; },
      target: function () { return pq("#dossier .dz") || pq("#dossier"); } },
    dividends: { face: "excited", text: function () { return "Payday! Every run pays <b>Dividends ◈</b>, itemised in your Shareholder Letter. Spend them in the <b>Summit Lounge</b>: new executives, perks, deal packs and very tasteful cosmetics."; },
      target: function () { return pq("#screen-end .letter") || pq("#screen-boardroom .lg-bal"); } },
    fight: { face: "worried", text: function () { return "Someone's at the <b>door</b>! Every deal brings one. <b>Pressure</b> cards lower their Scrutiny (0 = you win), <b>Deniability</b> blocks the red intent. 3 ◆ a round. Losing still signs the deal, just with damage."; },
      target: function () { return pq("#door .df-stage"); } },
    reward: { face: "excited", text: function () { return "Your <b>reward</b>! Add a card, <b>shred</b> one (it gets pricier each time), or skip for cash. Bosses and the Hearing also frame an <b>Asset</b> on your wall."; },
      target: function () { return pq("#door .rw-in"); } },
    boss: { face: "worried", text: function () { return "Every act ends in a <b>boss quarter</b>. " + (state && LD.isHouse(state) ? "" : "Tap the red marker on the timeline any time to see what it wants. ") + "Q4 and Q8 are card fights at the door: beat them for a rare card, an Asset and loot. Miss and… well, the board remembers."; },
      target: function () { return pq(".desk #rail-wrap .rm.boss") || pq("#rail-wrap") || pq(".desk.sd .sd-hud"); } },
    era1: { face: "excited", text: function () { return "Your <b>holdings board</b>! One <b>order</b> a quarter, cash only, on top of the house. Get all four facilities running by <b>Q4</b>. Lv 2 facilities open island sites in 2008; <b>Offshore</b> banks money for it."; },
      target: function () { return pq("#house-root .hv-ecard") || pq("#house-root .hv-screen"); } },
    era2: { face: "wink", text: function () { return "Welcome to <b>2008</b>: the island! Build all four sites by <b>Q8</b>, paid from Offshore first. Each site's level decides how its bunker room starts: Lv 2 switches it on, Lv 3 makes it sound."; },
      target: function () { return pq("#house-root .hv-ecard") || pq("#house-root .hv-screen"); } },
    era3: { face: "smug", text: function () { return "Now it's the <b>bunker</b>. Your island set the rooms' start, and Offshore's leftovers are in the stores. Get all four rooms on and holding, then seal from <b>Q" + LD.MIN_EVAC_TURN + "</b>."; },
      target: function () { return pq("#house-root .hv-ebar") || pq("#house-root .hv-band") || pq("#house-root .hv-screen"); } },
    ratings: { face: "smug", text: function () { return "<b>Credit ratings</b>: win at a rating to unlock the next one, from AAA all the way down to D. Every tier adds a new rule, and exits there pay a lot more. No pressure ♡"; },
      target: function () { return pq("#screen-exec .rating-row"); } }
  };

  function pennyBuild() {
    if (PN.el) return PN.el;
    var el = document.createElement("div");
    el.id = "penny";
    el.className = "penny";
    el.hidden = true;
    el.innerHTML = '<div class="pn-blk" data-b="t"></div><div class="pn-blk" data-b="l"></div><div class="pn-blk" data-b="r"></div><div class="pn-blk" data-b="b"></div>' +
      '<div class="pn-hole" aria-hidden="true"></div>' +
      '<div class="pn-arrow" aria-hidden="true"><svg viewBox="0 0 60 70"><path d="M30 68 L4 36 H19 V2 H41 V36 H56 Z"/></svg></div>' +
      '<div class="pn-box" role="dialog" aria-modal="false" aria-label="Penny, onboarding">' +
      '<img class="pn-face" alt="" src="">' +
      '<div class="pn-card"><div class="pn-head"><div class="pn-name">PENNY <span>· Onboarding</span></div><div class="pn-count"></div></div>' +
      '<p class="pn-text" aria-hidden="true"></p><p class="sr-only pn-sr" aria-live="polite"></p>' +
      '<div class="pn-actions"><button class="pn-alt" type="button" hidden></button><button class="pn-next" type="button">Next ▸</button></div></div>' +
      '<button class="pn-skip" type="button">Skip tutorial</button></div>';
    document.body.appendChild(el);
    el.querySelector(".pn-next").addEventListener("click", function (e) { e.stopPropagation(); tick(); pennyNext(); });
    el.querySelector(".pn-skip").addEventListener("click", function (e) { e.stopPropagation(); tick(); if (PN.mode === "tip") pennyMuteTips(); else pennySkip(); });
    el.querySelector(".pn-alt").addEventListener("click", function (e) { e.stopPropagation(); tick(); pennySkip(); });
    el.querySelector(".pn-text").addEventListener("click", function () { pennyFinishType(); });
    Array.prototype.forEach.call(el.querySelectorAll(".pn-blk"), function (b) {
      b.addEventListener("click", function (e) {
        e.stopPropagation();
        if (PN.mode === "tip") { pennyCloseTip(); return; }
        var a = el.querySelector(".pn-arrow");
        a.classList.remove("nudge"); void a.offsetWidth; a.classList.add("nudge");
      });
    });
    PN.el = el;
    return el;
  }

  function pennyType(html) {
    var el = PN.el.querySelector(".pn-text");
    var out = "", inTag = false;
    for (var i = 0; i < html.length; i++) {
      var c = html[i];
      if (c === "<") inTag = true;
      if (inTag) { out += c; if (c === ">") inTag = false; continue; }
      if (c === "&") { var j = html.indexOf(";", i); out += '<span class="ch">' + html.slice(i, j + 1) + "</span>"; i = j; continue; }
      out += '<span class="ch">' + c + "</span>";
    }
    el.innerHTML = out;
    PN.el.querySelector(".pn-sr").textContent = el.textContent;
    var chars = el.querySelectorAll(".ch");
    clearInterval(PN.typer);
    if (reduced()) { el.classList.add("done"); PN.typed = true; return; }
    el.classList.remove("done");
    PN.typed = false;
    var k = 0;
    PN.typer = setInterval(function () {
      for (var s = 0; s < 2 && k < chars.length; s++) chars[k++].classList.add("on");
      if (k >= chars.length) pennyFinishType();
    }, 22);
  }
  function pennyFinishType() {
    clearInterval(PN.typer);
    if (!PN.el) return;
    PN.el.querySelector(".pn-text").classList.add("done");
    PN.typed = true;
  }

  function pennyShowStep(step) {
    var el = pennyBuild();
    PN.cur = step;
    PN.scrolled = false;
    PN.shownFor = null;
    el.querySelector(".pn-face").src = assetUrlP(PENNY_FACES[step.face] || "penny-wink");
    var count = el.querySelector(".pn-count");
    count.textContent = step.n ? step.n + " / " + TOUR_TOTAL : "";
    var next = el.querySelector(".pn-next");
    var alt = el.querySelector(".pn-alt");
    var skip = el.querySelector(".pn-skip");
    alt.hidden = true;
    if (PN.mode === "tip") { next.textContent = "Got it ✓"; skip.textContent = "Mute tips"; }
    else if (step.offer) { next.textContent = "Yes, show me ▸"; skip.textContent = "Skip tutorial"; }
    else if (step.last) { next.textContent = "Let's go! ✦"; skip.textContent = "Skip tutorial"; }
    else { next.textContent = step.label || (step.act ? "Do it for me ▸" : "Next ▸"); skip.textContent = "Skip tutorial"; }
    if (step.scrollTo && isPhone()) { var st = pq(step.scrollTo); if (st) try { st.scrollIntoView({ block: "start" }); } catch (e) {} }
    next.hidden = !!step.passive;
    el.classList.toggle("is-tip", PN.mode === "tip");
    el.classList.toggle("is-passive", !!step.passive);
    el.classList.toggle("is-action", !!step.act);
    pennyType(typeof step.text === "function" ? step.text() : step.text);
    el.hidden = false;
    pennyPlace();
    var box = el.querySelector(".pn-box");
    box.classList.remove("pop"); void box.offsetWidth; box.classList.add("pop");
    try { next.focus({ preventScroll: true }); } catch (e) {}
  }
  function assetUrlP(name) { return LD.assetUrl ? LD.assetUrl(name) : "assets/" + name + ".webp"; }

  function pennyPlace() {
    var el = PN.el, step = PN.cur;
    if (!el || !step || el.hidden && !PN.on) return;
    var t = step.target ? step.target() : null;
    var vw = window.innerWidth, vh = window.innerHeight;
    var box = el.querySelector(".pn-box");
    var hole = el.querySelector(".pn-hole"), arrow = el.querySelector(".pn-arrow");
    var blks = el.querySelectorAll(".pn-blk");
    Array.prototype.forEach.call(document.querySelectorAll(".pn-glow"), function (g) { g.classList.remove("pn-glow"); });
    if (step.glow) Array.prototype.forEach.call(document.querySelectorAll(step.glow), function (g) { g.classList.add("pn-glow"); });
    if (!t || !pvis(t)) {
      hole.style.display = "none";
      arrow.style.display = "none";
      var full = !step.passive;
      blks[0].style.cssText = full ? "left:0;top:0;width:100vw;height:" + ((window.visualViewport && visualViewport.height) || window.innerHeight) + "px;" : "display:none";
      for (var i = 1; i < 4; i++) blks[i].style.cssText = "display:none";
      el.classList.add("box-top");
      pennyAvoidControls(box);
      return;
    }
    if (!PN.scrolled) {
      PN.scrolled = true;
      var r0 = t.getBoundingClientRect();
      var boxH0 = box.getBoundingClientRect().height || 200;
      if (r0.top < 8 || r0.bottom > vh - boxH0 - 12) {
        try { t.scrollIntoView({ block: r0.height > vh * 0.45 ? "start" : "center", behavior: "auto" }); } catch (e) {}
      }
    }
    var r = t.getBoundingClientRect();
    var pad = 8;
    var L = Math.max(0, r.left - pad), T = Math.max(0, r.top - pad), R = Math.min(vw, r.right + pad), B = Math.min(vh, r.bottom + pad);
    hole.style.display = "block";
    hole.style.cssText = "display:block;left:" + L + "px;top:" + T + "px;width:" + (R - L) + "px;height:" + (B - T) + "px;";
    blks[0].style.cssText = "left:0;top:0;width:100vw;height:" + T + "px;";
    blks[1].style.cssText = "left:0;top:" + T + "px;width:" + L + "px;height:" + (B - T) + "px;";
    blks[2].style.cssText = "left:" + R + "px;top:" + T + "px;width:" + Math.max(0, vw - R) + "px;height:" + (B - T) + "px;";
    blks[3].style.cssText = "left:0;top:" + B + "px;width:100vw;height:" + Math.max(0, vh - B) + "px;";
    var bh = box.getBoundingClientRect().height || 200;
    var wantTop = B > vh - bh - 16 && T > bh + 16;
    el.classList.toggle("box-top", wantTop);
    var bb = box.getBoundingClientRect();
    /* Arrow: above the hole pointing down, or below pointing up; keep it off the dialogue box. */
    var cx = (L + R) / 2;
    var up = T < 84 || (wantTop && T - 76 < bb.bottom);
    var ay = up ? B + 6 : T - 74;
    if (!up && !wantTop && ay + 70 > bb.top && bb.top > 0 && T > bb.top - 10) up = true, ay = B + 6;
    arrow.style.display = "block";
    arrow.style.left = Math.max(4, Math.min(vw - 60, cx - 30)) + "px";
    arrow.style.top = Math.max(4, Math.min(vh - 74, ay)) + "px";
    arrow.classList.toggle("up", up);
    pennyAvoidControls(box);
    if (pennyFitAway(box, { left: L, top: T, right: R, bottom: B })) {
      /* Box moved: re-aim the arrow from the side the box is not on. */
      var nb = box.getBoundingClientRect(), up2 = nb.top < T;
      var ay2 = up2 ? B + 6 : T - 74;
      if (!up2 && ay2 < nb.bottom) { up2 = true; ay2 = B + 6; }
      arrow.style.top = Math.max(4, Math.min(vh - 74, ay2)) + "px";
      arrow.classList.toggle("up", up2);
    }
  }
  /* Last resort: if the dialogue still sits on the thing it points at, slide it into the free band
     just below (or above) the target, between the target and the nearest control. */
  function pennyFitAway(box, hr) {
    var b = box.getBoundingClientRect(), vh = window.innerHeight;
    var ix = Math.min(b.right, hr.right) - Math.max(b.left, hr.left), iy = Math.min(b.bottom, hr.bottom) - Math.max(b.top, hr.top);
    if (ix <= 4 || iy <= 4) return false;
    var stops = document.querySelectorAll("#btn-endq, #door .df-hand, #door .df-actions, #df-end, #df-settle, #df-close, #door .rw-foot, #overlay .btn-row");
    var floor = vh - 6, ceil = 6;
    Array.prototype.forEach.call(stops, function (n) { if (!pvis(n)) return; var r = n.getBoundingClientRect(); if (r.top >= hr.bottom - 2 && r.top < floor) floor = r.top - 4; if (r.bottom <= hr.top + 2 && r.bottom > ceil) ceil = r.bottom + 4; });
    var h = b.height, el = PN.el, vw = window.innerWidth;
    /* Wide screens: move beside the target first. */
    if (vw > 720) {
      var room = Math.max(hr.left - 24, vw - hr.right - 24);
      if (room >= 340) {
        var w = Math.min(620, room), left = hr.left - 24 >= vw - hr.right - 24 ? 12 : hr.right + 12;
        box.style.transform = "none"; box.style.left = Math.round(left) + "px"; box.style.right = "auto"; box.style.width = Math.round(w) + "px";
        var nb = box.getBoundingClientRect();
        if (Math.min(nb.right, hr.right) - Math.max(nb.left, hr.left) <= 4) return true;
      }
    }
    var place = function (top) { el.classList.add("box-top"); box.style.bottom = "auto"; box.style.top = Math.round(Math.max(vw <= 720 ? 24 : 22, top)) + "px"; }; /* room for the name pill above the card */
    if (hr.bottom + 10 + h <= floor) { place(hr.bottom + 10); return true; }
    if (hr.top - 10 - h >= ceil) { place(hr.top - 10 - h); return true; }
    /* No clean band: pick the bigger side and keep the box off the target's centre line at least. */
    if (floor - hr.bottom > hr.top - ceil) place(Math.min(vh - h - 6, hr.bottom + 6)); else place(Math.max(6, hr.top - 6 - h));
    return true;
  }
  function pennyHits(box, nodes) {
    var b = box.getBoundingClientRect();
    var skip = box.querySelector(".pn-skip");
    var sr = skip ? skip.getBoundingClientRect() : null;
    for (var i = 0; i < nodes.length; i++) {
      if (!pvis(nodes[i])) continue;
      var d = nodes[i].getBoundingClientRect();
      var ix = Math.min(b.right, d.right) - Math.max(b.left, d.left);
      var iy = Math.min(b.bottom, d.bottom) - Math.max(b.top, d.top);
      if (ix > 6 && iy > 6) return true;
      if (sr) {
        var sx = Math.min(sr.right, d.right) - Math.max(sr.left, d.left);
        var sy = Math.min(sr.bottom, d.bottom) - Math.max(sr.top, d.top);
        if (sx > 4 && sy > 4) return true;
      }
    }
    return false;
  }
  /* Keep Penny off the deal card, End Quarter, the forecast rail, the ticker and the fight hand. */
  function pennyAvoidControls(box) {
    box.style.left = ""; box.style.width = ""; box.style.top = ""; box.style.bottom = ""; box.style.transform = ""; box.style.right = "";
    var vw = window.innerWidth, vh = window.innerHeight;
    var el = PN.el;
    /* Phones: keep the dialogue clear of the side rail so every rail button stays visible and tappable. */
    var rail = document.querySelector(".desk #side-rail");
    if (vw <= 720 && rail && pvis(rail) && !bunkerOpen() && !doorOpen() && !pq("#overlay.on")) box.style.right = Math.max(8, Math.round(vw - rail.getBoundingClientRect().left + 6)) + "px";
    var dz = document.querySelector(".desk.has-sel .deal-dz, .desk.has-sel #dossier");
    if (vw > 720 && dz && pvis(dz)) {
      var d = dz.getBoundingClientRect(), b = box.getBoundingClientRect();
      var ix = Math.min(b.right, d.right) - Math.max(b.left, d.left), iy = Math.min(b.bottom, d.bottom) - Math.max(b.top, d.top);
      if (ix > 0 && iy > 0) {
        if (d.right < vw * 0.5) {
          var left = d.right + 10;
          box.style.transform = "none"; box.style.left = left + "px"; box.style.width = Math.max(320, Math.min(860, vw - left - 12)) + "px";
        } else if (d.left > vw * 0.5) {
          box.style.transform = "none"; box.style.left = "12px"; box.style.width = Math.max(320, Math.min(860, d.left - 22)) + "px";
        }
      }
    }
    var avoid = document.querySelectorAll("#btn-endq, #rail-wrap, .desk .ticker, .office .ticker, #door .df-hand, #door .df-actions, #df-end, #df-settle, #df-close, #df-shred");
    if (!pennyHits(box, avoid)) return;
    el.classList.add("box-top");
    box.style.left = ""; box.style.top = ""; box.style.bottom = ""; box.style.transform = "";
    if (!pennyHits(box, avoid)) return;
    var w = Math.max(280, Math.min(520, Math.floor(vw * 0.44)));
    var tries = [
      { left: 12, top: 64, width: w },
      { left: Math.max(12, vw - 12 - w), top: 64, width: w },
      { left: 12, top: Math.max(56, Math.floor(vh * 0.22)), width: Math.min(w, 420) },
      { left: Math.max(12, vw - 12 - Math.min(w, 420)), top: Math.max(56, Math.floor(vh * 0.22)), width: Math.min(w, 420) }
    ];
    for (var i = 0; i < tries.length; i++) {
      var p = tries[i];
      el.classList.add("box-top");
      box.style.transform = "none";
      box.style.left = p.left + "px";
      box.style.top = p.top + "px";
      box.style.bottom = "auto";
      box.style.width = p.width + "px";
      if (!pennyHits(box, avoid)) return;
    }
  }

  function pennyTickLoop() {
    if (!PN.on || !PN.cur) return;
    if (!state && PN.mode === "tour") { pennyStop(); return; }
    var step = PN.cur;
    if (PN.mode === "tour" && !step.offer) {
      if (step.skip && step.skip()) { pennyAdvance(); return; }
      if (step.lost && step.lost() && step.back) { pennyGoto(step.back); return; }
    }
    var waiting = step.wait && step.wait();
    var t = step.target ? step.target() : null;
    var hide = waiting || (step.target && !step.passive && !(t && pvis(t)) && !step.offer);
    if (hide) {
      if (!PN.el.hidden) { PN.el.hidden = true; }
      return;
    }
    if (PN.el.hidden) { PN.el.hidden = false; PN.scrolled = false; }
    pennyPlace();
  }

  function pennyStart(opts) {
    opts = opts || {};
    if (!state || screen !== "desk") return;
    pennyCloseTip(true);
    if (!opts.offer) pennySave(function (p) { p.tipsOff = false; });
    PN.on = true;
    PN.mode = "tour";
    PN.startTurn = state.turn;
    clearInterval(PN.loop);
    PN.loop = setInterval(pennyTickLoop, 180);
    document.body.classList.add("penny-on");
    renderDesk();
    if (opts.offer) {
      PN.idx = -1;
      pennyShowStep({ offer: true, face: "wink", n: 0, text: "Hi! I'm <b>Penny</b>, from Onboarding ✦ Want a quick guided first quarter? Eight short steps, zero liability! Skip it and I'll stay quiet ♡", target: null });
      return;
    }
    PN.idx = -1;
    pennyAdvance();
  }
  function pennyGoto(id) {
    var T = curTour();
    for (var i = 0; i < T.length; i++) if (T[i].id === id) { PN.idx = i; pennyShowStep(T[i]); return; }
  }
  function pennyAdvance() {
    PN.idx += 1;
    var T = curTour();
    while (PN.idx < T.length && T[PN.idx].skip && T[PN.idx].skip()) PN.idx += 1;
    if (PN.idx >= T.length) { pennyDone(); return; }
    pennyShowStep(T[PN.idx]);
  }
  function pennyNext() {
    if (!PN.on || !PN.cur) return;
    if (!PN.typed) { pennyFinishType(); return; }
    var step = PN.cur;
    if (PN.mode === "tip") { pennyCloseTip(); return; }
    if (step.offer) { pennyAdvance(); return; }
    if (step.last) { pennyDone(); return; }
    if (step.act) { step.act(); return; }
    if (step.passive) return;
    pennyAdvance();
  }
  function pennyEmit(ev) {
    if (PN.mode === "tour" && PN.cur && PN.cur.on === ev) {
      var at = PN.cur;
      setTimeout(function () { if (PN.cur === at && PN.on) pennyAdvance(); }, 60);
    }
  }
  function pennyStop() {
    PN.on = false;
    PN.mode = null;
    PN.cur = null;
    clearInterval(PN.loop);
    clearInterval(PN.typer);
    document.body.classList.remove("penny-on");
    Array.prototype.forEach.call(document.querySelectorAll(".pn-glow"), function (g) { g.classList.remove("pn-glow"); });
    if (PN.el) PN.el.hidden = true;
  }
  function pennyDone(skipped) {
    /* Skipping the tour also mutes the one-time tips (they used to pop over fight intros right after a skip).
       Finishing it marks the tips the tour already covered as seen. Tips can be turned back on by replaying the tour. */
    pennySave(function (p) { p.done = true; p.offered = true; if (skipped) p.tipsOff = true; else { p.tips = p.tips || {}; p.tips.fight = p.tips.reward = p.tips.boss = true; } });
    var wasDesk = screen === "desk" && state && !state.ended;
    pennyStop();
    if (wasDesk) renderDesk();
  }
  function pennySkip() { pennyDone(true); }

  /* One-time tips: same dialogue, "Got it" to close. Never during the tour. */
  function pennyTip(key, force) {
    if (PN.mode === "tour") return;
    var m = pennyMeta();
    if (!force && (m.penny.tipsOff || m.penny.tips[key])) return;
    var tip = PENNY_TIPS[key];
    if (!tip) return;
    var t = tip.target();
    if (!t || !pvis(t)) return;
    pennySave(function (p) { p.tips[key] = true; });
    PN.on = true;
    PN.mode = "tip";
    clearInterval(PN.loop);
    PN.loop = setInterval(pennyTickLoop, 180);
    pennyShowStep({ id: "tip-" + key, face: tip.face, text: tip.text, target: tip.target, n: 0 });
  }
  function pennyCloseTip(silent) {
    if (PN.mode !== "tip") return;
    pennyStop();
  }
  function pennyMuteTips() { pennySave(function (p) { p.tipsOff = true; }); pennyCloseTip(); }
  function pennyShouldOffer() {
    var m = pennyMeta();
    if (m.penny.offered || m.penny.done) return false;
    return (m.finished | 0) === 0 && (!m.history || !m.history.length);
  }

  document.addEventListener("pointerdown", function (e) {
    if (PN.mode !== "tip" || !PN.on) return;
    if (e.target && e.target.closest && e.target.closest(".pn-box")) return;
    pennyCloseTip();
  }, true);
  document.addEventListener("keydown", function (e) {
    if (!PN.on || !PN.el || PN.el.hidden) return;
    if (e.key === "Escape" || e.key === "Esc") {
      e.preventDefault(); e.stopPropagation();
      if (PN.mode === "tip") pennyCloseTip(); else pennySkip();
      return;
    }
    if (e.key === "Enter" || e.key === " " || e.key === "Spacebar") {
      var a = document.activeElement;
      if (a && a.closest && (a.closest(".pn-skip") || a.closest(".pn-alt"))) return;
      var neutral = !a || a === document.body || a === document.documentElement || (a.closest && a.closest("#penny"));
      if (!neutral) return;
      e.preventDefault(); e.stopPropagation();
      pennyNext();
    }
  }, true);
  window.addEventListener("resize", function () { if (PN.on) pennyPlace(); });
  window.addEventListener("scroll", function () { if (PN.on) pennyPlace(); }, { passive: true });

  function openHowTo(inRun) {
    var m = loadMeta();
    var warn = !inRun && m.midRun ? "<p class='muted bro-warn'>The guided tour starts a fresh AAA practice climb with Mara Voss and replaces your saved run.</p>" : "";
    var body = inRun
      ? "<div class='howto-pick'><img src='" + assetUrlP("penny-wink") + "' alt=''><p><b>Penny · Onboarding</b> walks you through a real first quarter, step by step. She'll pick up from wherever you are.</p></div>"
      : "<div class='bro'><div class='bro-head'><div class='kicker'>Port Calder Tourist Board</div><h2>See the climb</h2><p>A pocket guide to profiting from the end of the world.</p></div>" +
        "<div class='bro-folds'>" +
        "<section class='bro-p'><img src='" + assetUrlP("penny-wink") + "' alt=''><h3>Guided tour</h3><p>Penny walks you through a real first quarter in 1978, one tap at a time.</p></section>" +
        "<section class='bro-p'><div class='bro-ico'>" + "<svg viewBox='0 0 32 32' aria-hidden='true'><path d='M4 7l8-2 8 2 8-2v20l-8 2-8-2-8 2z' class='i-fill'/><path d='M4 7l8-2 8 2 8-2v20l-8 2-8-2-8 2zM12 5v20M20 7v20' class='i-line'/></svg>" + "</div><h3>The rulebook</h3><p>Deals, door fights, the bunker and the board, page by page.</p></section>" +
        "<section class='bro-p bro-pack'><h3>What to pack</h3><ul><li><b>One deal a quarter</b> " + (LD.HOUSE_RULES ? "on your desk" : "on the map") + ".</li><li><b>Fights at the door:</b> Pressure to 0.</li><li><b>Climb the eras:</b> 1978, 2008, Today.</li><li><b>Seal the bunker</b> before the doors close.</li></ul></section>" +
        "</div>" + warn + "</div>";
    showOverlay(inRun ? "How to play" : "", body,
      '<button class="btn btn-coral" id="ht-penny">' + (inRun ? "Replay Penny's tour" : "Take the guided tour") + '</button><button class="btn" id="ht-rules">Read the rulebook</button><button class="btn btn-ghost" id="ht-close">' + (inRun ? "Back" : "Fold it up") + "</button>",
      function () {
        if (!inRun) $("overlay").classList.add("brochure-mode");
        $("ht-penny").addEventListener("click", function () {
          tick();
          hideOverlay();
          if (inRun) { pennyStart(); return; }
          selectedExec = "mara"; selectedRating = 0; seedDraft = "";
          PN.forceStart = true;
          startRun();
        });
        $("ht-rules").addEventListener("click", function () { tick(); screenIntent = inRun ? "play" : "title"; tutorialPage = 0; show("tutorial"); renderTutorial(); });
        $("ht-close").addEventListener("click", function () { tick(); hideOverlay(); });
        if (!inRun) $("overlay").onclick = function (e) { if (e.target === $("overlay")) { tick(); hideOverlay(); } };
      });
  }

  /* ---------- "What can I do now" highlights (matte ink outline, one pointing hand) ----------
     Logic lives in LD.actionable(state); this only maps ids to elements. Re-applied after any DOM change. */
  var HL = { raf: 0, seen: {}, seenSeed: null, target: null, since: 0, arrow: null };
  var HL_SEL = {
    deal: function (x) { return '.desk .map .pin[data-deal="' + x + '"]'; },
    bunker: function () { return "#bunker-card"; },
    order: function (x) { var p = x.split(":"); return '#bk-panel [data-up="' + p[0] + '"][data-q="' + p[1] + '"]:not([disabled])'; },
    room: function (x) { return '.bk-view [data-room="' + x + '"]'; },
    endq: function () { return "#btn-endq"; },
    card: function (x) { return '#door .df-hand [data-u="' + x + '"]'; },
    endround: function () { return "#df-end"; },
    depart: function () { return "#screen-exec #btn-start:not([disabled])"; },
    buyseat: function () { return "#screen-exec #btn-boardroom2[data-can-buy]"; },
    lounge: function () { return "#screen-boardroom .lt.lt-afford"; },
    loungesign: function () { return "#screen-boardroom #lg-sign:not([disabled])"; },
    fightclose: function () { return "#df-close"; },
    door: function () { return doorOpen() ? null : ".desk .office .of-door"; },
    reward: function () { return '#door.rw-mode [data-card]:not(.no), #door.rw-mode [data-asset], #rw-keep, #rw-take:not([disabled]), #door.rw-mode [data-isell], #door.rw-mode [data-areplace], #door.rw-mode [data-shred]:not(.no), #door.rw-mode [data-upg]:not(.no)'; },
    phone: function () { return "#btn-phone"; },
    memo: function (x) { return "#fy-m-" + x + ":not([disabled])"; },
    briefcase: function () { return "#btn-portfolio"; },
    item: function (x) { return '#overlay [data-use="' + x + '"]:not([aria-disabled])'; }
  };
  var HL_PRIO = {
    "order-sound": '#bk-panel [data-up][data-q="sound"]:not([disabled]).ld-act, #bk-panel [data-up]:not([disabled]).ld-act',
    room: ".bk-view [data-room].ld-act",
    "reward-take": "#rw-take:not([disabled])",
    reward: "#rw-keep"
  };
  /* Ochre/gold surfaces swallow an ochre outline: those get an ink/terracotta one instead. */
  function hlOchre(n) {
    if (n instanceof SVGElement) return false;
    var cs = getComputedStyle(n), m = /rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?/.exec(cs.backgroundColor);
    if (!m || (m[4] != null && +m[4] < 0.3)) m = /rgba?\((\d+),\s*(\d+),\s*(\d+)/.exec(cs.backgroundImage || "");
    if (!m) return false;
    var R = +m[1] / 255, G = +m[2] / 255, B = +m[3] / 255, mx = Math.max(R, G, B), mn = Math.min(R, G, B), l = (mx + mn) / 2, d = mx - mn;
    if (d < 0.12) return false;
    var sat = d / (1 - Math.abs(2 * l - 1)), h = mx === R ? 60 * (((G - B) / d) % 6) : mx === G ? 60 * ((B - R) / d + 2) : 60 * ((R - G) / d + 4);
    if (h < 0) h += 360;
    return h >= 22 && h <= 58 && sat > 0.35 && l > 0.3 && l < 0.82;
  }
  function hlSel(id) { var i = id.indexOf(":"), k = i < 0 ? id : id.slice(0, i), f = HL_SEL[k]; return f ? f(i < 0 ? "" : id.slice(i + 1)) : null; }
  function hlLensSeen() {
    if (!state) return null;
    var key = state.seed + "|" + (state.startedAt || "");
    if (HL.seenSeed !== key) { HL.seenSeed = key; HL.seen = {}; }
    LD.LENSES.forEach(function (l) { if (HL.seen[l] == null) HL.seen[l] = LD.lensSig(state, l); });
    return HL.seen;
  }
  function hlCovered(n) {
    var r = n.getBoundingClientRect(); if (!r.width || !r.height) return true;
    var x = Math.min(window.innerWidth - 2, Math.max(1, r.left + r.width / 2)), y = Math.min(window.innerHeight - 2, Math.max(1, r.top + r.height / 2));
    if (r.bottom < 0 || r.top > window.innerHeight || r.right < 0 || r.left > window.innerWidth) return true;
    var top = document.elementFromPoint(x, y);
    return !(top && (top === n || n.contains(top) || (top.closest && top.closest(".ld-act") === n)));
  }
  function hlArrowEl() {
    if (HL.arrow) return HL.arrow;
    var a = document.createElement("div");
    a.id = "ld-arrow"; a.className = "ld-arrow"; a.setAttribute("aria-hidden", "true"); a.hidden = true;
    a.innerHTML = '<svg viewBox="0 0 64 80"><g class="ld-hand"><path class="ld-hand-fill" d="M27 6c4-1 7 2 7 6v22l2-9c1-4 7-4 8 0v8c1-4 7-4 8 1v6c1-3 6-3 7 1v15c0 10-7 19-19 19h-3c-8 0-13-4-17-10L9 46c-2-4 2-8 6-5l6 6V12c0-3 2-6 6-6z"/><path class="ld-hand-line" d="M27 6c4-1 7 2 7 6v22l2-9c1-4 7-4 8 0v8c1-4 7-4 8 1v6c1-3 6-3 7 1v15c0 10-7 19-19 19h-3c-8 0-13-4-17-10L9 46c-2-4 2-8 6-5l6 6V12c0-3 2-6 6-6zM36 34v8M44 33v9M52 40v4"/></g></svg>';
    document.body.appendChild(a); HL.arrow = a; return a;
  }
  /* How much a hand box at (x, y) would cover things other than its target: other controls count 3, readable text 2. */
  function hlCost(n, x, y, W, H) {
    var cost = 0, seen = [];
    for (var i = 0; i < 3; i++) for (var j = 0; j < 3; j++) {
      var px = x + W * (0.18 + 0.32 * i), py = y + H * (0.18 + 0.32 * j);
      if (px < 0 || py < 0 || px > window.innerWidth || py > window.innerHeight) { cost += 4; continue; }
      var e = document.elementFromPoint(px, py);
      if (!e || e === n || n.contains(e) || seen.indexOf(e) !== -1) continue;
      seen.push(e);
      if (e.closest && e.closest("button, a, input, select, .dc, .pin, [role=button], [data-up], [data-room], .rs")) cost += 3;
      else {
        var txt = false;
        for (var k = 0; k < e.childNodes.length; k++) { var c = e.childNodes[k]; if (c.nodeType === 3 && /\S/.test(c.nodeValue)) { txt = true; break; } }
        if (txt) cost += 2;
      }
    }
    return cost;
  }
  function hlPlaceArrow() {
    var a = HL.arrow; if (!a) return;
    var n = HL.target;
    var pennyOn = (function () { var p = document.getElementById("penny"); return !!(p && !p.hidden && pvis(p)); })();
    if (!n || !document.body.contains(n) || pennyOn || hlCovered(n) || Date.now() - HL.since < 1200) { a.hidden = true; return; }
    var r = n.getBoundingClientRect(), W = 44, H = 55, G = 6;
    /* Candidates: above (points down), below (points up), left/right (points sideways), then tucked inside the target's edge. */
    var cx = r.left + r.width / 2 - W / 2, cy = r.top + r.height / 2 - H / 2;
    var cands = [
      { d: "down", x: cx, y: r.top - H - G },
      { d: "up", x: cx, y: r.bottom + G },
      { d: "right", x: r.left - W - G - 4, y: cy },
      { d: "left", x: r.right + G + 4, y: cy }
    ];
    if (r.width > W * 3) cands.push({ d: "left", x: r.right - W - 8, y: cy, inside: true });
    if (r.height > H * 1.6) cands.push({ d: "down", x: cx, y: r.top + 4, inside: true });
    var best = null;
    cands.forEach(function (c, i) {
      c.x = Math.round(Math.min(window.innerWidth - W - 4, Math.max(4, c.x)));
      c.y = Math.round(Math.min(window.innerHeight - H - 4, Math.max(4, c.y)));
      var ov = !(c.x + W <= r.left || c.x >= r.right || c.y + H <= r.top || c.y >= r.bottom);
      c.cost = hlCost(n, c.x, c.y, W, H) + i * 0.1 + (c.inside ? 2.5 : ov ? 6 : 0);
      if (!best || c.cost < best.cost) best = c;
    });
    a.style.left = best.x + "px"; a.style.top = best.y + "px";
    a.classList.toggle("up", best.d === "up");
    a.classList.toggle("left", best.d === "left");
    a.classList.toggle("right", best.d === "right");
    a.hidden = false;
  }
  function applyHighlights() {
    HL.raf = 0;
    var on = screen === "desk" && state && !state.ended && !closing;
    var res = on ? LD.actionable(state, { lensSeen: hlLensSeen() }) : { ids: [], prio: [], dim: [], badges: [] };
    if (screen === "exec" && document.querySelector("#screen-exec #btn-start:not([disabled])")) { res.ids = ["depart"]; res.prio = ["depart"]; }
    else if (screen === "exec" && document.querySelector("#screen-exec #btn-boardroom2[data-can-buy]")) { res.ids = ["buyseat"]; res.prio = ["buyseat"]; }
    else if (screen === "boardroom") { res.ids = ["lounge", "loungesign"]; res.prio = ["loungesign"]; }
    var want = new Set();
    res.ids.forEach(function (id) { var s = hlSel(id); if (!s) return; Array.prototype.forEach.call(document.querySelectorAll(s), function (n) { want.add(n); }); });
    Array.prototype.forEach.call(document.querySelectorAll(".ld-act"), function (n) { if (!want.has(n)) n.classList.remove("ld-act", "ld-primary", "ld-on-ochre"); });
    want.forEach(function (n) { if (!n.classList.contains("ld-act")) { n.classList.add("ld-act"); n.classList.toggle("ld-on-ochre", hlOchre(n)); } });
    var dim = new Set();
    var soft = new Set();
    res.dim.forEach(function (id) { var sf = /-soft$/.test(id), s = hlSel(id.replace(/-soft$/, "")); if (s) Array.prototype.forEach.call(document.querySelectorAll(s), function (n) { if (!want.has(n)) (sf ? soft : dim).add(n); }); });
    Array.prototype.forEach.call(document.querySelectorAll(".ld-dim"), function (n) { if (!dim.has(n)) n.classList.remove("ld-dim"); });
    Array.prototype.forEach.call(document.querySelectorAll(".ld-soft"), function (n) { if (!soft.has(n)) n.classList.remove("ld-soft"); });
    dim.forEach(function (n) { n.classList.add("ld-dim"); });
    soft.forEach(function (n) { n.classList.add("ld-soft"); });
    var badge = new Set(res.badges.map(function (b) { return b.slice(4); }));
    Array.prototype.forEach.call(document.querySelectorAll(".desk .lens-btn[data-lens]"), function (b) {
      var l = b.getAttribute("data-lens"), nw = badge.has(l) && !b.classList.contains("on");
      b.classList.toggle("ld-new", nw);
      if (b.classList.contains("on") && HL.seen && LD.LENSES.indexOf(l) >= 0) HL.seen[l] = LD.lensSig(state, l);
    });
    /* The one pointing hand */
    var target = null;
    for (var i = 0; i < res.prio.length && !target; i++) {
      var p = res.prio[i], sel = HL_PRIO[p] || hlSel(p);
      if (!sel) continue;
      var c = Array.prototype.filter.call(document.querySelectorAll(sel), function (n) { return n.classList.contains("ld-act") && !hlCovered(n); });
      if (c.length) target = c[0];
    }
    Array.prototype.forEach.call(document.querySelectorAll(".ld-primary"), function (n) { if (n !== target) n.classList.remove("ld-primary"); });
    if (target) target.classList.add("ld-primary");
    if (target !== HL.target) { HL.target = target; HL.since = Date.now(); }
    hlArrowEl(); hlPlaceArrow();
  }
  function scheduleHighlights() { if (!HL.raf) HL.raf = requestAnimationFrame(applyHighlights); }
  LD.applyHighlights = applyHighlights;
  LD.highlightDebug = function () { return HL; };
  document.addEventListener("click", function (e) {
    var b = e.target && e.target.closest && e.target.closest(".lens-btn[data-lens]");
    if (b && HL.seen) { var l = b.getAttribute("data-lens"); if (LD.LENSES.indexOf(l) >= 0 && state) HL.seen[l] = LD.lensSig(state, l); }
    HL.since = Date.now(); scheduleHighlights();
  }, true);
  if (typeof MutationObserver !== "undefined") {
    var hlObs = new MutationObserver(function (list) {
      for (var i = 0; i < list.length; i++) { if (list[i].target !== HL.arrow && !(HL.arrow && HL.arrow.contains(list[i].target))) { scheduleHighlights(); return; } }
    });
    document.addEventListener("DOMContentLoaded", function () { hlObs.observe(document.body, { childList: true, subtree: true }); scheduleHighlights(); });
  }
  setInterval(function () { if (document.hidden) return; if (HL.target || (HL.arrow && !HL.arrow.hidden)) applyHighlights(); else if (screen === "desk" || screen === "exec") scheduleHighlights(); }, 500);
  window.addEventListener("resize", scheduleHighlights);

  function boot() {
    seedDraft = "";
    applyCosmetics();
    if (demoRecap()) return;
    show("title");
    renderTitle();
  }

  document.addEventListener("DOMContentLoaded", boot);
})();

  