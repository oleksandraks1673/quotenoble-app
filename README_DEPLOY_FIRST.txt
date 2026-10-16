QUOTE.NOBLE — COMPLETE WEBSITE + STRIPE — PREVIEW CANDIDATE

Includes index.html, app.html, manifest.webmanifest, sw.js, icon.png, package.json, vercel.json, and api/stripe/{checkout,portal,status,webhook,_common}.js.

IMPORTANT: Based on v13 HTML, NOT confirmed to be the latest production website. Do not overwrite production or customer data. Preview deploy from a non-production branch of the verified existing Vercel project serving www.quotenoble.com, review changes and back up first. Do not create a new project or change www.quotenoble.com.

PAYMENT SAFETY: Checkout and billing portal return URLs are configurable with QUOTENOBLE_APP_URL. Set it to the actual preview URL for test purchases; production defaults to https://www.quotenoble.com. Use separate Stripe test-mode keys and price IDs for preview testing. Production Stripe keys can charge real money.

VERCEL ENV VARS (server only): STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, STRIPE_PRICE_MONTHLY, STRIPE_PRICE_YEARLY, SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, QUOTENOBLE_APP_URL. A Supabase service role key is not required by the current Stripe API files. Never put secret keys in HTML or screenshots.

KNOWN LIMITATIONS: Pro feature access is not fully server-enforced; webhook event handling is not fully idempotent; cloud sync and refresh persistence need end-to-end testing; service worker uses network-first requests and does not provide full offline functionality. Stripe webhook must be tested with valid signature and event delivery.

ZIP ROOT is the project root. Deploy via Git integration/CLI or an upload workflow that supports serverless api/ files, not static-only Vercel Drop. Verify deployment Resources shows functions.

VERCEL FIX: Removed the functions glob from vercel.json which caused [unused_function]. Vercel auto-detects api/stripe/*.js. This does not establish a successful build or functioning payments; test preview.
