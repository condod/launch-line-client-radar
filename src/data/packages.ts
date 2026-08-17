import type { SalesPackageDefinition } from '../types';

export const salesPackages: SalesPackageDefinition[] = [
  {
    name: 'Website Foundation Package',
    setupPrice: 2500,
    monthlyPrice: 250,
    timeline: '10-14 business days',
    positioning: 'A credible owned web presence that turns Google and referral attention into direct calls and quote requests.',
    deliverables: [
      'Mobile-first 5-page website',
      'Contact and quote request flow',
      'Click-to-call conversion path',
      'LocalBusiness or Organization schema',
      'Basic local SEO and analytics setup',
      'Google Business Profile link cleanup'
    ],
    bestFor: 'Businesses missing an owned website, relying on social-only pages, or using marketplace profiles as their primary web presence.'
  },
  {
    name: 'Speed-to-Lead Trade Growth System',
    setupPrice: 5500,
    monthlyPrice: 750,
    timeline: '14-21 business days',
    positioning: 'A high-intent lead capture and follow-up system for trades and service businesses where response time wins jobs.',
    deliverables: [
      'Conversion-focused service website',
      'Emergency or quote-first call to action',
      'Missed-call text-back workflow',
      'Lead routing and pipeline board',
      'Review request automation',
      'Monthly conversion reporting'
    ],
    bestFor: 'High-ticket or urgent-service companies with reviews, calls, and search demand but weak follow-up infrastructure.'
  },
  {
    name: 'Trust-to-Conversion Package',
    setupPrice: 4250,
    monthlyPrice: 500,
    timeline: '14-18 business days',
    positioning: 'A proof-heavy website and reputation system that turns existing trust signals into booked consultations.',
    deliverables: [
      'Website rebuild or conversion refresh',
      'Review proof and case study blocks',
      'Consultation or quote request flow',
      'Google review showcase',
      'Service and location proof pages',
      'Measurement dashboard'
    ],
    bestFor: 'Professional and appointment-led businesses that sell trust before price.'
  },
  {
    name: 'Review Repair + Google Growth Package',
    setupPrice: 1500,
    monthlyPrice: 450,
    timeline: '7-10 business days',
    positioning: 'A compliant review and Google profile workflow for businesses losing local trust before prospects ever call.',
    deliverables: [
      'Compliant review request workflow',
      'Review response templates',
      'Google profile update checklist',
      'Post-service SMS or email request copy',
      'QR review card copy',
      'Monthly reputation report'
    ],
    bestFor: 'Businesses with thin review volume, inconsistent profile data, or rating pressure.'
  },
  {
    name: 'Workflow Automation Package',
    setupPrice: 3500,
    monthlyPrice: 650,
    timeline: '10-15 business days',
    positioning: 'A practical follow-up system that reduces manual intake, missed calls, and stale leads.',
    deliverables: [
      'CRM or pipeline setup',
      'Form routing and lead alerts',
      'Appointment reminders',
      'Estimate follow-up workflow',
      'Manual handoff documentation',
      'Reporting dashboard'
    ],
    bestFor: 'Businesses with enough lead volume to need structure but not enough operational bandwidth to chase every inquiry manually.'
  },
  {
    name: 'Conversion Website + Scheduling Package',
    setupPrice: 3250,
    monthlyPrice: 400,
    timeline: '10-16 business days',
    positioning: 'A booking-ready website for appointment businesses that need fewer back-and-forth messages.',
    deliverables: [
      'Website redesign',
      'Booking or request integration',
      'Service page cleanup',
      'Review proof blocks',
      'SMS or email reminder copy',
      'Google profile link cleanup'
    ],
    bestFor: 'Appointment and service businesses with basic web presence but weak conversion paths.'
  }
];

export function getSalesPackageDefinition(name: string): SalesPackageDefinition {
  return salesPackages.find((item) => item.name === name) ?? salesPackages[0];
}
