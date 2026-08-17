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
  callbackWindowStart: number;
  callbackWindowEnd: number;
  callbackDays: number[];
  callbackDurationMinutes: number;
  aiDisclosure: string;
};

export type CallbackAppointmentStatus = 'scheduled' | 'completed' | 'cancelled';

export type CallbackAppointment = {
  id: string;
  callId: string;
  prospectId?: string;
  contactName: string;
  businessName: string;
  phone: string;
  email?: string;
  scheduledFor: string;
  timeZone: string;
  durationMinutes: number;
  needsSummary: string;
  details: string;
  status: CallbackAppointmentStatus;
  createdAt: string;
  updatedAt: string;
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
  appointmentId?: string;
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
  version: 2;
  settings: RuntimeVoiceSettings;
  consents: Record<string, ServerConsentRecord>;
  calls: ServerCallRecord[];
  appointments: CallbackAppointment[];
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
