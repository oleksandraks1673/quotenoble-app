/* Shell and dashboard taken from the D blueprint. Real records only; photos fall back to trade photos. */
(function () {
  const MARK = '<svg viewBox="0 0 40 40" width="40" height="40" aria-hidden="true"><rect class="mark-bg" width="40" height="40" rx="11"/><rect x="11" y="9" width="18" height="22" rx="3" fill="#fff"/><path d="M15.2 15.2h9.2M15.2 19.6h11M15.2 24h7" fill="none" stroke="var(--brand)" stroke-width="1.85" stroke-linecap="round"/><circle cx="29.2" cy="29.2" r="5.1" fill="var(--brand)"/><path d="M29.2 26.8v4.8M26.8 29.2h4.8" stroke="#fff" stroke-width="1.5" stroke-linecap="round"/></svg>';
  const I = {
    home: '<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1v-9.5z"/></svg>',
    cal: '<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3.5" y="5" width="17" height="15.5" rx="2.2"/><path d="M3.5 10h17M8 3.5v4M16 3.5v4"/></svg>',
    jobs: '<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="7.5" width="18" height="12.5" rx="2"/><path d="M8 7.5V5.8A2.3 2.3 0 0 1 10.3 3.5h3.4A2.3 2.3 0 0 1 16 5.8v1.7M3 13h18"/></svg>',
    quote: '<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M14 3.5H7.5A2 2 0 0 0 5.5 5.5v13a2 2 0 0 0 2 2h9a2 2 0 0 0 2-2V8.5L14 3.5z"/><path d="M14 3.5v5h5M9 13h6M9 16.5h4"/></svg>',
    invoice: '<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M7 3.5h10A1.5 1.5 0 0 1 18.5 5v15.5l-2.4-1.6-2.6 1.6-2.5-1.6-2.5 1.6-2.5-1.6L3.5 20.5V5A1.5 1.5 0 0 1 5 3.5H7z"/><path d="M8.5 9h7M8.5 13h7"/></svg>',
    camera: '<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 8h2.8l1.7-2h6.9l1.7 2H20a1 1 0 0 1 1 1v9.2a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z"/><circle cx="12" cy="13.2" r="3.1"/></svg>',
    people: '<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M15.5 19.5v-1.2A3.2 3.2 0 0 0 12.3 15H6.7A3.2 3.2 0 0 0 3.5 18.3v1.2"/><circle cx="9.5" cy="8.2" r="2.8"/><path d="M20.5 19.5v-1.1a3 3 0 0 0-2.2-2.9"/><path d="M16.2 5.5a2.7 2.7 0 0 1 0 5.2"/></svg>',
    team: '<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="8" r="2.8"/><circle cx="16.2" cy="9" r="2.3"/><path d="M3.6 19.5v-1.1A3.4 3.4 0 0 1 7 15h4a3.4 3.4 0 0 1 3.4 3.4v1.1M16 14.8h1.4a2.8 2.8 0 0 1 2.8 2.8v1.9"/></svg>',
    gear: '<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 13a1.8 1.8 0 0 0 .05-2l1.85-1.15-1.8-3.12-2.14.56a8 8 0 0 0-1.73-1L15.2 3.5h-6.4l-.43 2.79a8 8 0 0 0-1.73 1l-2.14-.56-1.8 3.12L4.55 11a1.8 1.8 0 0 0 0 2l-1.85 1.15 1.8 3.12 2.14-.56a8 8 0 0 0 1.73 1l.43 2.79h6.4l.43-2.79a8 8 0 0 0 1.73-1l2.14.56 1.8-3.12L19.4 13z"/></svg>',
    bell: '<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9.2a6 6 0 1 1 12 0c0 7 1.5 8.3 1.5 8.3H4.5S6 16.2 6 9.2z"/><path d="M10 19.5a2 2 0 0 0 4 0"/></svg>',
    plus: '<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>',
    search: '<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="6.5"/><path d="M16 16.5 20.5 21"/></svg>',
    more: '<svg class="ic" viewBox="0 0 24 24" fill="currentColor"><circle cx="5.5" cy="12" r="1.7"/><circle cx="12" cy="12" r="1.7"/><circle cx="18.5" cy="12" r="1.7"/></svg>',
    dollar: '<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3.5v17"/><path d="M16 7.5c0-1.8-1.8-3-4-3s-4 1.1-4 3c0 4 8 2 8 6 0 1.9-1.8 3.2-4 3.2s-4-1.2-4-3.2"/></svg>',
    alert: '<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="8.5"/><path d="M12 8v5M12 16.2h.01"/></svg>',
    doc: '<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="5" width="12" height="15.5" rx="2"/><path d="M9 5.2V4.5A1.5 1.5 0 0 1 10.5 3h3A1.5 1.5 0 0 1 15 4.5v.7M9 11h6M9 15h4"/></svg>',
    wrench: '<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M14.7 6.3a4.2 4.2 0 0 1 5 5L14 17l-2.5-.2L11.2 14l5.5-7.7z"/><path d="m11.2 14-6.7 6.7a1.4 1.4 0 0 0 2 2L13.2 16"/></svg>'
  };
  const GALLERY = ['/assets/img/job-hvac.jpg','/assets/img/job-electrical.jpg','/assets/img/job-paint.jpg','/assets/img/job-landscape.jpg','/assets/img/photo-kitchen.jpg','/assets/img/photo-tile.jpg'];

  function db() { try { return DB; } catch (e) { return null; } }
  function esc(s) { return String(s ?? '').replace(/[&<>"']/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
  function company() { return String(db()?.profile?.businessName || '').trim(); }
  function today() { return typeof todayStr === 'function' ? todayStr() : new Date().toISOString().slice(0, 10); }
  function moneyText(cents) { return typeof money === 'function' ? money(cents || 0) : '$' + ((Number(cents) || 0) / 100).toFixed(2); }
  function photoFor(title) {
    const t = String(title || '').toLowerCase();
    if (/panel|electric|breaker|wire|oak/.test(t)) return '/assets/img/job-electrical.jpg';
    if (/paint|coat|birch/.test(t)) return '/assets/img/job-paint.jpg';
    if (/clean|yard|garden|landscap|harbour|spring|bed/.test(t)) return '/assets/img/job-landscape.jpg';
    if (/hvac|furnace|heat|air/.test(t)) return '/assets/img/job-hvac.jpg';
    if (/plumb|faucet|drain|water|pipe|heater/.test(t)) return '/assets/img/job-plumbing.jpg';
    if (/bath|tile/.test(t)) return '/assets/img/job-bath.jpg';
    if (/kitchen/.test(t)) return '/assets/img/job-kitchen.jpg';
    return '/assets/img/tools.jpg';
  }
  function counts() {
    const data = db() || {};
    const quotes = data.quotes || [];
    const invoices = data.invoices || [];
    const jobs = data.jobs || [];
    const day = today();
    return {
      jobs: jobs.filter((j) => !['Completed','Cancelled','Invoiced'].includes(j.status || j.flowStage)).length,
      quotes: quotes.filter((q) => q.status === 'sent').length,
      invoices: invoices.filter((inv) => typeof invoiceTotals === 'function' && invoiceTotals(inv).balance > 0).length,
      today: jobs.filter((j) => j.date === day && !['Cancelled'].includes(j.status)).length,
      progress: jobs.filter((j) => (j.status || j.flowStage) === 'In Progress').length
    };
  }
  function initials() {
    const name = company();
    const bits = name.split(/\s+/).filter(Boolean);
    return ((bits[0] || 'Q')[0] + (bits[1] || '')[0]).toUpperCase();
  }
  function active() {
    if (document.body.dataset.qnSection === 'team') return 'team';
    const id = document.querySelector('#qn-d .view.active, .view.active')?.id.replace(/^view-/, '') || 'home';
    if (['plans','reports','help','purchases','inspections','money','project'].includes(id)) return 'more';
    return id;
  }
  function go(view) {
    closeMenus();
    if (view === 'team') {
      document.body.dataset.qnSection = 'team';
      window.showView?.('more');
      document.querySelector('[data-qn-crew-open]')?.click();
    } else if (view === 'photos') {
      document.body.dataset.qnSection = '';
      document.querySelector('[data-photo-journal-open]')?.click() || window.showView?.('photos');
    } else {
      document.body.dataset.qnSection = '';
      window.showView?.(view);
    }
    markNav();
  }
  function createRecord(kind) {
    closeMenus();
    if (kind === 'quote') document.querySelector('[data-action="new-quote"]')?.click();
    else if (kind === 'invoice') document.querySelector('[data-action="new-invoice"]')?.click();
    else if (kind === 'customer') document.querySelector('[data-action="new-client"]')?.click();
    else if (kind === 'job') { window.showView?.('jobs'); setTimeout(() => document.getElementById('qn-new-job')?.click(), 40); }
    else if (kind === 'photo') document.querySelector('[data-photo-journal-open]')?.click();
  }
  function closeMenus() {
    document.getElementById('qn-d-menu')?.setAttribute('hidden', '');
    document.getElementById('qn-d-notes')?.setAttribute('hidden', '');
  }
  function openJob(id) { window.qnOpenJobDetail?.(id); }
  function pill(status) {
    const s = status || '';
    if (['Completed','Invoiced','Paid'].includes(s)) return 'paid';
    if (s === 'Scheduled') return 'scheduled';
    if (s === 'Sent') return 'sent';
    return 'progress';
  }
  function dot(status) {
    return pill(status) === 'scheduled' ? '#EA580C' : pill(status) === 'paid' ? '#059669' : pill(status) === 'sent' ? '#2563EB' : '#7C3AED';
  }
  function soft(status) {
    return pill(status) === 'scheduled' ? '#FFEDD5' : pill(status) === 'paid' ? '#D1FAE5' : pill(status) === 'sent' ? '#DBEAFE' : '#EDE9FE';
  }

  function navButton(view, label, icon, phone) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = phone ? 'tab' : 'nav-item';
    b.dataset.go = view;
    b.innerHTML = icon + '<span data-qn-i18n>' + label + '</span>';
    b.addEventListener('click', () => go(view));
    return b;
  }

  function build() {
    if (document.getElementById('qn-d') || !document.querySelector('main')) return;
    document.body.classList.add('qn-d');
    document.getElementById('qn-side')?.remove();
    document.getElementById('qn-topbar')?.remove();
    document.getElementById('qn-phone-tabs')?.remove();
    const root = document.createElement('div');
    root.id = 'qn-d';
    root.className = 'app theme-c';
    const side = document.createElement('aside');
    side.className = 'sidebar';
    side.innerHTML = '<div class="brand"><div class="brand-mark">' + MARK + '</div><div><div class="brand-name">Quote Noble</div><div class="brand-co" data-qn-no-translate></div></div></div>';
    const groups = [
      ['Work', [['home','Dashboard',I.home],['schedule','Schedule',I.cal],['jobs','Jobs',I.jobs],['quotes','Quotes',I.quote],['invoices','Invoices',I.invoice]]],
      ['Media', [['photos','Photos',I.camera]]],
      ['People', [['clients','Customers',I.people],['team','Team',I.team]]],
      ['Settings', [['more','Settings',I.gear]]]
    ];
    groups.forEach(([label, items]) => {
      const lab = document.createElement('div');
      lab.className = 'nav-label';
      lab.dataset.qnI18n = '';
      lab.textContent = label;
      side.appendChild(lab);
      const nav = document.createElement('div');
      nav.className = 'nav';
      items.forEach(([view, name, icon]) => nav.appendChild(navButton(view, name, icon, false)));
      side.appendChild(nav);
    });
    const profile = document.createElement('button');
    profile.type = 'button';
    profile.className = 'profile';
    profile.innerHTML = '<div class="avatar"></div><div><div class="profile-name" data-qn-no-translate></div><div class="profile-role" data-qn-i18n>Owner</div><span class="profile-sync" data-qn-no-translate></span></div>';
    profile.addEventListener('click', () => window.openProfileForm?.());
    side.appendChild(profile);

    const stage = document.createElement('div');
    stage.className = 'main';
    const phone = document.createElement('header');
    phone.className = 'phone-header';
    phone.innerHTML = '<div><h1 data-qn-no-translate></h1><p data-qn-no-translate></p></div><div class="right"><button type="button" class="icon-btn" data-notes>' + I.bell + '<span class="notif-dot" hidden>0</span></button><div class="avatar"></div></div>';
    const top = document.createElement('header');
    top.className = 'topbar';
    top.innerHTML = '<label class="search">' + I.search + '<input type="search" placeholder="Search jobs, customers, invoices..." aria-label="Search jobs, customers, invoices..."></label><div class="topbar-actions"><button type="button" class="icon-btn" data-notes>' + I.bell + '<span class="notif-dot" hidden>0</span></button><div style="position:relative"><button type="button" class="btn-new" id="qn-d-new">' + I.plus + '<span data-qn-i18n>New</span></button><div id="qn-d-menu" hidden class="qn-d-menu"></div></div></div>';
    const content = document.createElement('div');
    content.className = 'content';
    const main = document.querySelector('main');
    [...main.children].forEach((node) => { if (node.classList?.contains('view') || node.id?.startsWith('view-')) content.appendChild(node); });
    if (!document.getElementById('dash-recent')) {
      const hidden = document.createElement('div');
      hidden.innerHTML = '<div id="dash-recent" hidden></div><div id="dash-stats" hidden></div>';
      content.appendChild(hidden);
    }
    stage.append(phone, top, content);
    const tabs = document.createElement('nav');
    tabs.className = 'tabbar';
    [['home','Home',I.home],['schedule','Schedule',I.cal]].forEach(([v,l,ic]) => tabs.appendChild(navButton(v,l,ic,true)));
    const plusWrap = document.createElement('div');
    plusWrap.className = 'tab-plus-wrap';
    plusWrap.innerHTML = '<button type="button" class="tab-plus" aria-label="New">' + I.plus + '</button>';
    tabs.appendChild(plusWrap);
    [['jobs','Jobs',I.jobs],['more','More',I.more]].forEach(([v,l,ic]) => tabs.appendChild(navButton(v,l,ic,true)));
    root.append(side, stage, tabs);
    document.body.appendChild(root);

    const menu = document.getElementById('qn-d-menu');
    [['quote','New quote'],['job','New job'],['invoice','New invoice'],['photo','Add photo'],['customer','Add customer']].forEach(([kind, label]) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.dataset.qnI18n = '';
      b.textContent = label;
      b.addEventListener('click', () => createRecord(kind));
      menu.appendChild(b);
    });
    document.getElementById('qn-d-new').addEventListener('click', (e) => { e.stopPropagation(); menu.hidden = !menu.hidden; });
    plusWrap.querySelector('button').addEventListener('click', (e) => { e.stopPropagation(); menu.hidden = !menu.hidden; menu.classList.add('qn-d-menu-phone'); });
    top.querySelector('input').addEventListener('input', (e) => search(e.target));
    document.addEventListener('click', (e) => { if (!e.target.closest('#qn-d-menu, #qn-d-new, .tab-plus')) closeMenus(); });
    phone.querySelector('.avatar').addEventListener('click', () => window.openProfileForm?.());
  }

  function search(input) {
    let box = document.getElementById('qn-d-results');
    if (!box) {
      box = document.createElement('div');
      box.id = 'qn-d-results';
      box.className = 'qn-d-results';
      input.closest('.search').appendChild(box);
    }
    const rows = window.QNJobFlow?.search?.(db(), input.value) || [];
    box.replaceChildren();
    box.hidden = !input.value.trim();
    rows.slice(0, 8).forEach((row) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.innerHTML = '<strong>' + esc(row.title) + '</strong><small>' + esc(row.detail || '') + '</small>';
      b.addEventListener('click', () => {
        input.value = '';
        box.hidden = true;
        if (row.kind === 'customer') { window.showView?.('clients'); window.openClientDetail?.(row.id); }
        else if (row.kind === 'quote') { window.showView?.('quotes'); window.openDocument?.('q', row.id); }
        else if (row.kind === 'invoice') { window.showView?.('invoices'); window.openDocument?.('i', row.id); }
        else openJob(row.id);
      });
      box.appendChild(b);
    });
  }

  function spark(values, color, id) {
    const nums = (values || []).map(Number).filter((n) => Number.isFinite(n));
    const pts = (nums.length > 1 ? nums : [1, 1]).map((n, i, arr) => {
      const max = Math.max(...arr, 1), min = Math.min(...arr, 0);
      const x = (i / (arr.length - 1)) * 120;
      const y = 30 - ((n - min) / (max - min || 1)) * 22;
      return x.toFixed(1) + ',' + y.toFixed(1);
    }).join(' ');
    return '<svg class="spark" viewBox="0 0 120 36" preserveAspectRatio="none" aria-hidden="true"><defs><linearGradient id="' + id + '" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="' + color + '" stop-opacity="0.3"/><stop offset="100%" stop-color="' + color + '" stop-opacity="0"/></linearGradient></defs><polyline fill="none" stroke="' + color + '" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round" points="' + pts + '"/></svg>';
  }

  function renderHome() {
    const home = document.getElementById('view-home');
    const data = db();
    if (!home || !data) return;
    const tally = counts();
    const month = today().slice(0, 7);
    let revenue = 0, unpaid = 0;
    (data.invoices || []).forEach((inv) => {
      (inv.payments || []).forEach((p) => { if (String(p.date || '').slice(0, 7) === month) revenue += Math.round(p.amount) || 0; });
      if (String(inv.createdAt || '').slice(0, 7) === month) revenue += Math.round(inv.depositPaid || 0);
      if (typeof invoiceTotals === 'function') unpaid += Math.max(0, invoiceTotals(inv).balance);
    });
    const awaiting = (data.quotes || []).filter((q) => q.status === 'sent');
    const potential = awaiting.reduce((n, q) => n + (typeof quoteTotals === 'function' ? quoteTotals(q).total : 0), 0);
    const hour = new Date().getHours();
    const greetings = { en: ['Good morning','Good afternoon','Good evening'], ru: ['Доброе утро','Добрый день','Добрый вечер'], uk: ['Доброго ранку','Добрий день','Добрий вечір'] };
    const greet = (greetings[window.qnLanguage?.get()] || greetings.en)[hour < 12 ? 0 : hour < 18 ? 1 : 2];
    const dateLine = new Date().toLocaleDateString(window.qnLanguage?.locale?.() || 'en-CA', { weekday: 'long', month: 'long', day: 'numeric' });
    const jobsToday = (data.jobs || []).filter((j) => j.date === today() && j.status !== 'Cancelled');
    const upcoming = (data.jobs || []).filter((j) => j.date && j.date > today() && j.status !== 'Cancelled').slice(0, 4);
    const rows = jobsToday.length ? jobsToday : upcoming;
    const series = window.qnDesignSeries || {};
    const cards = [
      ['k1', 'Revenue this month', moneyText(revenue), 'This month', I.dollar, '#E85D04', series.paid],
      ['k2', 'Unpaid invoices', moneyText(unpaid), tally.invoices + ' open', I.alert, '#EA580C', series.outstanding],
      ['k3', 'Quotes awaiting approval', String(tally.quotes), moneyText(potential) + ' potential', I.doc, '#2563EB', series.quoted],
      ['k4', 'Jobs today', String(tally.today), tally.progress + ' in progress', I.wrench, '#7C3AED', series.overdue]
    ];
    const schedule = rows.map((job) => {
      const when = job.date === today() ? 'Today' : (job.date || '');
      return '<button type="button" class="sked-item" data-job="' + esc(job.id) + '" style="--dot:' + dot(job.status || job.flowStage) + ';--dot-soft:' + soft(job.status || job.flowStage) + '"><div class="sked-time">' + esc(when) + '</div><div class="sked-rail"></div><div><div class="sked-title">' + esc(job.title || 'Job') + '</div><div class="sked-sub">' + esc([job.client, job.siteAddress || ''].filter(Boolean).join(' · ')) + '</div></div><span class="pill ' + pill(job.status || job.flowStage) + '">' + esc(job.flowStage || job.status || '') + '</span></button>';
    }).join('');
    const empty = !rows.length
      ? '<div class="sked-empty" data-qn-i18n>Nothing is scheduled. The day is open.</div>'
      : (rows.length < 2 ? '<div class="sked-empty" data-qn-i18n>The rest of the day is open.</div>' : '');
    const recent = (data.jobs || []).slice(0, 3);
    home.innerHTML = '<div class="greeting"><div><h1 data-qn-no-translate>' + esc(greet) + '</h1><p data-qn-no-translate>' + esc(dateLine + ' · ' + tally.today + ' jobs on the board today') + '</p></div><div class="chip desk-only" data-qn-no-translate>' + esc(company() || 'Quote Noble') + '</div></div>'
      + '<section class="kpis">' + cards.map((c, i) => '<article class="kpi ' + c[0] + '"><div class="kpi-label" data-qn-i18n>' + c[1] + '</div><div class="kpi-icon">' + c[4] + '</div><div class="kpi-value" data-qn-no-translate>' + esc(c[2]) + '</div><div class="kpi-meta" data-qn-no-translate>' + esc(c[3]) + '</div>' + spark(c[6], c[5], 'qnd' + i) + '</article>').join('') + '</section>'
      + '<div class="mid"><section class="panel"><div class="panel-head"><div class="panel-title" data-qn-i18n>Today\'s schedule</div><button type="button" class="link" data-go="schedule" data-qn-i18n>See all</button></div>' + (schedule || '') + empty + '</section>'
      + '<section class="panel photos"><div class="panel-head"><div class="panel-title" data-qn-i18n>Recent photos</div><button type="button" class="link" data-go="photos" data-qn-i18n>Open gallery</button></div><div class="photo-strip">' + GALLERY.map((src) => '<figure><img src="' + src + '" alt=""></figure>').join('') + '</div></section></div>'
      + '<section class="jobs"><div class="panel-head"><div class="panel-title" data-qn-i18n>Recent jobs</div><button type="button" class="link" data-go="jobs" data-qn-i18n>View all</button></div><div class="jobs-grid">' + recent.map((job) => '<button type="button" class="job-card" data-job="' + esc(job.id) + '"><div class="job-photo"><img src="' + photoFor(job.title) + '" alt=""><span class="pill ' + pill(job.status || job.flowStage) + '">' + esc(job.flowStage || job.status || '') + '</span></div><div class="job-body"><div class="job-title">' + esc(job.title || 'Job') + '</div><div class="job-sub">' + esc(job.client || '') + '</div><div class="job-foot"><span class="job-amt">' + esc(job.agreedTotal ? moneyText(job.agreedTotal) : '') + '</span></div></div></button>').join('') + '</div></section>'
      + '<div id="dash-recent" hidden></div><div id="dash-stats" hidden></div>';
    home.querySelectorAll('[data-job]').forEach((node) => node.addEventListener('click', () => openJob(node.dataset.job)));
    home.querySelectorAll('[data-go]').forEach((node) => node.addEventListener('click', () => go(node.dataset.go)));
    const phoneHead = document.querySelector('#qn-d .phone-header');
    if (phoneHead) {
      phoneHead.querySelector('h1').textContent = greet;
      phoneHead.querySelector('p').textContent = dateLine;
    }
  }

  function markNav() {
    const name = active();
    document.querySelectorAll('#qn-d [data-go]').forEach((node) => {
      const on = node.dataset.go === name || (name === 'home' && node.dataset.go === 'home');
      node.classList.toggle('active', on);
    });
    const tally = counts();
    const map = { jobs: tally.jobs, quotes: tally.quotes, invoices: tally.invoices };
    document.querySelectorAll('#qn-d .nav-item').forEach((node) => {
      node.querySelector('.badge')?.remove();
      const n = map[node.dataset.go];
      if (n) {
        const b = document.createElement('span');
        b.className = 'badge';
        b.textContent = String(n);
        node.appendChild(b);
      }
    });
    const jobsTab = document.querySelector('#qn-d .tab[data-go="jobs"]');
    if (jobsTab) {
      jobsTab.querySelector('.tab-badge')?.remove();
      if (tally.jobs) {
        const b = document.createElement('span');
        b.className = 'tab-badge';
        b.textContent = String(tally.jobs);
        jobsTab.appendChild(b);
      }
    }
    const co = company() || 'Quote Noble';
    const coNode = document.querySelector('#qn-d .brand-co');
    if (coNode) coNode.textContent = co;
    const profileName = document.querySelector('#qn-d .profile-name');
    if (profileName) profileName.textContent = co;
    document.querySelectorAll('#qn-d .avatar').forEach((node) => { node.textContent = initials(); });
    const sync = document.querySelector('#qn-d .profile-sync');
    const bar = document.getElementById('qn-save-status');
    if (sync) sync.textContent = bar?.textContent?.trim() || '';
    const notes = document.querySelectorAll('#qn-d .notif-dot');
    const n = tally.quotes + tally.invoices;
    notes.forEach((dot) => { dot.hidden = !n; dot.textContent = String(n); });
  }

  function dressJobs() {
    document.querySelectorAll('#job-list .list-item').forEach((row) => {
      row.querySelector('.qn-job-photos')?.remove();
      if (row.querySelector('.qn-d-photo')) return;
      const img = document.createElement('img');
      img.className = 'qn-d-photo';
      img.alt = '';
      img.src = photoFor(row.querySelector('.title')?.textContent || '');
      row.prepend(img);
    });
    const board = document.querySelector('#view-photos .qn-photo-board');
    if (board && new URLSearchParams(location.search).has('designpreview')) {
      [...board.querySelectorAll('img')].forEach((img, i) => { img.src = GALLERY[i % GALLERY.length]; });
    }
  }

  function boot() {
    if (!document.body.classList.contains('qn-authenticated') && !new URLSearchParams(location.search).has('designpreview')) return;
    build();
    if (document.getElementById('view-home')?.classList.contains('active')) renderHome();
    markNav();
    dressJobs();
  }
  const previous = window.showView;
  if (typeof previous === 'function' && !previous.qnD) {
    const wrapped = function (name) {
      const result = previous.apply(this, arguments);
      build();
      if (name === 'home' || document.getElementById('view-home')?.classList.contains('active')) renderHome();
      markNav();
      dressJobs();
      return result;
    };
    wrapped.qnD = true;
    window.showView = wrapped;
  }
  document.addEventListener('qn-language-changed', () => { renderHome(); markNav(); });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
  window.addEventListener('load', boot);
  new MutationObserver(() => { if (document.body.classList.contains('qn-authenticated')) boot(); }).observe(document.body, { attributes: true, attributeFilter: ['class'] });
})();
