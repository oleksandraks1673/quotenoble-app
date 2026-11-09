/* Phone Back follows sections and child screens. Draft nodes stay in memory only. */
(() => {
  const KEY = 'qn_navigation_v1';
  const base = {view: window.showView, modal: window.openModal, close: window.closeModal, document: window.openDocument};
  const layers = new Map(), positions = new Map();
  let stack = [], serial = 0, suppress = false, renderingLayer = null, context = null;
  let initialized = document.body.classList.contains('qn-authenticated');
  let closeQueued = false, traversing = false, position = history.state?.[KEY]?.position || 0;
  let backgroundEntry = null;
  const root = type => document.getElementById(type === 'document' ? 'doc-root' : 'modal-root');
  const same = (a, b) => JSON.stringify(a && {...a, position: 0}) === JSON.stringify(b && {...b, position: 0});
  const valid = state => state && state.workspace === LS_KEY && document.getElementById('view-' + state.view);
  function route() {
    const view = document.querySelector('.view.active')?.id.replace(/^view-/, '') || 'home';
    return {view, project: view === 'project' ? window.qnProjectRoute || null : null, photos: view === 'photos' ? window.qnPhotoRoute || null : null, panel: view === 'more' ? document.querySelector('#view-more .qn-more-panel:not([hidden])')?.id || null : null,
      stack: [...stack], business: stack.some(id => layers.get(id)?.key === 'business'), purchaseKind: view === 'purchases' ? window.QNPurchases?.navigationKind?.() || 'order' : null, workspace: LS_KEY, position};
  }
  function remember(state) {
    if (state.view === 'setup') return;
    try {
      localStorage.setItem('qn_last_view', state.view);
      localStorage.setItem('qn_resume_location_v4', JSON.stringify({view: state.view, modal: null}));
    } catch (_) {}
  }
  function write(replace = false) {
    if (suppress || traversing) return;
    if (closeQueued) { closeQueued = false; replace = true; }
    let state = route();
    remember(state);
    const previous = history.state?.[KEY];
    if (same(previous, state)) return;
    replace ||= !valid(previous) || previous.view === 'setup';
    if (!replace) position++;
    state = {...state, position};
    try { history[replace ? 'replaceState' : 'pushState']({...history.state, [KEY]: state}, ''); } catch (_) {}
    positions.set(position, state);
    if (!replace) for (const p of positions.keys()) if (p > position) positions.delete(p);
    for (const id of layers.keys()) if (layers.size > 40 && !stack.includes(id)) layers.delete(id);
  }
  function setPanel(id) {
    if(id==='qn-more-insights'&&!window.qnRequirePro?.('Business insights'))id=null;
    const more = document.getElementById('view-more');
    const selected = [...more.querySelectorAll('.qn-more-panel')].find(p => p.id === id);
    more.querySelectorAll('.qn-more-panel').forEach(p => { p.hidden = p !== selected; });
    more.classList.toggle('qn-more-panel-open', !!selected);
  }
  function renderRoots(refresh = false) {
    const visible = [...stack].reverse().map(id => layers.get(id)).find(item => item?.type !== 'dialog');
    for (const type of ['document', 'modal']) {
      const layer = visible?.type === type ? visible : null;
      const target = root(type);
      if (!layer) { target.replaceChildren(); continue; }
      if (refresh && layer.reopen) {
        target.replaceChildren();
        renderingLayer = layer;
        try { layer.reopen(); } finally { renderingLayer = null; }
      } else target.replaceChildren(...layer.nodes);
    }
  }
  function closeDialog(layer) {
    if (!layer.dialog?.open) return true;
    const event = new Event('cancel', {cancelable: true});
    layer.dialog.dispatchEvent(event);
    if (!event.defaultPrevented) layer.dialog.close();
    return !layer.dialog.open;
  }
  function apply(state) {
    if (!valid(state)) state = {view: 'home', panel: null, stack: [], workspace: LS_KEY};
    const targetStack = (state.stack || []).filter(id => layers.has(id) && (layers.get(id).type !== 'dialog' || layers.get(id).dialog?.open || layers.get(id).reopen));
    suppress = true;
    try {
      for (const id of [...stack].reverse()) {
        const layer = layers.get(id);
        if (!targetStack.includes(id) && layer?.type === 'dialog' && !closeDialog(layer)) return false;
      }
      stack = targetStack;
      if (state.view === 'purchases') window.QNPurchases?.restoreNavigationKind?.(state.purchaseKind);
      window.qnProjectRoute=state.project||null;
      window.qnPhotoRoute=state.photos||null;
      base.view(state.view);
      setPanel(state.view === 'more' ? state.panel : null);
      renderRoots(true);
      for (const id of stack) {
        const layer = layers.get(id);
        if (layer.type === 'dialog' && !layer.dialog?.open && layer.reopen) {
          renderingLayer = layer;
          try { layer.reopen(); } finally { renderingLayer = null; }
        }
      }
      if (state.business && !stack.length) window.openProfileForm();
      remember(route()); window.scrollTo(0, 0); return true;
    } finally { suppress = false; }
  }
  function backAfterClose() {
    if (suppress || traversing || closeQueued) return;
    closeQueued = true;
    queueMicrotask(() => {
      if (!closeQueued) return;
      closeQueued = false;
      const target = route();
      let destination = position - 1;
      for (let p = position - 1; p >= 0; p--) {
        if (same(positions.get(p), target)) { destination = p; break; }
      }
      if (position <= 0) { write(true); return; }
      traversing = true;
      history.go(destination - position);
    });
  }
  function removeLayer(id) {
    const index = stack.indexOf(id);
    if (index < 0) return;
    stack.splice(index, 1);
    if (!suppress) {
      suppress = true;
      try { renderRoots(true); } finally { suppress = false; }
      backAfterClose();
    }
  }
  function addLayer(type, options = {}) {
    let layer = renderingLayer;
    if (!layer && options.key) layer = [...stack].reverse().map(id => layers.get(id)).find(item => item?.key === options.key);
    const returnedToParent = layer && !renderingLayer && stack.indexOf(layer.id) < stack.length - 1;
    if (layer) {
      if (!renderingLayer) stack = stack.slice(0, stack.indexOf(layer.id) + 1);
      Object.assign(layer, options);
    } else {
      layer = {id: 'screen-' + Date.now().toString(36) + '-' + (++serial), type, ...options};
      layers.set(layer.id, layer); stack.push(layer.id);
    }
    if (type !== 'dialog') {
      layer.nodes = [...root(type).childNodes];
      root(type === 'modal' ? 'document' : 'modal').replaceChildren();
    }
    if (returnedToParent) { backAfterClose(); return layer; }
    write(!!options.replace);
    return layer;
  }
  window.openModal = function(title, markup, navigation) {
    const held = suppress; suppress = true;
    let body;
    try { body = base.modal(title, markup); } finally { suppress = held; }
    addLayer('modal', navigation || context || {});
    return body;
  };
  window.closeModal = function() {
    if (suppress) return base.close();
    const id = [...stack].reverse().find(id => layers.get(id)?.type === 'modal');
    if (id) removeLayer(id); else base.close();
  };
  window.openDocument = function(kind, id) {
    const held = suppress; suppress = true;
    try { base.document.apply(this, arguments); } finally { suppress = held; }
    if (!root('document').firstChild) return;
    addLayer('document', {key: 'document:' + kind + ':' + id, reopen: () => window.openDocument(kind, id)});
  };
  window.qnCloseDocument = function() {
    const id = [...stack].reverse().find(id => layers.get(id)?.type === 'document');
    if (id) removeLayer(id); else root('document').replaceChildren();
  };
  window.showView = function(name) {
    const before = route(), saved = history.state?.[KEY];
    const result = base.view.apply(this, arguments);
    if (!document.getElementById('view-' + name) || suppress) return result;
    if (!initialized) {
      initialized = true;
      if (window.qnResumeNavigation !== false && valid(saved) && saved.view === name) apply(saved);
      write(true); return result;
    }
    if (before.view !== name || name === 'project' || name === 'photos') {
      stack = []; base.close(); root('document').replaceChildren(); setPanel(null);
    }
    write(); return result;
  };
  window.qnOpenMorePanel = function(id) { setPanel(id); window.scrollTo(0, 0); write(); };
  window.qnNavigationChanged = () => write();
  for (const [name, prefix] of [['openProfileForm', 'business'], ['openQuoteDetail', 'quote'], ['openInvoiceDetail', 'invoice'], ['openClientDetail', 'customer']]) {
    const original = window[name];
    window[name] = function(...args) {
      const previous = context;
      context = {key: prefix + (args[0] ? ':' + args[0] : ''), reopen: () => window[name](...args)};
      try { return original.apply(this, args); } finally { context = previous; }
    };
  }
  window.qnTrackDialog = function(dialog, reopen) {
    const layer = addLayer('dialog', {dialog, reopen});
    const close = dialog.close.bind(dialog);
    dialog.close = function(...args) { const result = close(...args); removeLayer(layer.id); return result; };
    dialog.addEventListener('close', () => { if (layer.dialog === dialog) removeLayer(layer.id); });
  };
  // Returning to a section shows the welcome Home. Keep active work in place,
  // including document/PDF sharing, quote drafts, photos and edited Business info.
  function canWelcome() {
    if (!initialized || !document.body.classList.contains('qn-authenticated') || traversing || closeQueued) return false;
    if (['setup','plans'].includes(route().view) || root('document').firstChild || document.querySelector('dialog[open]')) return false;
    const open = stack.map(id => layers.get(id)).filter(Boolean);
    if (open.some(layer => layer.key !== 'business' || layer.dirty)) return false;
    return !root('modal').firstChild || open.some(layer => layer.key === 'business');
  }
  function resumeWelcome() {
    const previous = backgroundEntry; backgroundEntry = null;
    if (!previous || previous.workspace !== LS_KEY || !previous.allowed || !canWelcome() || previous.route !== JSON.stringify(route())) return;
    if (apply({...route(),view:'home',panel:null,stack:[],business:false})) write();
  }
  for (const name of ['input','change']) document.addEventListener(name, event => {
    if (!root('modal').contains(event.target)) return;
    const layer = [...stack].reverse().map(id => layers.get(id)).find(item => item?.type === 'modal');
    if (layer) layer.dirty = true;
  });
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') backgroundEntry = {workspace:LS_KEY,allowed:canWelcome(),route:JSON.stringify(route())};
    else if (document.visibilityState === 'visible') resumeWelcome();
  });
  window.addEventListener('pageshow', event => { if (event.persisted) resumeWelcome(); });
  window.addEventListener('popstate', event => {
    initialized = true;
    const previous = route(), state = event.state?.[KEY];
    position = state?.position || 0;
    if (traversing) {
      // A completed save/delete can close another parent before the first pop arrives.
      const target = route();
      if (!same(state, target)) {
        for (let p = position - 1; p >= 0; p--) {
          if (same(positions.get(p), target)) { history.go(p - position); return; }
        }
      }
      traversing = false; write(true); return;
    }
    closeQueued = false;
    if (!state) return;
    if (!apply(state)) { position = previous.position; write(); return; }
    write(true);
  });
  const initial = history.state?.[KEY];
  if (window.qnResumeNavigation !== false && valid(initial)) {
    positions.set(position, initial);
    if (initialized) { apply(initial); write(true); }
  } else write(true);
})();



/* Quote.Noble Roof Designer shortcuts. Non-destructive additive navigation. */
(() => {
  'use strict';
  function openRoofDesigner() { window.location.href = '/roof-designer.html'; }
  function add() {
    const home = document.querySelector('#view-home .qn-simple-shortcuts') || document.querySelector('#view-home .qn-home-actions');
    if (home && !home.querySelector('[data-qn-roof-designer]')) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'btn btn-outline';
      button.dataset.qnRoofDesigner = '';
      button.style.gridColumn = '1 / -1';
      button.textContent = '▱ Roof Designer';
      button.setAttribute('aria-label', 'Open Roof Designer');
      home.appendChild(button);
    }
    const menu = document.querySelector('#view-more .qn-more-menu');
    if (menu && !menu.querySelector('[data-qn-roof-designer]')) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'qn-more-item';
      button.dataset.qnRoofDesigner = '';
      button.innerHTML = '<span class="qn-more-item-icon" aria-hidden="true">▱</span><span><strong>Roof Designer</strong><small>2D roof plans, slope and overhangs</small></span><b aria-hidden="true">›</b>';
      menu.insertBefore(button, menu.children[1] || null);
    }
    document.querySelectorAll('[data-qn-roof-designer]').forEach(button=>{button.onclick=openRoofDesigner;});
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', add, { once: true });
  else add();
})();

(function(){const s=document.createElement('script');s.src='/roof-projects.js?v=20261030-ui-audit1';document.head.append(s)})();

(function(){const s=document.createElement('script');s.src='/contractor-general.js?v=20261030-ui-audit1';document.head.append(s)})();
