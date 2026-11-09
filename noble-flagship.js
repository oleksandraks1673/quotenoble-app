/* Visual layer only. Does not write records, call billing, or change sync. */
(function () {
  const root = document.documentElement;

  function applyTheme(theme) {
    if (theme === "dark" || theme === "light") root.dataset.theme = theme;
    else root.removeAttribute("data-theme");
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.content = root.dataset.theme === "dark" ? "#100e0c" : "#f3eee6";
    const button = document.getElementById("qn-theme-toggle");
    if (button) {
      const dark = root.dataset.theme === "dark";
      button.textContent = dark ? "Light" : "Dark";
      button.setAttribute("aria-label", dark ? "Switch to light theme" : "Switch to dark theme");
    }
  }

  function currentTheme() {
    return root.dataset.theme === "dark" ? "dark" : "light";
  }

  function mountToggle() {
    if (document.getElementById("qn-theme-toggle") || document.body.classList.contains("qn-landing")) return;
    const button = document.createElement("button");
    button.id = "qn-theme-toggle";
    button.type = "button";
    button.setAttribute("data-qn-no-translate", "");
    button.addEventListener("click", () => {
      const next = currentTheme() === "dark" ? "light" : "dark";
      try { localStorage.setItem("qn-theme", next); } catch (e) {}
      applyTheme(next);
    });
    document.body.appendChild(button);
    const place = () => {
      const wrap = document.querySelector(".qn-create-wrap");
      if (wrap && document.body.classList.contains("qn-authenticated")) {
        if (button.parentElement !== wrap) wrap.prepend(button);
      } else if (button.parentElement !== document.body) {
        document.body.appendChild(button);
      }
    };
    place();
    new MutationObserver(place).observe(document.body, { attributes: true, attributeFilter: ["class"] });
    applyTheme(currentTheme());
  }

  function paintHomeKpis() {
    const home = document.getElementById("view-home");
    const stats = document.getElementById("dash-stats");
    if (!home || !stats || typeof window.qnRenderBusinessSummary !== "function") return;
    try { window.qnRenderBusinessSummary(); } catch (e) { return; }
    let slot = document.getElementById("qn-flagship-kpis");
    if (!slot) {
      slot = document.createElement("div");
      slot.id = "qn-flagship-kpis";
      slot.className = "qn-flagship-kpis";
      slot.setAttribute("data-qn-no-translate", "");
      const greeting = home.querySelector(".qn-home-greeting");
      if (greeting) greeting.insertAdjacentElement("afterend", slot);
      else home.prepend(slot);
    }
    if (stats.innerHTML && slot.innerHTML !== stats.innerHTML) slot.innerHTML = stats.innerHTML;
  }

  function hookDashboard() {
    if (typeof window.renderDashboard !== "function" || window.renderDashboard.qnFlagship) return;
    const original = window.renderDashboard;
    const wrapped = function () {
      const result = original.apply(this, arguments);
      paintHomeKpis();
      return result;
    };
    wrapped.qnFlagship = true;
    window.renderDashboard = wrapped;
  }

  function designPreview() {
    const host = location.hostname;
    if (host !== "127.0.0.1" && host !== "localhost") return;
    const params = new URLSearchParams(location.search);
    if (!params.has("designpreview")) return;
    const reveal = () => {
      document.body.classList.add("qn-authenticated");
      const auth = document.getElementById("qn-auth-screen");
      if (auth) auth.style.display = "none";
      const view = params.get("view") || "home";
      if (view === "quote" && typeof window.openQuoteForm === "function") {
        window.showView?.("quotes");
        window.openQuoteForm();
        return;
      }
      if (view === "invoice" && typeof window.openInvoiceForm === "function") {
        window.showView?.("invoices");
        window.openInvoiceForm();
        return;
      }
      if (typeof window.showView === "function" && document.getElementById("view-" + view)) window.showView(view);
      else {
        document.querySelectorAll(".view").forEach((node) => node.classList.remove("active"));
        document.getElementById("view-" + view)?.classList.add("active");
      }
    };
    reveal();
    setTimeout(reveal, 600);
    setTimeout(reveal, 1800);
  }

  function boot() {
    mountToggle();
    hookDashboard();
    designPreview();
    if (document.getElementById("view-home")?.classList.contains("active")) paintHomeKpis();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
  window.addEventListener("load", boot);
})();
