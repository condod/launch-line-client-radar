import { readFile, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { emptyAudit, scoreProspect } from '../src/lib/radarScoring';
import type { ProspectRecord, WebsiteAudit } from '../src/types';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const dataDir = join(root, 'data');
const prospectsPath = join(dataDir, 'prospects.json');
const auditsPath = join(dataDir, 'audits.json');
const scoredPath = join(dataDir, 'scored_prospects.json');
const appDataPath = join(root, 'src', 'data', 'demoProspects.json');

const prospects = JSON.parse(await readFile(prospectsPath, 'utf8')) as Array<Partial<ProspectRecord>>;
let audits: Record<string, WebsiteAudit> = {};

try {
  audits = JSON.parse(await readFile(auditsPath, 'utf8')) as Record<string, WebsiteAudit>;
} catch {
  audits = {};
}

const scored = prospects.map((prospect) =>
  scoreProspect({
    place_id: String(prospect.place_id),
    business_name: String(prospect.business_name),
    categories: Array.isArray(prospect.categories) ? prospect.categories : [],
    primary_category_guess: String(prospect.primary_category_guess || prospect.categories?.[0] || 'service business'),
    business_status: String(prospect.business_status || 'OPERATIONAL'),
    formatted_address: String(prospect.formatted_address || ''),
    city: String(prospect.city || ''),
    state: String(prospect.state || 'FL'),
    phone: prospect.phone,
    website: prospect.website,
    google_maps_url: prospect.google_maps_url,
    rating: prospect.rating,
    user_ratings_total: prospect.user_ratings_total,
    opening_hours: prospect.opening_hours,
    price_level: prospect.price_level,
    latest_reviews: prospect.latest_reviews,
    review_timestamps: prospect.review_timestamps,
    latitude: prospect.latitude,
    longitude: prospect.longitude,
    audit: audits[String(prospect.place_id)] || prospect.audit || emptyAudit(prospect.website),
    notes: prospect.notes || '',
    pipelineStatus: prospect.pipelineStatus || 'New',
    isDemo: Boolean(prospect.isDemo),
    updatedAt: new Date().toISOString()
  })
);

await writeFile(scoredPath, `${JSON.stringify(scored, null, 2)}\n`, 'utf8');
await writeFile(appDataPath, `${JSON.stringify(scored, null, 2)}\n`, 'utf8');
console.log(`Scored ${scored.length} prospects.`);
