# Quote.Noble stabilization gates (do not publish until verified)

## Source of truth
- [ ] Compare Vercel production deployment `dpl_6JuLVhGh9mQrg23rDd2gvfuGC9tN` against GitHub `main`.
- [ ] Recover the actual deployed source into a separate review branch; never overwrite `main` with an incomplete scaffold.
- [ ] Confirm which build owns `quotenoble.com` and `www.quotenoble.com`.
- [ ] Create a rollback point and verify preview domain before changing production.

## Critical smoke tests (use test records, not customer records)
- [ ] Create a quote; save; refresh; log out/in; verify totals, HST, line items and customer address.
- [ ] Edit a quote; save; reopen; verify no duplicate record.
- [ ] Add and reopen multiple customer property addresses.
- [ ] Attach multiple material and job photos; verify persistence after refresh and in PDF.
- [ ] Preview quote in-app; inspect PDF pagination, total, taxes and photo placement.
- [ ] Accept quote; create invoice; verify matching amounts and statuses.
- [ ] Check document navigation on Android, iOS Safari and desktop; one language picker and one bottom navigation.
- [ ] Validate inspection, roof designer, approvals, follow-ups and partner access separately.
- [ ] Check that failed saves show an actionable error, never a false success toast.
- [ ] Check that unsaved work is not silently lost on navigation.

## Profit Guard release gates
- [ ] Mount only in authenticated contractor editor; never in customer links or generated PDFs.
- [ ] Do not change existing quote calculation, tax, discount or payment flows.
- [ ] Keep collapsed by default and optional for all trades.
- [ ] Determine tax-exclusive revenue from the existing quote model.
- [ ] Choose a secure persistence design only after inspecting the live schema and access policies.
- [ ] Run unit, integration and end-to-end tests in preview before production promotion.

## Status
This checklist documents release requirements; none of the unchecked tests are claimed to have passed.
