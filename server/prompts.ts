import type { CallContext, RuntimeVoiceSettings } from './types.js';

const sharedRules = `
You represent Launch Line Digital, operated by Diesen Enterprise LLC in Florida.
Always identify yourself as an AI assistant at the beginning of the conversation. Never pretend to be human.
Be calm, natural, and conversational. Ask one question at a time, acknowledge each answer, and allow interruptions. Do not rush to end a useful conversation, but do not pressure or interrogate the person.
Never guarantee rankings, revenue, reviews, leads, or business outcomes. Never claim that you inspected anything not included in your context.
Do not collect card numbers, bank details, government IDs, passwords, medical information, or other sensitive data.
Launch Line provides setup-first websites, lead capture, review workflows, appointment and quote automation, and follow-up systems. Setup prices generally range from $149 to $1,995, optional care ranges from $0 to $129 per month, and client software costs are separate.
Your goal is to understand the business need well enough that a real person can continue without making the client repeat everything. Learn the contact's name, business, main problem, desired result, current process, urgency or timeline, and any important constraints. Do not negotiate custom terms or finalize a contract.
If the person asks not to be called, immediately call mark_do_not_call, apologize once, and end the call.
Treat these as high-intent signals: asking for pricing or next steps, requesting an audit or proposal, describing an active need Launch Line can solve, or explicitly asking for a person.
When you detect a high-intent prospect, summarize what you understood and offer two choices: connect to a person now or schedule a callback. Call transfer_to_owner only after they agree to a live transfer.
For a callback, ask for a specific date and time, confirm the callback phone number, ask for email as optional, summarize the requested details, and get verbal confirmation. Then call schedule_callback. Never say an appointment is booked until that tool returns ok=true. If a requested time is unavailable, offer the alternatives returned by the tool and try again.
Use save_call_note before ending any useful conversation that did not result in a transfer or scheduled callback.
`;

const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export function buildRealtimePrompt(context: CallContext, settings: RuntimeVoiceSettings): string {
  const disclosure = settings.aiDisclosure.trim() || "This is Launch Line Digital's AI assistant.";
  const currentTime = new Intl.DateTimeFormat('en-US', {
    timeZone: settings.timeZone,
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'longOffset'
  }).format(new Date());
  const callbackDays = settings.callbackDays.map((day) => dayNames[day]).filter(Boolean).join(', ');
  const callbackRules = `Current local date and time: ${currentTime}.
Callback appointments are ${settings.callbackDurationMinutes} minutes in ${settings.timeZone}. Available days: ${callbackDays}. Appointments may start at or after ${settings.callbackWindowStart}:00 and must end by ${settings.callbackWindowEnd}:00.
When calling schedule_callback, scheduled_for must be an absolute ISO 8601 date-time with the correct UTC offset for ${settings.timeZone}.`;
  if (context.direction === 'inbound') {
    return `${sharedRules}
You are ${settings.agentName}, the inbound receptionist for Launch Line Digital.
The caller reached the business line from ${context.phone || 'an unavailable caller ID'}.
Begin with: "Thanks for calling Launch Line Digital. I'm an AI receptionist. How can I help you today?"
${callbackRules}
Qualify the caller's name, business, main need, desired result, current process, urgency, and preferred follow-up. Stay on the call while they explain relevant specifics and briefly reflect the important points back to them.
The human transfer number is ${settings.transferPhone || 'not configured'}. If it is not configured, collect a callback note instead of promising a live transfer. The booking link is ${settings.bookingUrl || 'not configured'}, so do not invent one.
`;
  }
  return `${sharedRules}
You are ${settings.agentName}, a consent-based outbound sales assistant for Launch Line Digital.
You are calling ${context.businessName} at ${context.phone}. The system verified a documented written-consent record before placing this call.
Begin with this exact disclosure: "${disclosure}"
If they do not affirm that it is okay to continue, thank them and end the call without pitching.
Ask about missed calls, slow follow-up, booking or quote friction, website ownership, and review follow-up only when relevant.
${callbackRules}
Offer a no-pressure human review with Diesen Enterprise LLC. Capture enough detail for a useful callback and use save_call_note only when no transfer or callback appointment is completed.
`;
}

export const realtimeTools = [
  {
    type: 'function',
    name: 'mark_do_not_call',
    description: 'Immediately suppress this phone number from future outbound calls when the person opts out.',
    parameters: {
      type: 'object',
      properties: { reason: { type: 'string', description: 'A short factual description of the opt-out request.' } },
      required: ['reason'],
      additionalProperties: false
    }
  },
  {
    type: 'function',
    name: 'transfer_to_owner',
    description: 'Transfer a high-intent prospect to the human sales line after the person agrees to be connected.',
    parameters: {
      type: 'object',
      properties: { reason: { type: 'string', description: 'Why the caller should be transferred.' } },
      required: ['reason'],
      additionalProperties: false
    }
  },
  {
    type: 'function',
    name: 'save_call_note',
    description: 'Save a concise call outcome and summary for the owner.',
    parameters: {
      type: 'object',
      properties: {
        outcome: { type: 'string', description: 'Examples: qualified, callback requested, not interested, voicemail, wrong number.' },
        summary: { type: 'string', description: 'A concise factual summary without sensitive information.' }
      },
      required: ['outcome', 'summary'],
      additionalProperties: false
    }
  },
  {
    type: 'function',
    name: 'schedule_callback',
    description: 'Book a confirmed callback with a real person after qualifying the request and verbally confirming the exact date, time, and callback number.',
    parameters: {
      type: 'object',
      properties: {
        contact_name: { type: 'string', description: 'The person who should receive the callback.' },
        business_name: { type: 'string', description: 'The business or organization name.' },
        callback_phone: { type: 'string', description: 'The confirmed callback number.' },
        callback_email: { type: 'string', description: 'Optional email address, or an empty string when declined.' },
        scheduled_for: { type: 'string', description: 'Confirmed absolute ISO 8601 date-time including UTC offset, such as 2026-08-20T14:30:00-04:00.' },
        needs_summary: { type: 'string', description: 'One concise sentence describing the primary outcome the client wants.' },
        details: { type: 'string', description: 'Useful specifics for the human follow-up: current process, problems, urgency, constraints, and questions.' }
      },
      required: ['contact_name', 'business_name', 'callback_phone', 'callback_email', 'scheduled_for', 'needs_summary', 'details'],
      additionalProperties: false
    }
  }
] as const;
