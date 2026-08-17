export type WebsiteStatus =
  | 'missing'
  | 'facebook_only'
  | 'social_only'
  | 'marketplace_only'
  | 'exists'
  | 'unreachable'
  | 'broken_ssl'
  | 'redirects';

export type PriorityBand =
  | 'Hot lead, website-first pitch'
  | 'Strong lead, audit + website/Google package'
  | 'Medium lead, niche service pitch'
  | 'Nurture'
  | 'Low priority';

export type GuidePriorityBand = 'Low priority' | 'Nurture' | 'High priority' | 'Immediate prospect';

export type GuidePackageRecommendation = 'Low priority, nurture or monitor' | 'Launch' | 'Convert' | 'Operate';

export type AuditCriterionKey =
  | 'digitalPresence'
  | 'conversionPath'
  | 'localTrust'
  | 'speedToLead'
  | 'revenuePotential'
  | 'ownerUrgency'
  | 'marketVisibility';

export type AuditScoreInputs = Record<AuditCriterionKey, number>;

export type AuditScoreLineItem = {
  key: AuditCriterionKey;
  label: string;
  weight: number;
  score: number;
  points: number;
};

export type AuditScore = {
  inputs: AuditScoreInputs;
  lineItems: AuditScoreLineItem[];
  total: number;
  priorityBand: GuidePriorityBand;
  packageRecommendation: GuidePackageRecommendation;
};

export type PipelineStatus =
  | 'New'
  | 'Researched'
  | 'Contacted'
  | 'Follow-up'
  | 'Meeting booked'
  | 'Proposal sent'
  | 'Won'
  | 'Lost'
  | 'Do not contact';

export type ProspectRecord = {
  place_id: string;
  business_name: string;
  categories: string[];
  primary_category_guess: string;
  business_status: string;
  formatted_address: string;
  city: string;
  state: string;
  phone?: string;
  website?: string;
  google_maps_url?: string;
  rating?: number;
  user_ratings_total?: number;
  opening_hours?: string[];
  price_level?: string;
  latest_reviews?: string[];
  review_timestamps?: string[];
  latitude?: number;
  longitude?: number;
  audit: WebsiteAudit;
  salesGuideScore?: AuditScore;
  scores: LeadScores;
  packageRecommendation: PackageRecommendation;
  biggestProblems: string[];
  salesAngle: string;
  coldCallOpener: string;
  emailOpener: string;
  smsDraft: string;
  voicemail: string;
  linkedInDraft: string;
  auditBullets: string[];
  estimatedValueRange: string;
  secondaryUpsells: string[];
  notes: string;
  pipelineStatus: PipelineStatus;
  isDemo: boolean;
  updatedAt: string;
};

export type WebsiteAudit = {
  website_status: WebsiteStatus;
  final_url?: string;
  http_status?: number;
  uses_https: boolean;
  mobile_viewport_present: boolean;
  title_tag?: string;
  meta_description?: string;
  h1?: string;
  word_count: number;
  service_pages_detected: boolean;
  location_pages_detected: boolean;
  contact_page_detected: boolean;
  phone_click_link_detected: boolean;
  contact_form_detected: boolean;
  booking_link_detected: boolean;
  quote_request_detected: boolean;
  ai_chat_or_chat_widget_detected: boolean;
  review_widget_detected: boolean;
  map_embed_detected: boolean;
  localbusiness_schema_detected: boolean;
  organization_schema_detected: boolean;
  faq_schema_detected: boolean;
  google_analytics_detected: boolean;
  google_tag_manager_detected: boolean;
  facebook_pixel_detected: boolean;
  outdated_copyright_detected: boolean;
  wordpress_detected: boolean;
  wix_detected: boolean;
  squarespace_detected: boolean;
  godaddy_detected: boolean;
  page_speed_mobile_score?: number;
  page_speed_desktop_score?: number;
  lcp?: number;
  inp?: number;
  cls?: number;
  accessibility_score?: number;
  seo_score?: number;
  best_improvement_notes: string[];
};

export type LeadScores = {
  website_need_score: number;
  service_fit_score: number;
  google_presence_score: number;
  automation_need_score: number;
  priority_score: number;
  priority_band: PriorityBand;
};

export type PackageRecommendation = {
  package: string;
  services: string[];
  bestServiceToPitchFirst: string;
};

export type CategoryProfile = {
  category: string;
  group: 'Highest priority' | 'Appointment/service priority' | 'Professional/local trust priority' | 'Food and hospitality';
  traits: {
    emergencyHighIntent?: boolean;
    highTicket?: boolean;
    recurring?: boolean;
    appointmentBased?: boolean;
    reviewSensitive?: boolean;
    manualIntakeLikely?: boolean;
  };
  typicalPainPoints: string[];
  bestPackage: string;
  commonObjections: string[];
  rebuttals: string[];
};

export type RadarFilters = {
  search: string;
  city: string;
  category: string;
  priorityBand: string;
  websiteStatus: string;
  packageName: string;
  minReviews: string;
  maxReviews: string;
  minRating: string;
  maxRating: string;
  minPriority: string;
};

export type AppSettings = {
  businessName: string;
  appName: string;
  defaultCity: string;
  defaultRadiusMiles: number;
  ownerName: string;
  ownerEmail: string;
  ownerPhone: string;
  defaultProposalDepositPercent: number;
  monthlyReportingRetainer: number;
  complianceFooter: string;
};

export type CallConsentStatus = 'unknown' | 'requested' | 'written' | 'denied' | 'do_not_call';

export type CallConsentRecord = {
  status: CallConsentStatus;
  source: string;
  evidenceNote: string;
  capturedAt?: string;
  updatedAt: string;
};

export type ProspectCallRecord = {
  prospectId: string;
  consent: CallConsentRecord;
  aiAttempts: number;
  lastAttemptAt?: string;
  lastOutcome?: string;
  nextFollowUpAt?: string;
  notes: string;
};

export type CallDirection = 'inbound' | 'outbound';
export type CallMode = 'human' | 'ai';

export type CallHistoryItem = {
  id: string;
  prospectId?: string;
  businessName: string;
  phone: string;
  direction: CallDirection;
  mode: CallMode;
  status: string;
  startedAt: string;
  updatedAt: string;
  durationSeconds?: number;
  providerCallSid?: string;
  summary?: string;
};

export type CallCenterSettings = {
  serviceBaseUrl: string;
  businessPhone: string;
  transferPhone: string;
  agentName: string;
  receptionistEnabled: boolean;
  aiOutboundEnabled: boolean;
  callWindowStart: number;
  callWindowEnd: number;
  timeZone: string;
  maxAiAttempts: number;
  bookingUrl: string;
  aiDisclosure: string;
};

export type CallCenterState = {
  settings: CallCenterSettings;
  records: Record<string, ProspectCallRecord>;
  history: CallHistoryItem[];
};

export type AppState = {
  prospects: ProspectRecord[];
  filters: RadarFilters;
  selectedLeadId: string;
  settings: AppSettings;
  callCenter: CallCenterState;
  updatedAt: string;
};

export type NavigationTab = 'dashboard' | 'prospects' | 'pipeline' | 'audit' | 'research' | 'offer' | 'calls' | 'export' | 'settings';

export type ManualProspectInput = {
  businessName: string;
  category: string;
  city: string;
  state: string;
  address: string;
  phone: string;
  website: string;
  rating: string;
  reviews: string;
  notes: string;
};

export type SalesPackageDefinition = {
  name: string;
  category: 'Quick Win' | 'Automated System' | 'Website System';
  setupPrice: number;
  monthlyPrice: number;
  softwareCost: string;
  automationSummary: string;
  reviewCadence: string;
  timeline: string;
  positioning: string;
  deliverables: string[];
  bestFor: string;
};

export type ProposalDraft = {
  title: string;
  summary: string;
  recommendedPackage: SalesPackageDefinition;
  scope: string[];
  timeline: string;
  investment: string;
  nextSteps: string[];
  plainText: string;
};
