import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { ProspectRecord } from '../src/types';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const inputPath = join(root, 'data', 'scored_prospects.json');
const outputDir = join(root, 'exports');
const outputPath = join(outputDir, 'prospects.csv');

function csvCell(value: unknown): string {
  const text = value == null ? '' : String(value);
  return `"${text.replace(/"/g, '""')}"`;
}

const leads = JSON.parse(await readFile(inputPath, 'utf8')) as ProspectRecord[];
const headers = [
  'business_name',
  'city',
  'primary_category_guess',
  'phone',
  'website',
  'rating',
  'user_ratings_total',
  'website_status',
  'priority_score',
  'website_need_score',
  'service_fit_score',
  'google_presence_score',
  'automation_need_score',
  'priority_band',
  'package',
  'sales_angle',
  'pipeline_status',
  'google_maps_url'
];

const rows = leads.map((lead) => [
  lead.business_name,
  lead.city,
  lead.primary_category_guess,
  lead.phone,
  lead.website,
  lead.rating,
  lead.user_ratings_total,
  lead.audit.website_status,
  lead.scores.priority_score,
  lead.scores.website_need_score,
  lead.scores.service_fit_score,
  lead.scores.google_presence_score,
  lead.scores.automation_need_score,
  lead.scores.priority_band,
  lead.packageRecommendation.package,
  lead.salesAngle,
  lead.pipelineStatus,
  lead.google_maps_url
]);

await mkdir(outputDir, { recursive: true });
await writeFile(outputPath, [headers, ...rows].map((row) => row.map(csvCell).join(',')).join('\n'), 'utf8');
console.log(`Exported ${leads.length} prospects to ${outputPath}`);
