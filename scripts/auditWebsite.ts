import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { emptyAudit, websiteStatusFromUrl } from '../src/lib/radarScoring';
import type { ProspectRecord, WebsiteAudit } from '../src/types';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const dataDir = join(root, 'data');
const prospects = JSON.parse(await readFile(join(dataDir, 'prospects.json'), 'utf8')) as ProspectRecord[];
const audits: Record<string, WebsiteAudit> = {};

function includesAny(content: string, terms: string[]): boolean {
  return terms.some((term) => content.includes(term));
}

function wordCount(text: string): number {
  return text.replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, ' ').split(/\s+/).filter(Boolean).length;
}

async function auditWebsite(prospect: ProspectRecord): Promise<WebsiteAudit> {
  if (!prospect.website) return emptyAudit();

  const status = websiteStatusFromUrl(prospect.website);
  if (status !== 'exists') {
    return { ...emptyAudit(prospect.website), website_status: status, final_url: prospect.website };
  }

  try {
    const response = await fetch(prospect.website, { redirect: 'follow' });
    const html = await response.text();
    const lower = html.toLowerCase();
    const title = html.match(/<title[^>]*>(.*?)<\/title>/is)?.[1]?.trim();
    const h1 = html.match(/<h1[^>]*>(.*?)<\/h1>/is)?.[1]?.replace(/<[^>]+>/g, '').trim();
    const meta = html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i)?.[1];

    return {
      ...emptyAudit(prospect.website),
      website_status: response.ok ? 'exists' : 'unreachable',
      final_url: response.url,
      http_status: response.status,
      uses_https: response.url.startsWith('https://'),
      mobile_viewport_present: lower.includes('name="viewport"') || lower.includes("name='viewport'"),
      title_tag: title,
      meta_description: meta,
      h1,
      word_count: wordCount(html),
      service_pages_detected: includesAny(lower, ['services', 'what we do', 'solutions']),
      location_pages_detected: includesAny(lower, ['service area', 'locations', 'near me']),
      contact_page_detected: lower.includes('contact'),
      phone_click_link_detected: lower.includes('tel:'),
      contact_form_detected: lower.includes('<form') && includesAny(lower, ['contact', 'message', 'email']),
      booking_link_detected: includesAny(lower, ['book now', 'schedule', 'appointment', 'calendly', 'square appointments']),
      quote_request_detected: includesAny(lower, ['quote', 'estimate', 'request service']),
      ai_chat_or_chat_widget_detected: includesAny(lower, ['chat', 'intercom', 'drift', 'tawk', 'crisp']),
      review_widget_detected: includesAny(lower, ['review', 'testimonial', 'stars']),
      map_embed_detected: lower.includes('google.com/maps') || lower.includes('maps/embed'),
      localbusiness_schema_detected: lower.includes('localbusiness'),
      organization_schema_detected: lower.includes('organization'),
      faq_schema_detected: lower.includes('faqpage'),
      google_analytics_detected: lower.includes('google-analytics') || lower.includes('gtag('),
      google_tag_manager_detected: lower.includes('googletagmanager'),
      facebook_pixel_detected: lower.includes('fbq('),
      outdated_copyright_detected: /copyright[^0-9]*(20[0-2][0-2])/.test(lower),
      wordpress_detected: lower.includes('wp-content'),
      wix_detected: lower.includes('wixstatic'),
      squarespace_detected: lower.includes('squarespace'),
      godaddy_detected: lower.includes('godaddy'),
      best_improvement_notes: ['Confirm mobile CTA clarity.', 'Check whether forms route into a follow-up system.']
    };
  } catch {
    return { ...emptyAudit(prospect.website), website_status: 'unreachable', final_url: prospect.website };
  }
}

for (const prospect of prospects) {
  audits[prospect.place_id] = await auditWebsite(prospect);
}

await mkdir(dataDir, { recursive: true });
await writeFile(join(dataDir, 'audits.json'), `${JSON.stringify(audits, null, 2)}\n`, 'utf8');
console.log(`Audited ${Object.keys(audits).length} websites.`);
