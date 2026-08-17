import type { CategoryProfile } from '../types';

const highestPriority = [
  'HVAC contractor',
  'plumber',
  'electrician',
  'roofer',
  'pool cleaning service',
  'pool contractor',
  'spa and hot tub repair',
  'pressure washing service',
  'landscaper',
  'lawn care service',
  'irrigation contractor',
  'pest control service',
  'tree service',
  'garage door service',
  'fencing contractor',
  'painting contractor',
  'flooring contractor',
  'remodeler',
  'general contractor',
  'cleaning service',
  'auto repair shop',
  'mobile detailing',
  'window tinting',
  'boat repair',
  'marine service',
  'towing service'
];

const appointmentPriority = [
  'hair salon',
  'barber shop',
  'nail salon',
  'med spa',
  'massage therapist',
  'chiropractor',
  'dentist',
  'physical therapy clinic',
  'mental health clinic',
  'pet groomer',
  'pet boarding',
  'gym',
  'personal trainer',
  'dance studio',
  'martial arts school'
];

const professionalPriority = [
  'law firm',
  'accountant',
  'tax preparer',
  'notary public',
  'real estate agent',
  'insurance agency',
  'mortgage broker',
  'financial planner'
];

const hospitalityPriority = ['restaurant', 'food truck', 'caterer', 'bakery', 'coffee shop', 'event venue'];

function profile(category: string, group: CategoryProfile['group']): CategoryProfile {
  const trade = group === 'Highest priority';
  const appointment = group === 'Appointment/service priority';
  const professional = group === 'Professional/local trust priority';
  const hospitality = group === 'Food and hospitality';

  return {
    category,
    group,
    traits: {
      emergencyHighIntent: trade && /hvac|plumb|electric|roofer|towing|garage|pest|tree/i.test(category),
      highTicket: trade || professional || /med spa|dentist|remodeler|contractor|marine|boat/i.test(category),
      recurring: /pool|lawn|landscap|cleaning|pest|pet|gym|coffee|restaurant/i.test(category),
      appointmentBased: appointment || professional || /repair|contractor|service|clinic|salon|spa/i.test(category),
      reviewSensitive: true,
      manualIntakeLikely: trade || appointment || professional
    },
    typicalPainPoints: [
      'Google demand exists but conversion path is weak or unowned.',
      'Mobile visitors need fast trust signals and a clear next action.',
      'Reviews and follow-up are not connected to a measurable lead system.'
    ],
    bestPackage: trade
      ? 'Speed-to-Lead Trade Growth System'
      : appointment
        ? 'Conversion Website + Scheduling Package'
        : professional
          ? 'Trust-to-Conversion Package'
          : hospitality
            ? 'Website Foundation Package'
            : 'Website Foundation Package',
    commonObjections: ['We get enough work from word of mouth.', 'We already have a Facebook page.', 'We do not have time to manage another tool.'],
    rebuttals: [
      'The goal is to capture demand you already earned, not replace referrals.',
      'Owned pages convert and track better than social-only profiles.',
      'The system should reduce manual follow-up instead of creating more work.'
    ]
  };
}

export const categoryProfiles: CategoryProfile[] = [
  ...highestPriority.map((category) => profile(category, 'Highest priority')),
  ...appointmentPriority.map((category) => profile(category, 'Appointment/service priority')),
  ...professionalPriority.map((category) => profile(category, 'Professional/local trust priority')),
  ...hospitalityPriority.map((category) => profile(category, 'Food and hospitality'))
];

export const defaultMarkets = [
  'Fruitville',
  'Sarasota',
  'Bradenton',
  'Lakewood Ranch',
  'Venice',
  'North Port',
  'Palmetto',
  'Parrish',
  'Longboat Key',
  'Siesta Key'
];
