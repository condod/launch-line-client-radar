import { defaultMarkets } from '../data/categories';
import type { AuditCriterionKey, ManualProspectInput, PipelineStatus, ProspectRecord, WebsiteAudit } from '../types';
import { emptyAudit, getCategoryProfile, scoreProspect, websiteStatusFromUrl } from './radarScoring';
import { calculateAuditScore, inferAuditInputsFromLead, normalizeAuditScore, updateAuditInput } from './scoring';

const DEFAULT_PIPELINE_STATUS: PipelineStatus = 'New';

export function createBlankProspectInput(): ManualProspectInput {
  return {
    businessName: '',
    category: 'HVAC contractor',
    city: defaultMarkets[0],
    state: 'FL',
    address: '',
    phone: '',
    website: '',
    rating: '',
    reviews: '',
    notes: ''
  };
}

export function createManualProspect(input: ManualProspectInput): ProspectRecord {
  const businessName = input.businessName.trim() || 'Untitled Local Business';
  const category = input.category.trim() || 'HVAC contractor';
  const city = input.city.trim() || defaultMarkets[0];
  const state = input.state.trim() || 'FL';
  const website = input.website.trim();
  const rating = Number(input.rating);
  const reviews = Number(input.reviews);
  const now = new Date().toISOString();
  const id = `manual-${Date.now()}-${businessName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'lead'}`;

  const scored = scoreProspect({
    place_id: id,
    business_name: businessName,
    categories: [category, getCategoryProfile(category).group],
    primary_category_guess: category,
    business_status: 'OPERATIONAL',
    formatted_address: input.address.trim() || `${city}, ${state}`,
    city,
    state,
    phone: input.phone.trim() || undefined,
    website: website || undefined,
    rating: Number.isFinite(rating) ? Math.max(0, Math.min(5, rating)) : undefined,
    user_ratings_total: Number.isFinite(reviews) ? Math.max(0, Math.round(reviews)) : undefined,
    audit: emptyAudit(website || undefined),
    notes: input.notes.trim(),
    pipelineStatus: DEFAULT_PIPELINE_STATUS,
    isDemo: false,
    updatedAt: now
  });
  return { ...scored, salesGuideScore: calculateAuditScore(inferAuditInputsFromLead(scored)) };
}

export function rescoreProspect(prospect: ProspectRecord): ProspectRecord {
  const { scores, packageRecommendation, biggestProblems, salesAngle, coldCallOpener, emailOpener, smsDraft, voicemail, linkedInDraft, auditBullets, estimatedValueRange, secondaryUpsells, ...base } = prospect;
  void scores;
  void packageRecommendation;
  void biggestProblems;
  void salesAngle;
  void coldCallOpener;
  void emailOpener;
  void smsDraft;
  void voicemail;
  void linkedInDraft;
  void auditBullets;
  void estimatedValueRange;
  void secondaryUpsells;
  return scoreProspect({ ...base, updatedAt: new Date().toISOString() });
}

export function updateProspectAudit(prospect: ProspectRecord, patch: Partial<WebsiteAudit>): ProspectRecord {
  const nextAudit = {
    ...prospect.audit,
    ...patch,
    website_status: patch.website_status ?? websiteStatusFromUrl(prospect.website)
  };
  return rescoreProspect({ ...prospect, audit: nextAudit });
}

export function updateProspectGuideAudit(prospect: ProspectRecord, key: AuditCriterionKey, value: number): ProspectRecord {
  return {
    ...prospect,
    salesGuideScore: updateAuditInput(prospect.salesGuideScore, key, value),
    updatedAt: new Date().toISOString()
  };
}

export function getProspectAuditScore(prospect: ProspectRecord) {
  return prospect.salesGuideScore ?? calculateAuditScore(inferAuditInputsFromLead(prospect));
}

export function normalizeProspect(candidate: Partial<ProspectRecord>, fallbackIndex = 0): ProspectRecord | null {
  if (!candidate || typeof candidate.business_name !== 'string' || !candidate.business_name.trim()) return null;

  const category = typeof candidate.primary_category_guess === 'string' && candidate.primary_category_guess.trim()
    ? candidate.primary_category_guess
    : 'HVAC contractor';
  const website = typeof candidate.website === 'string' && candidate.website.trim() ? candidate.website.trim() : undefined;
  const audit = candidate.audit ? { ...emptyAudit(website), ...candidate.audit } : emptyAudit(website);

  const scored = scoreProspect({
    place_id: typeof candidate.place_id === 'string' && candidate.place_id.trim() ? candidate.place_id : `imported-${Date.now()}-${fallbackIndex}`,
    business_name: candidate.business_name.trim(),
    categories: Array.isArray(candidate.categories) ? candidate.categories : [category],
    primary_category_guess: category,
    business_status: typeof candidate.business_status === 'string' ? candidate.business_status : 'OPERATIONAL',
    formatted_address: typeof candidate.formatted_address === 'string' && candidate.formatted_address.trim()
      ? candidate.formatted_address
      : `${candidate.city || defaultMarkets[0]}, ${candidate.state || 'FL'}`,
    city: typeof candidate.city === 'string' && candidate.city.trim() ? candidate.city : defaultMarkets[0],
    state: typeof candidate.state === 'string' && candidate.state.trim() ? candidate.state : 'FL',
    phone: typeof candidate.phone === 'string' && candidate.phone.trim() ? candidate.phone : undefined,
    website,
    google_maps_url: typeof candidate.google_maps_url === 'string' && candidate.google_maps_url.trim() ? candidate.google_maps_url : undefined,
    rating: typeof candidate.rating === 'number' ? candidate.rating : undefined,
    user_ratings_total: typeof candidate.user_ratings_total === 'number' ? candidate.user_ratings_total : undefined,
    opening_hours: Array.isArray(candidate.opening_hours) ? candidate.opening_hours : undefined,
    price_level: typeof candidate.price_level === 'string' ? candidate.price_level : undefined,
    latest_reviews: Array.isArray(candidate.latest_reviews) ? candidate.latest_reviews : undefined,
    review_timestamps: Array.isArray(candidate.review_timestamps) ? candidate.review_timestamps : undefined,
    latitude: typeof candidate.latitude === 'number' ? candidate.latitude : undefined,
    longitude: typeof candidate.longitude === 'number' ? candidate.longitude : undefined,
    audit,
    notes: typeof candidate.notes === 'string' ? candidate.notes : '',
    pipelineStatus: isPipelineStatus(candidate.pipelineStatus) ? candidate.pipelineStatus : DEFAULT_PIPELINE_STATUS,
    isDemo: Boolean(candidate.isDemo),
    updatedAt: typeof candidate.updatedAt === 'string' ? candidate.updatedAt : new Date().toISOString()
  });

  return {
    ...scored,
    salesGuideScore: normalizeAuditScore(candidate.salesGuideScore) ?? calculateAuditScore(inferAuditInputsFromLead(scored))
  };
}

function isPipelineStatus(value: unknown): value is PipelineStatus {
  return (
    value === 'New' ||
    value === 'Researched' ||
    value === 'Contacted' ||
    value === 'Follow-up' ||
    value === 'Meeting booked' ||
    value === 'Proposal sent' ||
    value === 'Won' ||
    value === 'Lost' ||
    value === 'Do not contact'
  );
}
