# Arabic UX Visual Audit

## Pages Checked

- Dashboard overview
- Accounting
- Reports
- Audit
- Partner settlements
- Customer portal
- Customer tracking
- Customer requests
- Purchase requests
- Deals
- AI operations, workflow intelligence, event system, runtime, collaboration, distributed runtime, cognitive operations, and agent fabric panels

## Components Checked

- Metric cards and financial summary cards
- Customer detail cards and request detail cards
- Partner settlement summary and settlement row cards
- Shipment tracking timeline and tracking detail panels
- AI summary, risk, workflow, realtime, transport, synchronization, distributed runtime, cognitive, and agent fabric cards
- Help box and help drawer content

## What Was Fixed

- Replaced narrow 4, 5, and 6-column metric layouts with responsive minmax grids.
- Added readable primitives for Arabic-safe labels, values, metric cards, info cards, responsive grids, and section help.
- Removed Arabic mojibake from help content, AI panels, runtime panels, dashboard briefing text, and agent panels.
- Removed uppercase letter-spacing from Arabic-sensitive labels and help headings.
- Added section-level help for financial summaries, settlements, AI risk, workflow health, realtime signals, transport health, synchronization, distributed runtime, agent registry, recovery, and customer request summaries.

## Remaining Manual Checks

- Open the production-like dashboard in Arabic and resize from mobile width to desktop width.
- Verify no metric label appears as one character per line in cards.
- Verify long values such as tracking IDs, emails, replay keys, and partner names wrap by segment and do not overflow.
- Verify help drawers remain readable in RTL on mobile.

## Screenshots Needed If Issue Persists

- Full page screenshot with the browser width visible.
- Close-up of the broken card or panel.
- Page route and selected language.
- Browser zoom level and device viewport size.
