# Document-first navigation

Quotes and invoices from lists, search and project document links open their full saved document immediately. The toolbar keeps Send, Edit and More together. PDF, record management and payments retain existing handlers. Optional materials, approvals, extra work, crew, project history and secondary Home shortcuts are grouped into collapsed sections. Visible project document links remain outside optional tools.

Only navigation and presentation are changed. No storage schema, migration, payment calculation, saved record, acceptance snapshot or PDF generation change.

Validation: JavaScript syntax checks; 21 browser checks using isolated sample records and the existing document, quote-detail, invoice-detail and navigation functions. Checks cover direct document viewing, correct totals, editing, PDF access, payment-form entry, preserved optional-action handlers, collapsed project and job tools, language labels and no record writes. Authenticated production records were not exercised.

Production deployment: dpl_HCoNzbYiJF2J7gq23LT4XbpozVDj. Base deployment: dpl_4pQDGaogSc7i9RREVK4kbHsvfcyT.

Deployment source uses current live HTML, with the new module loaded last and versioned asset URLs. The repository root HTML is older: do not deploy it as a replacement for the current live app.
