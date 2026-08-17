# Launch Runbook

Launch Line Client Radar is ready to run as a local-first prospecting product. It can be used by Diesen Enterprise LLC internally, demoed from an iPad, or packaged as a managed prospect-research workflow.

## Operator Workflow

1. Configure Settings with the business name, owner contact details, proposal deposit, and retainer floor.
2. Export a JSON backup before every data collection or import session.
3. Add prospects manually, import a prior JSON backup, or collect via the official Google Places API.
4. Audit the selected lead's owned website evidence.
5. Move qualified leads through the Pipeline Board.
6. Use Offer Builder for proposal text and Outreach Pack for manually reviewed copy.
7. Use Call Center for human click-to-call or consent-qualified AI calls; never mark consent as written without retaining the source evidence. Review scheduled callbacks daily, add them to the human calendar, and mark completed or cancelled outcomes.
8. Export CSV for spreadsheets and JSON for full local backup.

## Local Commands

```powershell
npm.cmd install
npm.cmd run seed
npm.cmd run dev
npm.cmd run build
npm.cmd run export:standalone
npm.cmd run server:smoke
```

## Live Data Commands

```powershell
copy .env.example .env
npm.cmd run collect -- --city "Sarasota, FL" --radius 25
npm.cmd run audit
npm.cmd run score
npm.cmd run export
```

`collect` uses the official Google Places API. It does not scrape Google Maps HTML. `audit` crawls only public business-owned websites already attached to the lead data.

## Deliverable Options

- Internal use: run `npm.cmd run dev` locally and keep JSON backups.
- Demo use: transfer `standalone.html` to an iPad or host the built `dist/` folder.
- Managed service: collect, audit, score, and deliver CSV plus proposals as part of a manual research engagement.
- Productized tool: host `dist/` behind a private login or static host and sell access with clear support terms.
- Voice service: deploy `server-dist/` through the included `render.yaml` or another persistent Node host, then follow `docs/VOICE_SETUP.md`.

## Support Boundaries

- No autonomous outbound AI calling without written consent and a human approval click.
- No private personal data collection.
- No guaranteed Google ranking, review volume, or revenue claims.
- Review workflows must use compliant request timing and honest customer-service follow-up.
- Always verify public evidence before presenting a finding to a prospect.
