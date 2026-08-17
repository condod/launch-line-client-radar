# Compliance Notes

Client Radar is a prospect research and human-controlled sales tool. It is designed around official APIs, user-imported CSV/JSON, safe website audits, and a separately hosted consent-gated voice service.

- Use Google Places API / Places Details API for Google business discovery.
- Do not scrape Google Maps HTML pages.
- Crawl only a business's own public website when a website URL is returned or imported.
- Do not collect private personal data.
- For requested callbacks, collect only the contact name, confirmed callback number, optional business email, appointment time, and business needs needed for the follow-up. Do not use the appointment notes for sensitive personal information, and delete stale records under a documented retention policy.
- Do not treat a public business listing or published phone number as consent to receive an artificial-voice call.
- AI outbound calls require a human approval click plus a server-side written-consent record for the exact number.
- Keep the configured calling window within 8:00 a.m.-8:00 p.m. local time and wait at least 24 hours between automated attempts.
- Honor opt-outs immediately. A do-not-call record blocks both human and AI buttons in the app, and the voice agent can suppress a number during a call.
- The agent must identify itself as AI and identify Launch Line Digital / Diesen Enterprise LLC at the beginning of the call.
- Do not enable call recording without a separate state-by-state recording-consent review. This implementation does not record calls.
- Do not guarantee rankings, traffic, leads, revenue, or review outcomes.
- Do not suggest fake reviews, paid/incentivized review manipulation, review gating, or suppression of honest negative reviews.

Review repair should mean better request timing, better response workflows, more consistent compliant review links, customer-service fixes, and reporting.

This file is an operating baseline, not legal advice. Have Florida counsel review the final campaign, consent language, licensing position, and any states reached before live use. Primary references include the [FCC AI-voice TCPA ruling](https://docs.fcc.gov/public/attachments/FCC-24-17A1_Rcd.pdf), [Florida Statute 501.059](https://leg.state.fl.us/statutes/index.cfm?App_mode=Display_Statute&URL=0500-0599%2F0501%2FSections%2F0501.059.html), and the [FTC's business-to-business telemarketing update](https://www.ftc.gov/news-events/news/press-releases/2024/03/ftc-implements-new-protections-businesses-against-telemarketing-fraud-affirms-protections-against-ai).
