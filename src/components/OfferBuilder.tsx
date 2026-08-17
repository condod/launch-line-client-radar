import { salesPackages } from '../data/packages';
import { buildProposalDraft } from '../lib/proposal';
import type { AppSettings, ProspectRecord } from '../types';

type OfferBuilderProps = {
  lead: ProspectRecord | undefined;
  settings: AppSettings;
  onCopy: (text: string) => void;
  onExport: (filename: string, text: string, type?: string) => void;
};

export function OfferBuilder({ lead, settings, onCopy, onExport }: OfferBuilderProps) {
  if (!lead) {
    return (
      <div className="page-stack">
        <section className="page-header">
          <p className="eyebrow">Offer Builder</p>
          <h2>Select a lead to build a proposal</h2>
          <p>Lead-specific proposals use the current score, package recommendation, audit evidence, and settings.</p>
        </section>
      </div>
    );
  }

  const proposal = buildProposalDraft(lead, settings);

  return (
    <div className="page-stack">
      <section className="page-header split-header">
        <div>
          <p className="eyebrow">Offer Builder</p>
          <h2>{proposal.title}</h2>
          <p>{proposal.summary}</p>
        </div>
        <div className="audit-score-card">
          <span>Recommended</span>
          <strong>{lead.scores.priority_score}</strong>
          <small>{proposal.recommendedPackage.name}</small>
        </div>
      </section>
      <div className="package-grid">
        {salesPackages.map((item) => (
          <article className={item.name === proposal.recommendedPackage.name ? 'package-card featured-package' : 'package-card'} key={item.name}>
            <span className="tag">{item.timeline}</span>
            <h3>{item.name}</h3>
            <p>{item.positioning}</p>
            <strong>{formatMoney(item.setupPrice)} setup</strong>
            <small>{formatMoney(item.monthlyPrice)}/mo optional</small>
          </article>
        ))}
      </div>
      <section className="panel proposal-builder">
        <div className="section-heading">
          <p className="eyebrow">Client-ready draft</p>
          <h2>Proposal text</h2>
        </div>
        <pre className="proposal-text">{proposal.plainText}</pre>
        <div className="action-row">
          <button className="primary-action" onClick={() => onCopy(proposal.plainText)} type="button">Copy proposal</button>
          <button className="secondary-action" onClick={() => onExport(`${slug(lead.business_name)}-proposal.txt`, proposal.plainText, 'text/plain')} type="button">
            Export proposal
          </button>
          <button className="secondary-action" onClick={() => window.print()} type="button">Print proposal</button>
        </div>
      </section>
    </div>
  );
}

function formatMoney(value: number): string {
  return new Intl.NumberFormat('en-US', { currency: 'USD', maximumFractionDigits: 0, style: 'currency' }).format(value);
}

function slug(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 48) || 'lead';
}
