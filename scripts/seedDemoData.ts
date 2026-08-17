import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { categoryProfiles, defaultMarkets } from '../src/data/categories';
import { emptyAudit, scoreProspect, websiteStatusFromUrl } from '../src/lib/radarScoring';
import type { PipelineStatus, ProspectRecord, WebsiteAudit, WebsiteStatus } from '../src/types';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const outputDir = join(root, 'data');
const srcDataDir = join(root, 'src', 'data');

const namePrefixes = [
  'Harbor',
  'Citrus',
  'Bayfront',
  'Palmetto',
  'Summit',
  'Coastal',
  'Gulfside',
  'Bluewater',
  'Live Oak',
  'Suncoast'
];

const nameSuffixes = ['Pros', 'Group', 'Studio', 'Care', 'Works', 'Solutions', 'Services', 'Collective'];
const websiteModes: WebsiteStatus[] = ['missing', 'facebook_only', 'social_only', 'exists', 'exists', 'unreachable', 'marketplace_only'];
const pipelineStatuses: PipelineStatus[] = ['New', 'Researched', 'Contacted', 'Follow-up'];

function websiteFor(status: WebsiteStatus, slug: string): string | undefined {
  if (status === 'missing') return undefined;
  if (status === 'facebook_only') return `https://facebook.com/${slug}`;
  if (status === 'social_only') return `https://instagram.com/${slug}`;
  if (status === 'marketplace_only') return `https://yelp.com/biz/${slug}`;
  if (status === 'unreachable') return `http://old-${slug}.example.invalid`;
  return `https://example.com/${slug}`;
}

function buildAudit(status: WebsiteStatus, website: string | undefined, index: number): WebsiteAudit {
  const audit = emptyAudit(website);
  audit.website_status = status;
  audit.final_url = website;
  audit.http_status = status === 'unreachable' ? 0 : website ? 200 : undefined;
  audit.uses_https = Boolean(website?.startsWith('https://'));
  audit.mobile_viewport_present = status === 'exists' && index % 3 !== 0;
  audit.word_count = status === 'exists' ? (index % 4 === 0 ? 280 : 920) : 0;
  audit.service_pages_detected = status === 'exists' && index % 2 === 0;
  audit.location_pages_detected = status === 'exists' && index % 5 === 0;
  audit.contact_page_detected = status === 'exists' && index % 2 !== 0;
  audit.phone_click_link_detected = status === 'exists' && index % 3 !== 1;
  audit.contact_form_detected = status === 'exists' && index % 4 === 0;
  audit.booking_link_detected = status === 'exists' && index % 6 === 0;
  audit.quote_request_detected = status === 'exists' && index % 5 === 0;
  audit.ai_chat_or_chat_widget_detected = status === 'exists' && index % 9 === 0;
  audit.review_widget_detected = status === 'exists' && index % 4 === 0;
  audit.map_embed_detected = status === 'exists' && index % 3 === 0;
  audit.localbusiness_schema_detected = status === 'exists' && index % 6 === 0;
  audit.organization_schema_detected = status === 'exists' && index % 7 === 0;
  audit.faq_schema_detected = status === 'exists' && index % 10 === 0;
  audit.google_analytics_detected = status === 'exists' && index % 2 === 0;
  audit.google_tag_manager_detected = status === 'exists' && index % 7 === 0;
  audit.facebook_pixel_detected = status === 'exists' && index % 5 === 0;
  audit.outdated_copyright_detected = status === 'exists' && index % 4 === 1;
  audit.wordpress_detected = status === 'exists' && index % 3 === 0;
  audit.wix_detected = status === 'exists' && index % 8 === 0;
  audit.squarespace_detected = status === 'exists' && index % 9 === 0;
  audit.godaddy_detected = status === 'exists' && index % 11 === 0;
  audit.page_speed_mobile_score = status === 'exists' ? 35 + ((index * 7) % 58) : undefined;
  audit.page_speed_desktop_score = status === 'exists' ? 48 + ((index * 5) % 45) : undefined;
  audit.lcp = status === 'exists' ? 2.1 + (index % 5) * 0.7 : undefined;
  audit.inp = status === 'exists' ? 110 + (index % 6) * 45 : undefined;
  audit.cls = status === 'exists' ? Number((0.03 + (index % 5) * 0.04).toFixed(2)) : undefined;
  audit.accessibility_score = status === 'exists' ? 65 + (index % 28) : undefined;
  audit.seo_score = status === 'exists' ? 58 + (index % 35) : undefined;
  audit.best_improvement_notes = [
    'Clarify the first mobile call to action.',
    'Add service proof and review snippets near conversion points.',
    'Connect the Google listing to a tracked owned lead path.'
  ];
  return audit;
}

function buildDemoLead(index: number): ProspectRecord {
  const profile = categoryProfiles[index % categoryProfiles.length];
  const city = defaultMarkets[index % defaultMarkets.length];
  const status = websiteModes[index % websiteModes.length];
  const businessName = `${namePrefixes[index % namePrefixes.length]} ${profile.category.replace(/\b\w/g, (char) => char.toUpperCase())} ${nameSuffixes[index % nameSuffixes.length]}`;
  const slug = businessName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  const website = websiteFor(status, slug);
  const reviews = 8 + ((index * 17) % 160);
  const rating = Number((3.6 + ((index * 13) % 14) / 10).toFixed(1));
  const base = {
    place_id: `demo-${String(index + 1).padStart(3, '0')}`,
    business_name: businessName,
    categories: [profile.category, profile.group],
    primary_category_guess: profile.category,
    business_status: 'OPERATIONAL',
    formatted_address: `${1000 + index} Demo ${city} Ave, ${city}, FL`,
    city,
    state: 'FL',
    phone: index % 9 === 0 ? undefined : `941-555-${String(1000 + index).slice(-4)}`,
    website,
    google_maps_url: `https://maps.google.com/?cid=demo-${index + 1}`,
    rating,
    user_ratings_total: reviews,
    opening_hours: index % 8 === 0 ? undefined : ['Monday-Friday 8:00 AM-5:00 PM'],
    price_level: index % 3 === 0 ? '$$' : undefined,
    latest_reviews: [`Demo review mentioning ${profile.category} service quality.`],
    review_timestamps: index % 4 === 0 ? [] : ['2026-04-15T12:00:00.000Z'],
    latitude: 27.33 + index * 0.003,
    longitude: -82.53 - index * 0.003,
    audit: buildAudit(websiteStatusFromUrl(website) === 'exists' ? status : websiteStatusFromUrl(website), website, index),
    notes: '',
    pipelineStatus: pipelineStatuses[index % pipelineStatuses.length],
    isDemo: true,
    updatedAt: new Date().toISOString()
  };
  return scoreProspect(base);
}

const leads = Array.from({ length: 50 }, (_, index) => buildDemoLead(index));

await mkdir(outputDir, { recursive: true });
await mkdir(srcDataDir, { recursive: true });
await writeFile(join(outputDir, 'demo-prospects.json'), `${JSON.stringify(leads, null, 2)}\n`, 'utf8');
await writeFile(join(outputDir, 'prospects.json'), `${JSON.stringify(leads, null, 2)}\n`, 'utf8');
await writeFile(join(outputDir, 'audits.json'), `${JSON.stringify(Object.fromEntries(leads.map((lead) => [lead.place_id, lead.audit])), null, 2)}\n`, 'utf8');
await writeFile(join(outputDir, 'scored_prospects.json'), `${JSON.stringify(leads, null, 2)}\n`, 'utf8');
await writeFile(join(srcDataDir, 'demoProspects.json'), `${JSON.stringify(leads, null, 2)}\n`, 'utf8');
console.log(`Seeded ${leads.length} demo prospects.`);
