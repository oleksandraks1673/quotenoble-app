const { stripe, auth, customer, error } = require('./_common');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const user = await auth(req);
    const st = stripe();
    const billingCustomer = await customer(st, user);

    if (!billingCustomer) {
      return res.status(404).json({ error: 'No billing account found' });
    }

    const origin = (process.env.QUOTENOBLE_APP_URL || 'https://www.quotenoble.com').replace(/\/$/, '');
    const session = await st.billingPortal.sessions.create({
      customer: billingCustomer.id,
      return_url: origin + '/'
    });

    return res.status(200).json({ url: session.url });
  } catch (e) {
    console.error('Stripe billing portal error:', e.message);
    return error(res, e);
  }
};
