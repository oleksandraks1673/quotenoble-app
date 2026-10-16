/* Quote.Noble billing status UI — server-authoritative, never infer Pro from redirects. */
(() => {
  'use strict';
  let busy = false;
  const byId = id => document.getElementById(id);
  const set = (id, value) => { const el = byId(id); if (el) el.textContent = value; };
  function setManage(visible) {
    const el = byId('qn-billing-manage');
    if (el) el.style.display = visible ? '' : 'none';
  }
  function display(data) {
    const active = data?.pro === true || data?.is_pro === true;
    const status = String(data?.status || 'none');
    const name = active ? 'Pro Active' : status === 'none' ? 'Free plan' : 'Subscription: ' + status.replace(/_/g,' ');
    set('qn-billing-state', name);
    set('qn-member-status', 'Current subscription: ' + name);
    const plan = data?.plan === 'yearly' ? 'Yearly' : data?.plan === 'monthly' ? 'Monthly' : '';
    const renewal = data?.current_period_end ? new Date(data.current_period_end * 1000).toLocaleDateString() : '';
    const parts = [plan, renewal && (data?.cancel_at_period_end ? 'Access until ' : 'Current period ends ') + renewal].filter(Boolean);
    set('qn-billing-detail', parts.join(' · ') || (active ? 'Your subscription is verified by Stripe.' : 'No active Pro subscription confirmed.'));
    setManage(Boolean(data?.subscription_id) && status !== 'none');
    const choose = byId('qn-pro-start');
    if (choose) { choose.disabled = active; choose.textContent = active ? 'Your Pro subscription is active' : 'Choose Pro plan'; }
  }
  async function refresh() {
    if (busy || typeof window.qnSubscriptionStatus !== 'function') return;
    busy = true;
    set('qn-billing-state', 'Checking subscription with Stripe…');
    try {
      const data = await window.qnSubscriptionStatus();
      display(data);
    } catch (err) {
      set('qn-billing-state', 'Unable to verify subscription');
      set('qn-member-status', 'Subscription status unavailable');
      set('qn-billing-detail', (err && err.message) || 'Please sign in and try again.');
      setManage(false);
    } finally { busy = false; }
  }
  document.addEventListener('click', e => {
    if (e.target.closest('#qn-billing-refresh')) refresh();
    if (e.target.closest('#qn-billing-manage')) {
      const existing = byId('cloud-portal');
      if (existing) existing.click();
      else { set('qn-billing-detail', 'Billing portal is unavailable. Please reload and sign in again.'); }
    }
    if (e.target.closest('[data-action="view-plans"], [data-qn-more="membership"], [data-view="more"]')) {
      setTimeout(refresh, 250);
    }
  });
  window.addEventListener('focus', refresh);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) refresh(); });
  window.addEventListener('load', () => {
    refresh();
    const query = new URLSearchParams(location.search);
    if (query.has('checkout') || query.has('billing')) {
      const url = new URL(location.href);
      url.searchParams.delete('checkout'); url.searchParams.delete('billing'); url.searchParams.delete('session_id');
      history.replaceState(history.state, '', url.pathname + url.search + url.hash);
      setTimeout(refresh, 1200);
    }
  });
  window.qnRefreshBilling = refresh;
})();
