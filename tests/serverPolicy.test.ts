import assert from 'node:assert/strict';
import test from 'node:test';
import { evaluateAiOutbound, normalizeE164, withinWindow } from '../server/policy.js';
import type { RuntimeVoiceSettings, ServerCallRecord, ServerConsentRecord } from '../server/types.js';

const settings: RuntimeVoiceSettings = {
  receptionistEnabled: true,
  aiOutboundEnabled: true,
  callWindowStart: 8,
  callWindowEnd: 20,
  timeZone: 'America/New_York',
  maxAiAttempts: 3,
  agentName: 'Launch Line Assistant',
  transferPhone: '',
  bookingUrl: '',
  callbackWindowStart: 9,
  callbackWindowEnd: 18,
  callbackDays: [1, 2, 3, 4, 5],
  callbackDurationMinutes: 30,
  aiDisclosure: 'This is an AI assistant.'
};

const consent: ServerConsentRecord = {
  prospectId: 'lead-1',
  businessName: 'Fictional Test Company',
  phone: '+19415550147',
  status: 'written',
  source: 'Callback request form',
  evidenceNote: 'AI voice disclosure accepted.',
  capturedAt: '2026-08-16T14:00:00.000Z',
  updatedAt: '2026-08-16T14:00:00.000Z'
};

function denialReason(result: ReturnType<typeof evaluateAiOutbound>): string {
  assert.equal(result.allowed, false);
  return result.allowed ? '' : result.reason;
}

test('server policy normalizes US numbers and enforces the Eastern call window', () => {
  assert.equal(normalizeE164('941.780.3258'), '+19417803258');
  assert.equal(withinWindow(new Date('2026-08-17T11:59:00Z'), settings), false);
  assert.equal(withinWindow(new Date('2026-08-17T12:00:00Z'), settings), true);
  assert.equal(withinWindow(new Date('2026-08-18T00:00:00Z'), settings), false);
});

test('server policy requires complete written consent', () => {
  assert.match(denialReason(evaluateAiOutbound(undefined, [], settings, new Date('2026-08-17T14:00:00Z'))), /consent/i);
  assert.match(denialReason(evaluateAiOutbound({ ...consent, status: 'do_not_call' }, [], settings, new Date('2026-08-17T14:00:00Z'))), /may not be called/i);
  assert.deepEqual(evaluateAiOutbound(consent, [], settings, new Date('2026-08-17T14:00:00Z')), { allowed: true });
});

test('server policy prevents concurrent-style retries and excessive attempts', () => {
  const call = (startedAt: string, index: number): ServerCallRecord => ({
    id: `call-${index}`,
    contextToken: `context-${index}`,
    prospectId: consent.prospectId,
    businessName: consent.businessName,
    phone: consent.phone,
    direction: 'outbound',
    mode: 'ai',
    status: 'completed',
    startedAt,
    updatedAt: startedAt
  });
  assert.match(
    denialReason(evaluateAiOutbound(consent, [call('2026-08-17T13:00:00Z', 1)], settings, new Date('2026-08-17T14:00:00Z'))),
    /24 hours/i
  );
  const oldCalls = [1, 2, 3].map((index) => call(`2026-08-${10 + index}T14:00:00Z`, index));
  assert.match(denialReason(evaluateAiOutbound(consent, oldCalls, settings, new Date('2026-08-17T14:00:00Z'))), /attempt limit/i);
});
