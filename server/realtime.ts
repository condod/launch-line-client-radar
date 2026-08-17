import WebSocket from 'ws';
import { scheduleCallback } from './appointments.js';
import { buildRealtimePrompt, realtimeTools } from './prompts.js';
import type { CallContext, VoiceConfig } from './types.js';
import { CallStore } from './store.js';

type FunctionEvent = {
  type: string;
  name?: string;
  call_id?: string;
  arguments?: string;
  response?: { status?: string; status_details?: unknown };
};

async function realtimeAction(config: VoiceConfig, callId: string, action: 'refer' | 'hangup', body?: Record<string, unknown>): Promise<void> {
  const response = await fetch(`https://api.openai.com/v1/realtime/calls/${encodeURIComponent(callId)}/${action}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.openAiApiKey}`,
      'Content-Type': 'application/json'
    },
    body: body ? JSON.stringify(body) : undefined
  });
  if (!response.ok) throw new Error(`OpenAI realtime ${action} returned ${response.status}: ${await response.text()}`);
}

async function updateCurrentCall(store: CallStore, context: CallContext, patch: Record<string, unknown>): Promise<void> {
  await store.update((data) => {
    const call = data.calls.find((item) => item.contextToken === context.token);
    if (!call) return;
    Object.assign(call, patch, { updatedAt: new Date().toISOString() });
  });
}

async function handleToolCall(
  event: FunctionEvent,
  ws: WebSocket,
  callId: string,
  context: CallContext,
  config: VoiceConfig,
  store: CallStore
): Promise<void> {
  const name = event.name ?? '';
  const toolCallId = event.call_id;
  if (!toolCallId || !['mark_do_not_call', 'transfer_to_owner', 'save_call_note', 'schedule_callback'].includes(name)) return;
  let args: Record<string, unknown> = {};
  try {
    if ((event.arguments?.length ?? 0) > 10_000) throw new Error('Tool arguments were too large.');
    args = JSON.parse(event.arguments || '{}') as Record<string, unknown>;
  } catch {
    args = {};
  }

  let result: Record<string, unknown> = { ok: true };
  if (name === 'mark_do_not_call') {
    await store.update((data) => {
      const key = context.prospectId ?? `phone:${context.phone}`;
      const current = data.consents[key];
      data.consents[key] = {
        prospectId: key,
        businessName: current?.businessName ?? context.businessName,
        phone: current?.phone ?? context.phone,
        status: 'do_not_call',
        source: current?.source ?? 'Voice opt-out',
        evidenceNote: String(args.reason || 'Contact requested no further calls.').slice(0, 500),
        capturedAt: current?.capturedAt,
        updatedAt: new Date().toISOString()
      };
      const call = data.calls.find((item) => item.contextToken === context.token);
      if (call) {
        call.status = 'do-not-call';
        call.summary = String(args.reason || 'Contact requested no further calls.').slice(0, 500);
        call.updatedAt = new Date().toISOString();
      }
    });
    result = { ok: true, action: 'suppressed' };
  } else if (name === 'transfer_to_owner') {
    const settings = (await store.read()).settings;
    if (!settings.transferPhone) {
      await updateCurrentCall(store, context, { status: 'callback-requested', summary: String(args.reason || 'Caller requested a human, but no transfer line is configured.').slice(0, 500) });
      result = { ok: false, action: 'transfer_unavailable', instruction: 'Collect a callback note.' };
    } else {
      await realtimeAction(config, callId, 'refer', { target_uri: `tel:${settings.transferPhone}` });
      await updateCurrentCall(store, context, { status: 'transferred', summary: String(args.reason || 'Caller requested a human.').slice(0, 500) });
      result = { ok: true, action: 'transfer_started' };
    }
  } else if (name === 'save_call_note') {
    const outcome = String(args.outcome || 'completed').slice(0, 80);
    const summary = String(args.summary || '').slice(0, 1000);
    await updateCurrentCall(store, context, { status: outcome, summary });
    result = { ok: true, action: 'note_saved' };
  } else if (name === 'schedule_callback') {
    const scheduled = await store.update((data) => scheduleCallback(data, context, args));
    result = scheduled.ok
      ? {
          ok: true,
          action: 'callback_scheduled',
          appointment_id: scheduled.appointment.id,
          scheduled_for: scheduled.appointment.scheduledFor,
          time_zone: scheduled.appointment.timeZone,
          confirmation: scheduled.confirmation
        }
      : scheduled;
  }

  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({
      type: 'conversation.item.create',
      item: {
        type: 'function_call_output',
        call_id: toolCallId,
        output: JSON.stringify(result)
      }
    }));
    if (name !== 'transfer_to_owner' || result.ok === false) ws.send(JSON.stringify({ type: 'response.create' }));
  }
}

function openSideband(callId: string, context: CallContext, config: VoiceConfig, store: CallStore): void {
  const ws = new WebSocket(`wss://api.openai.com/v1/realtime?call_id=${encodeURIComponent(callId)}`, {
    headers: { Authorization: `Bearer ${config.openAiApiKey}` }
  });
  const handledToolCalls = new Set<string>();

  ws.on('open', () => {
    ws.send(JSON.stringify({ type: 'response.create' }));
  });
  ws.on('message', (message) => {
    let event: FunctionEvent;
    try {
      event = JSON.parse(message.toString()) as FunctionEvent;
    } catch {
      return;
    }
    if (event.type === 'response.function_call_arguments.done' && event.call_id && !handledToolCalls.has(event.call_id)) {
      handledToolCalls.add(event.call_id);
      void handleToolCall(event, ws, callId, context, config, store).catch(async (error: unknown) => {
        await updateCurrentCall(store, context, { status: 'tool-error', summary: error instanceof Error ? error.message.slice(0, 500) : 'Realtime tool failed.' });
      });
    }
    if (event.type === 'response.done' && event.response?.status === 'failed') {
      void updateCurrentCall(store, context, { status: 'ai-error', summary: JSON.stringify(event.response.status_details ?? {}).slice(0, 500) });
    }
  });
  ws.on('error', (error) => {
    void updateCurrentCall(store, context, { status: 'sideband-error', summary: error.message.slice(0, 500) });
  });
}

export async function acceptRealtimeCall(callId: string, context: CallContext, config: VoiceConfig, store: CallStore): Promise<void> {
  const settings = (await store.read()).settings;
  const response = await fetch(`https://api.openai.com/v1/realtime/calls/${encodeURIComponent(callId)}/accept`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.openAiApiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      type: 'realtime',
      model: config.openAiRealtimeModel,
      instructions: buildRealtimePrompt(context, settings),
      tools: realtimeTools
    })
  });
  if (!response.ok) throw new Error(`OpenAI realtime accept returned ${response.status}: ${await response.text()}`);
  await updateCurrentCall(store, context, { status: 'in-progress', realtimeCallId: callId });
  openSideband(callId, context, config, store);
}

export async function rejectRealtimeCall(callId: string, config: VoiceConfig): Promise<void> {
  const response = await fetch(`https://api.openai.com/v1/realtime/calls/${encodeURIComponent(callId)}/reject`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.openAiApiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ status_code: 603 })
  });
  if (!response.ok) throw new Error(`OpenAI realtime reject returned ${response.status}: ${await response.text()}`);
}
