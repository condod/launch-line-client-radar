# Launch Line Client Radar

Local-first prospect research and sales workflow for Diesen Enterprise LLC / Launch Line Digital. The app scores local businesses by visible website, Google, review, scheduling, and workflow leakage, then produces a package recommendation, pipeline stage, outreach copy, and proposal draft.

Live app: https://condod.github.io/launch-line-client-radar/

## Product Surfaces

- Dashboard with KPI cards, opportunity mix, and dependency-free territory map.
- Lead Database with manual lead intake, filters, editable details, local persistence, and source links.
- Pipeline Board with stage movement from New through Won/Lost/Do not contact.
- Audit Workspace with evidence toggles, instant radar rescoring, and a persisted 0-10 weighted sales scorecard.
- Playbooks with vertical pain points, objections, and rebuttals.
- Offer Builder with priced package definitions and client-ready proposal text.
- Export Center with JSON backup/restore, CSV exports, print summary, and operator commands.
- Settings with business identity, contact info, proposal defaults, retainer floor, and launch checklist.

## Setup

```powershell
npm.cmd install
copy .env.example .env
npm.cmd run seed
npm.cmd run dev
```

Open the local URL printed by Vite. If another app is already using the default port, Vite will print the next available local URL.

## Environment

Create `.env` with:

```text
GOOGLE_PLACES_API_KEY=
PAGESPEED_API_KEY=
OPENAI_API_KEY=
DEFAULT_CITY=Sarasota, FL
DEFAULT_RADIUS_MILES=25
```

`GOOGLE_PLACES_API_KEY` is required only for live Places collection. `PAGESPEED_API_KEY` and `OPENAI_API_KEY` are optional future upgrade hooks.

## Scripts

```powershell
npm.cmd run seed
npm.cmd run collect -- --city "Sarasota, FL" --radius 25
npm.cmd run audit
npm.cmd run score
npm.cmd run export
npm.cmd run lint
npm.cmd run test
npm.cmd run build
npm.cmd run export:standalone
```

- `seed` creates 50 clearly marked fictional demo leads.
- `collect` uses the official Google Places API and does not scrape Google Maps HTML.
- `audit` crawls only business-owned public websites returned by Places or imported data.
- `score` applies the deterministic scoring model.
- `export` writes `exports/prospects.csv`.
- `export:standalone` creates `standalone.html` with inline CSS/JS for file transfer.

## Launch Modes

- Run yourself: use the dev server locally, keep JSON backups, and use CSV exports for spreadsheet review.
- iPad demo: transfer `standalone.html` or host the built `dist/` folder on a local/static server.
- Sell as a service: deliver scored lead lists, manual audits, package recommendations, and proposal drafts.
- Sell as a tool: host `dist/` behind your preferred access control and provide support terms.

## Compliance Boundaries

- Do not scrape Google Maps web pages.
- Do not collect private personal emails.
- Do not auto-send outreach.
- Do not claim guaranteed rankings, reviews, revenue, or lead volume.
- Review repair means compliant request timing, response workflows, consistent review links, customer-service fixes, and reporting.

See `docs/LAUNCH_RUNBOOK.md`, `docs/SALES_OFFER.md`, `docs/SCORING_MODEL.md`, `docs/OUTREACH_PLAYBOOK.md`, and `docs/COMPLIANCE_NOTES.md` for operating details.
