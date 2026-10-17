/* Quote.Noble Smart Templates initial service library. No preset prices. */
(function(root){
"use strict";
const templates=[
  {
    "id": "roofing-1",
    "trade": "Roofing",
    "name": "Asphalt Shingle Roof Replacement",
    "description": "Remove existing roofing materials in the designated work area and inspect the exposed roof deck for visible deterioration. Install specified underlayment, ice and water protection, flashing components, starter shingles, asphalt shingles, and ridge finishing in accordance with the selected roofing system. Address ventilation details where included in the approved scope. Remove installation debris and leave the work area reasonably clean. Concealed decking repairs and other unforeseen work are subject to separate approval."
  },
  {
    "id": "roofing-2",
    "trade": "Roofing",
    "name": "Flat Roof Replacement",
    "description": "Remove the existing flat-roof covering within the agreed work area, assess the exposed substrate, and prepare the surface for the selected roofing system. Install the specified insulation or cover board where included, membrane, perimeter terminations, flashings, and penetrations. Detail drains and transitions to support proper water shedding. Clean up roofing debris. Structural repairs and concealed moisture damage are excluded unless separately authorized."
  },
  {
    "id": "roofing-3",
    "trade": "Roofing",
    "name": "Metal Roof Installation",
    "description": "Provide metal roof installation for the agreed work area using appropriate materials and installation methods for the existing conditions. Inspect and prepare accessible surfaces or components before beginning work, carry out the specified service, check the completed work for visible deficiencies, and remove normal job-related debris. Any concealed damage, additional repairs, permits, or work outside the approved scope will be discussed and priced separately before proceeding."
  },
  {
    "id": "roofing-4",
    "trade": "Roofing",
    "name": "Cedar Roof Replacement",
    "description": "Provide cedar roof replacement for the agreed work area using appropriate materials and installation methods for the existing conditions. Inspect and prepare accessible surfaces or components before beginning work, carry out the specified service, check the completed work for visible deficiencies, and remove normal job-related debris. Any concealed damage, additional repairs, permits, or work outside the approved scope will be discussed and priced separately before proceeding."
  },
  {
    "id": "roofing-5",
    "trade": "Roofing",
    "name": "Synthetic Slate Installation",
    "description": "Provide synthetic slate installation for the agreed work area using appropriate materials and installation methods for the existing conditions. Inspect and prepare accessible surfaces or components before beginning work, carry out the specified service, check the completed work for visible deficiencies, and remove normal job-related debris. Any concealed damage, additional repairs, permits, or work outside the approved scope will be discussed and priced separately before proceeding."
  },
  {
    "id": "roofing-6",
    "trade": "Roofing",
    "name": "Roof Leak Repair",
    "description": "Inspect the reported leak area and accessible surrounding roof components to identify likely water-entry points. Complete localized repairs to the affected shingles, membrane, flashings, sealants, or fasteners as appropriate to the identified condition and agreed scope. Remove repair debris. Because water can travel from concealed locations, further investigation or repairs may be required if leakage continues."
  },
  {
    "id": "roofing-7",
    "trade": "Roofing",
    "name": "Shingle Repair",
    "description": "Provide shingle repair for the agreed work area using appropriate materials and installation methods for the existing conditions. Inspect and prepare accessible surfaces or components before beginning work, carry out the specified service, check the completed work for visible deficiencies, and remove normal job-related debris. Any concealed damage, additional repairs, permits, or work outside the approved scope will be discussed and priced separately before proceeding."
  },
  {
    "id": "roofing-8",
    "trade": "Roofing",
    "name": "Skylight Installation or Replacement",
    "description": "Provide skylight installation or replacement for the agreed work area using appropriate materials and installation methods for the existing conditions. Inspect and prepare accessible surfaces or components before beginning work, carry out the specified service, check the completed work for visible deficiencies, and remove normal job-related debris. Any concealed damage, additional repairs, permits, or work outside the approved scope will be discussed and priced separately before proceeding."
  },
  {
    "id": "roofing-9",
    "trade": "Roofing",
    "name": "Roof Ventilation Upgrade",
    "description": "Provide roof ventilation upgrade for the agreed work area using appropriate materials and installation methods for the existing conditions. Inspect and prepare accessible surfaces or components before beginning work, carry out the specified service, check the completed work for visible deficiencies, and remove normal job-related debris. Any concealed damage, additional repairs, permits, or work outside the approved scope will be discussed and priced separately before proceeding."
  },
  {
    "id": "roofing-10",
    "trade": "Roofing",
    "name": "Chimney Removal & Roof Closure",
    "description": "Provide chimney removal & roof closure for the agreed work area using appropriate materials and installation methods for the existing conditions. Inspect and prepare accessible surfaces or components before beginning work, carry out the specified service, check the completed work for visible deficiencies, and remove normal job-related debris. Any concealed damage, additional repairs, permits, or work outside the approved scope will be discussed and priced separately before proceeding."
  },
  {
    "id": "gutters-aluminum-1",
    "trade": "Gutters & Aluminum",
    "name": "Complete Eavestrough, Downspout, Soffit & Fascia Installation",
    "description": "Supply and install the specified coordinated exterior aluminum system, including eavestroughs, downspouts, soffit panels, and fascia coverings within the agreed areas. Confirm measurements and placement, install secure supports and compatible trim, seal required gutter joints, and direct downspout outlets toward approved discharge points. Remove installation debris. Repairs to concealed wood deterioration or structural framing are additional unless expressly included."
  },
  {
    "id": "gutters-aluminum-2",
    "trade": "Gutters & Aluminum",
    "name": "Eavestrough Replacement",
    "description": "Provide eavestrough replacement for the agreed work area using appropriate materials and installation methods for the existing conditions. Inspect and prepare accessible surfaces or components before beginning work, carry out the specified service, check the completed work for visible deficiencies, and remove normal job-related debris. Any concealed damage, additional repairs, permits, or work outside the approved scope will be discussed and priced separately before proceeding."
  },
  {
    "id": "gutters-aluminum-3",
    "trade": "Gutters & Aluminum",
    "name": "Gutter Cleaning & Downspout Flushing",
    "description": "Remove accessible leaves, sediment, and loose debris from designated eavestroughs. Flush accessible downspouts to assess water flow and clear minor loose obstructions where practical. Collect and dispose of removed debris and visually note obvious concerns such as loose hangers, separated joints, or standing water. Underground drainage clearing, inaccessible blockages, and repairs are not included unless specified."
  },
  {
    "id": "gutters-aluminum-4",
    "trade": "Gutters & Aluminum",
    "name": "Leaking Corner Repair",
    "description": "Provide leaking corner repair for the agreed work area using appropriate materials and installation methods for the existing conditions. Inspect and prepare accessible surfaces or components before beginning work, carry out the specified service, check the completed work for visible deficiencies, and remove normal job-related debris. Any concealed damage, additional repairs, permits, or work outside the approved scope will be discussed and priced separately before proceeding."
  },
  {
    "id": "gutters-aluminum-5",
    "trade": "Gutters & Aluminum",
    "name": "Gutter Re-Sloping",
    "description": "Provide gutter re-sloping for the agreed work area using appropriate materials and installation methods for the existing conditions. Inspect and prepare accessible surfaces or components before beginning work, carry out the specified service, check the completed work for visible deficiencies, and remove normal job-related debris. Any concealed damage, additional repairs, permits, or work outside the approved scope will be discussed and priced separately before proceeding."
  },
  {
    "id": "gutters-aluminum-6",
    "trade": "Gutters & Aluminum",
    "name": "Downspout Repair or Replacement",
    "description": "Provide downspout repair or replacement for the agreed work area using appropriate materials and installation methods for the existing conditions. Inspect and prepare accessible surfaces or components before beginning work, carry out the specified service, check the completed work for visible deficiencies, and remove normal job-related debris. Any concealed damage, additional repairs, permits, or work outside the approved scope will be discussed and priced separately before proceeding."
  },
  {
    "id": "gutters-aluminum-7",
    "trade": "Gutters & Aluminum",
    "name": "Leaf Guard Installation",
    "description": "Provide leaf guard installation for the agreed work area using appropriate materials and installation methods for the existing conditions. Inspect and prepare accessible surfaces or components before beginning work, carry out the specified service, check the completed work for visible deficiencies, and remove normal job-related debris. Any concealed damage, additional repairs, permits, or work outside the approved scope will be discussed and priced separately before proceeding."
  },
  {
    "id": "gutters-aluminum-8",
    "trade": "Gutters & Aluminum",
    "name": "Soffit Replacement",
    "description": "Provide soffit replacement for the agreed work area using appropriate materials and installation methods for the existing conditions. Inspect and prepare accessible surfaces or components before beginning work, carry out the specified service, check the completed work for visible deficiencies, and remove normal job-related debris. Any concealed damage, additional repairs, permits, or work outside the approved scope will be discussed and priced separately before proceeding."
  },
  {
    "id": "gutters-aluminum-9",
    "trade": "Gutters & Aluminum",
    "name": "Fascia Replacement",
    "description": "Provide fascia replacement for the agreed work area using appropriate materials and installation methods for the existing conditions. Inspect and prepare accessible surfaces or components before beginning work, carry out the specified service, check the completed work for visible deficiencies, and remove normal job-related debris. Any concealed damage, additional repairs, permits, or work outside the approved scope will be discussed and priced separately before proceeding."
  },
  {
    "id": "gutters-aluminum-10",
    "trade": "Gutters & Aluminum",
    "name": "Gutter Hanger Reinforcement",
    "description": "Provide gutter hanger reinforcement for the agreed work area using appropriate materials and installation methods for the existing conditions. Inspect and prepare accessible surfaces or components before beginning work, carry out the specified service, check the completed work for visible deficiencies, and remove normal job-related debris. Any concealed damage, additional repairs, permits, or work outside the approved scope will be discussed and priced separately before proceeding."
  },
  {
    "id": "painting-1",
    "trade": "Painting",
    "name": "Interior Wall Painting",
    "description": "Provide interior wall painting for the agreed work area using appropriate materials and installation methods for the existing conditions. Inspect and prepare accessible surfaces or components before beginning work, carry out the specified service, check the completed work for visible deficiencies, and remove normal job-related debris. Any concealed damage, additional repairs, permits, or work outside the approved scope will be discussed and priced separately before proceeding."
  },
  {
    "id": "painting-2",
    "trade": "Painting",
    "name": "Exterior House Painting",
    "description": "Provide exterior house painting for the agreed work area using appropriate materials and installation methods for the existing conditions. Inspect and prepare accessible surfaces or components before beginning work, carry out the specified service, check the completed work for visible deficiencies, and remove normal job-related debris. Any concealed damage, additional repairs, permits, or work outside the approved scope will be discussed and priced separately before proceeding."
  },
  {
    "id": "painting-3",
    "trade": "Painting",
    "name": "Ceiling Painting",
    "description": "Provide ceiling painting for the agreed work area using appropriate materials and installation methods for the existing conditions. Inspect and prepare accessible surfaces or components before beginning work, carry out the specified service, check the completed work for visible deficiencies, and remove normal job-related debris. Any concealed damage, additional repairs, permits, or work outside the approved scope will be discussed and priced separately before proceeding."
  },
  {
    "id": "painting-4",
    "trade": "Painting",
    "name": "Trim & Door Painting",
    "description": "Provide trim & door painting for the agreed work area using appropriate materials and installation methods for the existing conditions. Inspect and prepare accessible surfaces or components before beginning work, carry out the specified service, check the completed work for visible deficiencies, and remove normal job-related debris. Any concealed damage, additional repairs, permits, or work outside the approved scope will be discussed and priced separately before proceeding."
  },
  {
    "id": "painting-5",
    "trade": "Painting",
    "name": "Deck & Fence Staining",
    "description": "Provide deck & fence staining for the agreed work area using appropriate materials and installation methods for the existing conditions. Inspect and prepare accessible surfaces or components before beginning work, carry out the specified service, check the completed work for visible deficiencies, and remove normal job-related debris. Any concealed damage, additional repairs, permits, or work outside the approved scope will be discussed and priced separately before proceeding."
  },
  {
    "id": "renovations-1",
    "trade": "Renovations",
    "name": "Bathroom Renovation",
    "description": "Provide bathroom renovation for the agreed work area using appropriate materials and installation methods for the existing conditions. Inspect and prepare accessible surfaces or components before beginning work, carry out the specified service, check the completed work for visible deficiencies, and remove normal job-related debris. Any concealed damage, additional repairs, permits, or work outside the approved scope will be discussed and priced separately before proceeding."
  },
  {
    "id": "renovations-2",
    "trade": "Renovations",
    "name": "Kitchen Renovation",
    "description": "Provide kitchen renovation for the agreed work area using appropriate materials and installation methods for the existing conditions. Inspect and prepare accessible surfaces or components before beginning work, carry out the specified service, check the completed work for visible deficiencies, and remove normal job-related debris. Any concealed damage, additional repairs, permits, or work outside the approved scope will be discussed and priced separately before proceeding."
  },
  {
    "id": "renovations-3",
    "trade": "Renovations",
    "name": "Drywall Installation & Repair",
    "description": "Provide drywall installation & repair for the agreed work area using appropriate materials and installation methods for the existing conditions. Inspect and prepare accessible surfaces or components before beginning work, carry out the specified service, check the completed work for visible deficiencies, and remove normal job-related debris. Any concealed damage, additional repairs, permits, or work outside the approved scope will be discussed and priced separately before proceeding."
  },
  {
    "id": "renovations-4",
    "trade": "Renovations",
    "name": "Flooring Installation",
    "description": "Provide flooring installation for the agreed work area using appropriate materials and installation methods for the existing conditions. Inspect and prepare accessible surfaces or components before beginning work, carry out the specified service, check the completed work for visible deficiencies, and remove normal job-related debris. Any concealed damage, additional repairs, permits, or work outside the approved scope will be discussed and priced separately before proceeding."
  },
  {
    "id": "renovations-5",
    "trade": "Renovations",
    "name": "Interior Demolition",
    "description": "Provide interior demolition for the agreed work area using appropriate materials and installation methods for the existing conditions. Inspect and prepare accessible surfaces or components before beginning work, carry out the specified service, check the completed work for visible deficiencies, and remove normal job-related debris. Any concealed damage, additional repairs, permits, or work outside the approved scope will be discussed and priced separately before proceeding."
  },
  {
    "id": "plumbing-1",
    "trade": "Plumbing",
    "name": "Faucet Replacement",
    "description": "Provide faucet replacement for the agreed work area using appropriate materials and installation methods for the existing conditions. Inspect and prepare accessible surfaces or components before beginning work, carry out the specified service, check the completed work for visible deficiencies, and remove normal job-related debris. Any concealed damage, additional repairs, permits, or work outside the approved scope will be discussed and priced separately before proceeding."
  },
  {
    "id": "plumbing-2",
    "trade": "Plumbing",
    "name": "Toilet Installation",
    "description": "Provide toilet installation for the agreed work area using appropriate materials and installation methods for the existing conditions. Inspect and prepare accessible surfaces or components before beginning work, carry out the specified service, check the completed work for visible deficiencies, and remove normal job-related debris. Any concealed damage, additional repairs, permits, or work outside the approved scope will be discussed and priced separately before proceeding."
  },
  {
    "id": "plumbing-3",
    "trade": "Plumbing",
    "name": "Drain Repair",
    "description": "Provide drain repair for the agreed work area using appropriate materials and installation methods for the existing conditions. Inspect and prepare accessible surfaces or components before beginning work, carry out the specified service, check the completed work for visible deficiencies, and remove normal job-related debris. Any concealed damage, additional repairs, permits, or work outside the approved scope will be discussed and priced separately before proceeding."
  },
  {
    "id": "plumbing-4",
    "trade": "Plumbing",
    "name": "Water Supply Line Replacement",
    "description": "Provide water supply line replacement for the agreed work area using appropriate materials and installation methods for the existing conditions. Inspect and prepare accessible surfaces or components before beginning work, carry out the specified service, check the completed work for visible deficiencies, and remove normal job-related debris. Any concealed damage, additional repairs, permits, or work outside the approved scope will be discussed and priced separately before proceeding."
  },
  {
    "id": "plumbing-5",
    "trade": "Plumbing",
    "name": "Sump Pump Installation",
    "description": "Provide sump pump installation for the agreed work area using appropriate materials and installation methods for the existing conditions. Inspect and prepare accessible surfaces or components before beginning work, carry out the specified service, check the completed work for visible deficiencies, and remove normal job-related debris. Any concealed damage, additional repairs, permits, or work outside the approved scope will be discussed and priced separately before proceeding."
  },
  {
    "id": "electrical-1",
    "trade": "Electrical",
    "name": "Light Fixture Installation",
    "description": "Provide light fixture installation for the agreed work area using appropriate materials and installation methods for the existing conditions. Inspect and prepare accessible surfaces or components before beginning work, carry out the specified service, check the completed work for visible deficiencies, and remove normal job-related debris. Any concealed damage, additional repairs, permits, or work outside the approved scope will be discussed and priced separately before proceeding."
  },
  {
    "id": "electrical-2",
    "trade": "Electrical",
    "name": "Switch & Outlet Replacement",
    "description": "Provide switch & outlet replacement for the agreed work area using appropriate materials and installation methods for the existing conditions. Inspect and prepare accessible surfaces or components before beginning work, carry out the specified service, check the completed work for visible deficiencies, and remove normal job-related debris. Any concealed damage, additional repairs, permits, or work outside the approved scope will be discussed and priced separately before proceeding."
  },
  {
    "id": "electrical-3",
    "trade": "Electrical",
    "name": "Recessed Lighting Installation",
    "description": "Provide recessed lighting installation for the agreed work area using appropriate materials and installation methods for the existing conditions. Inspect and prepare accessible surfaces or components before beginning work, carry out the specified service, check the completed work for visible deficiencies, and remove normal job-related debris. Any concealed damage, additional repairs, permits, or work outside the approved scope will be discussed and priced separately before proceeding."
  },
  {
    "id": "electrical-4",
    "trade": "Electrical",
    "name": "Electrical Troubleshooting",
    "description": "Assess the reported electrical issue using appropriate visual checks and testing of accessible components. Identify the likely cause and explain recommended corrective work. Complete only the repairs specifically authorized within the agreed scope. Electrical work must be performed by a properly qualified professional and comply with applicable local requirements. Concealed wiring faults or additional circuit repairs may require a separate estimate."
  },
  {
    "id": "electrical-5",
    "trade": "Electrical",
    "name": "Ceiling Fan Installation",
    "description": "Provide ceiling fan installation for the agreed work area using appropriate materials and installation methods for the existing conditions. Inspect and prepare accessible surfaces or components before beginning work, carry out the specified service, check the completed work for visible deficiencies, and remove normal job-related debris. Any concealed damage, additional repairs, permits, or work outside the approved scope will be discussed and priced separately before proceeding."
  }
];
// Display and insert each scope sentence as an editable bullet point.
for (const template of templates) {
  const sentences=String(template.description||"").trim().split(/(?<=[.!?])\s+(?=[A-Z])/).map(s=>s.trim()).filter(Boolean);
  template.description=sentences.map(s=>"• "+s).join("\n");
}
const search=(query="",trade="")=>templates.filter(t=>(!trade||t.trade===trade)&&(!query||(t.name+" "+t.description).toLowerCase().includes(query.toLowerCase())));
root.QuoteNobleSmartTemplates=Object.freeze({templates:Object.freeze(templates),trades:Object.freeze(["Roofing","Gutters & Aluminum","Painting","Renovations","Plumbing","Electrical"]),search});
})(typeof window!=="undefined"?window:globalThis);
