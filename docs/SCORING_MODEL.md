# Scoring Model

Client Radar creates four deterministic 0-100 subscores and one weighted priority score.

The Audit Workspace also includes a separate Launch Line Sales Audit Scorecard. That scorecard uses direct 0-10 operator inputs, exact weighted points, and the original Launch/Convert/Operate package bands.

## Website Need

Adds points for missing, social-only, unreachable, slow, thin, or conversion-weak websites. Signals include missing mobile viewport, missing CTA, no form, no booking, no click-to-call, no local schema, no service/location pages, outdated copyright, no map embed, and thin content.

## Service Fit

Rewards categories where a digital system can plausibly drive revenue: urgent services, high-ticket jobs, recurring revenue, appointment workflows, review-sensitive buying, and manual intake.

## Google Presence

Higher means more work is needed. Signals include low rating, low review count, missing website link, missing phone, and unavailable hours.

## Automation Need

Higher means follow-up or workflow leakage is likely. Signals include missing booking, missing quote forms, missing contact forms, no chat/AI capture, no analytics/CRM tags, and phone-only conversion paths.

## Priority Score

```text
priority_score =
  website_need_score * 0.45 +
  service_fit_score * 0.25 +
  google_presence_score * 0.20 +
  automation_need_score * 0.10
```

Bands:

- 85-100: Hot lead, website-first pitch
- 70-84: Strong lead, audit + website/Google package
- 55-69: Medium lead, niche service pitch
- 40-54: Nurture
- 0-39: Low priority

## Sales Audit Scorecard

Each scorecard input accepts a 0-10 score. Weighted points are calculated exactly as:

```text
weighted_points = (score / 10) * weight
```

Criteria:

- Owned digital presence: 20
- Conversion path: 20
- Local trust: 15
- Speed to lead: 15
- Revenue potential: 15
- Owner urgency: 10
- Market visibility: 5

Bands:

- 0-30: Low priority
- 31-55: Nurture
- 56-75: High priority
- 76-100: Immediate prospect

Package recommendation:

- 0-30: Low priority, nurture or monitor
- 31-55: Launch
- 56-75: Convert
- 76-100: Operate
