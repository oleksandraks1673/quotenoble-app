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

  const NAV_ICONS = {
    home: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z"/></svg>',
    cal: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/></svg>',
    jobs: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="7" width="18" height="13" rx="2"/><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>',
    quote: ICONS.quote,
    invoice: ICONS.invoice,
    camera: ICONS.camera,
    people: ICONS.people,
    team: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="8" cy="9" r="3"/><circle cx="16" cy="9" r="3"/><path d="M3 20c.6-3 2.6-4.5 5-4.5S12.4 17 13 20M11 20c.4-2 1.6-3.2 3.2-3.8 1.8-.2 3.6.6 4.8 3.8"/></svg>',
    settings: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="3"/><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M18.4 5.6 17 7M7 17l-1.4 1.4"/></svg>',
    bell: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M6 16V10a6 6 0 1 1 12 0v6l1.5 2H4.5z"/><path d="M10 19a2 2 0 0 0 4 0"/></svg>'
  };
  const GROUPS = [
    ["Work", [["home", "Dashboard", "home"], ["schedule", "Schedule", "cal"], ["jobs", "Jobs", "jobs"], ["quotes", "Quotes", "quote"], ["invoices", "Invoices", "invoice"]]],
    ["Media", [["photos", "Photos", "camera"]]],
    ["People", [["clients", "Customers", "people"], ["team", "Team", "team"]]],
    ["", [["more", "Settings", "settings"]]]
  ];

  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
  }
  function data() { try { return DB; } catch (error) { return null; } }
  function companyName() { return String(data()?.profile?.businessName || "").trim(); }
  function todayKey() { return typeof todayStr === "function" ? todayStr() : new Date().toISOString().slice(0, 10); }
  function moneyText(cents) { return typeof money === "function" ? money(cents) : "$" + (Number(cents || 0) / 100).toFixed(2); }
  function counts() {
    const quotes = data()?.quotes || [];
    const invoices = data()?.invoices || [];
    const jobs = data()?.jobs || [];
    const today = todayKey();
    const awaiting = quotes.filter((q) => q.status === "sent").length;
    const unpaid = invoices.filter((inv) => typeof invoiceTotals === "function" && invoiceTotals(inv).balance > 0).length;
    const activeJobs = jobs.filter((j) => !["Completed", "Cancelled", "Invoiced"].includes(j.status || j.flowStage)).length;
    const todayJobs = jobs.filter((j) => j.date === today && !["Cancelled", "Completed", "Invoiced"].includes(j.status || j.flowStage)).length;
    return { awaiting, unpaid, activeJobs, todayJobs, customers: (data()?.clients || []).length };
  }
  function badge(node, value) {
    let mark = node.querySelector(".qn-nav-count");
    if (!value) { mark?.remove(); return; }
    if (!mark) { mark = el("span", "qn-nav-count"); node.appendChild(mark); }
    mark.textContent = String(value);
  }
  function activeName() {
    if (document.body.dataset.qnSection === "team") return "team";
    const id = document.querySelector(".view.active")?.id.replace(/^view-/, "") || "home";
    if (["plans", "reports", "help", "purchases", "inspections", "money", "project"].includes(id)) return "more";
    return id;
  }
  function openRecord(kind, id) {
    closeMenus();
    if (kind === "customer") { window.showView?.("clients"); window.openClientDetail?.(id); }
    else if (kind === "quote") { window.showView?.("quotes"); window.openDocument?.("q", id); }
    else if (kind === "invoice") { window.showView?.("invoices"); window.openDocument?.("i", id); }
    else if (kind === "job") window.qnOpenJobDetail?.(id);
  }
  function createRecord(kind) {
    closeMenus();
    if (kind === "quote") document.querySelector('[data-action="new-quote"]')?.click();
    else if (kind === "invoice") document.querySelector('[data-action="new-invoice"]')?.click();
    else if (kind === "customer") document.querySelector('[data-action="new-client"]')?.click();
    else if (kind === "job") { window.showView?.("jobs"); setTimeout(() => document.getElementById("qn-new-job")?.click(), 40); }
    else if (kind === "photo") document.querySelector("[data-photo-journal-open]")?.click();
  }
  function closeMenus() {
    document.getElementById("qn-new-menu")?.setAttribute("hidden", "");
    document.getElementById("qn-note-menu")?.setAttribute("hidden", "");
    document.getElementById("qn-search-results")?.replaceChildren();
  }
  function go(view) {
    closeMenus();
    if (view === "team") {
      document.body.dataset.qnSection = "team";
      window.showView?.("more");
      document.querySelector("[data-qn-crew-open]")?.click();
    } else if (view === "photos") {
      document.body.dataset.qnSection = "";
      document.querySelector("[data-photo-journal-open]")?.click() || window.showView?.("photos");
    } else {
      document.body.dataset.qnSection = "";
      window.showView?.(view);
    }
    syncNav();
    placeGreeting();
  }
  function navButton(view, label, icon) {
    const button = el("button", "qn-nav-item");
    button.type = "button";
    button.dataset.go = view;
    button.innerHTML = NAV_ICONS[icon] || "";
    const name = el("span", "");
    name.dataset.qnI18n = "";
    name.textContent = label;
    button.appendChild(name);
    button.addEventListener("click", () => go(view));
    return button;
  }
  function ensureShell() {
    if (document.getElementById("qn-side") || !document.querySelector("main")) return;
    const side = el("aside", "");
    side.id = "qn-side";
    const brand = el("div", "");
    brand.id = "qn-side-brand";
    const logo = document.querySelector(".app-header .logo img");
    const img = document.createElement("img");
    img.src = logo?.getAttribute("src") || "/assets/brand-logo-original.png";
    img.alt = "";
    const titles = el("div", "");
    titles.append(el("strong", "", "Quote.Noble"), el("span", ""));
    titles.lastChild.id = "qn-side-company";
    titles.lastChild.dataset.qnNoTranslate = "";
    brand.append(img, titles);
    const nav = document.createElement("nav");
    nav.setAttribute("aria-label", "Main");
    GROUPS.forEach(([section, items]) => {
      if (section) {
        const label = el("p", "qn-nav-label", section);
        label.dataset.qnI18n = "";
        nav.appendChild(label);
      }
      items.forEach(([view, label, icon]) => nav.appendChild(navButton(view, label, icon)));
    });
    const user = el("button", "");
    user.id = "qn-side-user";
    user.type = "button";
    user.innerHTML = "<b></b><span><strong></strong><small></small></span>";
    user.addEventListener("click", () => { document.body.dataset.qnSection = ""; window.openProfileForm?.() || go("more"); });
    side.append(brand, nav, user);

    const top = el("div", "");
    top.id = "qn-topbar";
    const search = el("label", "");
    search.id = "qn-top-search";
    const input = document.createElement("input");
    input.type = "search";
    input.placeholder = "Search customers, quotes and jobs";
    input.setAttribute("aria-label", "Search customers, quotes and jobs");
    const results = el("div", "");
    results.id = "qn-search-results";
    results.hidden = true;
    search.append(input, results);
    input.addEventListener("input", () => {
      const rows = window.QNJobFlow?.search?.(data(), input.value) || [];
      results.replaceChildren();
      results.hidden = !input.value.trim();
      rows.slice(0, 8).forEach((row) => {
        const button = el("button", "");
        button.type = "button";
        const title = el("strong", "", row.title);
        title.dataset.qnNoTranslate = "";
        const detail = el("small", "", row.detail || "");
        detail.dataset.qnNoTranslate = "";
        button.append(title, detail);
        button.addEventListener("click", () => { input.value = ""; results.hidden = true; openRecord(row.kind, row.id); });
        results.appendChild(button);
      });
    });

    const notes = el("div", "");
    notes.id = "qn-note-wrap";
    const bell = el("button", "");
    bell.id = "qn-notify";
    bell.type = "button";
    bell.setAttribute("aria-label", "Notifications");
    bell.innerHTML = NAV_ICONS.bell;
    const noteMenu = el("div", "");
    noteMenu.id = "qn-note-menu";
    noteMenu.hidden = true;
    notes.append(bell, noteMenu);
    bell.addEventListener("click", (event) => {
      event.stopPropagation();
      noteMenu.hidden = !noteMenu.hidden;
      document.getElementById("qn-new-menu").hidden = true;
    });

    const create = el("div", "");
    create.id = "qn-new-wrap";
    const plus = el("button", "", "+ New");
    plus.id = "qn-new-toggle";
    plus.type = "button";
    plus.dataset.qnI18n = "";
    const menu = el("div", "");
    menu.id = "qn-new-menu";
    menu.hidden = true;
    [["quote", "New quote"], ["job", "New job"], ["invoice", "New invoice"], ["photo", "Add photo"], ["customer", "Add customer"]].forEach(([kind, label]) => {
      const button = el("button", "", label);
      button.type = "button";
      button.dataset.qnI18n = "";
      button.addEventListener("click", () => createRecord(kind));
      menu.appendChild(button);
    });
    plus.addEventListener("click", (event) => {
      event.stopPropagation();
      menu.hidden = !menu.hidden;
      menu.classList.remove("qn-phone-menu");
      noteMenu.hidden = true;
    });
    create.append(plus, menu);
    top.append(search, notes, create);
    document.body.prepend(side);
    document.querySelector("main").before(top);

    const tabs = el("nav", "");
    tabs.id = "qn-phone-tabs";
    tabs.setAttribute("aria-label", "Main");
    [["home", "Dashboard", "home"], ["quotes", "Quotes", "quote"]].forEach(([view, label, icon]) => tabs.appendChild(navButton(view, label, icon)));
    const center = el("button", "", "+");
    center.id = "qn-phone-plus";
    center.type = "button";
    center.setAttribute("aria-label", "+ New");
    center.addEventListener("click", (event) => {
      event.stopPropagation();
      menu.hidden = !menu.hidden;
      menu.classList.toggle("qn-phone-menu", !menu.hidden);
    });
    tabs.appendChild(center);
    [["jobs", "Jobs", "jobs"], ["more", "Settings", "settings"]].forEach(([view, label, icon]) => tabs.appendChild(navButton(view, label, icon)));
    document.body.appendChild(tabs);
    document.addEventListener("click", (event) => {
      if (!event.target.closest("#qn-new-wrap, #qn-phone-plus, #qn-note-wrap, #qn-top-search")) closeMenus();
    });
    if (!document.getElementById("view-schedule")) {
      const section = el("section", "view");
      section.id = "view-schedule";
      section.innerHTML = '<div class="qn-page-intro"><h2 data-qn-i18n>Schedule</h2><p data-qn-i18n>Today\'s schedule</p></div><div id="qn-schedule-list"></div>';
      document.querySelector("main").appendChild(section);
    }
  }
  function syncNav() {
    const name = activeName();
    document.querySelectorAll("#qn-side .qn-nav-item, #qn-phone-tabs .qn-nav-item").forEach((button) => {
      const on = button.dataset.go === name;
      button.classList.toggle("active", on);
      if (on) button.setAttribute("aria-current", "page");
      else button.removeAttribute("aria-current");
    });
    const tally = counts();
    const map = { schedule: tally.todayJobs, jobs: tally.activeJobs, quotes: tally.awaiting, invoices: tally.unpaid, clients: tally.customers };
    document.querySelectorAll("#qn-side .qn-nav-item").forEach((button) => badge(button, map[button.dataset.go] || 0));
    const company = document.getElementById("qn-side-company");
    if (company) company.textContent = companyName() || "Quote.Noble";
    const tag = document.querySelector(".app-header .qn-brand-copy p");
    if (tag && companyName()) { tag.dataset.qnNoTranslate = ""; tag.textContent = companyName(); }
    const user = document.getElementById("qn-side-user");
    if (user) {
      const nameText = companyName() || "Quote.Noble";
      user.querySelector("b").textContent = nameText.slice(0, 1).toUpperCase();
      user.querySelector("strong").textContent = nameText;
      user.querySelector("small").textContent = data()?.profile?.email || "";
    }
    const noteMenu = document.getElementById("qn-note-menu");
    const bell = document.getElementById("qn-notify");
    if (noteMenu && bell) {
      const items = [];
      (data()?.invoices || []).forEach((inv) => { if (typeof invoiceStatus === "function" && invoiceStatus(inv) === "overdue") items.push([inv.number + " is overdue", () => openRecord("invoice", inv.id)]); });
      (data()?.quotes || []).filter((q) => q.status === "sent").forEach((q) => items.push([q.number + " is awaiting approval", () => openRecord("quote", q.id)]));
      (data()?.jobs || []).filter((j) => j.date === todayKey()).forEach((j) => items.push([j.title, () => openRecord("job", j.id)]));
      noteMenu.replaceChildren();
      if (!items.length) {
        const empty = el("button", "", "No notifications");
        empty.type = "button";
        empty.dataset.qnI18n = "";
        empty.disabled = true;
        noteMenu.appendChild(empty);
      }
      items.slice(0, 8).forEach(([label, action]) => {
        const button = el("button", "", label);
        button.type = "button";
        button.dataset.qnNoTranslate = "";
        button.addEventListener("click", action);
        noteMenu.appendChild(button);
      });
      badge(bell, items.length);
    }
  }
  function placeGreeting() {
    const greet = document.querySelector(".qn-home-greeting");
    const header = document.querySelector(".app-header");
    const view = document.getElementById("view-home");
    if (!greet || !header || !view) return;
    if (!greet.querySelector(".qn-dash-date")) {
      const date = el("p", "qn-dash-date");
      date.dataset.qnNoTranslate = "";
      greet.appendChild(date);
    }
    const date = greet.querySelector(".qn-dash-date");
    date.textContent = new Date().toLocaleDateString(window.qnLanguage?.locale?.() || "en-CA", { weekday: "long", month: "long", day: "numeric" });
    const phone = window.matchMedia("(max-width: 899px)").matches;
    const home = document.body.classList.contains("qn-home-active") || view.classList.contains("active");
    if (phone && home) header.appendChild(greet);
    else view.prepend(greet);
    const bar = document.getElementById("qn-save-status");
    const kpis = document.getElementById("qn-flagship-kpis");
    if (bar && phone && home && kpis) kpis.after(bar);
    else if (bar && header) header.after(bar);
  }
  function coverFor(title) {
    if (!new URLSearchParams(location.search).has("designpreview")) return "";
    const photos = demoPhotos();
    const text = String(title || "").toLowerCase();
    if (text.includes("panel") || text.includes("oak")) return photos[0];
    if (text.includes("paint") || text.includes("birch")) return photos[2];
    if (text.includes("furnace") || text.includes("hvac")) return photos[3];
    if (text.includes("clean") || text.includes("yard") || text.includes("harbour")) return photos[4];
    return photos[5];
  }
  function statusClass(job) {
    const status = job.flowStage || job.status || "";
    if (["Completed", "Invoiced"].includes(status)) return "done";
    if (status === "Scheduled") return "wait";
    return "";
  }
  function jobCard(job) {
    const button = el("button", "qn-cover-card");
    button.type = "button";
    const src = coverFor(job.title);
    if (src) {
      const img = document.createElement("img");
      img.alt = "";
      img.src = src;
      button.appendChild(img);
    }
    const shade = el("span", "qn-cover-shade");
    const title = el("strong", "", job.title || "Job");
    title.dataset.qnNoTranslate = "";
    const meta = el("small", "", [job.client, job.date].filter(Boolean).join(" · "));
    meta.dataset.qnNoTranslate = "";
    const pill = el("em", "qn-status " + statusClass(job), job.flowStage || job.status || "");
    shade.append(title, meta, pill);
    button.append(shade);
    button.addEventListener("click", () => openRecord("job", job.id));
    return button;
  }
  function renderSchedule() {
    const list = document.getElementById("qn-schedule-list");
    if (!list) return;
    const today = todayKey();
    const jobs = (data()?.jobs || []).slice().sort((a, b) => String(a.date || "").localeCompare(String(b.date || "")));
    const todayJobs = jobs.filter((j) => j.date === today);
    const upcoming = jobs.filter((j) => j.date && j.date > today).slice(0, 6);
    const rows = todayJobs.length ? todayJobs : upcoming;
    list.replaceChildren();
    if (!rows.length) {
      const empty = el("p", "empty", "Nothing scheduled today");
      empty.dataset.qnI18n = "";
      list.appendChild(empty);
      return;
    }
    rows.forEach((job) => {
      const button = el("button", "qn-schedule-row");
      button.type = "button";
      const copy = el("span", "");
      const title = el("strong", "", job.title || "Job");
      title.dataset.qnNoTranslate = "";
      const meta = el("small", "", [job.client, job.date].filter(Boolean).join(" · "));
      meta.dataset.qnNoTranslate = "";
      copy.append(title, meta);
      const pill = el("em", "qn-status " + statusClass(job), job.flowStage || job.status || "");
      button.append(copy, pill);
      button.addEventListener("click", () => openRecord("job", job.id));
      list.appendChild(button);
    });
  }
  function monthSeries(kind) {
    const designed = window.qnDesignSeries;
    if (designed) {
      if (kind === "revenue") return designed.paid;
      if (kind === "unpaid") return designed.outstanding;
      if (kind === "awaiting") return designed.quoted;
      return designed.overdue;
    }
    return null;
  }
  function paintDash() {
    const home = document.getElementById("view-home");
    if (!home || !data()) return;
    let dash = document.getElementById("qn-dash");
    if (!dash) {
      dash = el("div", "");
      dash.id = "qn-dash";
      home.appendChild(dash);
    }
    const tally = counts();
    const month = todayKey().slice(0, 7);
    let revenue = 0;
    let unpaid = 0;
    (data().invoices || []).forEach((inv) => {
      (inv.payments || []).forEach((payment) => { if (String(payment.date || "").slice(0, 7) === month) revenue += Math.round(payment.amount) || 0; });
      if (String(inv.createdAt || "").slice(0, 7) === month) revenue += Math.round(inv.depositPaid || 0);
      if (typeof invoiceTotals === "function") unpaid += Math.max(0, invoiceTotals(inv).balance);
    });
    const awaitingTotal = (data().quotes || []).filter((q) => q.status === "sent").reduce((sum, q) => sum + (typeof quoteTotals === "function" ? quoteTotals(q).total : 0), 0);
    const cards = [
      ["Revenue this month", moneyText(revenue), "money", "revenue"],
      ["Unpaid invoices", moneyText(unpaid), "invoice", "unpaid"],
      ["Quotes awaiting approval", String(tally.awaiting) + " · " + moneyText(awaitingTotal), "quote", "awaiting"],
      ["Jobs today", String(tally.todayJobs), "jobs", "today"]
    ];
    let kpis = document.getElementById("qn-flagship-kpis");
    if (!kpis) { kpis = el("div", "qn-flagship-kpis"); kpis.id = "qn-flagship-kpis"; }
    kpis.replaceChildren();
    cards.forEach(([label, value, icon, key]) => {
      const card = el("div", "stat");
      const top = el("div", "qn-kpi-top");
      const labelNode = el("div", "label", label);
      labelNode.dataset.qnI18n = "";
      top.append(iconWrap(icon === "jobs" ? "camera" : icon), labelNode);
      const number = el("div", "value", value);
      number.dataset.qnNoTranslate = "";
      card.append(top, number);
      const line = sparkline(monthSeries(key));
      if (line) card.appendChild(line);
      kpis.appendChild(card);
    });
    const grid = el("div", "qn-dash-grid");
    const schedule = el("section", "qn-dash-block");
    const scheduleTitle = el("h2", "", "Today's schedule");
    scheduleTitle.dataset.qnI18n = "";
    const scheduleList = el("div", "");
    scheduleList.id = "qn-dash-schedule";
    schedule.append(scheduleTitle, scheduleList);
    const photos = el("section", "qn-dash-block");
    const photoTitle = el("h2", "", "Recent photos");
    photoTitle.dataset.qnI18n = "";
    const photoGrid = el("div", "qn-dash-photos");
    const preview = new URLSearchParams(location.search).has("designpreview");
    if (preview) demoPhotos().forEach((src) => { const image = document.createElement("img"); image.src = src; image.alt = ""; photoGrid.appendChild(image); });
    else {
      const empty = el("p", "empty", "No photos yet");
      empty.dataset.qnI18n = "";
      photoGrid.appendChild(empty);
    }
    photos.append(photoTitle, photoGrid);
    const jobs = el("section", "qn-dash-block qn-dash-jobs");
    const jobTitle = el("h2", "", "Recent jobs");
    jobTitle.dataset.qnI18n = "";
    const jobRow = el("div", "qn-dash-jobs-row");
    (data().jobs || []).slice(0, 3).forEach((job) => jobRow.appendChild(jobCard(job)));
    jobs.append(jobTitle, jobRow);
    grid.append(schedule, photos, jobs);
    dash.replaceChildren(kpis, grid);
    const today = todayKey();
    const scheduled = (data().jobs || []).filter((job) => job.date === today);
    const shown = scheduled.length ? scheduled : (data().jobs || []).filter((job) => job.date && job.date >= today).slice(0, 4);
    if (!shown.length) {
      const empty = el("p", "empty", "Nothing scheduled today");
      empty.dataset.qnI18n = "";
      scheduleList.appendChild(empty);
    } else shown.forEach((job) => {
      const button = el("button", "qn-schedule-row");
      button.type = "button";
      const title = el("strong", "", job.title || "Job");
      title.dataset.qnNoTranslate = "";
      const meta = el("small", "", [job.client, job.date].filter(Boolean).join(" · "));
      meta.dataset.qnNoTranslate = "";
      const copy = el("span", "");
      copy.append(title, meta);
      button.append(copy, el("em", "qn-status " + statusClass(job), job.flowStage || job.status || ""));
      button.addEventListener("click", () => openRecord("job", job.id));
      scheduleList.appendChild(button);
    });
    placeGreeting();
    const greet = document.querySelector(".qn-home-greeting");
    if (greet?.parentElement === home) greet.after(dash);
    else home.prepend(dash);
    syncNav();
    renderSchedule();
  }

  function paintHomeKpis() {
    paintDash();
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

  function hookNavigation() {
    if (typeof window.showView !== "function" || window.showView.qnShell) return;
    const original = window.showView;
    const wrapped = function (name) {
      if (name !== "team") document.body.dataset.qnSection = name === "more" && document.body.dataset.qnSection === "team" ? "team" : "";
      const result = original.apply(this, arguments);
      if (name === "schedule") renderSchedule();
      if (name === "home" || document.getElementById("view-home")?.classList.contains("active")) paintDash();
      syncNav();
      placeGreeting();
      return result;
    };
    wrapped.qnShell = true;
    window.showView = wrapped;
  }

  function boot() {
    ensureShell();
    hookDashboard();
    hookNavigation();
    designPreview();
    decorateActions();
    syncNav();
    placeGreeting();
    if (document.getElementById("view-home")?.classList.contains("active")) paintDash();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
  window.addEventListener("load", () => { boot(); decorateActions(); });
})();
