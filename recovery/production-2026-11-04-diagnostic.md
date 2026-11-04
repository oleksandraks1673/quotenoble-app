# Production recovery diagnostic — 2026-11-04

## Verified source
- Vercel team: `team_buvn9jTEcHuwShwEbqDvssTJ`
- Project: `prj_pLsYOO4o0oiwfVoXkArVjIPtU7iK`
- Production deployment: `dpl_E1bsnaftBren3tJfjTuPu4F6RCaq`
- Production domain aliases: `quotenoble.com`, `www.quotenoble.com`
- Deployment file inventory: 142 entries in `src/` and `out/`.
- Supabase project: `jssfjaggsjtwppokjpns` (active).
- Edge function: `quote-approval-storage`, version 8 (active).

## Verified recovery limitations
- Vercel connected `get_deployment_file_contents` returns base64 text but truncates large files at the tool response boundary. This occurred for `src/cloud-sync.js`, `src/api/approvals.js`, and `src/vercel.json`. Truncated base64 is not a valid complete recovery.
- Attempt to retrieve `src/robots.txt` by the inventory file identifier returned 404 despite the inventory listing it.
- GitHub repository `oleksandraks1673/quotenoble-app` default branch does not have the matching `api/approvals.js`, `lib/approvals.js`, or `cloud-sync.js`.
- Container direct network access to the public site failed due to DNS resolution in the runtime.
- Vercel runtime-log lookup for the deployment returned no entries in the requested recent window.

## Required next steps
1. Export the complete production source using an authenticated Vercel CLI/API environment with full response-body support, or locate the original uploaded project archive. Do not put access tokens or environment secrets into Git.
2. Verify byte lengths and hashes of recovered files against the deployment listing where possible.
3. Create a new branch from the verified recovered source. Do not merge this inventory-only branch as app code.
4. Reproduce paid-account Send for Approval failure; inspect Stripe eligibility, `api/approvals.js`, and the signed Supabase storage bridge.
5. Test cloud-sync conflict resolution, autosave, cross-device reload, and photo persistence with isolated fixtures.
6. Only deploy after verified backups and end-to-end tests. Preserve customer data.

No production application or database changes were made during this recovery diagnostic.
