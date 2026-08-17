import { getSalesPackageDefinition } from '../data/packages';
import type { AppSettings, ProposalDraft, ProspectRecord } from '../types';

const money = new Intl.NumberFormat('en-US', {
  currency: 'USD',
  maximumFractionDigits: 0,
  style: 'currency'
});

export function buildProposalDraft(lead: ProspectRecord, settings: AppSettings, selectedPackageName = lead.packageRecommendation.package): ProposalDraft {
  const recommendedPackage = getSalesPackageDefinition(selectedPackageName);
  const deposit = Math.round(recommendedPackage.setupPrice * (settings.defaultProposalDepositPercent / 100));
  const monthly = recommendedPackage.monthlyPrice > 0
    ? Math.max(recommendedPackage.monthlyPrice, settings.monthlyReportingRetainer)
    : 0;
  const title = `${lead.business_name} - Local Lead Capture Proposal`;
  const summary = `${lead.business_name} has local demand signals in ${lead.city}, but the current website, booking, Google, or follow-up path shows visible leakage. The selected first move is ${recommendedPackage.name.toLowerCase()}.`;
  const scope = recommendedPackage.deliverables;
  const optionalCare = monthly > 0 ? `${money.format(monthly)}/month optional care plan` : 'no ongoing service fee';
  const investment = `${money.format(recommendedPackage.setupPrice)} one-time setup, ${optionalCare}. Client-paid software: ${recommendedPackage.softwareCost}. Recommended deposit: ${money.format(deposit)}.`;
  const nextSteps = [
    'Confirm the business goal and service area.',
    'Approve the workflow, messages, scope, timeline, and deposit.',
    'Open any required client-owned software accounts and grant setup access.',
    'Test every trigger, handoff, opt-out path, and failure alert before launch.'
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
    'Automation',
    recommendedPackage.automationSummary,
    `Review cadence: ${recommendedPackage.reviewCadence}`,
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
