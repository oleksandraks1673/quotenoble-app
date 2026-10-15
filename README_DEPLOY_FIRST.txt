QUOTE.NOBLE — COMPLETE WEBSITE + STRIPE — PREVIEW CANDIDATE

Includes index.html, app.html, manifest.webmanifest, sw.js, icon.png, package.json, vercel.json, and api/stripe/{checkout,portal,status,webhook,_common}.js.

IMPORTANT: Based on v13 HTML, NOT confirmed to be the latest production website. Do not overwrite production or customer data. Preview deploy to existing Vercel project final-final, review changes and backup first. Do not create a new project or change www.quotenoble.com.

PAYMENT SAFETY: The checkout implementation redirects to the LIVE domain on completion. Use a separate Stripe test-mode configuration and update preview callback URLs before test purchases. Production Stripe keys can charge real money.

VERCEL ENV VARS (server only): STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, STRIPE_PRICE_MONTHLY, STRIPE_PRICE_YEARLY, SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, SUPABASE_SERVICE_ROLE_KEY. Never put secret keys in HTML or screenshots.

KNOWN LIMITATIONS: Pro feature access is not fully server-enforced; webhook event handling is not fully idempotent; cloud sync and refresh persistence need end-to-end testing; service worker uses network-first requests and does not provide full offline functionality. Stripe webhook must be tested with valid signature and event delivery.

ZIP ROOT is the project root. Deploy via Git integration/CLI or an upload workflow that supports serverless api/ files, not static-only Vercel Drop. Verify deployment Resources shows functions.

VERCEL FIX: Removed the functions glob from vercel.json which caused [unused_function]. Vercel auto-detects api/stripe/*.js. This does not establish a successful build or functioning payments; test preview.
