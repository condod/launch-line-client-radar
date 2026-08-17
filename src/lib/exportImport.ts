import { createDefaultState } from './storage';
import type { AppState, ProspectRecord } from '../types';
import { getProspectAuditScore, normalizeProspect } from './prospectFactory';

export function serializeAppState(state: AppState): string {
  return JSON.stringify(
    {
      app: 'launch-line-client-radar',
      version: 1,
      exportedAt: new Date().toISOString(),
      state
    },
    null,
    2
  );
}

export function parseImportedState(raw: string): { ok: true; state: AppState } | { ok: false; error: string } {
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object') return { ok: false, error: 'Import must be a JSON object.' };
    const payload = parsed as { app?: unknown; version?: unknown; state?: unknown };
    if (payload.app !== 'launch-line-client-radar' || payload.version !== 1) {
      return { ok: false, error: 'This file is not a Launch Line Client Radar v1 export.' };
    }
    if (!payload.state || typeof payload.state !== 'object') return { ok: false, error: 'Import is missing app state.' };
    const defaults = createDefaultState();
    const state = payload.state as Partial<AppState>;
    if (!Array.isArray(state.prospects)) return { ok: false, error: 'Import is missing a prospect list.' };
    const prospects = state.prospects
      .map((lead, index) => normalizeProspect(lead, index))
      .filter((lead): lead is ProspectRecord => Boolean(lead));
    if (!prospects.length) return { ok: false, error: 'Import did not contain any usable prospects.' };
    return {
      ok: true,
      state: {
        prospects,
        filters: { ...defaults.filters, ...state.filters },
        selectedLeadId: prospects.some((lead) => lead.place_id === state.selectedLeadId) ? String(state.selectedLeadId) : prospects[0].place_id,
        settings: { ...defaults.settings, ...state.settings },
        callCenter: {
          settings: { ...defaults.callCenter.settings, ...state.callCenter?.settings },
          records: state.callCenter?.records && typeof state.callCenter.records === 'object' ? state.callCenter.records : {},
          history: Array.isArray(state.callCenter?.history) ? state.callCenter.history.slice(0, 500) : []
        },
        updatedAt: new Date().toISOString()
      }
    };
  } catch {
    return { ok: false, error: 'Import JSON could not be parsed.' };
  }
}

function csvCell(value: unknown): string {
  const text = value == null ? '' : String(value);
  return `"${text.replace(/"/g, '""')}"`;
}

export function prospectsToCsv(prospects: ProspectRecord[]): string {
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
    'sales_audit_score',
    'sales_audit_band',
    'sales_audit_package',
    'package',
    'pipeline_status',
    'sales_angle'
  ];
  const rows = prospects.map((lead) => {
    const auditScore = getProspectAuditScore(lead);
    return [
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
      auditScore.total,
      auditScore.priorityBand,
      auditScore.packageRecommendation,
      lead.packageRecommendation.package,
      lead.pipelineStatus,
      lead.salesAngle
    ];
  });
  return [headers, ...rows].map((row) => row.map(csvCell).join(',')).join('\n');
}

export function downloadTextFile(filename: string, contents: string, type = 'application/json'): void {
  const blob = new Blob([contents], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}
