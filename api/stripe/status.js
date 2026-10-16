const { stripe, auth, customer, error } = require('./_common');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  res.setHeader('Cache-Control', 'no-store');

  try {
    const user = await auth(req);
    const st = stripe();
    const billingCustomer = await customer(st, user);

    if (!billingCustomer) {
      return res.status(200).json({ pro: false, status: 'none', current_period_end: null });
    }

    const subscriptions = await st.subscriptions.list({
      customer: billingCustomer.id,
      status: 'all',
      limit: 100
    });

    const active = subscriptions.data.find(subscription =>
      ['active', 'trialing'].includes(subscription.status)
    );

    return res.status(200).json({
      pro: Boolean(active),
      status: active?.status || 'inactive',
      current_period_end: active?.current_period_end || null
    });
  } catch (e) {
    console.error('Stripe subscription status error:', e.message);
    return error(res, e);
  }
};
