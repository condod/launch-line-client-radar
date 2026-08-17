import { useEffect, useState } from 'react';
import { salesPackageCategories, salesPackages } from '../data/packages';
import { buildProposalDraft } from '../lib/proposal';
import type { AppSettings, ProspectRecord } from '../types';

type OfferBuilderProps = {
  lead: ProspectRecord | undefined;
  settings: AppSettings;
  onCopy: (text: string) => void;
  onExport: (filename: string, text: string, type?: string) => void;
};

export function OfferBuilder({ lead, settings, onCopy, onExport }: OfferBuilderProps) {
  const [selectedPackageName, setSelectedPackageName] = useState(lead?.packageRecommendation.package ?? salesPackages[0].name);

  useEffect(() => {
    if (lead) setSelectedPackageName(lead.packageRecommendation.package);
  }, [lead?.place_id, lead?.packageRecommendation.package]);

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

  const proposal = buildProposalDraft(lead, settings, selectedPackageName);

  return (
    <div className="page-stack">
      <section className="page-header split-header">
        <div>
          <p className="eyebrow">Offer Builder</p>
          <h2>{proposal.title}</h2>
          <p>{proposal.summary}</p>
        </div>
        <div className="audit-score-card">
          <span>Selected offer</span>
          <strong>{lead.scores.priority_score}</strong>
          <small>{proposal.recommendedPackage.name}</small>
        </div>
      </section>
      <section className="panel catalog-summary">
        <div>
          <p className="eyebrow">Automation-first catalog</p>
          <h2>One setup, client-owned software, low optional care</h2>
          <p>Prices separate implementation from third-party platform costs. Automated workflows still include a defined health-check cadence.</p>
        </div>
        <div className="catalog-summary-prices">
          <span><strong>$149</strong>starting setup</span>
          <span><strong>$0</strong>required agency retainer</span>
          <span><strong>10</strong>sellable offers</span>
        </div>
      </section>
      {salesPackageCategories.map((category) => (
        <section className="catalog-section" key={category}>
          <div className="section-heading catalog-section-heading">
            <div>
              <p className="eyebrow">{category}</p>
              <h2>{categoryDescription(category)}</h2>
            </div>
          </div>
          <div className="package-grid">
            {salesPackages.filter((item) => item.category === category).map((item) => {
              const isSelected = item.name === proposal.recommendedPackage.name;
              const isRecommended = item.name === lead.packageRecommendation.package;
              return (
                <article className={isSelected ? 'package-card featured-package' : 'package-card'} key={item.name}>
                  <div className="package-tag-row">
                    <span className="tag">{item.timeline}</span>
                    {isRecommended ? <span className="tag recommendation-tag">Scored match</span> : null}
                  </div>
                  <h3>{item.name}</h3>
                  <p>{item.positioning}</p>
                  <div className="package-pricing">
                    <strong>{formatMoney(item.setupPrice)} one time</strong>
                    <small>{item.monthlyPrice > 0 ? `${formatMoney(item.monthlyPrice)}/mo optional care` : 'No ongoing service fee'}</small>
                  </div>
                  <dl className="package-details">
                    <div><dt>Client software</dt><dd>{item.softwareCost}</dd></div>
                    <div><dt>Runs automatically</dt><dd>{item.automationSummary}</dd></div>
                    <div><dt>Review cadence</dt><dd>{item.reviewCadence}</dd></div>
                  </dl>
                  <strong>Included</strong>
                  <ul>{item.deliverables.slice(0, 4).map((deliverable) => <li key={deliverable}>{deliverable}</li>)}</ul>
                  <button
                    aria-pressed={isSelected}
                    className={isSelected ? 'primary-action package-select' : 'secondary-action package-select'}
                    onClick={() => setSelectedPackageName(item.name)}
                    type="button"
                  >
                    {isSelected ? 'Selected' : 'Use this offer'}
                  </button>
                </article>
              );
            })}
          </div>
        </section>
      ))}
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

function categoryDescription(category: (typeof salesPackageCategories)[number]): string {
  if (category === 'Quick Win') return 'Easy first purchases that solve one expensive leak.';
  if (category === 'Automated System') return 'Connected follow-up workflows that keep running after handoff.';
  return 'Owned conversion systems with automated lead capture.';
}

function formatMoney(value: number): string {
  return new Intl.NumberFormat('en-US', { currency: 'USD', maximumFractionDigits: 0, style: 'currency' }).format(value);
}

function slug(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 48) || 'lead';
}
