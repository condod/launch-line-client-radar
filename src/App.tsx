import { useEffect, useMemo, useState } from 'react';
import { AppShell } from './components/AppShell';
import { AuditWorkspace } from './components/AuditWorkspace';
import { CallCenter } from './components/CallCenter';
import { HeroPanel } from './components/HeroPanel';
import { MetricCard } from './components/MetricCard';
import { OfferBuilder } from './components/OfferBuilder';
import { PipelineBoard } from './components/PipelineBoard';
import { ProspectIntake } from './components/ProspectIntake';
import { SettingsPanel } from './components/SettingsPanel';
import { TerritoryMap } from './components/TerritoryMap';
import { categoryProfiles, defaultMarkets } from './data/categories';
import { downloadTextFile, parseImportedState, prospectsToCsv, serializeAppState } from './lib/exportImport';
import { PIPELINE_STAGES } from './lib/pipeline';
import { rescoreProspect, updateProspectAudit, updateProspectGuideAudit } from './lib/prospectFactory';
import { createDefaultState, localStorageAdapter } from './lib/storage';
import { websiteStatusFromUrl } from './lib/radarScoring';
import type { AppSettings, AppState, AuditCriterionKey, CallCenterState, NavigationTab, PipelineStatus, ProspectRecord, WebsiteAudit } from './types';

const websiteStatuses = ['missing', 'facebook_only', 'social_only', 'marketplace_only', 'exists', 'unreachable', 'broken_ssl', 'redirects'];

function App() {
  const [activeTab, setActiveTab] = useState<NavigationTab>(() => tabFromHash() ?? 'dashboard');
  const [state, setState] = useState<AppState>(() => localStorageAdapter.load());
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');
  const [sortKey, setSortKey] = useState('priority_score');
  const [importText, setImportText] = useState('');
  const [status, setStatus] = useState('');

  useEffect(() => {
    localStorageAdapter.save(state);
  }, [state]);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const onHashChange = () => {
      const next = tabFromHash();
      if (next) setActiveTab(next);
    };
    window.addEventListener('hashchange', onHashChange);
    window.addEventListener('popstate', onHashChange);
    return () => {
      window.removeEventListener('hashchange', onHashChange);
      window.removeEventListener('popstate', onHashChange);
    };
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const nextHash = `#${activeTab}`;
    if (window.location.hash !== nextHash) window.history.replaceState(null, '', nextHash);
  }, [activeTab]);

  const selectedLead = useMemo(
    () => state.prospects.find((lead) => lead.place_id === state.selectedLeadId) || state.prospects[0],
    [state.prospects, state.selectedLeadId]
  );

  const filteredProspects = useMemo(() => {
    const filters = state.filters;
    const normalizedSearch = filters.search.toLowerCase().trim();
    const minReviews = Number(filters.minReviews || 0);
    const maxReviews = Number(filters.maxReviews || Number.POSITIVE_INFINITY);
    const minRating = Number(filters.minRating || 0);
    const maxRating = Number(filters.maxRating || 5);
    const minPriority = Number(filters.minPriority || 0);

    return state.prospects
      .filter((lead) => {
        const searchTarget = `${lead.business_name} ${lead.city} ${lead.primary_category_guess} ${lead.packageRecommendation.package} ${lead.pipelineStatus}`.toLowerCase();
        return (
          (!normalizedSearch || searchTarget.includes(normalizedSearch)) &&
          (!filters.city || lead.city === filters.city) &&
          (!filters.category || lead.primary_category_guess === filters.category) &&
          (!filters.priorityBand || lead.scores.priority_band === filters.priorityBand) &&
          (!filters.websiteStatus || lead.audit.website_status === filters.websiteStatus) &&
          (!filters.packageName || lead.packageRecommendation.package === filters.packageName) &&
          (lead.user_ratings_total ?? 0) >= minReviews &&
          (lead.user_ratings_total ?? 0) <= maxReviews &&
          (lead.rating ?? 0) >= minRating &&
          (lead.rating ?? 0) <= maxRating &&
          lead.scores.priority_score >= minPriority
        );
      })
      .sort((a, b) => {
        if (sortKey === 'priority_score') return b.scores.priority_score - a.scores.priority_score;
        if (sortKey === 'website_need') return b.scores.website_need_score - a.scores.website_need_score;
        if (sortKey === 'review_count') return (b.user_ratings_total ?? 0) - (a.user_ratings_total ?? 0);
        if (sortKey === 'rating') return (b.rating ?? 0) - (a.rating ?? 0);
        if (sortKey === 'category') return a.primary_category_guess.localeCompare(b.primary_category_guess);
        return a.city.localeCompare(b.city);
      });
  }, [state.filters, state.prospects, sortKey]);

  const stats = useMemo(() => {
    const total = state.prospects.length;
    const hot = state.prospects.filter((lead) => lead.scores.priority_score >= 85).length;
    const missingWebsite = state.prospects.filter((lead) => lead.audit.website_status === 'missing').length;
    const socialOnly = state.prospects.filter((lead) => ['facebook_only', 'social_only', 'marketplace_only'].includes(lead.audit.website_status)).length;
    const openPipeline = state.prospects.filter((lead) => !['Won', 'Lost', 'Do not contact'].includes(lead.pipelineStatus)).length;
    const proposals = state.prospects.filter((lead) => lead.pipelineStatus === 'Proposal sent' || lead.pipelineStatus === 'Meeting booked').length;
    const average = total ? Math.round(state.prospects.reduce((sum, lead) => sum + lead.scores.priority_score, 0) / total) : 0;
    return { total, hot, missingWebsite, socialOnly, openPipeline, proposals, average };
  }, [state.prospects]);

  function updateState(nextState: AppState) {
    setState({ ...nextState, updatedAt: new Date().toISOString() });
  }

  function navigate(tab: NavigationTab) {
    setActiveTab(tab);
  }

  function selectLead(id: string, tab?: NavigationTab) {
    updateState({ ...state, selectedLeadId: id });
    if (tab) navigate(tab);
  }

  function updateLead(id: string, patch: Partial<ProspectRecord>) {
    updateState({
      ...state,
      prospects: state.prospects.map((lead) => (lead.place_id === id ? { ...lead, ...patch, updatedAt: new Date().toISOString() } : lead))
    });
  }

  function updateLeadFacts(id: string, patch: Partial<Pick<ProspectRecord, 'business_name' | 'city' | 'state' | 'phone' | 'website' | 'rating' | 'user_ratings_total'>>) {
    updateState({
      ...state,
      prospects: state.prospects.map((lead) => {
        if (lead.place_id !== id) return lead;
        const nextWebsite = patch.website !== undefined ? patch.website || undefined : lead.website;
        const nextAudit = patch.website !== undefined
          ? {
              ...lead.audit,
              final_url: nextWebsite,
              uses_https: Boolean(nextWebsite?.startsWith('https://')),
              website_status: websiteStatusFromUrl(nextWebsite)
            }
          : lead.audit;
        return rescoreProspect({ ...lead, ...patch, website: nextWebsite, audit: nextAudit, updatedAt: new Date().toISOString() });
      })
    });
  }

  function updateLeadAudit(id: string, patch: Partial<WebsiteAudit>) {
    updateState({
      ...state,
      prospects: state.prospects.map((lead) => (lead.place_id === id ? updateProspectAudit(lead, patch) : lead))
    });
  }

  function updateGuideAuditScore(id: string, key: AuditCriterionKey, value: number) {
    updateState({
      ...state,
      prospects: state.prospects.map((lead) => (lead.place_id === id ? updateProspectGuideAudit(lead, key, value) : lead))
    });
  }

  function createLead(lead: ProspectRecord) {
    updateState({ ...state, prospects: [lead, ...state.prospects], selectedLeadId: lead.place_id });
    setActiveTab('audit');
    setStatus(`Added and scored ${lead.business_name}.`);
  }

  function deleteLead(id: string) {
    const lead = state.prospects.find((item) => item.place_id === id);
    if (!lead) return;
    if (!window.confirm(`Remove ${lead.business_name} from this local database? Export a backup first if you need it later.`)) return;
    const prospects = state.prospects.filter((item) => item.place_id !== id);
    updateState({ ...state, prospects, selectedLeadId: prospects[0]?.place_id || '' });
    setStatus(`Removed ${lead.business_name}.`);
  }

  function setFilter(key: keyof AppState['filters'], value: string) {
    updateState({ ...state, filters: { ...state.filters, [key]: value } });
  }

  function openCategory(category: string) {
    updateState({ ...state, filters: { ...state.filters, category } });
    navigate('prospects');
  }

  function updateSettings(patch: Partial<AppSettings>) {
    updateState({ ...state, settings: { ...state.settings, ...patch } });
  }

  function updateCallCenter(callCenter: CallCenterState) {
    updateState({ ...state, callCenter });
  }

  function exportJson(leads = state.prospects) {
    const payload = serializeAppState({ ...state, prospects: leads });
    setImportText(payload);
    downloadTextFile('launch-line-client-radar.json', payload);
    setStatus(`Exported ${leads.length} leads as JSON.`);
  }

  function exportCsv(leads = filteredProspects) {
    downloadTextFile('launch-line-client-radar.csv', prospectsToCsv(leads), 'text/csv');
    setStatus(`Exported ${leads.length} leads as CSV.`);
  }

  function importJson() {
    const parsed = parseImportedState(importText);
    if (!parsed.ok) {
      setStatus(parsed.error);
      return;
    }
    updateState(parsed.state);
    setStatus(`Imported and scored ${parsed.state.prospects.length} leads.`);
  }

  function resetDemoData() {
    localStorageAdapter.clear();
    const defaults = createDefaultState();
    updateState(defaults);
    setImportText('');
    setStatus('Reset to the seeded 50-lead demo dataset.');
  }

  async function copyText(text: string) {
    try {
      if (!navigator.clipboard) throw new Error('Clipboard unavailable');
      await navigator.clipboard.writeText(text);
      setStatus('Copied text.');
    } catch {
      setImportText(text);
      setStatus('Clipboard was unavailable. Text was placed in the export/import box.');
    }
  }

  function leadScoreStack(lead: ProspectRecord) {
    return (
      <div className="score-stack">
        <span className="priority-chip">{lead.scores.priority_score}</span>
        <small>{lead.scores.priority_band}</small>
      </div>
    );
  }

  function renderDashboard() {
    const topCategories = Object.entries(
      state.prospects.reduce<Record<string, number>>((acc, lead) => {
        acc[lead.primary_category_guess] = (acc[lead.primary_category_guess] || 0) + 1;
        return acc;
      }, {})
    )
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8);
    const maxCategory = Math.max(1, ...topCategories.map((item) => item[1]));

    return (
      <div className="page-stack">
        <HeroPanel
          actionLabel="Review Hot Leads"
          body="Find local businesses with visible demand but weak owned websites, booking, Google, review, and follow-up systems."
          eyebrow="Website-first prospect radar"
          onAction={() => navigate('prospects')}
          title="Turn local attention into calls, appointments, quote requests, and repeat customers."
        />
        <div className="metric-grid radar-metrics">
          <MetricCard detail="Demo or imported records" label="Total leads" value={stats.total} />
          <MetricCard detail="85+ priority score" label="Hot leads" value={stats.hot} />
          <MetricCard detail="No owned site listed" label="Website missing" value={stats.missingWebsite} />
          <MetricCard detail="Social or marketplace only" label="Social-only leads" value={stats.socialOnly} />
          <MetricCard detail="Not closed or blocked" label="Open pipeline" value={stats.openPipeline} />
          <MetricCard detail="Meetings or proposals" label="Late-stage leads" value={stats.proposals} />
          <MetricCard detail="Across current database" label="Average score" value={stats.average} />
        </div>
        <div className="dashboard-grid">
          <section className="panel">
            <div className="section-heading">
              <p className="eyebrow">Opportunity Mix</p>
              <h2>Top categories by opportunity</h2>
            </div>
            <div className="category-bars">
              {topCategories.map(([category, count]) => (
                <button className="category-bar" key={category} onClick={() => openCategory(category)} type="button">
                  <span>{category}</span>
                  <strong>{count}</strong>
                  <i style={{ width: `${Math.max(12, (count / maxCategory) * 100)}%` }} />
                </button>
              ))}
            </div>
          </section>
          <TerritoryMap prospects={state.prospects} selectedLeadId={state.selectedLeadId} onSelectLead={(id) => selectLead(id, 'prospects')} />
        </div>
        <section className="panel launch-strip">
          <div>
            <p className="eyebrow">Product Status</p>
            <h2>Local-first sales operating system</h2>
          </div>
          <div className="launch-strip-items">
            <span>Offline demo export</span>
            <span>Consent-gated AI calls</span>
            <span>JSON backup/restore</span>
            <span>Configurable proposals</span>
          </div>
        </section>
      </div>
    );
  }

  function renderFilters() {
    const packages = [...new Set(state.prospects.map((lead) => lead.packageRecommendation.package))];
    const bands = [...new Set(state.prospects.map((lead) => lead.scores.priority_band))];
    return (
      <section className="panel filter-panel">
        <div className="filter-grid">
          <label>
            Search
            <input value={state.filters.search} onChange={(event) => setFilter('search', event.target.value)} placeholder="Business, city, package" />
          </label>
          <label>
            City
            <select value={state.filters.city} onChange={(event) => setFilter('city', event.target.value)}>
              <option value="">All cities</option>
              {defaultMarkets.map((city) => <option key={city}>{city}</option>)}
            </select>
          </label>
          <label>
            Category
            <select value={state.filters.category} onChange={(event) => setFilter('category', event.target.value)}>
              <option value="">All categories</option>
              {categoryProfiles.map((profile) => <option key={profile.category}>{profile.category}</option>)}
            </select>
          </label>
          <label>
            Priority band
            <select value={state.filters.priorityBand} onChange={(event) => setFilter('priorityBand', event.target.value)}>
              <option value="">All bands</option>
              {bands.map((band) => <option key={band}>{band}</option>)}
            </select>
          </label>
          <label>
            Website status
            <select value={state.filters.websiteStatus} onChange={(event) => setFilter('websiteStatus', event.target.value)}>
              <option value="">All statuses</option>
              {websiteStatuses.map((item) => <option key={item}>{item}</option>)}
            </select>
          </label>
          <label>
            Package
            <select value={state.filters.packageName} onChange={(event) => setFilter('packageName', event.target.value)}>
              <option value="">All packages</option>
              {packages.map((item) => <option key={item}>{item}</option>)}
            </select>
          </label>
          <label>
            Min reviews
            <input min="0" type="number" value={state.filters.minReviews} onChange={(event) => setFilter('minReviews', event.target.value)} />
          </label>
          <label>
            Min score
            <input max="100" min="0" type="number" value={state.filters.minPriority} onChange={(event) => setFilter('minPriority', event.target.value)} />
          </label>
        </div>
        <div className="action-row">
          <label className="compact-select">
            Sort by
            <select value={sortKey} onChange={(event) => setSortKey(event.target.value)}>
              <option value="priority_score">Priority score</option>
              <option value="website_need">Website need</option>
              <option value="review_count">Review count</option>
              <option value="rating">Rating</option>
              <option value="category">Category</option>
              <option value="city">City</option>
            </select>
          </label>
          <button className="secondary-action" onClick={() => setViewMode(viewMode === 'table' ? 'cards' : 'table')} type="button">
            {viewMode === 'table' ? 'Card view' : 'Table view'}
          </button>
          <button className="secondary-action" onClick={() => updateState({ ...state, filters: createDefaultState().filters })} type="button">
            Clear filters
          </button>
        </div>
      </section>
    );
  }

  function renderLeadList() {
    if (!filteredProspects.length) {
      return <div className="empty-state"><h3>No leads match these filters</h3><p>Clear filters or import a broader prospect list.</p></div>;
    }
    if (viewMode === 'cards') {
      return (
        <div className="lead-card-grid">
          {filteredProspects.map((lead) => (
            <button className="lead-card" key={lead.place_id} onClick={() => selectLead(lead.place_id)} type="button">
              <span className="tag">{lead.audit.website_status}</span>
              <h3>{lead.business_name}</h3>
              <p>{lead.city} - {lead.primary_category_guess}</p>
              {leadScoreStack(lead)}
              <small>{lead.packageRecommendation.package}</small>
            </button>
          ))}
        </div>
      );
    }
    return (
      <div className="table-wrap">
        <table className="prospect-table radar-table">
          <thead>
            <tr>
              <th>Lead</th>
              <th>Category</th>
              <th>Google</th>
              <th>Website</th>
              <th>Scores</th>
              <th>Package</th>
            </tr>
          </thead>
          <tbody>
            {filteredProspects.map((lead) => (
              <tr className={selectedLead?.place_id === lead.place_id ? 'selected-row' : ''} key={lead.place_id}>
                <td>
                  <button className="text-button" onClick={() => selectLead(lead.place_id)} type="button">
                    {lead.business_name}
                  </button>
                  <small>{lead.formatted_address}</small>
                </td>
                <td>{lead.primary_category_guess}</td>
                <td>{lead.rating ?? 'n/a'} stars / {lead.user_ratings_total ?? 0} reviews</td>
                <td>{lead.audit.website_status.replace(/_/g, ' ')}</td>
                <td>{leadScoreStack(lead)}</td>
                <td>{lead.packageRecommendation.package}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  function renderLeadDetail(lead: ProspectRecord | undefined) {
    if (!lead) return null;
    return (
      <aside className="detail-drawer">
        <div className="section-heading">
          <p className="eyebrow">Lead Detail</p>
          <h2>{lead.business_name}</h2>
          <p>{lead.city} - {lead.primary_category_guess}</p>
        </div>
        <div className="score-chip-grid">
          <span><strong>{lead.scores.priority_score}</strong>Priority</span>
          <span><strong>{lead.scores.website_need_score}</strong>Website</span>
          <span><strong>{lead.scores.service_fit_score}</strong>Fit</span>
          <span><strong>{lead.scores.google_presence_score}</strong>Google</span>
          <span><strong>{lead.scores.automation_need_score}</strong>Automation</span>
        </div>
        <div className="detail-edit-grid">
          <label>
            Business
            <input value={lead.business_name} onChange={(event) => updateLeadFacts(lead.place_id, { business_name: event.target.value })} />
          </label>
          <label>
            City
            <input value={lead.city} onChange={(event) => updateLeadFacts(lead.place_id, { city: event.target.value })} />
          </label>
          <label>
            Phone
            <input value={lead.phone || ''} onChange={(event) => updateLeadFacts(lead.place_id, { phone: event.target.value || undefined })} />
          </label>
          <label>
            Website
            <input value={lead.website || ''} onChange={(event) => updateLeadFacts(lead.place_id, { website: event.target.value })} />
          </label>
          <label>
            Rating
            <input max="5" min="0" step="0.1" type="number" value={lead.rating ?? ''} onChange={(event) => updateLeadFacts(lead.place_id, { rating: toOptionalNumber(event.target.value) })} />
          </label>
          <label>
            Reviews
            <input min="0" step="1" type="number" value={lead.user_ratings_total ?? ''} onChange={(event) => updateLeadFacts(lead.place_id, { user_ratings_total: toOptionalNumber(event.target.value) })} />
          </label>
        </div>
        <dl className="detail-list">
          <div><dt>Source</dt><dd>{lead.isDemo ? 'Fictional demo lead' : 'User/imported lead'}</dd></div>
          <div><dt>Website</dt><dd>{lead.website ? <a className="source-link" href={lead.website} rel="noreferrer" target="_blank">{lead.website}</a> : 'Missing'}</dd></div>
          <div><dt>Google Maps</dt><dd>{lead.google_maps_url ? <a className="source-link" href={lead.google_maps_url} rel="noreferrer" target="_blank">Open source listing</a> : 'Unavailable'}</dd></div>
        </dl>
        <div className="problem-list">
          <strong>Biggest problems detected</strong>
          <ul>{lead.biggestProblems.map((problem) => <li key={problem}>{problem}</li>)}</ul>
        </div>
        <div className="problem-list">
          <strong>Best service to pitch first</strong>
          <p>{lead.packageRecommendation.bestServiceToPitchFirst}</p>
          <strong>Secondary upsells</strong>
          <p>{lead.secondaryUpsells.join(', ')}</p>
        </div>
        <label>
          Pipeline status
          <select value={lead.pipelineStatus} onChange={(event) => updateLead(lead.place_id, { pipelineStatus: event.target.value as PipelineStatus })}>
            {PIPELINE_STAGES.map((item) => <option key={item}>{item}</option>)}
          </select>
        </label>
        <label>
          Notes
          <textarea value={lead.notes} onChange={(event) => updateLead(lead.place_id, { notes: event.target.value })} />
        </label>
        <div className="action-row">
          <button className="primary-action" onClick={() => selectLead(lead.place_id, 'audit')} type="button">Audit lead</button>
          <button className="secondary-action" onClick={() => selectLead(lead.place_id, 'offer')} type="button">Build offer</button>
          <button className="danger-action" onClick={() => deleteLead(lead.place_id)} type="button">Remove</button>
        </div>
      </aside>
    );
  }

  function renderProspects() {
    return (
      <div className="page-stack">
        <section className="page-header">
          <p className="eyebrow">Lead Database</p>
          <h2>Score local businesses by visible revenue leakage</h2>
          <p>Filter, add, edit, and select leads. Every saved change persists locally and can be exported as a JSON backup.</p>
        </section>
        <ProspectIntake onCreate={createLead} />
        {renderFilters()}
        <div className="prospect-layout">
          <section className="panel">{renderLeadList()}</section>
          {renderLeadDetail(selectedLead)}
        </div>
      </div>
    );
  }

  function renderResearch() {
    return (
      <div className="page-stack">
        <section className="page-header">
          <p className="eyebrow">Playbooks</p>
          <h2>Vertical playbooks and objections</h2>
          <p>Each category keeps the pitch tied to missed local demand, not generic website criticism.</p>
        </section>
        <div className="playbook-grid">
          {categoryProfiles.map((profile) => (
            <article className="playbook-card" key={profile.category}>
              <span className="tag">{profile.group}</span>
              <h3>{profile.category}</h3>
              <p>{profile.bestPackage}</p>
              <strong>Typical pain points</strong>
              <ul>{profile.typicalPainPoints.map((item) => <li key={item}>{item}</li>)}</ul>
              <strong>Common objections</strong>
              <ul>{profile.commonObjections.map((item, index) => <li key={item}>{item} Answer: {profile.rebuttals[index]}</li>)}</ul>
            </article>
          ))}
        </div>
      </div>
    );
  }

  function renderOutreachBlock() {
    if (!selectedLead) return null;
    const scripts = [
      ['Cold call opener', selectedLead.coldCallOpener],
      ['Voicemail', selectedLead.voicemail],
      ['Email opener', selectedLead.emailOpener],
      ['SMS draft for manual use only', selectedLead.smsDraft],
      ['LinkedIn/message draft', selectedLead.linkedInDraft],
      ['Audit teaser', selectedLead.auditBullets.join('\n')]
    ];
    return (
      <section className="panel">
        <div className="section-heading">
          <p className="eyebrow">Outreach Pack</p>
          <h2>Manual copy for {selectedLead.business_name}</h2>
        </div>
        <div className="outreach-grid">
          {scripts.map(([label, text]) => (
            <article className="outreach-card" key={label}>
              <div>
                <p className="eyebrow">{label}</p>
                <h3>{selectedLead.packageRecommendation.package}</h3>
              </div>
              <p>{text}</p>
              <button className="secondary-action" onClick={() => copyText(text)} type="button">Copy</button>
            </article>
          ))}
        </div>
      </section>
    );
  }

  function renderExportCenter() {
    const hotLeads = state.prospects.filter((lead) => lead.scores.priority_score >= 85);
    return (
      <div className="page-stack">
        <section className="page-header">
          <p className="eyebrow">Export Center</p>
          <h2>Back up data and move leads into manual review workflows</h2>
          <p>Exports are for manual review only. The app does not auto-send emails, texts, or calls.</p>
        </section>
        <section className="panel">
          <div className="action-row">
            <button className="primary-action" onClick={() => exportJson()} type="button">Backup all JSON</button>
            <button className="secondary-action" onClick={() => exportCsv(filteredProspects)} type="button">Export filtered CSV</button>
            <button className="secondary-action" onClick={() => exportCsv(hotLeads)} type="button">Export hot leads CSV</button>
            <button className="secondary-action" onClick={() => exportJson(hotLeads)} type="button">Export hot leads JSON</button>
            <button className="secondary-action" onClick={() => window.print()} type="button">Print summary</button>
          </div>
          <label className="textarea-label">
            Import JSON
            <textarea value={importText} onChange={(event) => setImportText(event.target.value)} placeholder="Paste a Launch Line Client Radar export here." />
          </label>
          <div className="action-row">
            <button className="primary-action" onClick={importJson} type="button">Import JSON</button>
            <button className="danger-action" onClick={resetDemoData} type="button">Reset demo data</button>
          </div>
        </section>
        <section className="panel operator-card">
          <div className="section-heading">
            <p className="eyebrow">Operator Commands</p>
            <h2>Run it yourself</h2>
          </div>
          <pre className="proposal-text">{[
            'npm.cmd run seed',
            'npm.cmd run collect -- --city "Sarasota, FL" --radius 25',
            'npm.cmd run audit',
            'npm.cmd run score',
            'npm.cmd run export',
            'npm.cmd run export:standalone'
          ].join('\n')}</pre>
        </section>
        <section className="panel print-section">
          <div className="section-heading">
            <p className="eyebrow">Printable Report</p>
            <h2>Hot lead summary</h2>
          </div>
          <div className="lead-card-grid">
            {hotLeads.slice(0, 12).map((lead) => (
              <article className="opportunity-card" key={lead.place_id}>
                <span className="tag">{lead.scores.priority_score}</span>
                <h3>{lead.business_name}</h3>
                <p>{lead.packageRecommendation.package}</p>
                <small>{lead.salesAngle}</small>
              </article>
            ))}
          </div>
        </section>
      </div>
    );
  }

  const content = {
    dashboard: renderDashboard,
    prospects: renderProspects,
    pipeline: () => (
      <PipelineBoard
        prospects={state.prospects}
        selectedLeadId={state.selectedLeadId}
        onMoveLead={(id, pipelineStatus) => updateLead(id, { pipelineStatus })}
        onSelectLead={(id) => selectLead(id, 'prospects')}
      />
    ),
    audit: () => (
      <AuditWorkspace
        lead={selectedLead}
        onAuditChange={updateLeadAudit}
        onGuideScoreChange={updateGuideAuditScore}
        onLeadNoteChange={(id, notes) => updateLead(id, { notes })}
      />
    ),
    research: renderResearch,
    offer: () => (
      <div className="page-stack">
        <OfferBuilder lead={selectedLead} settings={state.settings} onCopy={copyText} onExport={downloadTextFile} />
        {renderOutreachBlock()}
      </div>
    ),
    calls: () => (
      <CallCenter
        callCenter={state.callCenter}
        onSelectLead={(id) => selectLead(id)}
        onStatus={setStatus}
        onUpdateCallCenter={updateCallCenter}
        onUpdateLead={updateLead}
        prospects={state.prospects}
        selectedLeadId={state.selectedLeadId}
      />
    ),
    export: renderExportCenter,
    settings: () => <SettingsPanel settings={state.settings} prospectCount={state.prospects.length} onResetDemoData={resetDemoData} onUpdateSettings={updateSettings} />
  }[activeTab]();

  return (
    <AppShell
      activeTab={activeTab}
      businessName={state.settings.businessName}
      guideTitle={state.settings.appName}
      ownerEmail={state.settings.ownerEmail}
      ownerPhone={state.settings.ownerPhone}
      onTabChange={navigate}
    >
      {status ? <div className="status-banner" role="status">{status}</div> : null}
      {content}
    </AppShell>
  );
}

function tabFromHash(): NavigationTab | null {
  if (typeof window === 'undefined') return null;
  const value = window.location.hash.replace('#', '');
  if (
    value === 'dashboard' ||
    value === 'prospects' ||
    value === 'pipeline' ||
    value === 'audit' ||
    value === 'research' ||
    value === 'offer' ||
    value === 'calls' ||
    value === 'export' ||
    value === 'settings'
  ) {
    return value;
  }
  return null;
}

function toOptionalNumber(value: string): number | undefined {
  if (!value.trim()) return undefined;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : undefined;
}

export default App;
