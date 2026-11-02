# Cloud sync audit — source-reconciliation blocker

Production deployment: `dpl_6JuLVhGh9mQrg23rDd2gvfuGC9tN`.
Observed deployed path: `src/cloud-sync.js`.
GitHub `main` currently does not contain `cloud-sync.js` or `src/cloud-sync.js`.
Vercel file-content API truncates this file, so the retrieved excerpt is **not** a complete source backup.

## Confirmed from retrieved excerpt
- Synchronization tracks clients, quotes, invoices, jobs, smartTemplates, expenses, inspections, roofDesigns.
- The normalization function also initializes photos, reports and sequence counters.
- It uses a stable-value fingerprint rather than relying solely on object property order.
- It maintains local and remote state and a conflict variable.

## Unverified; must inspect full deployed source before any change
- Conflict resolution and whether newer remote data can overwrite unsynced local edits.
- Atomicity of writes and handling of concurrent browser sessions.
- Photo persistence mechanism and file-size limits.
- Retries, network disconnections and storage quota failures.
- Autosave debounce, unload handling and truthful success/error messaging.
- Backup and restore behavior for existing customer data.

## Safe implementation plan
1. Recover complete source from the deployment artifact or original repository (not a truncated API excerpt).
2. Reproduce lost edits with test records in preview.
3. Add tests for offline edits, concurrent tabs, duplicate saves and refresh.
4. Patch only the verified source, keeping current production untouched.
5. Deploy preview, test real cloud round trips, then promote with rollback readiness.

Do not claim these issues are fixed until tests pass.
