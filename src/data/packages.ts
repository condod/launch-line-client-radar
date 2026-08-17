import type { SalesPackageDefinition } from '../types';

export const salesPackageCategories: SalesPackageDefinition['category'][] = ['Quick Win', 'Automated System', 'Website System'];

export const salesPackages: SalesPackageDefinition[] = [
  {
    name: 'Google Review QR Starter',
    category: 'Quick Win',
    setupPrice: 149,
    monthlyPrice: 0,
    softwareCost: '$0 with the client\'s Google Business Profile',
    automationSummary: 'Creates a permanent review link and QR path the business can reuse after every completed job.',
    reviewCadence: 'Verify the review link whenever the Google profile changes.',
    timeline: '1-2 business days',
    positioning: 'A simple, compliant review request kit that gives staff one repeatable way to ask every customer for honest feedback.',
    deliverables: [
      'Direct Google review link',
      'Branded review QR code',
      'Print-ready counter card copy',
      'Two neutral review request templates',
      'Five review response templates',
      'Staff handoff checklist'
    ],
    bestFor: 'Small local businesses that need a low-risk first purchase and a consistent, non-gated review request process.'
  },
  {
    name: 'Booking & Reminder Setup',
    category: 'Quick Win',
    setupPrice: 349,
    monthlyPrice: 39,
    softwareCost: '$0-$20 per user/month, paid directly by the client',
    automationSummary: 'Customers self-book and receive confirmations and reminders without staff sending each message.',
    reviewCadence: 'Quarterly calendar, availability, and reminder review.',
    timeline: '2-3 business days',
    positioning: 'A client-owned booking flow that removes scheduling back-and-forth and reduces preventable no-shows.',
    deliverables: [
      'Booking account configuration',
      'Service and availability setup',
      'Intake questions',
      'Confirmation and reminder messages',
      'Website or Google booking link',
      'Owner handoff video or guide'
    ],
    bestFor: 'Appointment businesses still scheduling primarily by phone, text, or direct message.'
  },
  {
    name: 'Missed-Call Text-Back Setup',
    category: 'Quick Win',
    setupPrice: 499,
    monthlyPrice: 49,
    softwareCost: '$20-$100/month plus phone and message usage, paid directly by the client',
    automationSummary: 'A missed business call triggers an approved text response and routes the reply to the owner or team.',
    reviewCadence: 'Monthly opt-out, delivery, and routing check.',
    timeline: '3-5 business days',
    positioning: 'An after-hours and busy-line safety net for businesses that lose high-intent callers before anyone can respond.',
    deliverables: [
      'Client-owned phone workflow',
      'Approved first-response message',
      'Reply routing and lead alert',
      'Business-hours logic',
      'STOP and HELP handling check',
      'Live test and handoff documentation'
    ],
    bestFor: 'Trades and local services where one missed call can represent a valuable job.'
  },
  {
    name: 'Quote Follow-Up Autopilot',
    category: 'Quick Win',
    setupPrice: 599,
    monthlyPrice: 49,
    softwareCost: '$0-$30/month for CRM or automation software, paid directly by the client',
    automationSummary: 'New estimates enter a timed follow-up sequence and stop automatically when the lead replies or closes.',
    reviewCadence: 'Monthly check for failed steps, replies, and stale offers.',
    timeline: '3-5 business days',
    positioning: 'A short follow-up sequence that keeps open quotes from disappearing into an owner\'s inbox or notebook.',
    deliverables: [
      'Simple quote pipeline',
      'Three-message follow-up sequence',
      'Reply and won/lost stop rules',
      'Owner lead alerts',
      'Template approval workflow',
      'Test records and handoff guide'
    ],
    bestFor: 'Contractors, repair services, and professional firms that send estimates but follow up inconsistently.'
  },
  {
    name: 'Review Repair + Google Growth Package',
    category: 'Automated System',
    setupPrice: 399,
    monthlyPrice: 49,
    softwareCost: '$0-$25/month plus optional message usage, paid directly by the client',
    automationSummary: 'Completed jobs trigger the same neutral review request for every eligible customer, with replies tracked for staff review.',
    reviewCadence: 'Monthly profile, delivery, and response check.',
    timeline: '3-5 business days',
    positioning: 'A compliant Google and review follow-up system for businesses with thin review volume or inconsistent request timing.',
    deliverables: [
      'Google profile cleanup checklist',
      'Neutral post-service request workflow',
      'Email or SMS request templates',
      'Review QR code',
      'Response template library',
      'Monthly scorecard template'
    ],
    bestFor: 'Businesses with good service delivery but inconsistent review volume, incomplete profile data, or no repeatable request process.'
  },
  {
    name: 'Workflow Automation Package',
    category: 'Automated System',
    setupPrice: 799,
    monthlyPrice: 79,
    softwareCost: '$0-$50/month for CRM and automation tools, paid directly by the client',
    automationSummary: 'Forms, lead alerts, task creation, reminders, and pipeline updates run from tested triggers.',
    reviewCadence: 'Monthly error log and workflow health check.',
    timeline: '5-7 business days',
    positioning: 'A practical client-owned workflow that reduces manual intake, missed handoffs, and stale leads.',
    deliverables: [
      'Simple CRM or pipeline setup',
      'Form routing and lead alerts',
      'Task and status automation',
      'Appointment or estimate reminders',
      'Failure notifications',
      'Owner handoff documentation'
    ],
    bestFor: 'Businesses with enough lead volume to need structure but not enough staff time to chase every handoff manually.'
  },
  {
    name: 'Speed-to-Lead Trade Growth System',
    category: 'Automated System',
    setupPrice: 1995,
    monthlyPrice: 129,
    softwareCost: '$30-$100/month plus call or message usage, paid directly by the client',
    automationSummary: 'Calls, forms, and quote requests create leads, trigger fast acknowledgements, and route follow-up tasks automatically.',
    reviewCadence: 'Monthly conversion, delivery, and pipeline review.',
    timeline: '7-10 business days',
    positioning: 'A complete lead-response system for trades where speed, missed calls, and quote follow-up directly affect booked work.',
    deliverables: [
      'Conversion landing page or website refresh',
      'Emergency or quote-first call to action',
      'Missed-call text-back workflow',
      'Lead routing and pipeline',
      'Quote follow-up sequence',
      'Review request automation'
    ],
    bestFor: 'High-ticket or urgent-service companies with real demand but weak response and follow-up infrastructure.'
  },
  {
    name: 'Website Foundation Package',
    category: 'Website System',
    setupPrice: 995,
    monthlyPrice: 49,
    softwareCost: '$12-$30/month for hosting and forms, paid directly by the client',
    automationSummary: 'Calls and quote requests route through a client-owned website with automatic confirmations and lead alerts.',
    reviewCadence: 'Quarterly form, link, security, and content check.',
    timeline: '5-7 business days',
    positioning: 'A credible owned web presence that turns Google and referral attention into calls and quote requests.',
    deliverables: [
      'Template-based mobile-first website up to five pages',
      'Contact and quote request flow',
      'Click-to-call conversion path',
      'LocalBusiness or Organization schema',
      'Basic local SEO and analytics setup',
      'Google Business Profile link cleanup'
    ],
    bestFor: 'Businesses missing an owned website, relying on social-only pages, or using marketplace profiles as their primary web presence.'
  },
  {
    name: 'Trust-to-Conversion Package',
    category: 'Website System',
    setupPrice: 1295,
    monthlyPrice: 79,
    softwareCost: '$12-$40/month for hosting, forms, and proof tools, paid directly by the client',
    automationSummary: 'Proof, consultation requests, and lead alerts work continuously while the client adds approved case studies over time.',
    reviewCadence: 'Quarterly proof, form, and conversion review.',
    timeline: '7-10 business days',
    positioning: 'A proof-heavy website refresh that turns existing reviews and trust signals into booked consultations.',
    deliverables: [
      'Website conversion refresh',
      'Review proof and case study blocks',
      'Consultation or quote request flow',
      'Service and location proof pages',
      'Lead confirmation and owner alert',
      'Basic measurement dashboard'
    ],
    bestFor: 'Professional and appointment-led businesses that already have trust signals but need a stronger conversion path.'
  },
  {
    name: 'Conversion Website + Scheduling Package',
    category: 'Website System',
    setupPrice: 1495,
    monthlyPrice: 79,
    softwareCost: '$20-$60/month for hosting, scheduling, and reminders, paid directly by the client',
    automationSummary: 'Visitors choose a service, book available times, complete intake, and receive reminders without manual scheduling.',
    reviewCadence: 'Monthly booking, reminder, and form delivery check.',
    timeline: '7-10 business days',
    positioning: 'A booking-ready website for appointment businesses that need fewer calls and back-and-forth messages.',
    deliverables: [
      'Mobile-first website refresh',
      'Booking and calendar integration',
      'Service and intake setup',
      'Confirmation and reminder flow',
      'Review proof blocks',
      'Google profile booking link cleanup'
    ],
    bestFor: 'Appointment and service businesses with a basic web presence but weak self-booking and reminder paths.'
  }
];

export function getSalesPackageDefinition(name: string): SalesPackageDefinition {
  return salesPackages.find((item) => item.name === name) ?? salesPackages.find((item) => item.name === 'Website Foundation Package')!;
}
