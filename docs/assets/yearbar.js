/* Yıl şeridi etkileşimi — takvim listesi ↔ yıl şeridi ↔ açıklama (legend) vurgusu
   + şerit bölgelerinde hover'da tarih balonu (isim + kesin gün aralığı).
   Material'ın document$ akışına abone olur → instant-navigation sonrası da bağlanır.
   Bilgi zaten metinde/listede mevcut olduğundan bu yalnızca ilerlemeci görsel katkıdır. */
(function () {
  function init() {
    var bar = document.querySelector(".staj-yearbar");
    if (!bar || bar.dataset.linked === "1") return;
    var track = bar.querySelector(".staj-yearbar__track");
    if (!track) return;
    bar.dataset.linked = "1";

    var list = document.querySelector(".staj-takvim");
    var segs = [].slice.call(track.querySelectorAll("[data-key]"));
    var items = list ? [].slice.call(list.querySelectorAll(".staj-takvim__item")) : [];

    var tip = document.createElement("div");
    tip.className = "staj-yearbar__tip";
    tip.setAttribute("aria-hidden", "true");
    bar.appendChild(tip);

    function byKey(arr, k) {
      return arr.filter(function (el) { return el.dataset.key === k; });
    }

    function showTip(el) {
      var name = el.dataset.key || "";
      var range = el.dataset.range || "";
      tip.innerHTML = "<b></b><span></span>";
      tip.firstChild.textContent = name;
      tip.lastChild.textContent = range;
      var barRect = bar.getBoundingClientRect();
      var r = el.getBoundingClientRect();
      var cx = r.left + r.width / 2 - barRect.left;
      cx = Math.max(46, Math.min(barRect.width - 46, cx));
      tip.style.left = cx + "px";
      tip.style.top = (r.top - barRect.top - 6) + "px";
      tip.classList.add("is-visible");
    }
    function hideTip() { tip.classList.remove("is-visible"); }

    function activateKey(k, on) {
      var s = byKey(segs, k);
      if (!s.length) return; // şeritte karşılığı yoksa vurgulama
      bar.classList.toggle("is-focusing", on);
      s.forEach(function (el) { el.classList.toggle("is-active", on); });
      byKey(items, k).forEach(function (el) { el.classList.toggle("is-active", on); });
    }

    function activateCat(cat, on) {
      bar.classList.toggle("is-focusing", on);
      segs.forEach(function (el) {
        el.classList.toggle("is-active", on && cat !== "ok" && el.dataset.cat === cat);
      });
    }

    function bind(el, on, off) {
      el.addEventListener("mouseenter", on);
      el.addEventListener("mouseleave", off);
      el.addEventListener("focusin", on);
      el.addEventListener("focusout", off);
    }

    items.forEach(function (it) {
      var k = it.dataset.key;
      bind(it, function () { activateKey(k, true); }, function () { activateKey(k, false); });
    });
    segs.forEach(function (s) {
      var k = s.dataset.key;
      bind(
        s,
        function () { activateKey(k, true); showTip(s); },
        function () { activateKey(k, false); hideTip(); }
      );
    });
    bar.querySelectorAll(".staj-yearbar__legend [data-cat]").forEach(function (lg) {
      var c = lg.dataset.cat;
      bind(lg, function () { activateCat(c, true); }, function () { activateCat(c, false); });
    });
  }

  if (window.document$ && typeof window.document$.subscribe === "function") {
    window.document$.subscribe(function () { init(); });
  } else if (document.readyState !== "loading") {
    init();
  } else {
    document.addEventListener("DOMContentLoaded", init);
  }
})();
