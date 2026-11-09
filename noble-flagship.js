/* Visual layer. Demo records exist only for a localhost screenshot pass and are never saved. */
(function () {
  const root = document.documentElement;
  root.dataset.theme = "light";
  try { localStorage.removeItem("qn-theme"); } catch (e) {}

  const ICONS = {
    quote: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M14 2H6v20h12V8zM14 2v6h6M8 13h8M8 17h5"/></svg>',
    invoice: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M6 3h12v18l-3-2-3 2-3-2-3 2zM9 8h6M9 12h6M9 16h3"/></svg>',
    people: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M16 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2"/><circle cx="9.5" cy="7" r="3"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
    camera: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 7h3l2-2h6l2 2h3v12H4z"/><circle cx="12" cy="13" r="3.5"/></svg>',
    money: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 2v20M17 6.5c0-1.5-2-2.5-5-2.5s-5 1-5 2.5 2 2.5 5 2.5 5 1 5 2.5-2 2.5-5 2.5-5-1-5-2.5"/></svg>',
    alert: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 8v5M12 17h.01"/><path d="M10.3 4.5 2.8 18a2 2 0 0 0 1.7 3h15a2 2 0 0 0 1.7-3L13.7 4.5a2 2 0 0 0-3.4 0z"/></svg>'
  };

  function iconWrap(name) {
    const span = document.createElement("span");
    span.className = "qn-tile-icon";
    span.setAttribute("aria-hidden", "true");
    span.innerHTML = ICONS[name] || ICONS.quote;
    return span;
  }

  function tileKind(button) {
    const action = button.getAttribute("data-action") || "";
    const text = (button.textContent || "").toLowerCase();
    if (action === "new-quote" || text.includes("quote")) return "quote";
    if (action === "new-invoice" || text.includes("invoice")) return "invoice";
    if (text.includes("photo") || text.includes("job")) return "camera";
    if (text.includes("customer")) return "people";
    return "quote";
  }

  function decorateActions() {
    document.querySelectorAll(".qn-home-actions .btn, .qn-simple-shortcuts .btn").forEach((button) => {
      if (button.querySelector(".qn-tile-icon")) return;
      button.prepend(iconWrap(tileKind(button)));
    });
  }

  function sparkline(values) {
    const nums = (values || []).map(Number).filter((n) => Number.isFinite(n));
    if (nums.length < 2) return null;
    const max = Math.max(...nums, 1);
    const min = Math.min(...nums, 0);
    const w = 120;
    const h = 28;
    const points = nums.map((n, i) => {
      const x = (i / (nums.length - 1)) * w;
      const y = h - 3 - ((n - min) / (max - min || 1)) * (h - 6);
      return x.toFixed(1) + "," + y.toFixed(1);
    }).join(" ");
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("class", "qn-spark");
    svg.setAttribute("viewBox", "0 0 " + w + " " + h);
    svg.setAttribute("aria-hidden", "true");
    const line = document.createElementNS("http://www.w3.org/2000/svg", "polyline");
    line.setAttribute("points", points);
    svg.appendChild(line);
    return svg;
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
      const greeting = home.querySelector(".qn-home-greeting");
      if (greeting) greeting.insertAdjacentElement("afterend", slot);
      else home.prepend(slot);
    }
    if (stats.innerHTML) slot.innerHTML = stats.innerHTML;
    const series = window.qnDesignSeries || {};
    const keys = ["quoted", "outstanding", "paid", "overdue"];
    const icons = ["quote", "invoice", "money", "alert"];
    slot.querySelectorAll(".stat").forEach((card, index) => {
      const label = card.querySelector(".label");
      if (label && !card.querySelector(".qn-kpi-top")) {
        const top = document.createElement("div");
        top.className = "qn-kpi-top";
        top.appendChild(iconWrap(icons[index] || "quote"));
        top.appendChild(label);
        card.prepend(top);
      }
      const line = sparkline(series[keys[index]]);
      if (line) card.appendChild(line);
    });
  }

  function hookDashboard() {
    if (typeof window.renderDashboard !== "function" || window.renderDashboard.qnFlagship) return;
    const original = window.renderDashboard;
    const wrapped = function () {
      const result = original.apply(this, arguments);
      paintHomeKpis();
      decorateActions();
      return result;
    };
    wrapped.qnFlagship = true;
    window.renderDashboard = wrapped;
  }

  function photo(title, roof, sky) {
    const canvas = document.createElement("canvas");
    canvas.width = 900;
    canvas.height = 640;
    const g = canvas.getContext("2d");
    g.fillStyle = sky;
    g.fillRect(0, 0, 900, 640);
    g.fillStyle = "#d6d3cd";
    g.fillRect(0, 360, 900, 280);
    g.fillStyle = roof;
    g.beginPath();
    g.moveTo(70, 370);
    g.lineTo(450, 120);
    g.lineTo(830, 370);
    g.closePath();
    g.fill();
    return canvas.toDataURL("image/jpeg", 0.86);
  }

  function demoPhotos() {
    if (window.__qnDemoPhotos) return window.__qnDemoPhotos;
    window.__qnDemoPhotos = [
      photo("Before", "#6b7280", "#bfdbfe"),
      photo("During", "#c2410c", "#fed7aa"),
      photo("After", "#374151", "#e0f2fe"),
      photo("Gutters", "#1f2937", "#dbeafe"),
      photo("Flashing", "#9a3412", "#ffedd5"),
      photo("Complete", "#14532d", "#dcfce7")
    ];
    return window.__qnDemoPhotos;
  }

  function paintJobPhotos() {
    if (!new URLSearchParams(location.search).has("designpreview")) return;
    const photos = demoPhotos();
    document.querySelectorAll("#job-list .list-item").forEach((row, index) => {
      if (row.querySelector(".qn-job-photos")) return;
      const strip = document.createElement("div");
      strip.className = "qn-job-photos";
      const start = (index * 2) % photos.length;
      [0, 1, 2].forEach((offset) => {
        const img = document.createElement("img");
        img.src = photos[(start + offset) % photos.length];
        img.alt = "";
        strip.appendChild(img);
      });
      row.appendChild(strip);
    });
  }

  function paintPhotoBoard() {
    if (!new URLSearchParams(location.search).has("designpreview")) return;
    const section = document.getElementById("view-photos");
    if (!section) return;
    const photos = demoPhotos();
    const labels = ["Maple Ave · before", "Maple Ave · during", "Maple Ave · after", "Birch Cres · gutters", "Harbour St · flashing", "Harbour St · complete"];
    section.innerHTML = '<div class="qn-page-intro"><h2>Project photos</h2><p>Before, during, and after for open jobs.</p></div><div class="qn-photo-board"></div>';
    const board = section.querySelector(".qn-photo-board");
    photos.forEach((src, index) => {
      const figure = document.createElement("figure");
      figure.className = "qn-photo-tile";
      figure.style.margin = "0";
      const img = document.createElement("img");
      img.src = src;
      img.alt = labels[index];
      const cap = document.createElement("span");
      cap.className = "qn-photo-caption";
      cap.textContent = labels[index];
      figure.append(img, cap);
      board.appendChild(figure);
    });
  }

  function designPreview() {
    const host = location.hostname;
    if (host !== "127.0.0.1" && host !== "localhost") return;
    const params = new URLSearchParams(location.search);
    if (!params.has("designpreview")) return;
    const view = params.get("view") || "home";
    const reveal = (openEditors) => {
      window.qnDesignPreviewSeed?.();
      document.body.classList.add("qn-authenticated");
      const auth = document.getElementById("qn-auth-screen");
      if (auth) auth.style.display = "none";
      if (view === "quote" && openEditors && typeof window.openQuoteForm === "function") {
        window.showView?.("quotes");
        const quote = window.qnDesignPreviewQuote?.();
        if (quote) window.openQuoteForm(quote);
      } else if (view === "invoice" && openEditors && typeof window.openInvoiceDetail === "function") {
        window.showView?.("invoices");
        const invoice = window.qnDesignPreviewInvoice?.();
        if (invoice) window.openInvoiceDetail(invoice.id);
      } else if (view === "photos") {
        paintPhotoBoard();
        document.querySelectorAll(".view").forEach((node) => node.classList.remove("active"));
        document.getElementById("view-photos")?.classList.add("active");
        document.querySelectorAll("#tabbar button").forEach((button) => {
          const on = button.dataset.view === "jobs";
          button.classList.toggle("active", on);
        });
      } else if (typeof window.showView === "function" && document.getElementById("view-" + view)) {
        window.showView(view);
      }
      decorateActions();
      paintHomeKpis();
      if (view === "jobs" || view === "home") paintJobPhotos();
      document.body.dataset.qnReady = "1";
    };
    reveal(true);
    setTimeout(() => reveal(false), 500);
  }

  function boot() {
    hookDashboard();
    designPreview();
    decorateActions();
    if (document.getElementById("view-home")?.classList.contains("active")) paintHomeKpis();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
  window.addEventListener("load", () => { boot(); decorateActions(); });
})();
