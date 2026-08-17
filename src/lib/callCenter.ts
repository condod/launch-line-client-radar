import type { CallCenterSettings, CallConsentRecord, ProspectCallRecord, ProspectRecord } from '../types';

const MIN_AI_RETRY_HOURS = 24;

export function normalizePhoneToE164(value: string): string | null {
  const digits = value.replace(/\D/g, '');
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`;
  if (value.trim().startsWith('+') && digits.length >= 8 && digits.length <= 15) return `+${digits}`;
  return null;
}

export function phoneHref(value: string): string {
  return `tel:${normalizePhoneToE164(value) ?? value.replace(/[^\d+]/g, '')}`;
}

export function createConsentRecord(now = new Date()): CallConsentRecord {
  return {
    status: 'unknown',
    source: '',
    evidenceNote: '',
    updatedAt: now.toISOString()
  };
}

export function createProspectCallRecord(prospectId: string, now = new Date()): ProspectCallRecord {
  return {
    prospectId,
    consent: createConsentRecord(now),
    aiAttempts: 0,
    notes: ''
  };
}

export function callRecordFor(records: Record<string, ProspectCallRecord>, prospectId: string): ProspectCallRecord {
  return records[prospectId] ?? createProspectCallRecord(prospectId);
}

export function localHourInTimeZone(date: Date, timeZone: string): number {
  const hourPart = new Intl.DateTimeFormat('en-US', {
    hour: '2-digit',
    hour12: false,
    timeZone
  }).formatToParts(date).find((part) => part.type === 'hour');
  const hour = Number(hourPart?.value);
  return Number.isFinite(hour) ? hour % 24 : date.getHours();
}

export function isWithinCallWindow(date: Date, settings: Pick<CallCenterSettings, 'callWindowStart' | 'callWindowEnd' | 'timeZone'>): boolean {
  const hour = localHourInTimeZone(date, settings.timeZone);
  if (settings.callWindowStart === settings.callWindowEnd) return false;
  if (settings.callWindowStart < settings.callWindowEnd) return hour >= settings.callWindowStart && hour < settings.callWindowEnd;
  return hour >= settings.callWindowStart || hour < settings.callWindowEnd;
}

export function canStartManualCall(lead: ProspectRecord, record: ProspectCallRecord): { allowed: boolean; reason: string } {
  if (!normalizePhoneToE164(lead.phone ?? '')) return { allowed: false, reason: 'Add a valid phone number first.' };
  if (record.consent.status === 'do_not_call' || lead.pipelineStatus === 'Do not contact') {
    return { allowed: false, reason: 'This lead is on the do-not-call list.' };
  }
  return { allowed: true, reason: 'Human-reviewed call is available.' };
}

export function canStartAiCall(
  lead: ProspectRecord,
  record: ProspectCallRecord,
  settings: CallCenterSettings,
  now = new Date()
): { allowed: boolean; reason: string } {
  if (!settings.aiOutboundEnabled) return { allowed: false, reason: 'Enable AI outbound calls in Call Center settings.' };
  if (!normalizePhoneToE164(lead.phone ?? '')) return { allowed: false, reason: 'Add a valid phone number first.' };
  if (record.consent.status === 'do_not_call' || lead.pipelineStatus === 'Do not contact') {
    return { allowed: false, reason: 'This lead is on the do-not-call list.' };
  }
  if (record.consent.status !== 'written') return { allowed: false, reason: 'Document written consent before an AI call.' };
  if (!record.consent.source.trim() || !record.consent.evidenceNote.trim() || !record.consent.capturedAt) {
    return { allowed: false, reason: 'Consent source, evidence, and capture date are required.' };
  }
  if (record.aiAttempts >= settings.maxAiAttempts) return { allowed: false, reason: 'The configured AI attempt limit has been reached.' };
  if (!isWithinCallWindow(now, settings)) {
    return { allowed: false, reason: `AI calls are limited to ${settings.callWindowStart}:00-${settings.callWindowEnd}:00 in ${settings.timeZone}.` };
  }
  if (record.lastAttemptAt) {
    const elapsedHours = (now.getTime() - new Date(record.lastAttemptAt).getTime()) / 3_600_000;
    if (Number.isFinite(elapsedHours) && elapsedHours < MIN_AI_RETRY_HOURS) {
      return { allowed: false, reason: 'Wait at least 24 hours between AI call attempts.' };
    }
  }
  return { allowed: true, reason: 'Consent and calling-window checks passed.' };
}

