import { categoryProfiles } from '../data/categories';
import type { CategoryProfile, LeadScores, PackageRecommendation, PriorityBand, ProspectRecord, WebsiteAudit } from '../types';

const socialHosts = ['facebook.com', 'instagram.com', 'linktr.ee', 'yelp.com', 'toasttab.com', 'square.site'];

export function websiteStatusFromUrl(website?: string): WebsiteAudit['website_status'] {
  if (!website) return 'missing';
  const lower = website.toLowerCase();
  if (socialHosts.some((host) => lower.includes(host))) {
    if (lower.includes('facebook.com')) return 'facebook_only';
    return lower.includes('yelp.com') || lower.includes('toasttab.com') || lower.includes('square.site')
      ? 'marketplace_only'
      : 'social_only';
  }
  return 'exists';
}

export function emptyAudit(website?: string): WebsiteAudit {
  return {
    website_status: websiteStatusFromUrl(website),
    final_url: website,
    uses_https: Boolean(website?.startsWith('https://')),
    mobile_viewport_present: false,
    word_count: 0,
    service_pages_detected: false,
    location_pages_detected: false,
    contact_page_detected: false,
    phone_click_link_detected: false,
    contact_form_detected: false,
    booking_link_detected: false,
    quote_request_detected: false,
    ai_chat_or_chat_widget_detected: false,
    review_widget_detected: false,
    map_embed_detected: false,
    localbusiness_schema_detected: false,
    organization_schema_detected: false,
    faq_schema_detected: false,
    google_analytics_detected: false,
    google_tag_manager_detected: false,
    facebook_pixel_detected: false,
    outdated_copyright_detected: false,
    wordpress_detected: false,
    wix_detected: false,
    squarespace_detected: false,
    godaddy_detected: false,
    best_improvement_notes: []
  };
}

export function getCategoryProfile(category: string): CategoryProfile {
  return categoryProfiles.find((profile) => profile.category.toLowerCase() === category.toLowerCase()) || categoryProfiles[0];
}

export function capScore(score: number): number {
  return Math.max(0, Math.min(100, Math.round(score)));
}

export function calculateWebsiteNeedScore(audit: WebsiteAudit): number {
  let score = 0;
  if (audit.website_status === 'missing') score += 35;
  if (['facebook_only', 'social_only', 'marketplace_only'].includes(audit.website_status)) score += 30;
  if (['unreachable', 'broken_ssl'].includes(audit.website_status)) score += 30;
  if (!audit.mobile_viewport_present) score += 15;
  if ((audit.page_speed_mobile_score ?? 100) < 50) score += 15;
  if (!audit.booking_link_detected && !audit.quote_request_detected && !audit.contact_form_detected) score += 10;
  if (!audit.contact_form_detected && !audit.quote_request_detected) score += 10;
  if (!audit.booking_link_detected) score += 12;
  if (!audit.phone_click_link_detected) score += 8;
  if (!audit.localbusiness_schema_detected && !audit.organization_schema_detected) score += 8;
  if (!audit.service_pages_detected) score += 8;
  if (!audit.location_pages_detected) score += 6;
  if (audit.outdated_copyright_detected) score += 5;
  if (!audit.map_embed_detected) score += 5;
  if (audit.word_count > 0 && audit.word_count < 400) score += 10;
  return capScore(score);
}

export function calculateServiceFitScore(profile: CategoryProfile, audit: WebsiteAudit): number {
  let score = 0;
  if (profile.traits.emergencyHighIntent) score += 25;
  if (profile.traits.highTicket) score += 20;
  if (profile.traits.recurring) score += 15;
  if (profile.traits.appointmentBased && !audit.booking_link_detected) score += 15;
  if (profile.traits.reviewSensitive) score += 15;
  if (profile.traits.manualIntakeLikely) score += 10;
  return capScore(score);
}

export function calculateGooglePresenceScore(prospect: Pick<ProspectRecord, 'rating' | 'user_ratings_total' | 'website' | 'phone' | 'opening_hours'>): number {
  let score = 0;
  if ((prospect.rating ?? 5) < 4.2) score += 15;
  if ((prospect.rating ?? 5) < 4.0) score += 10;
  if ((prospect.user_ratings_total ?? 0) < 20) score += 20;
  else if ((prospect.user_ratings_total ?? 0) < 50) score += 10;
  if (!prospect.website) score += 25;
  if (!prospect.phone) score += 10;
  if (!prospect.opening_hours?.length) score += 8;
  return capScore(score);
}

export function calculateAutomationNeedScore(profile: CategoryProfile, audit: WebsiteAudit): number {
  let score = 0;
  if (profile.traits.appointmentBased && !audit.booking_link_detected) score += 25;
  if (profile.traits.manualIntakeLikely && !audit.quote_request_detected) score += 20;
  if (!audit.contact_form_detected) score += 15;
  if (!audit.ai_chat_or_chat_widget_detected) score += 10;
  if (!audit.google_analytics_detected && !audit.google_tag_manager_detected) score += 10;
  if (audit.phone_click_link_detected && !audit.contact_form_detected && !audit.booking_link_detected) score += 20;
  return capScore(score);
}

export function getPriorityBand(score: number): PriorityBand {
  if (score >= 85) return 'Hot lead, website-first pitch';
  if (score >= 70) return 'Strong lead, audit + website/Google package';
  if (score >= 55) return 'Medium lead, niche service pitch';
  if (score >= 40) return 'Nurture';
  return 'Low priority';
}

export function scoreProspect(prospect: Omit<ProspectRecord, 'scores' | 'packageRecommendation' | 'biggestProblems' | 'salesAngle' | 'coldCallOpener' | 'emailOpener' | 'smsDraft' | 'voicemail' | 'linkedInDraft' | 'auditBullets' | 'estimatedValueRange' | 'secondaryUpsells'>): ProspectRecord {
  const profile = getCategoryProfile(prospect.primary_category_guess);
  const websiteNeed = calculateWebsiteNeedScore(prospect.audit);
  const serviceFit = calculateServiceFitScore(profile, prospect.audit);
  const googlePresence = calculateGooglePresenceScore(prospect);
  const automationNeed = calculateAutomationNeedScore(profile, prospect.audit);
  const priority = capScore(websiteNeed * 0.45 + serviceFit * 0.25 + googlePresence * 0.2 + automationNeed * 0.1);
  const scores: LeadScores = {
    website_need_score: websiteNeed,
    service_fit_score: serviceFit,
    google_presence_score: googlePresence,
    automation_need_score: automationNeed,
    priority_score: priority,
    priority_band: getPriorityBand(priority)
  };
  const packageRecommendation = recommendPackage(prospect, scores, profile);
  const biggestProblems = getBiggestProblems(prospect.audit, scores);

  return {
    ...prospect,
    scores,
    packageRecommendation,
    biggestProblems,
    salesAngle: buildSalesAngle(prospect, packageRecommendation),
    coldCallOpener: buildCallOpener(prospect),
    emailOpener: buildEmailOpener(prospect),
    smsDraft: `Hi ${prospect.business_name}, I noticed a few places your Google traffic may be leaking before people request service. I put together a short manual audit if you want to review it.`,
    voicemail: `Hi, this is Diesen Enterprise. I was reviewing local ${prospect.primary_category_guess} options around ${prospect.city} and noticed a few website and Google conversion gaps. I will send a short note with what I found.`,
    linkedInDraft: `I noticed ${prospect.business_name} has local demand signals, but the website and follow-up path may not be capturing all of it. I help local teams turn that attention into calls, bookings, and quote requests.`,
    auditBullets: biggestProblems.slice(0, 4),
    estimatedValueRange: estimateValueRange(priority, profile),
    secondaryUpsells: getSecondaryUpsells(scores)
  };
}

export function recommendPackage(prospect: Pick<ProspectRecord, 'audit' | 'rating' | 'user_ratings_total' | 'primary_category_guess'>, scores: LeadScores, profile: CategoryProfile): PackageRecommendation {
  const status = prospect.audit.website_status;
  if (status === 'missing' || status === 'facebook_only' || status === 'social_only' || status === 'marketplace_only') {
    return {
      package: 'Website Foundation Package',
      bestServiceToPitchFirst: 'Owned website with quote/contact capture',
      services: ['5-page website', 'mobile-first design', 'Google Business Profile cleanup', 'contact/quote form', 'click-to-call', 'LocalBusiness schema', 'basic SEO', 'analytics']
    };
  }
  if (profile.traits.emergencyHighIntent || profile.traits.highTicket) {
    return {
      package: 'Speed-to-Lead Trade Growth System',
      bestServiceToPitchFirst: 'Mobile conversion path and speed-to-lead workflow',
      services: ['mobile website', 'emergency CTA', 'quote form', 'AI chat', 'missed-call text-back', 'review automation', 'job pipeline']
    };
  }
  if ((prospect.user_ratings_total ?? 0) >= 50 && scores.website_need_score >= 55) {
    return {
      package: 'Trust-to-Conversion Package',
      bestServiceToPitchFirst: 'Review-backed conversion website',
      services: ['website rebuild', 'review showcase', 'case studies', 'before/after proof', 'Google review flow', 'CTA optimization']
    };
  }
  if ((prospect.rating ?? 5) < 4.2 || (prospect.user_ratings_total ?? 0) < 20) {
    return {
      package: 'Review Repair + Google Growth Package',
      bestServiceToPitchFirst: 'Compliant review and Google profile workflow',
      services: ['compliant review request system', 'review response workflow', 'Google profile updates', 'review QR code', 'post-service SMS/email request', 'monthly reporting']
    };
  }
  if (scores.automation_need_score >= 55) {
    return {
      package: 'Workflow Automation Package',
      bestServiceToPitchFirst: 'Lead routing and follow-up automation',
      services: ['CRM setup', 'form routing', 'lead alerts', 'follow-up automations', 'appointment reminders', 'estimate pipeline', 'dashboard']
    };
  }
  return {
    package: 'Conversion Website + Scheduling Package',
    bestServiceToPitchFirst: 'Booking and lead capture upgrade',
    services: ['website redesign', 'booking integration', 'service pages', 'review proof blocks', 'lead capture forms', 'SMS/email reminders', 'GBP link cleanup']
  };
}

function getBiggestProblems(audit: WebsiteAudit, scores: LeadScores): string[] {
  const problems: string[] = [];
  if (audit.website_status !== 'exists') problems.push(`Website status is ${audit.website_status.replace(/_/g, ' ')}.`);
  if (!audit.mobile_viewport_present) problems.push('Mobile viewport is missing or unverified.');
  if (!audit.contact_form_detected && !audit.quote_request_detected) problems.push('No clear contact or quote form was detected.');
  if (!audit.booking_link_detected) problems.push('No online booking or scheduling path was detected.');
  if (!audit.phone_click_link_detected) problems.push('No click-to-call link was detected.');
  if (!audit.localbusiness_schema_detected && !audit.organization_schema_detected) problems.push('Local/organization schema was not detected.');
  if (scores.google_presence_score >= 45) problems.push('Google presence needs review, rating, or listing completeness work.');
  if (!audit.ai_chat_or_chat_widget_detected) problems.push('No AI/chat or after-hours capture was detected.');
  return problems.slice(0, 6);
}

function buildSalesAngle(prospect: Pick<ProspectRecord, 'business_name' | 'primary_category_guess' | 'city'>, recommendation: PackageRecommendation): string {
  return `${prospect.business_name} already has local demand potential in ${prospect.city}, but the current website, booking, Google, or follow-up path is likely leaking leads. Pitch ${recommendation.bestServiceToPitchFirst.toLowerCase()} first.`;
}

function buildCallOpener(prospect: Pick<ProspectRecord, 'business_name' | 'primary_category_guess' | 'city' | 'rating' | 'user_ratings_total' | 'website'>): string {
  const trust = prospect.rating ? `${prospect.rating} stars and ${prospect.user_ratings_total ?? 0} reviews` : 'a local Google listing';
  const websiteLine = prospect.website ? 'but I noticed a few conversion gaps on the web presence' : 'but I could not find a dedicated website connected to the listing';
  return `I was looking at ${prospect.primary_category_guess} options around ${prospect.city} and noticed ${prospect.business_name} has ${trust}, ${websiteLine}. I help local businesses turn that attention into calls, bookings, quote requests, and follow-ups.`;
}

function buildEmailOpener(prospect: Pick<ProspectRecord, 'business_name' | 'city' | 'primary_category_guess'>): string {
  return `I found ${prospect.business_name} while reviewing local ${prospect.primary_category_guess} options around ${prospect.city}. A quick audit shows a few places where local demand may not be converting into owned leads.`;
}

function estimateValueRange(priority: number, profile: CategoryProfile): string {
  if (priority >= 85 || profile.traits.highTicket) return '$3,500 - $12,000+';
  if (priority >= 70) return '$2,500 - $8,000';
  if (priority >= 55) return '$1,500 - $5,000';
  return '$750 - $2,500';
}

function getSecondaryUpsells(scores: LeadScores): string[] {
  const upsells = [];
  if (scores.google_presence_score >= 35) upsells.push('Google Business Profile optimization');
  if (scores.automation_need_score >= 35) upsells.push('CRM/workflow automation');
  if (scores.website_need_score >= 45) upsells.push('Local SEO and service pages');
  upsells.push('Monthly reporting dashboard');
  return [...new Set(upsells)];
}
