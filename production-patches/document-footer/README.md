# Quote and invoice footer repair

Replace only `document-first.js` in the COMPLETE current production source with this file. It preserves the live document-first implementation retrieved on 2026-11-10 and appends a scoped toolbar organizer.

One equal-height mobile row: existing Send PDF, Edit, More. Project sharing and other existing action nodes move into More, retaining their event handlers. The existing document-extras disclosure moves into the same menu. Menu bounds attach to the whole toolbar, rather than the narrow More button; desktop uses a right-aligned 320px menu. Outside click and Escape close the menu. Print excludes the toolbar. No quote records or billing behavior are changed.

Not deployed. Root GitHub app files are older than production; do not deploy the root repository. Update the script cache version in current app/index entry points when deploying. Requires mobile and desktop browser visual checks on a preview with the real current source.
