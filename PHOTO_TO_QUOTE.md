# Photo to Quote

First release: gutters and roofing repairs. Add up to six photos and typed or
keyboard-dictated notes, analyze visible work, review suggestions, then open the
existing quote editor. Each quantity must be entered, each price reviewed, and
the review box checked before saving. Exact, unambiguous saved service names can
prefill a rate from Smart Templates. No market prices are invented.

Photo drafts live in account-scoped `formDrafts`. The current production image
store puts image bytes in IndexedDB and includes them in cloud snapshots. The
existing cloud status remains authoritative: “saved on device” does not mean
cloud upload succeeded. Photos are optimized copies, not full-resolution originals.
Analysis does not create a document or send anything to a customer. Photos and
source notes stay on the resulting quote and survive quote-form draft restore.

## Activation

The current production deployment is `dpl_6JuLVhGh9mQrg23rDd2gvfuGC9tN` in project
`prj_pLsYOO4o0oiwfVoXkArVjIPtU7iK`. GitHub main is older than production.
Do not deploy this repository's old HTML files over production.

Apply `node scripts/install-photo-quote.cjs /path/to/current-production-source`.
The installer validates exact integration points before any file is written.
Copy `photo-quote.js`, `photo-quote.css`, `api/photo-quote.js`, and
`lib/photo-quote.js` alongside the existing production source and libraries.
Give `api/photo-quote.js` a 60-second function duration.

Add `OPENAI_API_KEY` as a server-only secret to the existing Vercel project.
Optional: `PHOTO_QUOTE_MODEL` (default `gpt-4.1-mini`). Never put the key in HTML,
JavaScript sent to the browser, or GitHub. Without it, the feature keeps photos
and notes but clearly disables analysis. Existing authentication and Pro checks
apply. Model requests use `store:false`.

Run `node --test tests/photo-quote.test.cjs`. Browser integration must verify
upload, reload recovery, missing-price validation, scope changes, repeated save,
and preservation of existing records. Live AI results and real-account cloud
round trips still require configuration and signed-in acceptance testing.

The per-instance request throttle is a basic cost guard, not a global quota.
Before broad launch, add a durable per-account usage counter. Three packages
are deferred until the single-quote flow has been tested on real jobs.
