const { stripe, auth, customer, error } = require('./_common');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
  try {
    const user = await auth(req);
    const st = stripe();
    const billingCustomer = await customer(st, user);
    if (!billingCustomer) {
      return res.status(200).json({ pro: false, status: 'none', plan: 'free', current_period_end: null });
    }

    const subscriptions = await st.subscriptions.list({
      customer: billingCustomer.id,
      status: 'all',
      limit: 100,
      expand: ['data.items.data.price']
    });
    const rank = { active: 0, trialing: 1, past_due: 2, unpaid: 3, incomplete: 4, canceled: 5 };
    const ordered = subscriptions.data.slice().sort((a, b) =>
      (rank[a.status] ?? 6) - (rank[b.status] ?? 6) || b.created - a.created
    );
    const subscription = ordered[0];
    const pro = Boolean(subscription && ['active', 'trialing'].includes(subscription.status));
    const recurring = subscription?.items?.data?.[0]?.price?.recurring?.interval;
    const plan = pro ? (recurring === 'year' ? 'yearly' : 'monthly') : 'free';

    return res.status(200).json({
      pro,
      is_pro: pro,
      status: subscription?.status || 'none',
      plan,
      subscription_id: subscription?.id || null,
      current_period_end: subscription?.current_period_end || null,
      cancel_at_period_end: Boolean(subscription?.cancel_at_period_end)
    });
  } catch (e) {
    console.error('Stripe subscription status error:', e.message);
    return error(res, e);
  }
};
