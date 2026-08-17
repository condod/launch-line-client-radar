import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { getSalesPackageDefinition, salesPackageCategories, salesPackages } from '../src/data/packages';
import { buildProposalDraft } from '../src/lib/proposal';
import { createBlankProspectInput, createManualProspect } from '../src/lib/prospectFactory';
import { defaultSettings } from '../src/lib/storage';

describe('automation-first sales catalog', () => {
  it('provides 10 offers across all three catalog families', () => {
    assert.equal(salesPackages.length, 10);
    assert.deepEqual([...new Set(salesPackages.map((item) => item.category))], salesPackageCategories);
    assert.equal(Math.min(...salesPackages.map((item) => item.setupPrice)), 149);
    assert.equal(Math.max(...salesPackages.map((item) => item.setupPrice)), 1995);
    assert.equal(Math.max(...salesPackages.map((item) => item.monthlyPrice)), 129);
    assert.equal(salesPackages.every((item) => item.softwareCost && item.automationSummary && item.reviewCadence), true);
  });

  it('keeps the website package as the safe catalog fallback', () => {
    assert.equal(getSalesPackageDefinition('Unknown Offer').name, 'Website Foundation Package');
    assert.equal(getSalesPackageDefinition('Website Foundation Package').setupPrice, 995);
  });

  it('builds a proposal from a manually selected lower-cost offer', () => {
    const lead = createManualProspect({ ...createBlankProspectInput(), businessName: 'Automation Demo Electric', category: 'electrician' });
    const proposal = buildProposalDraft(lead, defaultSettings, 'Missed-Call Text-Back Setup');

    assert.equal(proposal.recommendedPackage.name, 'Missed-Call Text-Back Setup');
    assert.equal(proposal.investment.includes('$499 one-time setup'), true);
    assert.equal(proposal.investment.includes('Client-paid software'), true);
    assert.equal(proposal.plainText.includes('Review cadence:'), true);
  });

  it('does not add a retainer to a no-care quick win', () => {
    const lead = createManualProspect({ ...createBlankProspectInput(), businessName: 'Review Demo Salon', category: 'hair salon' });
    const proposal = buildProposalDraft(lead, defaultSettings, 'Google Review QR Starter');

    assert.equal(proposal.investment.includes('no ongoing service fee'), true);
    assert.equal(proposal.investment.includes('$49/month'), false);
  });
});
