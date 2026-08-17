import demoProspects from '../data/demoProspects.json';
import type { AppSettings, AppState, ProspectRecord, RadarFilters } from '../types';
import { normalizeProspect } from './prospectFactory';

const STORAGE_KEY = 'launch-line-client-radar-state-v1';

export const defaultFilters: RadarFilters = {
  search: '',
  city: '',
  category: '',
  priorityBand: '',
  websiteStatus: '',
  packageName: '',
  minReviews: '',
  maxReviews: '',
  minRating: '',
  maxRating: '',
  minPriority: ''
};

export const defaultSettings: AppSettings = {
  businessName: 'Diesen Enterprise LLC',
  appName: 'Launch Line Client Radar',
  defaultCity: 'Sarasota, FL',
  defaultRadiusMiles: 25,
  ownerName: '',
  ownerEmail: 'cdiesen@repairmagic.com',
  ownerPhone: '(941) 780-3258',
  defaultProposalDepositPercent: 50,
  monthlyReportingRetainer: 49,
  complianceFooter: 'Prepared for manual review. No rankings, revenue, or review outcomes are guaranteed.'
};

export const createDefaultState = (): AppState => {
  const prospects = (demoProspects as ProspectRecord[])
    .map((lead, index) => normalizeProspect(lead, index))
    .filter((lead): lead is ProspectRecord => Boolean(lead));
  return {
  prospects,
  filters: defaultFilters,
  selectedLeadId: prospects[0]?.place_id || '',
  settings: defaultSettings,
  updatedAt: new Date().toISOString()
  };
};

export interface StorageAdapter {
  load(): AppState;
  save(state: AppState): void;
  clear(): void;
}

function getLocalStore(): Storage | null {
  if (typeof window === 'undefined') return null;

  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function mergeWithDefaults(state: Partial<AppState>): AppState {
  const defaults = createDefaultState();
  const prospects = Array.isArray(state.prospects)
    ? state.prospects.map((lead, index) => normalizeProspect(lead, index)).filter((lead): lead is ProspectRecord => Boolean(lead))
    : defaults.prospects;
  const settings = { ...defaults.settings, ...state.settings };
  if (settings.monthlyReportingRetainer === 250) settings.monthlyReportingRetainer = defaults.settings.monthlyReportingRetainer;

  return {
    prospects: prospects.length ? prospects : defaults.prospects,
    filters: { ...defaults.filters, ...state.filters },
    selectedLeadId: typeof state.selectedLeadId === 'string' ? state.selectedLeadId : defaults.selectedLeadId,
    settings,
    updatedAt: typeof state.updatedAt === 'string' ? state.updatedAt : defaults.updatedAt
  };
}

export const localStorageAdapter: StorageAdapter = {
  load() {
    const store = getLocalStore();
    if (!store) return createDefaultState();
    const raw = store.getItem(STORAGE_KEY);
    if (!raw) return createDefaultState();

    try {
      return mergeWithDefaults(JSON.parse(raw) as Partial<AppState>);
    } catch {
      return createDefaultState();
    }
  },
  save(state) {
    const store = getLocalStore();
    if (!store) return;
    store.setItem(STORAGE_KEY, JSON.stringify({ ...state, updatedAt: new Date().toISOString() }));
  },
  clear() {
    const store = getLocalStore();
    if (!store) return;
    store.removeItem(STORAGE_KEY);
  }
};
