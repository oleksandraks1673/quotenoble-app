"use strict";
/* QuoteNoble floating dock (chunk 5) — bolt-on, follows the chunks 2–4 pattern.
 *
 * Two scripts rewrite the tab bar during startup, so the bar cannot be
 * restyled reliably at the source:
 *   - workflow.js replaces the Customers button's innerHTML with a Jobs
 *     button whose icon is the unicode glyph "▣" (in index.html that glyph
 *     version is even baked into the static markup), and
 *   - simple-navigation.js reorders the buttons to
 *     home / quotes / jobs / invoices / more.
 * Editing the shipped HTML alone would therefore leave Jobs with a glyph
 * icon in app.html. Instead this module runs last (its tag sits after all
 * chunk 1–4 tags in both pages), marks the bar with .qn-dock for dock.css,
 * swaps the one glyph icon for an inline SVG drawn in the same stroke style
 * as the other four buttons (24 viewBox, stroke currentColor, width 1.8,
 * round caps/joins), and mirrors chunk 4's to-sort count onto the bar's
 * More button. A MutationObserver re-applies the swap if a later rewrite
 * stomps the button again. Nothing navigational changes: destinations,
 * order, data-view values and every showView wrapper are left exactly as
 * the earlier scripts made them.
 */
(function () {
  if (window.qnFloatingDock) return;
  window.qnFloatingDock = true;

  var JOBS_ICON =
    '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="2.5" y="7" width="19" height="13" rx="2"/><path d="M8.5 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M2.5 12.5h19"/></svg>';

  function bar() {
    return document.getElementById("tabbar");
  }

  function jobsIconNeedsSwap(nav) {
    var jobs = nav.querySelector('[data-view="jobs"]');
    if (!jobs) return false;
    var ico = jobs.querySelector(".ico");
    return !!ico && !ico.querySelector("svg");
  }

  function ensureBadge(nav) {
    var more = nav.querySelector('[data-view="more"]');
    if (!more) return null;
    var badge = more.querySelector(".qn-dock-badge");
    if (!badge) {
      badge = document.createElement("span");
      badge.className = "qn-dock-badge";
      badge.hidden = true;
      badge.setAttribute("aria-hidden", "true");
      more.appendChild(badge);
    }
    return badge;
  }

  /* The count source is chunk 4's own badge ([data-payments-badge] in the
   * More menu), which payments-sort.js keeps current; window.QNPayments is
   * the fallback if that element is ever missing. */
  function sortCount() {
    var src = document.querySelector("[data-payments-badge]");
    if (src) {
      if (src.hidden) return 0;
      var n = parseInt(src.textContent, 10);
      return isNaN(n) ? 0 : n;
    }
    try {
      if (window.QNPayments && typeof window.QNPayments.unsorted === "function") {
        return window.QNPayments.unsorted().length || 0;
      }
    } catch (e) {}
    return 0;
  }

  function syncBadge(nav) {
    var badge = ensureBadge(nav);
    if (!badge) return;
    var n = sortCount();
    var text = n ? String(n) : "";
    if (badge.hidden === !n && badge.textContent === text) return;
    badge.hidden = !n;
    badge.textContent = text;
  }

  function upgrade() {
    var nav = bar();
    if (!nav) return;
    if (!nav.classList.contains("qn-dock")) nav.classList.add("qn-dock");
    if (document.body && !document.body.classList.contains("qn-dock-on")) {
      document.body.classList.add("qn-dock-on");
    }
    if (jobsIconNeedsSwap(nav)) {
      nav.querySelector('[data-view="jobs"] .ico').innerHTML = JOBS_ICON;
    }
    syncBadge(nav);
  }

  /* Re-apply if a later rewrite replaces the Jobs button or its icon.
   * The observer only acts when the glyph is back or the class is gone,
   * and its own mutations settle immediately (the swap leaves an <svg>
   * in place), so it cannot loop. */
  var barWatched = false;
  function watchBar() {
    var nav = bar();
    if (!nav || barWatched || typeof MutationObserver !== "function") return;
    barWatched = true;
    var observer = new MutationObserver(function () {
      if (!nav.classList.contains("qn-dock") || jobsIconNeedsSwap(nav)) upgrade();
    });
    observer.observe(nav, { childList: true, subtree: true });
  }

  /* Keep the dock badge in step with chunk 4's badge: payments-sort.js
   * updates it by flipping `hidden` and replacing its text. */
  var badgeWatched = false;
  function watchBadge() {
    var src = document.querySelector("[data-payments-badge]");
    if (!src || badgeWatched || typeof MutationObserver !== "function") return;
    badgeWatched = true;
    var observer = new MutationObserver(function () {
      var nav = bar();
      if (nav) syncBadge(nav);
    });
    observer.observe(src, { attributes: true, childList: true, characterData: true });
  }

  function boot() {
    upgrade();
    watchBar();
    watchBadge();
  }

  boot();
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  }
  window.addEventListener("load", boot);
})();
