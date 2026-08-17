import type { CSSProperties } from 'react';
import { auditCriteria } from '../lib/scoring';
import { getProspectAuditScore } from '../lib/prospectFactory';
import type { AuditCriterionKey, ProspectRecord, WebsiteAudit, WebsiteStatus } from '../types';

type AuditWorkspaceProps = {
  lead: ProspectRecord | undefined;
  onAuditChange: (leadId: string, patch: Partial<WebsiteAudit>) => void;
  onGuideScoreChange: (leadId: string, key: AuditCriterionKey, value: number) => void;
  onLeadNoteChange: (leadId: string, notes: string) => void;
};

const websiteStatuses: WebsiteStatus[] = ['missing', 'facebook_only', 'social_only', 'marketplace_only', 'exists', 'unreachable', 'broken_ssl', 'redirects'];

const auditChecks: Array<{ key: keyof WebsiteAudit; label: string; impact: string }> = [
  { key: 'mobile_viewport_present', label: 'Mobile viewport works', impact: 'Missing mobile setup raises website need.' },
  { key: 'contact_form_detected', label: 'Contact form detected', impact: 'No form weakens lead capture.' },
  { key: 'quote_request_detected', label: 'Quote request path detected', impact: 'Quote flow matters for service businesses.' },
  { key: 'booking_link_detected', label: 'Booking or scheduling link detected', impact: 'Scheduling gaps raise automation need.' },
  { key: 'phone_click_link_detected', label: 'Click-to-call link detected', impact: 'Mobile call friction hurts conversion.' },
  { key: 'service_pages_detected', label: 'Service pages detected', impact: 'Thin service content weakens local intent.' },
  { key: 'location_pages_detected', label: 'Location pages detected', impact: 'Local proof matters in territory searches.' },
  { key: 'localbusiness_schema_detected', label: 'LocalBusiness schema detected', impact: 'Structured data supports clarity and trust.' },
  { key: 'review_widget_detected', label: 'Review proof detected', impact: 'Review proof supports trust-sensitive sales.' },
  { key: 'ai_chat_or_chat_widget_detected', label: 'Chat or after-hours capture detected', impact: 'No capture increases follow-up leakage.' },
  { key: 'google_analytics_detected', label: 'Analytics detected', impact: 'No measurement weakens ongoing optimization.' },
  { key: 'outdated_copyright_detected', label: 'Outdated copyright detected', impact: 'Outdated signals reduce trust.' }
];

export function AuditWorkspace({ lead, onAuditChange, onGuideScoreChange, onLeadNoteChange }: AuditWorkspaceProps) {
  if (!lead) {
    return (
      <div className="page-stack">
        <section className="page-header">
          <p className="eyebrow">Audit Workspace</p>
          <h2>Select a lead to audit</h2>
          <p>Add or import a prospect first, then use this workspace to adjust evidence and recalculate the recommendation.</p>
        </section>
      </div>
    );
  }
  const guideScore = getProspectAuditScore(lead);

  return (
    <div className="page-stack">
      <section className="page-header split-header">
        <div>
          <p className="eyebrow">Audit Workspace</p>
          <h2>{lead.business_name}</h2>
          <p>Change audit evidence and the app immediately re-scores the lead, recommendation, outreach, and proposal.</p>
        </div>
        <div className="audit-score-card">
          <span>Priority</span>
          <strong>{lead.scores.priority_score}</strong>
          <small>{lead.scores.priority_band}</small>
        </div>
      </section>
      <div className="score-layout">
        <div className="audit-work-stack">
          <section className="panel weighted-audit-card">
            <div className="weighted-score-header">
              <div>
                <p className="eyebrow">Sales Audit Scorecard</p>
                <h2>0-10 weighted priority score</h2>
                <p>Weighted points are calculated as score divided by 10, multiplied by each criterion weight.</p>
              </div>
              <div className="audit-score-card">
                <span>{guideScore.packageRecommendation}</span>
                <strong>{guideScore.total}</strong>
                <small>{guideScore.priorityBand}</small>
              </div>
            </div>
            <div className="guide-score-grid">
              {auditCriteria.map((criterion) => {
                const item = guideScore.lineItems.find((lineItem) => lineItem.key === criterion.key);
                const score = item?.score ?? 0;
                return (
                  <article className="guide-score-row" key={criterion.key}>
                    <div>
                      <strong>{criterion.label}</strong>
                      <span>{criterion.description}</span>
                    </div>
                    <input
                      aria-label={`${criterion.label} 0 to 10 score`}
                      max="10"
                      min="0"
                      onChange={(event) => onGuideScoreChange(lead.place_id, criterion.key, Number(event.target.value))}
                      type="range"
                      value={score}
                    />
                    <input
                      aria-label={`${criterion.label} numeric score`}
                      className="score-input"
                      max="10"
                      min="0"
                      onChange={(event) => onGuideScoreChange(lead.place_id, criterion.key, Number(event.target.value))}
                      type="number"
                      value={score}
                    />
                    <small>{item?.points ?? 0} / {criterion.weight} pts</small>
                  </article>
                );
              })}
            </div>
          </section>
          <section className="panel audit-form">
            <div className="section-heading">
              <p className="eyebrow">Website Evidence</p>
              <h2>Visible proof behind the recommendation</h2>
            </div>
            <div className="form-grid">
              <label>
                Website status
                <select value={lead.audit.website_status} onChange={(event) => onAuditChange(lead.place_id, { website_status: event.target.value as WebsiteStatus })}>
                  {websiteStatuses.map((status) => <option key={status}>{status}</option>)}
                </select>
              </label>
              <label>
                Mobile PageSpeed score
                <input
                  max="100"
                  min="0"
                  type="number"
                  value={lead.audit.page_speed_mobile_score ?? ''}
                  onChange={(event) => onAuditChange(lead.place_id, { page_speed_mobile_score: toOptionalNumber(event.target.value) })}
                />
              </label>
              <label>
                Word count
                <input
                  min="0"
                  type="number"
                  value={lead.audit.word_count}
                  onChange={(event) => onAuditChange(lead.place_id, { word_count: Math.max(0, Number(event.target.value) || 0) })}
                />
              </label>
              <label>
                HTTP status
                <input
                  min="0"
                  type="number"
                  value={lead.audit.http_status ?? ''}
                  onChange={(event) => onAuditChange(lead.place_id, { http_status: toOptionalNumber(event.target.value) })}
                />
              </label>
            </div>
            <div className="checklist-grid">
              {auditChecks.map((check) => (
                <label className="checkline" key={check.key}>
                  <input
                    checked={Boolean(lead.audit[check.key])}
                    onChange={(event) => onAuditChange(lead.place_id, { [check.key]: event.target.checked } as Partial<WebsiteAudit>)}
                    type="checkbox"
                  />
                  <span>
                    <strong>{check.label}</strong>
                    <small>{check.impact}</small>
                  </span>
                </label>
              ))}
            </div>
            <label className="textarea-label">
              Audit notes
              <textarea
                value={lead.audit.best_improvement_notes.join('\n')}
                onChange={(event) => onAuditChange(lead.place_id, { best_improvement_notes: event.target.value.split('\n').map((item) => item.trim()).filter(Boolean) })}
              />
            </label>
          </section>
        </div>
        <aside className="score-side">
          <section className="score-gauge">
            <div className="gauge-ring" style={{ '--score': lead.scores.priority_score } as CSSProperties}>
              <span>{lead.scores.priority_score}</span>
            </div>
            <div>
              <p className="eyebrow">Recommendation</p>
              <h3>{lead.packageRecommendation.package}</h3>
              <p>{lead.salesAngle}</p>
            </div>
          </section>
          <section className="panel">
            <div className="section-heading">
              <p className="eyebrow">Evidence Summary</p>
              <h2>Problems to discuss</h2>
            </div>
            <ul>{lead.biggestProblems.map((problem) => <li key={problem}>{problem}</li>)}</ul>
            <label className="textarea-label">
              Sales notes
              <textarea value={lead.notes} onChange={(event) => onLeadNoteChange(lead.place_id, event.target.value)} />
            </label>
          </section>
        </aside>
      </div>
    </div>
  );
}

function toOptionalNumber(value: string): number | undefined {
  if (!value.trim()) return undefined;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : undefined;
}
