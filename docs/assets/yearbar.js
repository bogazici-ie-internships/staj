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
    // Balonun iç yapısı BİR KEZ kurulur; her hover'da yalnız metin güncellenir.
    // (Eskiden her hover'da innerHTML yeniden ayrıştırılıyordu.)
    var tipName = document.createElement("b");
    var tipRange = document.createElement("span");
    tip.appendChild(tipName);
    tip.appendChild(tipRange);
    bar.appendChild(tip);

    function byKey(arr, k) {
      return arr.filter(function (el) { return el.dataset.key === k; });
    }

    // Balon konumunu ÖLÇER ama hiçbir şey yazmaz. Yazma işlerinden önce
    // çağrıldığı sürece layout zaten geçerlidir → zorlanmış yeniden hesaplama yok.
    function measureTip(el) {
      var barRect = bar.getBoundingClientRect();
      var r = el.getBoundingClientRect();
      var cx = r.left + r.width / 2 - barRect.left;
      return {
        left: Math.max(46, Math.min(barRect.width - 46, cx)),
        top: r.top - barRect.top - 6
      };
    }

    // Yalnız yazar. Ölçüm sonucu dışarıdan verilir.
    function showTip(el, pos) {
      tipName.textContent = el.dataset.key || "";
      tipRange.textContent = el.dataset.range || "";
      tip.style.left = pos.left + "px";
      tip.style.top = pos.top + "px";
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
        function () {
          // ÖNCE ölç (layout temiz), SONRA yaz → yaz/oku/yaz döngüsü yok.
          // is-active yalnız filter/box-shadow uyguladığı için ölçümü etkilemez.
          var pos = measureTip(s);
          activateKey(k, true);
          showTip(s, pos);
        },
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
