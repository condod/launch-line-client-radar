import type { RuntimeVoiceSettings, ServerCallRecord, ServerConsentRecord } from './types.js';

const MIN_RETRY_HOURS = 24;

export function normalizeE164(value: string): string | null {
  const digits = value.replace(/\D/g, '');
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`;
  if (value.trim().startsWith('+') && digits.length >= 8 && digits.length <= 15) return `+${digits}`;
  return null;
}

export function localHour(date: Date, timeZone: string): number {
  const part = new Intl.DateTimeFormat('en-US', { hour: '2-digit', hour12: false, timeZone })
    .formatToParts(date)
    .find((item) => item.type === 'hour');
  const hour = Number(part?.value);
  return Number.isFinite(hour) ? hour % 24 : date.getUTCHours();
}

export function withinWindow(date: Date, settings: RuntimeVoiceSettings): boolean {
  const hour = localHour(date, settings.timeZone);
  if (settings.callWindowStart >= settings.callWindowEnd) return false;
  return hour >= settings.callWindowStart && hour < settings.callWindowEnd;
}

export function evaluateAiOutbound(
  consent: ServerConsentRecord | undefined,
  calls: ServerCallRecord[],
  settings: RuntimeVoiceSettings,
  now = new Date()
): { allowed: true } | { allowed: false; reason: string } {
  if (!settings.aiOutboundEnabled) return { allowed: false, reason: 'AI outbound calls are disabled.' };
  if (!consent) return { allowed: false, reason: 'No server-side consent record exists for this lead.' };
  if (consent.status === 'do_not_call' || consent.status === 'denied') return { allowed: false, reason: 'This contact may not be called.' };
  if (consent.status !== 'written') return { allowed: false, reason: 'Written consent is required for an AI call.' };
  if (!consent.source.trim() || !consent.evidenceNote.trim() || !consent.capturedAt) {
    return { allowed: false, reason: 'The written consent record is incomplete.' };
  }
  if (!normalizeE164(consent.phone)) return { allowed: false, reason: 'The consent record does not contain a valid E.164 phone number.' };
  if (!withinWindow(now, settings)) {
    return { allowed: false, reason: `Calls are allowed only from ${settings.callWindowStart}:00 to ${settings.callWindowEnd}:00 in ${settings.timeZone}.` };
  }
  const attempts = calls
    .filter((call) => call.prospectId === consent.prospectId && call.direction === 'outbound' && call.mode === 'ai')
    .sort((a, b) => b.startedAt.localeCompare(a.startedAt));
  if (attempts.length >= settings.maxAiAttempts) return { allowed: false, reason: 'The AI call attempt limit has been reached.' };
  if (attempts[0]) {
    const elapsedHours = (now.getTime() - new Date(attempts[0].startedAt).getTime()) / 3_600_000;
    if (Number.isFinite(elapsedHours) && elapsedHours < MIN_RETRY_HOURS) {
      return { allowed: false, reason: 'Wait at least 24 hours between AI call attempts.' };
    }
  }
  return { allowed: true };
}

export function safeIdentifier(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return /^[a-zA-Z0-9_.:-]{1,160}$/.test(trimmed) ? trimmed : null;
}

