
  /* Visible viewport height: prefer visualViewport so a Safari toolbar
     cannot leave actions under the chrome. 100vh is the large viewport
     and is not used for layout. */
  (function () {
    function setAppH() {
      var vv = window.visualViewport;
      var h = Math.round((vv && vv.height) || window.innerHeight || document.documentElement.clientHeight);
      var top = Math.round((vv && vv.offsetTop) || 0);
      if (h < 240) return;
      var r = document.documentElement;
      r.style.setProperty("--app-h", h + "px");
      r.style.setProperty("--app-top", top + "px");
    }
    setAppH();
    window.addEventListener("resize", setAppH);
    window.addEventListener("orientationchange", function () { setTimeout(setAppH, 60); });
    if (window.visualViewport) {
      visualViewport.addEventListener("resize", setAppH);
      visualViewport.addEventListener("scroll", setAppH);
    }
  })();
  