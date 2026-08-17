import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { parseImportedState, serializeAppState } from '../src/lib/exportImport';
import { buildProposalDraft } from '../src/lib/proposal';
import { createBlankProspectInput, createManualProspect } from '../src/lib/prospectFactory';
import { groupProspectsByStage } from '../src/lib/pipeline';
import { createDefaultState, defaultSettings } from '../src/lib/storage';

describe('client radar product workflows', () => {
  it('creates and scores a manual lead', () => {
    const lead = createManualProspect({
      ...createBlankProspectInput(),
      businessName: 'Manual Demo Plumbing',
      category: 'plumber',
      city: 'Sarasota',
      website: '',
      rating: '4.4',
      reviews: '18'
    });

    assert.equal(lead.isDemo, false);
    assert.equal(lead.pipelineStatus, 'New');
    assert.equal(lead.scores.priority_score > 0, true);
    assert.equal(lead.packageRecommendation.package, 'Website Foundation Package');
  });

  it('groups pipeline stages without losing leads', () => {
    const lead = createManualProspect({ ...createBlankProspectInput(), businessName: 'Pipeline Demo HVAC' });
    const grouped = groupProspectsByStage([{ ...lead, pipelineStatus: 'Proposal sent' }]);

    assert.equal(grouped['Proposal sent'].length, 1);
    assert.equal(grouped.New.length, 0);
  });

  it('builds a proposal with pricing and next steps', () => {
    const lead = createManualProspect({ ...createBlankProspectInput(), businessName: 'Proposal Demo Roofing', category: 'roofer' });
    const proposal = buildProposalDraft(lead, defaultSettings);

    assert.equal(proposal.title.includes('Proposal Demo Roofing'), true);
    assert.equal(proposal.plainText.includes('Investment'), true);
    assert.equal(proposal.nextSteps.length, 4);
  });

  it('rejects invalid imports without returning replacement state', () => {
    const invalid = parseImportedState('{bad json');
    assert.equal(invalid.ok, false);

    const incompatible = parseImportedState(JSON.stringify({ app: 'other-product', version: 1, state: {} }));
    assert.equal(incompatible.ok, false);
  });

  it('round-trips exported state through import validation', () => {
    const state = createDefaultState();
    const parsed = parseImportedState(serializeAppState(state));

    assert.equal(parsed.ok, true);
    if (parsed.ok) {
      assert.equal(parsed.state.prospects.length, state.prospects.length);
      assert.equal(parsed.state.prospects[0].salesGuideScore?.packageRecommendation, 'Operate');
    }
  });
});
