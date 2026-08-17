import type {
  AuditCriterionKey,
  AuditScore,
  AuditScoreInputs,
  GuidePackageRecommendation,
  GuidePriorityBand,
  ProspectRecord
} from '../types';

export const auditCriteria: Array<{
  key: AuditCriterionKey;
  label: string;
  description: string;
  weight: number;
}> = [
  {
    key: 'digitalPresence',
    label: 'Owned digital presence',
    description: 'Website quality, mobile readiness, HTTPS, and clear ownership of the lead path.',
    weight: 20
  },
  {
    key: 'conversionPath',
    label: 'Conversion path',
    description: 'How clearly a prospect can call, book, request a quote, or submit a form.',
    weight: 20
  },
  {
    key: 'localTrust',
    label: 'Local trust',
    description: 'Review proof, Google profile credibility, schema, and trust-building content.',
    weight: 15
  },
  {
    key: 'speedToLead',
    label: 'Speed to lead',
    description: 'Follow-up readiness, missed-call capture, chat, alerts, and routing.',
    weight: 15
  },
  {
    key: 'revenuePotential',
    label: 'Revenue potential',
    description: 'Ticket size, urgency, appointment value, and recurring service opportunity.',
    weight: 15
  },
  {
    key: 'ownerUrgency',
    label: 'Owner urgency',
    description: 'Visible pain, timing, decision-maker access, and reason to act now.',
    weight: 10
  },
  {
    key: 'marketVisibility',
    label: 'Market visibility',
    description: 'Search visibility, territory fit, category demand, and competitive pressure.',
    weight: 5
  }
];

export function createDefaultAuditInputs(): AuditScoreInputs {
  return auditCriteria.reduce((inputs, criterion) => {
    inputs[criterion.key] = 0;
    return inputs;
  }, {} as AuditScoreInputs);
}

export function calculateAuditScore(inputs: Partial<AuditScoreInputs>): AuditScore {
  const normalized = normalizeAuditInputs(inputs);
  const lineItems = auditCriteria.map((criterion) => {
    const score = normalized[criterion.key];
    return {
      key: criterion.key,
      label: criterion.label,
      weight: criterion.weight,
      score,
      points: roundPoints((score / 10) * criterion.weight)
    };
  });
  const total = roundPoints(lineItems.reduce((sum, item) => sum + item.points, 0));
  return {
    inputs: normalized,
    lineItems,
    total,
    priorityBand: getGuidePriorityBand(total),
    packageRecommendation: getGuidePackageRecommendation(total)
  };
}

export function getGuidePriorityBand(score: number): GuidePriorityBand {
  if (score <= 30) return 'Low priority';
  if (score <= 55) return 'Nurture';
  if (score <= 75) return 'High priority';
  return 'Immediate prospect';
}

export function getGuidePackageRecommendation(score: number): GuidePackageRecommendation {
  if (score <= 30) return 'Low priority, nurture or monitor';
  if (score <= 55) return 'Launch';
  if (score <= 75) return 'Convert';
  return 'Operate';
}

export function normalizeAuditScore(candidate: unknown): AuditScore | null {
  if (!candidate || typeof candidate !== 'object') return null;
  const score = candidate as { inputs?: unknown };
  if (!score.inputs || typeof score.inputs !== 'object') return null;
  return calculateAuditScore(score.inputs as Partial<AuditScoreInputs>);
}

export function inferAuditInputsFromLead(lead: Pick<ProspectRecord, 'scores' | 'rating' | 'user_ratings_total'>): AuditScoreInputs {
  return {
    digitalPresence: scoreToTen(lead.scores.website_need_score),
    conversionPath: scoreToTen(Math.max(lead.scores.website_need_score, lead.scores.automation_need_score)),
    localTrust: scoreToTen(Math.max(lead.scores.google_presence_score, reviewOpportunityScore(lead.rating, lead.user_ratings_total))),
    speedToLead: scoreToTen(lead.scores.automation_need_score),
    revenuePotential: scoreToTen(lead.scores.service_fit_score),
    ownerUrgency: scoreToTen(lead.scores.priority_score),
    marketVisibility: scoreToTen((lead.scores.service_fit_score + lead.scores.google_presence_score) / 2)
  };
}

export function updateAuditInput(current: AuditScore | undefined, key: AuditCriterionKey, value: number): AuditScore {
  return calculateAuditScore({
    ...(current?.inputs ?? createDefaultAuditInputs()),
    [key]: value
  });
}

function normalizeAuditInputs(inputs: Partial<AuditScoreInputs>): AuditScoreInputs {
  return auditCriteria.reduce((normalized, criterion) => {
    normalized[criterion.key] = clampZeroToTen(Number(inputs[criterion.key] ?? 0));
    return normalized;
  }, {} as AuditScoreInputs);
}

function reviewOpportunityScore(rating?: number, reviewCount?: number): number {
  let score = 0;
  if ((rating ?? 5) < 4.2) score += 35;
  if ((reviewCount ?? 0) < 20) score += 35;
  else if ((reviewCount ?? 0) < 50) score += 20;
  return Math.min(100, score);
}

function scoreToTen(score: number): number {
  return clampZeroToTen(Math.round(score / 10));
}

function clampZeroToTen(score: number): number {
  if (!Number.isFinite(score)) return 0;
  return Math.max(0, Math.min(10, Math.round(score)));
}

function roundPoints(points: number): number {
  return Math.round(points * 10) / 10;
}
