import path from 'node:path';
import type { RuntimeVoiceSettings, VoiceConfig } from './types.js';

function cleanUrl(value: string): string {
  return value.trim().replace(/\/$/, '');
}

function integer(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isInteger(parsed) ? parsed : fallback;
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): VoiceConfig {
  return {
    port: integer(env.PORT, 8787),
    publicBaseUrl: cleanUrl(env.PUBLIC_BASE_URL ?? ''),
    dashboardOrigins: (env.DASHBOARD_ORIGINS ?? 'http://127.0.0.1:4191,http://localhost:4191,https://condod.github.io')
      .split(',')
      .map(cleanUrl)
      .filter(Boolean),
    dashboardApiKey: env.DASHBOARD_API_KEY?.trim() ?? '',
    businessPhone: env.BUSINESS_PHONE_E164?.trim() ?? '+19417803258',
    humanTransferPhone: env.HUMAN_TRANSFER_PHONE_E164?.trim() ?? '+19417352514',
    twilioAccountSid: env.TWILIO_ACCOUNT_SID?.trim() ?? '',
    twilioAuthToken: env.TWILIO_AUTH_TOKEN?.trim() ?? '',
    twilioPhoneNumber: env.TWILIO_PHONE_NUMBER?.trim() ?? '',
    validateTwilioWebhooks: env.TWILIO_VALIDATE_WEBHOOKS !== 'false',
    openAiApiKey: env.OPENAI_API_KEY?.trim() ?? '',
    openAiProjectId: env.OPENAI_PROJECT_ID?.trim() ?? '',
    openAiWebhookSecret: env.OPENAI_WEBHOOK_SECRET?.trim() ?? '',
    openAiRealtimeModel: env.OPENAI_REALTIME_MODEL?.trim() ?? 'gpt-realtime-2.1-mini',
    dataFile: path.resolve(env.CALL_DATA_FILE?.trim() || 'server-data/call-center.json')
  };
}

export function defaultRuntimeSettings(config: VoiceConfig): RuntimeVoiceSettings {
  return {
    receptionistEnabled: true,
    aiOutboundEnabled: false,
    callWindowStart: 8,
    callWindowEnd: 20,
    timeZone: 'America/New_York',
    maxAiAttempts: 3,
    agentName: 'Launch Line Assistant',
    transferPhone: config.humanTransferPhone,
    bookingUrl: '',
    aiDisclosure: "Hi, this is Launch Line Digital's AI assistant calling on behalf of Diesen Enterprise LLC. Is now an okay time for a brief conversation?"
  };
}

export function configurationStatus(config: VoiceConfig) {
  return {
    twilio: Boolean(config.twilioAccountSid && config.twilioAuthToken && config.twilioPhoneNumber),
    openai: Boolean(config.openAiApiKey && config.openAiProjectId && config.openAiWebhookSecret),
    publicUrl: Boolean(config.publicBaseUrl),
    dashboardAuth: Boolean(config.dashboardApiKey)
  };
}
