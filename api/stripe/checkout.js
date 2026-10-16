

const { stripe, auth, customer, error } = require('./_common');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const user = await auth(req);
    const st = stripe();

    const plan = req.body?.plan;
    if (!['monthly', 'yearly'].includes(plan)) {
      return res.status(400).json({ error: 'Invalid subscription plan' });
    }

    const priceId = plan === 'monthly'
      ? process.env.STRIPE_PRICE_MONTHLY
      : process.env.STRIPE_PRICE_YEARLY;

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

    const origin = 'https://quotenoblev13stripeintegrationprevi.vercel.app';

    const session = await st.checkout.sessions.create({
      mode: 'subscription',
      customer: existingCustomer.id,
      client_reference_id: user.id,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: origin + '/?checkout=success&session_id={CHECKOUT_SESSION_ID}',
      cancel_url: origin + '/?checkout=cancel',
      metadata: { qn_user_id: user.id },
      subscription_data: {
        metadata: { qn_user_id: user.id }
      }
    });

    return res.status(200).json({ url: session.url });
  } catch (e) {
    console.error('Stripe checkout error:', e.message);
    return error(res, e);
  }
};
