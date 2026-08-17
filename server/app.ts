import { randomUUID, timingSafeEqual } from 'node:crypto';
import express, { type NextFunction, type Request, type Response } from 'express';
import OpenAI from 'openai';
import twilio from 'twilio';
import { configurationStatus, defaultRuntimeSettings } from './config.js';
import { evaluateAiOutbound, normalizeE164, safeIdentifier } from './policy.js';
import { acceptRealtimeCall, rejectRealtimeCall } from './realtime.js';
import { CallStore } from './store.js';
import type { CallContext, ConsentStatus, RuntimeVoiceSettings, ServerCallRecord, ServerConsentRecord, VoiceConfig } from './types.js';

type IncomingRealtimeEvent = {
  id: string;
  type: string;
  data?: { call_id?: string; sip_headers?: Array<{ name: string; value: string }> };
};

function constantTimeEqual(left: string, right: string): boolean {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && timingSafeEqual(a, b);
}

function requireDashboardAuth(config: VoiceConfig) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!config.dashboardApiKey) {
      res.status(503).json({ error: 'DASHBOARD_API_KEY is not configured on the voice service.' });
      return;
    }
    const token = req.header('authorization')?.replace(/^Bearer\s+/i, '') ?? '';
    if (!token || !constantTimeEqual(token, config.dashboardApiKey)) {
      res.status(401).json({ error: 'Invalid voice service access key.' });
      return;
    }
    next();
  };
}

function validateTwilioRequest(config: VoiceConfig) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!config.validateTwilioWebhooks) {
      next();
      return;
    }
    const signature = req.header('x-twilio-signature') ?? '';
    const url = `${config.publicBaseUrl}${req.originalUrl}`;
    if (!config.twilioAuthToken || !config.publicBaseUrl || !signature || !twilio.validateRequest(config.twilioAuthToken, signature, url, req.body)) {
      res.status(403).send('Invalid Twilio signature.');
      return;
    }
    next();
  };
}

function sipUri(config: VoiceConfig, contextToken: string): string {
  return `sip:${config.openAiProjectId}@sip.api.openai.com;transport=tls?x-launchline-context=${encodeURIComponent(contextToken)}`;
}

function voiceXml(response: Response, twiml: twilio.twiml.VoiceResponse): void {
  response.type('text/xml').send(twiml.toString());
}

function spokenPhone(value: string): string {
  return value.replace(/\D/g, '').slice(-10).split('').join(' ');
}

function validTimeZone(value: string): boolean {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: value }).format();
    return true;
  } catch {
    return false;
  }
}

function settingsFromBody(body: Record<string, unknown>, current: RuntimeVoiceSettings, config: VoiceConfig): RuntimeVoiceSettings | null {
  const transferInput = String(body.transferPhone ?? '').trim();
  const next: RuntimeVoiceSettings = {
    receptionistEnabled: body.receptionistEnabled === true,
    aiOutboundEnabled: body.aiOutboundEnabled === true,
    callWindowStart: Number(body.callWindowStart),
    callWindowEnd: Number(body.callWindowEnd),
    timeZone: String(body.timeZone ?? ''),
    maxAiAttempts: Number(body.maxAiAttempts),
    agentName: String(body.agentName ?? '').trim().slice(0, 80),
    transferPhone: transferInput ? normalizeE164(transferInput) ?? '' : '',
    bookingUrl: String(body.bookingUrl ?? '').trim().slice(0, 500),
    aiDisclosure: String(body.aiDisclosure ?? '').trim().slice(0, 500)
  };
  if (!Number.isInteger(next.callWindowStart) || next.callWindowStart < 8 || next.callWindowStart > 19) return null;
  if (!Number.isInteger(next.callWindowEnd) || next.callWindowEnd < 9 || next.callWindowEnd > 20 || next.callWindowStart >= next.callWindowEnd) return null;
  if (!Number.isInteger(next.maxAiAttempts) || next.maxAiAttempts < 1 || next.maxAiAttempts > 3) return null;
  if (!validTimeZone(next.timeZone) || !next.agentName || !/\bAI\b/i.test(next.aiDisclosure)) return null;
  if (transferInput && !next.transferPhone) return null;
  if (next.transferPhone && [config.businessPhone, config.twilioPhoneNumber].includes(next.transferPhone)) return null;
  try {
    if (next.bookingUrl) new URL(next.bookingUrl);
  } catch {
    return null;
  }
  return { ...current, ...next };
}

function consentFromBody(body: Record<string, unknown>): ServerConsentRecord | null {
  const prospectId = safeIdentifier(body.prospectId);
  const businessName = String(body.businessName ?? '').trim().slice(0, 160);
  const phone = normalizeE164(String(body.phone ?? ''));
  const status = String(body.status ?? '') as ConsentStatus;
  const source = String(body.source ?? '').trim().slice(0, 300);
  const evidenceNote = String(body.evidenceNote ?? '').trim().slice(0, 1000);
  const capturedAt = typeof body.capturedAt === 'string' && Number.isFinite(new Date(body.capturedAt).getTime()) ? new Date(body.capturedAt).toISOString() : undefined;
  if (!prospectId || !businessName || !phone || !['unknown', 'requested', 'written', 'denied', 'do_not_call'].includes(status)) return null;
  if (status === 'written' && (!source || !evidenceNote || !capturedAt || new Date(capturedAt).getTime() > Date.now() + 300_000)) return null;
  return { prospectId, businessName, phone, status, source, evidenceNote, capturedAt, updatedAt: new Date().toISOString() };
}

function contextHeader(event: IncomingRealtimeEvent): string | null {
  const header = event.data?.sip_headers?.find((item) => item.name.toLowerCase() === 'x-launchline-context');
  return safeIdentifier(header?.value);
}

export function createVoiceApp(config: VoiceConfig, store = new CallStore(config.dataFile, defaultRuntimeSettings(config))) {
  const app = express();
  const openai = new OpenAI({ apiKey: config.openAiApiKey || 'not-configured', webhookSecret: config.openAiWebhookSecret || 'not-configured' });
  const dashboardAuth = requireDashboardAuth(config);
  const twilioAuth = validateTwilioRequest(config);
  const processingWebhooks = new Set<string>();

  app.disable('x-powered-by');
  app.set('trust proxy', 1);
  app.use((req, res, next) => {
    const origin = req.header('origin');
    if (origin && config.dashboardOrigins.includes(origin.replace(/\/$/, ''))) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Vary', 'Origin');
      res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    }
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'no-referrer');
    if (req.method === 'OPTIONS') {
      res.status(204).end();
      return;
    }
    next();
  });

  app.post('/webhooks/openai', express.text({ type: 'application/json', limit: '256kb' }), async (req, res) => {
    if (!config.openAiApiKey || !config.openAiWebhookSecret) {
      res.status(503).send('OpenAI is not configured.');
      return;
    }
    try {
      const event = await openai.webhooks.unwrap(req.body, req.headers, config.openAiWebhookSecret) as unknown as IncomingRealtimeEvent;
      if (event.type !== 'realtime.call.incoming' || !event.data?.call_id) {
        res.status(200).send('Ignored.');
        return;
      }
      const snapshot = await store.read();
      if (snapshot.handledWebhookIds.includes(event.id) || processingWebhooks.has(event.id)) {
        res.status(200).send('Duplicate ignored.');
        return;
      }
      processingWebhooks.add(event.id);
      try {
        const token = contextHeader(event);
        const context = token ? snapshot.contexts[token] : undefined;
        if (!context) {
          await rejectRealtimeCall(event.data.call_id, config);
          res.status(200).send('Unknown call rejected.');
          return;
        }
        await acceptRealtimeCall(event.data.call_id, context, config, store);
        await store.update((data) => {
          data.handledWebhookIds.push(event.id);
        });
        res.status(200).send('Accepted.');
      } finally {
        processingWebhooks.delete(event.id);
      }
    } catch (error) {
      if (error instanceof OpenAI.InvalidWebhookSignatureError) {
        res.status(400).send('Invalid OpenAI signature.');
        return;
      }
      console.error('OpenAI webhook failed:', error);
      res.status(500).send('Webhook processing failed.');
    }
  });

  app.use(express.json({ limit: '256kb' }));

  app.get('/api/health', async (_req, res) => {
    const data = await store.read();
    res.json({ ok: true, configured: configurationStatus(config), businessPhone: config.businessPhone, receptionistEnabled: data.settings.receptionistEnabled });
  });

  app.get('/api/settings', dashboardAuth, async (_req, res) => {
    res.json({ settings: (await store.read()).settings });
  });

  app.post('/api/settings', dashboardAuth, async (req, res) => {
    const data = await store.read();
    const settings = settingsFromBody(req.body as Record<string, unknown>, data.settings, config);
    if (!settings) {
      res.status(400).json({ error: 'Voice settings are invalid. Keep calling hours within 8:00-20:00, attempts at 1-3, and an explicit AI disclosure. Any transfer number must be valid and different from the AI business line.' });
      return;
    }
    await store.update((draft) => { draft.settings = settings; });
    res.json({ ok: true, settings });
  });

  app.post('/api/consents', dashboardAuth, async (req, res) => {
    const consent = consentFromBody(req.body as Record<string, unknown>);
    if (!consent) {
      res.status(400).json({ error: 'Consent record is invalid. Written consent requires a source, evidence note, and capture date.' });
      return;
    }
    await store.update((data) => { data.consents[consent.prospectId] = consent; });
    res.json({ ok: true, consent });
  });

  app.get('/api/calls', dashboardAuth, async (_req, res) => {
    const calls = [...(await store.read()).calls]
      .sort((a, b) => b.startedAt.localeCompare(a.startedAt))
      .map((call) => {
        const publicCall: Partial<ServerCallRecord> = { ...call };
        delete publicCall.contextToken;
        delete publicCall.realtimeCallId;
        return publicCall;
      });
    res.json({ calls });
  });

  app.post('/api/calls/outbound-ai', dashboardAuth, async (req, res) => {
    const prospectId = safeIdentifier((req.body as Record<string, unknown>).prospectId);
    if (!prospectId) {
      res.status(400).json({ error: 'A valid prospectId is required.' });
      return;
    }
    const configured = configurationStatus(config);
    if (!configured.twilio || !configured.openai || !configured.publicUrl) {
      res.status(503).json({ error: 'Twilio, OpenAI, and PUBLIC_BASE_URL must be configured before placing AI calls.' });
      return;
    }
    const now = new Date().toISOString();
    const contextToken = randomUUID();
    const id = `call-${randomUUID()}`;
    const reservation = await store.update((data) => {
      const consent = data.consents[prospectId];
      const policy = evaluateAiOutbound(consent, data.calls, data.settings, new Date(now));
      if (!policy.allowed) return { ok: false as const, reason: policy.reason };
      const context: CallContext = {
        token: contextToken,
        direction: 'outbound',
        prospectId,
        businessName: consent.businessName,
        phone: consent.phone,
        createdAt: now
      };
      const callRecord: ServerCallRecord = {
        id,
        contextToken,
        prospectId,
        businessName: consent.businessName,
        phone: consent.phone,
        direction: 'outbound',
        mode: 'ai',
        status: 'queued',
        startedAt: now,
        updatedAt: now
      };
      data.contexts[contextToken] = context;
      data.calls.unshift(callRecord);
      return { ok: true as const, consent };
    });
    if (!reservation.ok) {
      res.status(409).json({ error: reservation.reason });
      return;
    }
    const consent = reservation.consent;

    try {
      const client = twilio(config.twilioAccountSid, config.twilioAuthToken);
      const call = await client.calls.create({
        to: consent.phone,
        from: config.twilioPhoneNumber,
        url: `${config.publicBaseUrl}/webhooks/twilio/outbound-connect?context=${encodeURIComponent(contextToken)}`,
        method: 'POST',
        machineDetection: 'Enable',
        statusCallback: `${config.publicBaseUrl}/webhooks/twilio/call-status?context=${encodeURIComponent(contextToken)}`,
        statusCallbackMethod: 'POST',
        statusCallbackEvent: ['initiated', 'ringing', 'answered', 'completed']
      });
      await store.update((data) => {
        const item = data.calls.find((entry) => entry.id === id);
        if (item) {
          item.providerCallSid = call.sid;
          item.status = call.status;
          item.updatedAt = new Date().toISOString();
        }
      });
      res.status(202).json({ id, providerCallSid: call.sid, status: call.status });
    } catch (error) {
      await store.update((data) => {
        const item = data.calls.find((entry) => entry.id === id);
        if (item) {
          item.status = 'failed';
          item.summary = error instanceof Error ? error.message.slice(0, 500) : 'Twilio call creation failed.';
          item.updatedAt = new Date().toISOString();
        }
      });
      res.status(502).json({ error: 'Twilio could not create the call. Check the server log and provider configuration.' });
    }
  });

  app.post('/webhooks/twilio/inbound', express.urlencoded({ extended: false }), twilioAuth, async (req, res) => {
    const twiml = new twilio.twiml.VoiceResponse();
    const settings = (await store.read()).settings;
    if (!settings.receptionistEnabled || !config.openAiProjectId) {
      twiml.say('Thanks for calling Launch Line Digital. The automated receptionist is unavailable. Please try again shortly.');
      voiceXml(res, twiml);
      return;
    }
    const providerCallSid = typeof req.body.CallSid === 'string' ? req.body.CallSid : undefined;
    const snapshot = await store.read();
    const existingCall = providerCallSid ? snapshot.calls.find((item) => item.direction === 'inbound' && item.providerCallSid === providerCallSid) : undefined;
    let context = existingCall ? snapshot.contexts[existingCall.contextToken] : undefined;
    if (!context) {
      const callerPhone = normalizeE164(String(req.body.From ?? '')) ?? String(req.body.From ?? 'unknown').slice(0, 40);
      const contextToken = randomUUID();
      const now = new Date().toISOString();
      context = {
        token: contextToken,
        direction: 'inbound',
        businessName: 'Inbound caller',
        phone: callerPhone,
        createdAt: now
      };
      const callRecord: ServerCallRecord = {
        id: `call-${randomUUID()}`,
        contextToken,
        businessName: 'Inbound caller',
        phone: callerPhone,
        direction: 'inbound',
        mode: 'ai',
        status: 'ringing',
        startedAt: now,
        updatedAt: now,
        providerCallSid
      };
      await store.update((data) => {
        data.contexts[contextToken] = context as CallContext;
        data.calls.unshift(callRecord);
      });
    }
    const dial = twiml.dial({ answerOnBridge: true, timeout: 25 });
    dial.sip(sipUri(config, context.token));
    voiceXml(res, twiml);
  });

  app.post('/webhooks/twilio/outbound-connect', express.urlencoded({ extended: false }), twilioAuth, async (req, res) => {
    const twiml = new twilio.twiml.VoiceResponse();
    const token = safeIdentifier(req.query.context);
    const context = token ? (await store.read()).contexts[token] : undefined;
    if (!context) {
      twiml.hangup();
      voiceXml(res, twiml);
      return;
    }
    const answeredBy = String(req.body.AnsweredBy ?? '').toLowerCase();
    if (answeredBy.startsWith('machine') || answeredBy === 'fax') {
      twiml.say(`This is Launch Line Digital calling for ${context.businessName}. Please call us at ${spokenPhone(config.businessPhone)}. Again, ${spokenPhone(config.businessPhone)}.`);
      twiml.hangup();
      await store.update((data) => {
        const call = data.calls.find((item) => item.contextToken === context.token);
        if (call) {
          call.status = 'voicemail';
          call.summary = 'Twilio answering-machine detection prevented an AI conversation.';
          call.updatedAt = new Date().toISOString();
        }
      });
      voiceXml(res, twiml);
      return;
    }
    const dial = twiml.dial({ answerOnBridge: true, timeout: 25 });
    dial.sip(sipUri(config, context.token));
    voiceXml(res, twiml);
  });

  app.post('/webhooks/twilio/call-status', express.urlencoded({ extended: false }), twilioAuth, async (req, res) => {
    const token = safeIdentifier(req.query.context);
    if (token) {
      await store.update((data) => {
        const call = data.calls.find((item) => item.contextToken === token);
        if (!call) return;
        call.status = String(req.body.CallStatus ?? call.status).slice(0, 80);
        call.providerCallSid = String(req.body.CallSid ?? call.providerCallSid ?? '').slice(0, 80) || undefined;
        const duration = Number(req.body.CallDuration);
        if (Number.isFinite(duration) && duration >= 0) call.durationSeconds = duration;
        call.updatedAt = new Date().toISOString();
      });
    }
    res.status(204).end();
  });

  app.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
    void _next;
    console.error('Voice service request failed:', error);
    res.status(500).json({ error: 'Voice service request failed.' });
  });

  return app;
}
