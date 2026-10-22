# Quote Noble production/source reconciliation audit — 2026-10-22

## Verified ownership and routing
- Vercel team: `team_buvn9jTEcHuwShwEbqDvssTJ`
- Project: `quotenoble_v13_stripe_integration_preview` (`prj_pLsYOO4o0oiwfVoXkArVjIPtU7iK`)
- Both `quotenoble.com` and `www.quotenoble.com` are assigned to this project.
- Observed READY production deployment: `dpl_8vXVAh2KLyDxuMXANP5g8pJCDHYc`. Confirm aliases and production state again before release.

## Source mismatch — confirmed
The Vercel production deployment source tree includes files absent from the connected GitHub repository's known base snapshot, including:
- `app-navigation.js`, `simple-navigation.js`, `simple-navigation.css`
- `cloud-sync.js`, `form-autosave.js`, `delete-records.js`
- `inspection-model.js`, `inspections.js`, `inspection-pdf.js`
- `photo-journal.js`, `photo-editor.js`, `photo-report.js`
- `crew-entry.js`, `crew-page.js`, `language.js`
- `workflow.js`, `money.js`, `quote-payments.js`
- Additional `api/approvals.js`, `api/crew.js`, `api/project-photos.js` and other functions.

Production source listing was retrieved using Vercel's deployment-files API. The repository README itself warns that its v13 candidate is not confirmed to be the latest production website.

## Safe reconciliation procedure
1. Export the exact production deployment's source tree into a secure, private working copy. Do not check in production credentials, customer records, or environment variables.
2. Compare all text files, assets, API routes, service worker, and build configuration against the GitHub main branch.
3. Use production as the behavioral baseline, not the older GitHub preview. Preserve existing live functions and customer data.
4. Create a dedicated reconciliation branch and commit verified source files. Keep the homepage preview separate until navigation is mapped to live app routes.
5. Run regression tests for quotes, approvals, invoice creation, deposit requests, autosave, deletion, inspection, project photos, crew invites, multilingual preferences, PDF downloads, and Stripe webhook/payment flows in a nonproduction environment.
6. Merge only after reviewing differences and confirming backup and rollback. Do not deploy production automatically.

## Current status
- Production deployment: untouched.
- Customer data: untouched.
- Preview homepage: separate draft PR #6, not yet integrated.
- Reconciliation: investigation completed; full source export and diff remain outstanding.
