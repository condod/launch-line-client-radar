import { randomUUID } from 'node:crypto';
import { normalizeE164 } from './policy.js';
import type { CallContext, CallData, CallbackAppointment, CallbackAppointmentStatus, RuntimeVoiceSettings } from './types.js';

const MINIMUM_NOTICE_MS = 30 * 60 * 1000;
const MAXIMUM_ADVANCE_MS = 180 * 24 * 60 * 60 * 1000;
const DAY_INDEX: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

export type ScheduleCallbackResult =
  | { ok: true; appointment: CallbackAppointment; confirmation: string }
  | { ok: false; error: string; instruction: string; alternatives?: Array<{ scheduled_for: string; confirmation: string }> };

function text(value: unknown, maxLength: number): string {
  return String(value ?? '').trim().replace(/\s+/g, ' ').slice(0, maxLength);
}

function zonedParts(date: Date, timeZone: string): { day: number; hour: number; minute: number } {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23'
  }).formatToParts(date);
  const value = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? '';
  return {
    day: DAY_INDEX[value('weekday')] ?? -1,
    hour: Number(value('hour')) % 24,
    minute: Number(value('minute'))
  };
}

function slotIsAllowed(date: Date, settings: RuntimeVoiceSettings): boolean {
  const { day, hour, minute } = zonedParts(date, settings.timeZone);
  const start = hour * 60 + minute;
  const end = start + settings.callbackDurationMinutes;
  return settings.callbackDays.includes(day)
    && start >= settings.callbackWindowStart * 60
    && end <= settings.callbackWindowEnd * 60;
}

function conflicts(appointments: CallbackAppointment[], start: Date, durationMinutes: number): boolean {
  const end = start.getTime() + durationMinutes * 60_000;
  return appointments.some((appointment) => {
    if (appointment.status !== 'scheduled') return false;
    const existingStart = new Date(appointment.scheduledFor).getTime();
    const existingEnd = existingStart + appointment.durationMinutes * 60_000;
    return start.getTime() < existingEnd && end > existingStart;
  });
}

function nextAvailableSlots(
  data: CallData,
  settings: RuntimeVoiceSettings,
  after: Date,
  now: Date
): Array<{ scheduled_for: string; confirmation: string }> {
  const minimum = Math.max(after.getTime() + 30 * 60_000, now.getTime() + MINIMUM_NOTICE_MS);
  let cursor = Math.ceil(minimum / (30 * 60_000)) * 30 * 60_000;
  const limit = now.getTime() + 30 * 24 * 60 * 60_000;
  const slots: Array<{ scheduled_for: string; confirmation: string }> = [];
  while (cursor <= limit && slots.length < 3) {
    const candidate = new Date(cursor);
    if (slotIsAllowed(candidate, settings) && !conflicts(data.appointments, candidate, settings.callbackDurationMinutes)) {
      const scheduledFor = candidate.toISOString();
      slots.push({ scheduled_for: scheduledFor, confirmation: formatCallbackTime(scheduledFor, settings.timeZone) });
    }
    cursor += 30 * 60_000;
  }
  return slots;
}

export function formatCallbackTime(value: string, timeZone: string): string {
  return new Intl.DateTimeFormat('en-US', {
    timeZone,
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'short'
  }).format(new Date(value));
}

export function scheduleCallback(
  data: CallData,
  context: CallContext,
  input: Record<string, unknown>,
  now = new Date()
): ScheduleCallbackResult {
  const settings = data.settings;
  const call = data.calls.find((item) => item.contextToken === context.token);
  if (!call) return { ok: false, error: 'call_not_found', instruction: 'Save a callback note and ask the owner to follow up manually.' };

  const contactName = text(input.contact_name, 120);
  const businessName = text(input.business_name, 160) || context.businessName;
  const phone = normalizeE164(text(input.callback_phone, 40)) ?? normalizeE164(context.phone);
  const email = text(input.callback_email, 254);
  const needsSummary = text(input.needs_summary, 500);
  const details = text(input.details, 1500);
  const scheduledInput = text(input.scheduled_for, 80);
  const scheduledFor = new Date(scheduledInput);

  if (!contactName || !businessName || !phone || !needsSummary) {
    return { ok: false, error: 'missing_details', instruction: 'Ask for the contact name, business name, callback number, and a concise summary of what they want.' };
  }
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false, error: 'invalid_email', instruction: 'Ask the person to repeat the email address, or leave it blank if they prefer phone only.' };
  }
  if (!/(?:Z|[+-]\d{2}:\d{2})$/.test(scheduledInput) || !Number.isFinite(scheduledFor.getTime())) {
    return { ok: false, error: 'invalid_time', instruction: `Confirm a specific date and time in ${settings.timeZone}, then provide ISO 8601 with a UTC offset.` };
  }
  if (scheduledFor.getTime() < now.getTime() + MINIMUM_NOTICE_MS) {
    return { ok: false, error: 'insufficient_notice', instruction: 'Choose a time at least 30 minutes in the future.', alternatives: nextAvailableSlots(data, settings, scheduledFor, now) };
  }
  if (scheduledFor.getTime() > now.getTime() + MAXIMUM_ADVANCE_MS) {
    return { ok: false, error: 'too_far_ahead', instruction: 'Choose a callback within the next 180 days.' };
  }
  if (!slotIsAllowed(scheduledFor, settings)) {
    return {
      ok: false,
      error: 'outside_callback_hours',
      instruction: `Offer a time during the configured callback days between ${settings.callbackWindowStart}:00 and ${settings.callbackWindowEnd}:00 in ${settings.timeZone}.`,
      alternatives: nextAvailableSlots(data, settings, scheduledFor, now)
    };
  }
  if (conflicts(data.appointments, scheduledFor, settings.callbackDurationMinutes)) {
    return { ok: false, error: 'time_unavailable', instruction: 'Apologize briefly and offer one of the available alternatives.', alternatives: nextAvailableSlots(data, settings, scheduledFor, now) };
  }

  const timestamp = now.toISOString();
  const appointment: CallbackAppointment = {
    id: `appointment-${randomUUID()}`,
    callId: call.id,
    prospectId: context.prospectId,
    contactName,
    businessName,
    phone,
    email: email || undefined,
    scheduledFor: scheduledFor.toISOString(),
    timeZone: settings.timeZone,
    durationMinutes: settings.callbackDurationMinutes,
    needsSummary,
    details,
    status: 'scheduled',
    createdAt: timestamp,
    updatedAt: timestamp
  };
  data.appointments.unshift(appointment);
  call.appointmentId = appointment.id;
  call.status = 'callback-scheduled';
  call.summary = `${contactName} requested a callback about ${needsSummary}`.slice(0, 1000);
  call.updatedAt = timestamp;
  return { ok: true, appointment, confirmation: formatCallbackTime(appointment.scheduledFor, appointment.timeZone) };
}

export function setCallbackStatus(
  data: CallData,
  appointmentId: string,
  status: CallbackAppointmentStatus,
  now = new Date()
): CallbackAppointment | null {
  const appointment = data.appointments.find((item) => item.id === appointmentId);
  if (!appointment) return null;
  appointment.status = status;
  appointment.updatedAt = now.toISOString();
  return appointment;
}
