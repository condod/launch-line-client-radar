import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { categoryProfiles } from '../src/data/categories';
import { emptyAudit, scoreProspect } from '../src/lib/radarScoring';
import type { ProspectRecord } from '../src/types';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const dataDir = join(root, 'data');
const apiKey = process.env.GOOGLE_PLACES_API_KEY;

function arg(name: string, fallback: string): string {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] || fallback : fallback;
}

const city = arg('city', process.env.DEFAULT_CITY || 'Sarasota, FL');
const radius = Number(arg('radius', process.env.DEFAULT_RADIUS_MILES || '25'));
const maxResultsPerCategory = Number(arg('maxResultsPerCategory', '10'));
const categories = arg('categories', categoryProfiles.slice(0, 8).map((profile) => profile.category).join('|')).split('|');

if (!apiKey) {
  throw new Error('GOOGLE_PLACES_API_KEY is required for live collection. Run npm run seed for demo data.');
}

const leads: ProspectRecord[] = [];
const seen = new Set<string>();

async function delay(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

for (const category of categories) {
  const response = await fetch('https://places.googleapis.com/v1/places:searchText', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': apiKey,
      'X-Goog-FieldMask':
        'places.id,places.displayName,places.formattedAddress,places.location,places.nationalPhoneNumber,places.websiteUri,places.googleMapsUri,places.rating,places.userRatingCount,places.businessStatus,places.types,places.regularOpeningHours'
    },
    body: JSON.stringify({
      textQuery: `${category} in ${city}`,
      pageSize: Math.min(maxResultsPerCategory, 20),
      locationBias: { circle: { center: { latitude: 27.3364, longitude: -82.5307 }, radius: radius * 1609.34 } }
    })
  });

  if (!response.ok) {
    throw new Error(`Places request failed for ${category}: ${response.status} ${await response.text()}`);
  }

  const json = (await response.json()) as { places?: any[] };
  for (const place of json.places || []) {
    const key = place.id || `${place.displayName?.text}-${place.formattedAddress}`;
    if (!key || seen.has(key)) continue;
    seen.add(key);
    const address = String(place.formattedAddress || '');
    const cityGuess = address.split(',').slice(-3)[0]?.trim() || city.split(',')[0];
    const base = {
      place_id: key,
      business_name: place.displayName?.text || 'Unnamed business',
      categories: place.types || [category],
      primary_category_guess: category,
      business_status: place.businessStatus || 'UNKNOWN',
      formatted_address: address,
      city: cityGuess,
      state: 'FL',
      phone: place.nationalPhoneNumber,
      website: place.websiteUri,
      google_maps_url: place.googleMapsUri,
      rating: place.rating,
      user_ratings_total: place.userRatingCount,
      opening_hours: place.regularOpeningHours?.weekdayDescriptions,
      latitude: place.location?.latitude,
      longitude: place.location?.longitude,
      audit: emptyAudit(place.websiteUri),
      notes: '',
      pipelineStatus: 'New' as const,
      isDemo: false,
      updatedAt: new Date().toISOString()
    };
    leads.push(scoreProspect(base));
  }
  await delay(350);
}

await mkdir(dataDir, { recursive: true });
await writeFile(join(dataDir, 'prospects.json'), `${JSON.stringify(leads, null, 2)}\n`, 'utf8');
console.log(`Collected ${leads.length} live prospects into data/prospects.json.`);
