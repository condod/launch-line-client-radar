import assert from 'node:assert/strict';
import test from 'node:test';
import { canStartAiCall, createProspectCallRecord, normalizePhoneToE164 } from '../src/lib/callCenter';
import { createDefaultState } from '../src/lib/storage';

test('normalizes common US phone formats to E.164', () => {
  assert.equal(normalizePhoneToE164('(941) 780-3258'), '+19417803258');
  assert.equal(normalizePhoneToE164('1-941-780-3258'), '+19417803258');
  assert.equal(normalizePhoneToE164('invalid'), null);
});

test('blocks AI calls until written consent evidence is complete', () => {
  const state = createDefaultState();
  const lead = { ...state.prospects[0], phone: '(941) 555-0147' };
  const record = createProspectCallRecord(lead.place_id);
  const settings = { ...state.callCenter.settings, aiOutboundEnabled: true };
  const result = canStartAiCall(lead, record, settings, new Date('2026-08-17T14:00:00-04:00'));
  assert.equal(result.allowed, false);
  assert.match(result.reason, /written consent/i);
});

test('allows a consent-qualified AI call during the configured window', () => {
  const state = createDefaultState();
  const lead = { ...state.prospects[0], phone: '(941) 555-0147' };
  const record = {
    ...createProspectCallRecord(lead.place_id),
    consent: {
      status: 'written' as const,
      source: 'Website callback form',
      evidenceNote: 'Accepted the AI call disclosure checkbox.',
      capturedAt: '2026-08-16T12:00:00.000Z',
      updatedAt: '2026-08-16T12:00:00.000Z'
    }
  };
  const settings = { ...state.callCenter.settings, aiOutboundEnabled: true };
  const result = canStartAiCall(lead, record, settings, new Date('2026-08-17T14:00:00-04:00'));
  assert.equal(result.allowed, true);
});

test('blocks rapid retries and do-not-call records', () => {
  const state = createDefaultState();
  const lead = { ...state.prospects[0], phone: '(941) 555-0147' };
  const base = {
    ...createProspectCallRecord(lead.place_id),
    consent: {
      status: 'written' as const,
      source: 'Signed form',
      evidenceNote: 'Signed permission retained in CRM.',
      capturedAt: '2026-08-16T12:00:00.000Z',
      updatedAt: '2026-08-16T12:00:00.000Z'
    },
    lastAttemptAt: '2026-08-17T13:00:00-04:00'
  };
  const settings = { ...state.callCenter.settings, aiOutboundEnabled: true };
  assert.match(canStartAiCall(lead, base, settings, new Date('2026-08-17T14:00:00-04:00')).reason, /24 hours/i);
  assert.match(
    canStartAiCall(lead, { ...base, consent: { ...base.consent, status: 'do_not_call' } }, settings, new Date('2026-08-18T14:00:00-04:00')).reason,
    /do-not-call/i
  );
});
