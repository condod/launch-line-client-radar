import { groupProspectsByStage, isClosedPipelineStage, PIPELINE_STAGES } from '../lib/pipeline';
import type { PipelineStatus, ProspectRecord } from '../types';

type PipelineBoardProps = {
  prospects: ProspectRecord[];
  selectedLeadId: string;
  onSelectLead: (leadId: string) => void;
  onMoveLead: (leadId: string, status: PipelineStatus) => void;
};

export function PipelineBoard({ prospects, selectedLeadId, onSelectLead, onMoveLead }: PipelineBoardProps) {
  const grouped = groupProspectsByStage(prospects);
  const activeValue = prospects
    .filter((lead) => !isClosedPipelineStage(lead.pipelineStatus))
    .reduce((sum, lead) => sum + estimateSetupValue(lead), 0);

  return (
    <div className="page-stack">
      <section className="page-header split-header">
        <div>
          <p className="eyebrow">Pipeline Board</p>
          <h2>Run the sales motion from research to proposal</h2>
          <p>Move leads manually. This keeps outreach compliant and preserves a clean local audit trail.</p>
        </div>
        <div className="pipeline-total">
          <span>Open setup value</span>
          <strong>{formatMoney(activeValue)}</strong>
        </div>
      </section>
      <section className="pipeline-board" aria-label="Lead pipeline">
        {PIPELINE_STAGES.map((stage) => {
          const leads = grouped[stage];
          return (
            <article className="pipeline-column" key={stage}>
              <div className="pipeline-column-header">
                <h3>{stage}</h3>
                <span>{leads.length}</span>
              </div>
              <div className="pipeline-card-list">
                {leads.map((lead) => (
                  <article className={lead.place_id === selectedLeadId ? 'pipeline-card active' : 'pipeline-card'} key={lead.place_id}>
                    <button className="pipeline-card-button" onClick={() => onSelectLead(lead.place_id)} type="button">
                      <span className="tag">{lead.scores.priority_score}</span>
                      <strong>{lead.business_name}</strong>
                      <small>{lead.city} - {lead.primary_category_guess}</small>
                      <small>{lead.packageRecommendation.package}</small>
                    </button>
                    <select
                      aria-label={`Move ${lead.business_name}`}
                      onChange={(event) => onMoveLead(lead.place_id, event.target.value as PipelineStatus)}
                      value={lead.pipelineStatus}
                    >
                      {PIPELINE_STAGES.map((item) => <option key={item}>{item}</option>)}
                    </select>
                  </article>
                ))}
                {!leads.length ? <p className="column-empty">No leads in this stage.</p> : null}
              </div>
            </article>
          );
        })}
      </section>
    </div>
  );
}

function estimateSetupValue(lead: ProspectRecord): number {
  if (lead.estimatedValueRange.includes('12,000')) return 7500;
  if (lead.estimatedValueRange.includes('8,000')) return 5000;
  if (lead.estimatedValueRange.includes('5,000')) return 2750;
  return 1250;
}

function formatMoney(value: number): string {
  return new Intl.NumberFormat('en-US', { currency: 'USD', maximumFractionDigits: 0, style: 'currency' }).format(value);
}
