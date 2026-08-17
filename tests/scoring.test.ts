import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { categoryProfiles } from '../src/data/categories';
import {
  calculateAuditScore,
  getGuidePackageRecommendation,
  getGuidePriorityBand
} from '../src/lib/scoring';
import {
  calculateAutomationNeedScore,
  calculateGooglePresenceScore,
  calculateServiceFitScore,
  calculateWebsiteNeedScore,
  emptyAudit,
  getPriorityBand,
  scoreProspect
} from '../src/lib/radarScoring';

describe('client radar scoring', () => {
  it('calculates exact 0-10 weighted guide audit points', () => {
    const result = calculateAuditScore({
      digitalPresence: 10,
      conversionPath: 5,
      localTrust: 0,
      speedToLead: 10,
      revenuePotential: 6,
      ownerUrgency: 3,
      marketVisibility: 8
    });

    assert.equal(result.total, 61);
    assert.equal(result.lineItems.find((item) => item.key === 'conversionPath')?.points, 10);
    assert.equal(result.priorityBand, 'High priority');
    assert.equal(result.packageRecommendation, 'Convert');
  });

  it('matches requested guide priority and package thresholds', () => {
    assert.equal(getGuidePriorityBand(30), 'Low priority');
    assert.equal(getGuidePriorityBand(31), 'Nurture');
    assert.equal(getGuidePriorityBand(55), 'Nurture');
    assert.equal(getGuidePriorityBand(56), 'High priority');
    assert.equal(getGuidePriorityBand(75), 'High priority');
    assert.equal(getGuidePriorityBand(76), 'Immediate prospect');

    assert.equal(getGuidePackageRecommendation(30), 'Low priority, nurture or monitor');
    assert.equal(getGuidePackageRecommendation(31), 'Launch');
    assert.equal(getGuidePackageRecommendation(55), 'Launch');
    assert.equal(getGuidePackageRecommendation(56), 'Convert');
    assert.equal(getGuidePackageRecommendation(75), 'Convert');
    assert.equal(getGuidePackageRecommendation(76), 'Operate');
  });

  it('caps website need score at 100 for severe website leakage', () => {
    const audit = {
      ...emptyAudit(),
      website_status: 'missing' as const,
      mobile_viewport_present: false,
      contact_form_detected: false,
      booking_link_detected: false,
      quote_request_detected: false,
      phone_click_link_detected: false,
      localbusiness_schema_detected: false,
      organization_schema_detected: false,
      service_pages_detected: false,
      location_pages_detected: false,
      map_embed_detected: false
    };
    assert.equal(calculateWebsiteNeedScore(audit), 100);
  });

  it('scores service fit, google presence, and automation deterministically', () => {
    const profile = categoryProfiles.find((item) => item.category === 'HVAC contractor')!;
    const audit = emptyAudit();
    assert.equal(calculateServiceFitScore(profile, audit), 85);
    assert.equal(calculateGooglePresenceScore({ rating: 3.9, user_ratings_total: 12, website: undefined, phone: undefined, opening_hours: undefined }), 88);
    assert.equal(calculateAutomationNeedScore(profile, audit), 80);
  });

  it('assigns the requested priority bands', () => {
    assert.equal(getPriorityBand(85), 'Hot lead, website-first pitch');
    assert.equal(getPriorityBand(70), 'Strong lead, audit + website/Google package');
    assert.equal(getPriorityBand(55), 'Medium lead, niche service pitch');
    assert.equal(getPriorityBand(40), 'Nurture');
    assert.equal(getPriorityBand(39), 'Low priority');
  });

  it('generates a website-first package for a missing website lead', () => {
    const scored = scoreProspect({
      place_id: 'test-1',
      business_name: 'Demo Pool Service',
      categories: ['pool cleaning service'],
      primary_category_guess: 'pool cleaning service',
      business_status: 'OPERATIONAL',
      formatted_address: '100 Demo Ave, Sarasota, FL',
      city: 'Sarasota',
      state: 'FL',
      rating: 4.6,
      user_ratings_total: 38,
      audit: emptyAudit(),
      notes: '',
      pipelineStatus: 'New',
      isDemo: true,
      updatedAt: new Date().toISOString()
    });
    assert.equal(scored.packageRecommendation.package, 'Website Foundation Package');
    assert.equal(scored.scores.priority_score >= 70, true);
  });
});
