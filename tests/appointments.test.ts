import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { scheduleCallback, setCallbackStatus } from '../server/appointments.js';
import { buildRealtimePrompt } from '../server/prompts.js';
import { CallStore } from '../server/store.js';
import type { CallContext, CallData, RuntimeVoiceSettings } from '../server/types.js';

const settings: RuntimeVoiceSettings = {
  receptionistEnabled: true,
  aiOutboundEnabled: false,
  callWindowStart: 8,
  callWindowEnd: 20,
  timeZone: 'America/New_York',
  maxAiAttempts: 3,
  agentName: 'Launch Line Assistant',
  transferPhone: '+19417352514',
  bookingUrl: '',
  callbackWindowStart: 9,
  callbackWindowEnd: 18,
  callbackDays: [1, 2, 3, 4, 5],
  callbackDurationMinutes: 30,
  aiDisclosure: 'This is an AI assistant.'
};

const context: CallContext = {
  token: 'context-1',
  direction: 'inbound',
  businessName: 'Inbound caller',
  phone: '+19415550199',
  createdAt: '2026-08-17T14:00:00.000Z'
};

function callData(): CallData {
  return {
    version: 2,
    settings: structuredClone(settings),
    consents: {},
    calls: [{
      id: 'call-1',
      contextToken: context.token,
      businessName: context.businessName,
      phone: context.phone,
      direction: 'inbound',
      mode: 'ai',
      status: 'in-progress',
      startedAt: context.createdAt,
      updatedAt: context.createdAt
    }],
    appointments: [],
    contexts: { [context.token]: context },
    handledWebhookIds: []
  };
}

const request = {
  contact_name: 'Jordan Smith',
  business_name: 'Fictional Gulf Services',
  callback_phone: '(941) 555-0199',
  callback_email: 'jordan@example.com',
  scheduled_for: '2026-08-18T14:00:00-04:00',
  needs_summary: 'Automate missed-call follow-up and quote intake.',
  details: 'Currently returns calls manually and wants a faster response process.'
};

test('books a confirmed callback and links it to the call record', () => {
  const data = callData();
  const result = scheduleCallback(data, context, request, new Date('2026-08-17T14:00:00.000Z'));
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.appointment.phone, '+19415550199');
  assert.equal(result.appointment.status, 'scheduled');
  assert.equal(data.calls[0].appointmentId, result.appointment.id);
  assert.equal(data.calls[0].status, 'callback-scheduled');
  assert.match(result.confirmation, /Tuesday, August 18, 2026/);
});

test('rejects conflicts and returns alternative callback times', () => {
  const data = callData();
  const first = scheduleCallback(data, context, request, new Date('2026-08-17T14:00:00.000Z'));
  assert.equal(first.ok, true);
  const conflict = scheduleCallback(data, context, request, new Date('2026-08-17T14:00:00.000Z'));
  assert.equal(conflict.ok, false);
  if (conflict.ok) return;
  assert.equal(conflict.error, 'time_unavailable');
  assert.equal(conflict.alternatives?.length, 3);
  assert.match(conflict.alternatives?.[0].confirmation ?? '', /Tuesday, August 18, 2026/);
});

test('enforces callback hours and supports completion', () => {
  const data = callData();
  const outsideHours = scheduleCallback(
    data,
    context,
    { ...request, scheduled_for: '2026-08-18T20:00:00-04:00' },
    new Date('2026-08-17T14:00:00.000Z')
  );
  assert.equal(outsideHours.ok, false);
  const booked = scheduleCallback(data, context, request, new Date('2026-08-17T14:00:00.000Z'));
  assert.equal(booked.ok, true);
  if (!booked.ok) return;
  assert.equal(setCallbackStatus(data, booked.appointment.id, 'completed')?.status, 'completed');
});

test('prompt gathers specifics and books only after confirmation', () => {
  const prompt = buildRealtimePrompt(context, settings);
  assert.match(prompt, /main problem, desired result, current process/i);
  assert.match(prompt, /verbal confirmation/i);
  assert.match(prompt, /schedule_callback/);
  assert.match(prompt, /Never say an appointment is booked until/i);
});

test('migrates existing voice data without losing call records', async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'launch-line-appointment-migration-'));
  const file = path.join(directory, 'call-center.json');
  try {
    await writeFile(file, JSON.stringify({
      version: 1,
      settings: { agentName: 'Existing Agent' },
      consents: {},
      calls: callData().calls,
      contexts: {},
      handledWebhookIds: []
    }));
    const loaded = await new CallStore(file, settings).read();
    assert.equal(loaded.version, 2);
    assert.equal(loaded.settings.agentName, 'Existing Agent');
    assert.equal(loaded.settings.callbackDurationMinutes, 30);
    assert.deepEqual(loaded.appointments, []);
    assert.equal(loaded.calls.length, 1);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
