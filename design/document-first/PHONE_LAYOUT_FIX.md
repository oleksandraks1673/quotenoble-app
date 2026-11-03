# Phone document layout correction

The earlier document layout combined a flex scroll container, an extra disclosure outside that container, static bottom actions, and space reserved for fixed actions. This reduced the document viewport and wasted space below the toolbar. Two-column party details also squeezed long contacts at phone widths.

The correction uses a three-row document shell: navigation, one scrolling content region containing the document and optional panels, and actions. It removes duplicate footer padding, limits business logos to 130x52px, and stacks business and customer details below 700px. Send is shortened to keep the toolbar readable at 320px.

Validation: 29 isolated browser checks pass at 320px, 360px and 390px with long business/customer names, email, project address and an oversized input logo. Checks include nonoverlapping contact sections and actions, no nested scroll area, no horizontal scroll, the end of the quote scrolling clear of the footer, and preserved document, editing, PDF, payment-form, materials, extra-work and crew handlers. Test records remain unchanged. Production account data was not used for browser QA.

Production deployment: dpl_4gmPBY2GuMdy7dyArj83vfxWj5Qm. Base: dpl_HCoNzbYiJF2J7gq23LT4XbpozVDj.
