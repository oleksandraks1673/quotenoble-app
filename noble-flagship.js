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

  function photo(kind) {
    const canvas = document.createElement("canvas");
    canvas.width = 900;
    canvas.height = 640;
    const g = canvas.getContext("2d");
    const wall = (color) => { g.fillStyle = color; g.fillRect(0, 0, 900, 640); };
    const floor = (color) => { g.fillStyle = color; g.fillRect(0, 430, 900, 210); };
    if (kind === "panel") {
      wall("#e7e5e4"); floor("#a8a29e");
      g.fillStyle = "#1f2937"; g.fillRect(280, 90, 340, 420);
      g.fillStyle = "#f8fafc";
      for (let row = 0; row < 4; row++) for (let col = 0; col < 2; col++) g.fillRect(320 + col * 150, 130 + row * 90, 110, 60);
    } else if (kind === "paint") {
      wall("#fdba74"); floor("#d6d3d1");
      g.fillStyle = "#fff7ed"; g.fillRect(0, 0, 280, 430);
      g.fillStyle = "#9a3412"; g.fillRect(620, 180, 40, 220);
    } else if (kind === "yard") {
      wall("#bae6fd"); floor("#65a30d");
      g.fillStyle = "#166534"; g.beginPath(); g.arc(180, 360, 90, 0, Math.PI * 2); g.fill();
      g.beginPath(); g.arc(700, 340, 70, 0, Math.PI * 2); g.fill();
      g.fillStyle = "#d6d3d1"; g.fillRect(300, 470, 300, 50);
    } else if (kind === "pipes") {
      wall("#f1f5f9"); floor("#cbd5e1");
      g.strokeStyle = "#0369a1"; g.lineWidth = 28;
      g.beginPath(); g.moveTo(80, 160); g.lineTo(820, 160); g.stroke();
      g.beginPath(); g.moveTo(220, 160); g.lineTo(220, 500); g.stroke();
      g.strokeStyle = "#e85d04"; g.beginPath(); g.moveTo(560, 160); g.lineTo(560, 420); g.stroke();
    } else if (kind === "hvac") {
      wall("#e2e8f0"); floor("#94a3b8");
      g.fillStyle = "#cbd5e1"; g.fillRect(180, 160, 540, 320);
      g.fillStyle = "#334155"; g.fillRect(230, 220, 180, 200);
      g.fillStyle = "#e85d04"; g.fillRect(480, 250, 180, 40);
    } else {
      wall("#f8fafc"); floor("#e7e5e4");
      g.fillStyle = "#bfdbfe"; g.fillRect(80, 80, 260, 180);
      g.fillStyle = "#111827"; g.fillRect(460, 140, 280, 16);
      g.fillRect(460, 180, 200, 16);
    }
    return canvas.toDataURL("image/jpeg", 0.86);
  }

  function demoPhotos() {
    if (window.__qnDemoPhotos) return window.__qnDemoPhotos;
    window.__qnDemoPhotos = ["panel", "pipes", "paint", "hvac", "yard", "room"].map(photo);
    return window.__qnDemoPhotos;
  }

  function paintJobPhotos() {
    if (!new URLSearchParams(location.search).has("designpreview")) return;
    const photos = demoPhotos();
    document.querySelectorAll("#job-list .list-item").forEach((row) => {
      if (row.querySelector(".qn-job-photos")) return;
      const title = (row.querySelector(".title")?.textContent || "").toLowerCase();
      const pick = title.includes("panel") || title.includes("oak") ? [0, 1, 3]
        : title.includes("paint") || title.includes("birch") ? [2, 5, 2]
        : [4, 5, 4];
      const strip = document.createElement("div");
      strip.className = "qn-job-photos";
      pick.forEach((index) => {
        const img = document.createElement("img");
        img.src = photos[index];
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
    const labels = ["Oak St · panel open", "Oak St · new breakers", "Birch · first coat", "Harbour · furnace", "Harbour · beds before", "Harbour · beds after"];
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
