/* Connecta Group — animações de scroll (AOS) aplicadas de forma centralizada.
   Roda depois de aos.js (defer preserva a ordem). */
(function () {
  function ready(fn) {
    if (document.readyState !== "loading") fn();
    else document.addEventListener("DOMContentLoaded", fn);
  }

  ready(function () {
    // [seletor, animação, delay-base, stagger?]
    var groups = [
      [".hero-content .eyebrow", "fade-right", 0, false],
      [".hero-title", "fade-up", 80, false],
      [".hero-sub", "fade-up", 180, false],
      [".hero-actions", "fade-up", 280, false],
      [".section-head", "fade-up", 0, false],
      [".problem-copy", "fade-right", 0, false],
      [".problem-item", "fade-up", 0, true],
      [".connect-simple > article", "zoom-in", 0, true],
      [".why-card", "fade-up", 0, true],
      [".faq details", "fade-up", 0, true],
      [".lead-section > .wrap > div:first-child", "fade-right", 0, false],
      [".form-card", "fade-left", 100, false],
      [".basic-statement", "zoom-in-up", 0, false]
    ];

    groups.forEach(function (g) {
      var sel = g[0], anim = g[1], base = g[2], stagger = g[3];
      var els = document.querySelectorAll(sel);
      Array.prototype.forEach.call(els, function (el, i) {
        if (el.hasAttribute("data-aos")) return;
        el.setAttribute("data-aos", anim);
        var delay = base + (stagger ? (i % 4) * 55 : 0);
        if (delay) el.setAttribute("data-aos-delay", String(delay));
      });
    });

    if (window.AOS) {
      window.AOS.init({
        duration: 900,
        easing: "ease-out-quart",
        once: true,
        offset: 40,
        anchorPlacement: "top-bottom",
        disableMutationObserver: false
      });
      // recalcula após carregar fontes/imagens
      window.addEventListener("load", function () { window.AOS.refresh(); });

      // Depois que cada elemento termina de aparecer, removemos os atributos do AOS.
      // Isso libera as transições de :hover dos cards (o AOS aplica uma duração de
      // alta especificidade via atributo que deixaria o hover lento). O Intersection
      // Observer é confiável (o evento aos:in não borbulha até o document).
      if ("IntersectionObserver" in window) {
        var cleanup = new IntersectionObserver(function (entries) {
          entries.forEach(function (entry) {
            if (!entry.isIntersecting) return;
            var el = entry.target;
            cleanup.unobserve(el);
            var delay = parseInt(el.getAttribute("data-aos-delay") || "0", 10) || 0;
            window.setTimeout(function () {
              el.removeAttribute("data-aos");
              el.removeAttribute("data-aos-duration");
              el.removeAttribute("data-aos-delay");
              el.removeAttribute("data-aos-easing");
            }, 1000 + delay + 250);
          });
        }, { threshold: 0.12 });
        document.querySelectorAll("[data-aos]").forEach(function (el) { cleanup.observe(el); });
      }
    }
  });
})();
