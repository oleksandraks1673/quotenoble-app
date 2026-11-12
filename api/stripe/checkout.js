

const { stripe, auth, customer, error } = require('./_common');

const TIERS = ['basic', 'pro', 'ultimate'];

// Resolve the Stripe price ID for a tier + billing cycle.
// Per-tier env vars win (STRIPE_PRICE_<TIER>_MONTHLY / _YEARLY). The legacy
// single-plan pair (STRIPE_PRICE_MONTHLY / STRIPE_PRICE_YEARLY) stays as the
// fallback for Pro — and for requests that name no tier — so the price
// configuration already live in production keeps working unchanged.
function priceIdFor(tier, plan) {
  const cycle = plan === 'yearly' ? 'YEARLY' : 'MONTHLY';
  if (tier) {
    const specific = process.env[`STRIPE_PRICE_${tier.toUpperCase()}_${cycle}`];
    if (specific) return specific;
    if (tier !== 'pro') return null;
  }
  return plan === 'yearly'
    ? process.env.STRIPE_PRICE_YEARLY
    : process.env.STRIPE_PRICE_MONTHLY;
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const user = await auth(req);
    const st = stripe();

    const plan = req.body?.plan || 'monthly';
    if (!['monthly', 'yearly'].includes(plan)) {
      return res.status(400).json({ error: 'Invalid subscription plan' });
    }

    const tier = req.body?.tier;
    if (tier !== undefined && !TIERS.includes(tier)) {
      return res.status(400).json({ error: 'Invalid subscription tier' });
    }

    const trial = req.body?.trial === true;

    const priceId = priceIdFor(tier, plan);

    if (!priceId) {
      throw new Error('Stripe price configuration missing');
    }

    const price = await st.prices.retrieve(priceId);
    if (!price.active || price.type !== 'recurring') {
      return res.status(400).json({ error: 'Invalid subscription price' });
    }

    const existingCustomer = await customer(st, user, true);

    const subscriptions = await st.subscriptions.list({
      customer: existingCustomer.id,
      status: 'all',
      limit: 100
    });

    const alreadySubscribed = subscriptions.data.some(s =>
      ['active', 'trialing', 'past_due', 'unpaid'].includes(s.status)
    );

    if (alreadySubscribed) {
      return res.status(409).json({
        error: 'You already have a subscription. Manage it in Billing.'
      });
    }

    const origin = (process.env.APP_BASE_URL || 'https://www.quotenoble.com').replace(/\/+$/, '');

    const session = await st.checkout.sessions.create({
      mode: 'subscription',
      customer: existingCustomer.id,
      client_reference_id: user.id,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: origin + '/?checkout=success&session_id={CHECKOUT_SESSION_ID}',
      cancel_url: origin + '/?checkout=cancel',
      metadata: { qn_user_id: user.id },
      subscription_data: {
        metadata: { qn_user_id: user.id },
        ...(trial ? { trial_period_days: 7 } : {})
      }
    });

    return res.status(200).json({ url: session.url });
  } catch (e) {
    console.error('Stripe checkout error:', e.message);
    return error(res, e);
  }
};
