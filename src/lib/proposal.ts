import { getSalesPackageDefinition } from '../data/packages';
import type { AppSettings, ProposalDraft, ProspectRecord } from '../types';

const money = new Intl.NumberFormat('en-US', {
  currency: 'USD',
  maximumFractionDigits: 0,
  style: 'currency'
});

export function buildProposalDraft(lead: ProspectRecord, settings: AppSettings): ProposalDraft {
  const recommendedPackage = getSalesPackageDefinition(lead.packageRecommendation.package);
  const deposit = Math.round(recommendedPackage.setupPrice * (settings.defaultProposalDepositPercent / 100));
  const monthly = Math.max(recommendedPackage.monthlyPrice, settings.monthlyReportingRetainer);
  const title = `${lead.business_name} - Local Lead Capture Proposal`;
  const summary = `${lead.business_name} has local demand signals in ${lead.city}, but the current website, booking, Google, or follow-up path shows visible leakage. The first recommended move is ${lead.packageRecommendation.bestServiceToPitchFirst.toLowerCase()}.`;
  const scope = [...new Set([...recommendedPackage.deliverables, ...lead.packageRecommendation.services])].slice(0, 10);
  const investment = `${money.format(recommendedPackage.setupPrice)} setup, ${money.format(monthly)}/month optional reporting and optimization. Recommended deposit: ${money.format(deposit)}.`;
  const nextSteps = [
    'Confirm the business goal and service area.',
    'Review the audit findings with the owner or decision-maker.',
    'Approve scope, timeline, and deposit.',
    'Collect brand assets, service details, and access needed for setup.'
  ];
  const plainText = [
    title,
    '',
    `Prepared by: ${settings.businessName}${settings.ownerName ? ` - ${settings.ownerName}` : ''}`,
    settings.ownerEmail || settings.ownerPhone ? `Contact: ${[settings.ownerEmail, settings.ownerPhone].filter(Boolean).join(' | ')}` : '',
    '',
    'Opportunity',
    summary,
    '',
    'Recommended Package',
    `${recommendedPackage.name}: ${recommendedPackage.positioning}`,
    '',
    'Scope',
    ...scope.map((item) => `- ${item}`),
    '',
    'Timeline',
    recommendedPackage.timeline,
    '',
    'Investment',
    investment,
    '',
    'Next Steps',
    ...nextSteps.map((item, index) => `${index + 1}. ${item}`),
    '',
    settings.complianceFooter
  ].filter(Boolean).join('\n');

  return {
    title,
    summary,
    recommendedPackage,
    scope,
    timeline: recommendedPackage.timeline,
    investment,
    nextSteps,
    plainText
  };
}
