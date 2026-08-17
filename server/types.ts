export type ConsentStatus = 'unknown' | 'requested' | 'written' | 'denied' | 'do_not_call';

export type ServerConsentRecord = {
  prospectId: string;
  businessName: string;
  phone: string;
  status: ConsentStatus;
  source: string;
  evidenceNote: string;
  capturedAt?: string;
  updatedAt: string;
};

export type RuntimeVoiceSettings = {
  receptionistEnabled: boolean;
  aiOutboundEnabled: boolean;
  callWindowStart: number;
  callWindowEnd: number;
  timeZone: string;
  maxAiAttempts: number;
  agentName: string;
  transferPhone: string;
  bookingUrl: string;
  aiDisclosure: string;
};

export type ServerCallRecord = {
  id: string;
  contextToken: string;
  prospectId?: string;
  businessName: string;
  phone: string;
  direction: 'inbound' | 'outbound';
  mode: 'human' | 'ai';
  status: string;
  startedAt: string;
  updatedAt: string;
  durationSeconds?: number;
  providerCallSid?: string;
  realtimeCallId?: string;
  summary?: string;
};

export type CallContext = {
  token: string;
  direction: 'inbound' | 'outbound';
  prospectId?: string;
  businessName: string;
  phone: string;
  createdAt: string;
};

export type CallData = {
  version: 1;
  settings: RuntimeVoiceSettings;
  consents: Record<string, ServerConsentRecord>;
  calls: ServerCallRecord[];
  contexts: Record<string, CallContext>;
  handledWebhookIds: string[];
};

export type VoiceConfig = {
  port: number;
  publicBaseUrl: string;
  dashboardOrigins: string[];
  dashboardApiKey: string;
  businessPhone: string;
  humanTransferPhone: string;
  twilioAccountSid: string;
  twilioAuthToken: string;
  twilioPhoneNumber: string;
  validateTwilioWebhooks: boolean;
  openAiApiKey: string;
  openAiProjectId: string;
  openAiWebhookSecret: string;
  openAiRealtimeModel: string;
  dataFile: string;
};
