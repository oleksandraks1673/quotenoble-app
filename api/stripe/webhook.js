const { stripe } = require('./_common');

// Stripe signatures must be verified against the exact raw request bytes.
// Disable Vercel's default JSON body parser for this endpoint.
module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!process.env.STRIPE_WEBHOOK_SECRET) {
    return res.status(503).json({ error: 'Webhook not configured' });
  }

  const signature = req.headers['stripe-signature'];
  if (!signature) {
    return res.status(400).send('Missing Stripe signature');
  }

  try {
    const chunks = [];
    for await (const chunk of req) chunks.push(Buffer.from(chunk));
    const rawBody = Buffer.concat(chunks);

    const event = stripe().webhooks.constructEvent(
      rawBody,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );

    // Pro status is read from Stripe by /api/stripe/status.
    // Never grant access solely because a browser returned from Checkout.
    // TODO: Persist verified events idempotently before relying on webhook-based entitlements.
    const supportedEvents = new Set([
      'checkout.session.completed',
      'customer.subscription.created',
      'customer.subscription.updated',
      'customer.subscription.deleted',
      'invoice.payment_failed'
    ]);

    if (!supportedEvents.has(event.type)) {
      return res.status(200).json({ received: true });
    }

    return res.status(200).json({ received: true });
  } catch (e) {
    console.error('Stripe webhook validation error:', e.message);
    return res.status(400).send('Webhook signature invalid');
  }
};

module.exports.config = { api: { bodyParser: false } };
