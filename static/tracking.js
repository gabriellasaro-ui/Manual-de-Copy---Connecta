/* Connecta Group - tracking base + WhatsApp lead capture */
(function () {
  function push(eventName, data) {
    window.dataLayer = window.dataLayer || [];
    var payload = { event: eventName };
    if (data) {
      for (var key in data) payload[key] = data[key];
    }
    window.dataLayer.push(payload);
    try { console.log("[connecta]", eventName, data || {}); } catch (e) {}
  }

  var utmKeys = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term", "gclid", "fbclid"];
  var params = new URLSearchParams(location.search);
  var utms = {};

  utmKeys.forEach(function (key) {
    var value = params.get(key);
    if (value) {
      utms[key] = value;
      try { sessionStorage.setItem("cg_" + key, value); } catch (e) {}
    } else {
      try {
        var stored = sessionStorage.getItem("cg_" + key);
        if (stored) utms[key] = stored;
      } catch (e) {}
    }
  });

  window.CG_UTMS = utms;
  window.trackCTA = function (label) { push("click_cta", { label: label || "" }); };

  document.addEventListener("click", function (event) {
    var element = event.target && event.target.closest ? event.target.closest("[data-cta]") : null;
    if (element) push("click_cta", { label: element.getAttribute("data-cta") });
  });

  function labelFor(form, name) {
    var input = form.querySelector('[name="' + name + '"]');
    if (!input) return name;
    var field = input.closest(".field");
    var label = field ? field.querySelector("label") : null;
    return label ? label.textContent.replace("*", "").trim() : name;
  }

  function handleLeadForm(form) {
    form.addEventListener("submit", function (event) {
      event.preventDefault();
      if (form.checkValidity && !form.checkValidity()) {
        form.reportValidity();
        return;
      }

      var origin = form.getAttribute("data-origin") || document.title;
      var phone = (form.getAttribute("data-wa") || "").replace(/\D/g, "");
      var data = new FormData(form);
      var lines = ["*Novo lead - " + origin + "*", ""];

      data.forEach(function (value, key) {
        if (value && String(value).trim() && key.charAt(0) !== "_") {
          lines.push("- " + labelFor(form, key) + ": " + value);
        }
      });

      var utmLines = [];
      for (var utmKey in utms) utmLines.push(utmKey + "=" + utms[utmKey]);
      if (utmLines.length) {
        lines.push("");
        lines.push("_Origem: " + utmLines.join(" | ") + "_");
      }

      push("lead_submit", {
        origin: origin,
        faturamento: data.get("Faturamento mensal") || data.get("VGV mensal") || ""
      });

      var button = form.querySelector('[type="submit"]');
      if (button) {
        button.dataset.originalText = button.textContent;
        button.textContent = "Abrindo WhatsApp...";
        button.disabled = true;
      }

      var message = encodeURIComponent(lines.join("\n"));
      var url = phone ? "https://wa.me/" + phone + "?text=" + message : "https://wa.me/?text=" + message;
      window.open(url, "_blank");

      setTimeout(function () {
        if (button) button.textContent = "Enviado. WhatsApp aberto";
        var ok = form.querySelector(".form-ok");
        if (ok) ok.style.display = "block";
      }, 400);
    });
  }

  document.querySelectorAll("form.lead-form").forEach(handleLeadForm);

  document.querySelectorAll("[data-year]").forEach(function (element) {
    element.textContent = new Date().getFullYear();
  });

  var revealItems = document.querySelectorAll(".reveal-step");
  if (revealItems.length) {
    if ("IntersectionObserver" in window) {
      var revealObserver = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            revealObserver.unobserve(entry.target);
          }
        });
      }, { threshold: 0.18, rootMargin: "0px 0px -8% 0px" });

      revealItems.forEach(function (item) {
        revealObserver.observe(item);
      });
    } else {
      revealItems.forEach(function (item) {
        item.classList.add("is-visible");
      });
    }
  }

  var nav = document.querySelector(".site-header") || document.querySelector(".nav");
  if (nav) {
    var onScroll = function () {
      var active = (window.scrollY || 0) > 36;
      nav.classList.toggle("solid", active);
      nav.classList.toggle("is-solid", active);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
  }

  push("page_view", { path: location.pathname });
})();
