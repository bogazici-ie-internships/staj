/* Header "Refined Institutional" (Yön B) — kaydırma durumu.
   Sayfa yukarıdan >8px kayınca <body>'ye data-hdr-scrolled eklenir; CSS bunu
   yakalayıp header'ı küçültür + camlaştırır (backdrop-blur). rAF ile throttle,
   passive listener. Ekstra bağımlılık yok. */
(function () {
  var b = document.body;
  var THRESHOLD = 8;
  var ticking = false;

  function update() {
    b.toggleAttribute("data-hdr-scrolled", window.scrollY > THRESHOLD);
    ticking = false;
  }
  function onScroll() {
    if (!ticking) {
      window.requestAnimationFrame(update);
      ticking = true;
    }
  }

  window.addEventListener("scroll", onScroll, { passive: true });
  update();
})();
