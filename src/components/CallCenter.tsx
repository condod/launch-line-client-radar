import { useMemo, useState } from 'react';
import { callbackCalendarContents, callRecordFor, canStartAiCall, canStartManualCall, normalizePhoneToE164, phoneHref } from '../lib/callCenter';
import { downloadTextFile } from '../lib/exportImport';
import type {
  CallbackAppointment,
  CallbackAppointmentStatus,
  CallCenterSettings,
  CallCenterState,
  CallConsentStatus,
  CallHistoryItem,
  PipelineStatus,
  ProspectCallRecord,
  ProspectRecord
} from '../types';

const ACCESS_KEY_STORAGE = 'launch-line-call-center-access-key';
const consentOptions: Array<{ value: CallConsentStatus; label: string }> = [
  { value: 'unknown', label: 'Unknown' },
  { value: 'requested', label: 'Consent requested' },
  { value: 'written', label: 'Written consent documented' },
  { value: 'denied', label: 'Consent denied' },
  { value: 'do_not_call', label: 'Do not call' }
];

type ServiceHealth = {
  ok: boolean;
  configured: {
    twilio: boolean;
    openai: boolean;
    publicUrl: boolean;
  };
  businessPhone: string;
  scheduledCallbacks: number;
};

const callbackDayPresets = [
  { value: 'weekdays', label: 'Monday-Friday', days: [1, 2, 3, 4, 5] },
  { value: 'monday-saturday', label: 'Monday-Saturday', days: [1, 2, 3, 4, 5, 6] },
  { value: 'daily', label: 'Every day', days: [0, 1, 2, 3, 4, 5, 6] }
];

type CallCenterProps = {
  callCenter: CallCenterState;
  prospects: ProspectRecord[];
  selectedLeadId: string;
  onSelectLead: (id: string) => void;
  onUpdateCallCenter: (next: CallCenterState) => void;
  onUpdateLead: (id: string, patch: Partial<ProspectRecord>) => void;
  onStatus: (message: string) => void;
};

function sessionAccessKey(): string {
  if (typeof window === 'undefined') return '';
  try {
    return window.sessionStorage.getItem(ACCESS_KEY_STORAGE) ?? '';
  } catch {
    return '';
  }
}

function serviceUrl(baseUrl: string, path: string): string {
  return `${baseUrl.trim().replace(/\/$/, '')}${path}`;
}

function dateInputValue(value?: string): string {
  return value && /^\d{4}-\d{2}-\d{2}/.test(value) ? value.slice(0, 10) : '';
}

function displayPhone(value: string): string {
  const normalized = normalizePhoneToE164(value);
  if (normalized?.startsWith('+1') && normalized.length === 12) {
    return `(${normalized.slice(2, 5)}) ${normalized.slice(5, 8)}-${normalized.slice(8)}`;
  }
  return value;
}

function callbackDayPreset(days: number[]): string {
  const key = [...days].sort((a, b) => a - b).join(',');
  return callbackDayPresets.find((preset) => preset.days.join(',') === key)?.value ?? 'custom';
}

function displayAppointmentTime(appointment: CallbackAppointment): string {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: appointment.timeZone,
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'short'
  }).format(new Date(appointment.scheduledFor));
}

export function CallCenter({ callCenter, prospects, selectedLeadId, onSelectLead, onUpdateCallCenter, onUpdateLead, onStatus }: CallCenterProps) {
  const [accessKey, setAccessKey] = useState(sessionAccessKey);
  const [serviceHealth, setServiceHealth] = useState<ServiceHealth | null>(null);
  const [working, setWorking] = useState(false);
  const selectedLead = prospects.find((lead) => lead.place_id === selectedLeadId) ?? prospects[0];
  const record = selectedLead ? callRecordFor(callCenter.records, selectedLead.place_id) : null;
  const manualEligibility = selectedLead && record ? canStartManualCall(selectedLead, record) : { allowed: false, reason: 'Select a lead.' };
  const aiEligibility = selectedLead && record
    ? canStartAiCall(selectedLead, record, callCenter.settings)
    : { allowed: false, reason: 'Select a lead.' };
  const sortedHistory = useMemo(
    () => [...callCenter.history].sort((a, b) => b.startedAt.localeCompare(a.startedAt)).slice(0, 20),
    [callCenter.history]
  );
  const sortedAppointments = useMemo(
    () => [...callCenter.appointments].sort((a, b) => {
      if (a.status === 'scheduled' && b.status !== 'scheduled') return -1;
      if (a.status !== 'scheduled' && b.status === 'scheduled') return 1;
      return a.scheduledFor.localeCompare(b.scheduledFor);
    }).slice(0, 30),
    [callCenter.appointments]
  );

  function updateSettings(patch: Partial<CallCenterSettings>) {
    onUpdateCallCenter({ ...callCenter, settings: { ...callCenter.settings, ...patch } });
  }

  function updateRecord(patch: Partial<ProspectCallRecord>) {
    if (!selectedLead || !record) return;
    onUpdateCallCenter({
      ...callCenter,
      records: {
        ...callCenter.records,
        [selectedLead.place_id]: { ...record, ...patch }
      }
    });
  }

  function updateConsent(status: CallConsentStatus) {
    if (!record) return;
    const now = new Date().toISOString();
    const consent = {
      ...record.consent,
      status,
      capturedAt: status === 'written' ? record.consent.capturedAt ?? now : undefined,
      updatedAt: now
    };
    updateRecord({
      consent
    });
    if (status === 'do_not_call' && selectedLead) {
      onUpdateLead(selectedLead.place_id, { pipelineStatus: 'Do not contact' });
      onStatus(`${selectedLead.business_name} was added to the do-not-call list.`);
    }
    if ((status === 'do_not_call' || status === 'denied') && callCenter.settings.serviceBaseUrl.trim() && accessKey.trim()) {
      void syncConsent(consent).then(
        () => onStatus(`${selectedLead?.business_name ?? 'Lead'} was suppressed locally and on the voice service.`),
        () => onStatus(`${selectedLead?.business_name ?? 'Lead'} was suppressed locally; voice-service sync still needs attention.`)
      );
    }
  }

  function saveAccessKey(value: string) {
    setAccessKey(value);
    try {
      window.sessionStorage.setItem(ACCESS_KEY_STORAGE, value);
    } catch {
      // The key still remains in component memory when sessionStorage is unavailable.
    }
  }

  function authHeaders(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessKey}`
    };
  }

  async function readApiResponse(response: Response): Promise<Record<string, unknown>> {
    const body = await response.json().catch(() => ({})) as Record<string, unknown>;
    if (!response.ok) throw new Error(typeof body.error === 'string' ? body.error : `Voice service returned ${response.status}.`);
    return body;
  }

  async function testService() {
    if (!callCenter.settings.serviceBaseUrl.trim()) {
      onStatus('Add the deployed voice service URL first.');
      return;
    }
    setWorking(true);
    try {
      const response = await fetch(serviceUrl(callCenter.settings.serviceBaseUrl, '/api/health'));
      const body = await readApiResponse(response) as unknown as ServiceHealth;
      setServiceHealth(body);
      onStatus(body.configured.twilio && body.configured.openai ? 'Voice service is connected.' : 'Voice service responded, but provider credentials are incomplete.');
    } catch (error) {
      setServiceHealth(null);
      onStatus(error instanceof Error ? error.message : 'Voice service could not be reached.');
    } finally {
      setWorking(false);
    }
  }

  async function syncConsent(consent = record?.consent) {
    if (!selectedLead || !record) throw new Error('Select a lead first.');
    if (!consent) throw new Error('Consent record is unavailable.');
    const response = await fetch(serviceUrl(callCenter.settings.serviceBaseUrl, '/api/consents'), {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({
        prospectId: selectedLead.place_id,
        businessName: selectedLead.business_name,
        phone: normalizePhoneToE164(selectedLead.phone ?? ''),
        ...consent
      })
    });
    await readApiResponse(response);
  }

  async function syncOperatingSettingsRequest() {
    const response = await fetch(serviceUrl(callCenter.settings.serviceBaseUrl, '/api/settings'), {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(callCenter.settings)
    });
    await readApiResponse(response);
  }

  async function syncOperatingSettings() {
    if (!callCenter.settings.serviceBaseUrl.trim() || !accessKey.trim()) {
      onStatus('Add the voice service URL and session access key first.');
      return;
    }
    setWorking(true);
    try {
      await syncOperatingSettingsRequest();
      onStatus('Receptionist and outbound controls were saved to the voice service.');
    } catch (error) {
      onStatus(error instanceof Error ? error.message : 'Voice controls could not be saved.');
    } finally {
      setWorking(false);
    }
  }

  function logManualCall() {
    if (!selectedLead || !record || !manualEligibility.allowed) return;
    const now = new Date().toISOString();
    const historyItem: CallHistoryItem = {
      id: `manual-${Date.now()}`,
      prospectId: selectedLead.place_id,
      businessName: selectedLead.business_name,
      phone: normalizePhoneToE164(selectedLead.phone ?? '') ?? selectedLead.phone ?? '',
      direction: 'outbound',
      mode: 'human',
      status: 'dialer-opened',
      startedAt: now,
      updatedAt: now
    };
    onUpdateCallCenter({ ...callCenter, history: [historyItem, ...callCenter.history].slice(0, 500) });
    const pipelineStatus: PipelineStatus = selectedLead.pipelineStatus === 'New' || selectedLead.pipelineStatus === 'Researched'
      ? 'Contacted'
      : selectedLead.pipelineStatus;
    onUpdateLead(selectedLead.place_id, { pipelineStatus });
    onStatus(`Opened the dialer for ${selectedLead.business_name}.`);
  }

  async function startAiCall() {
    if (!selectedLead || !record || !aiEligibility.allowed) return;
    if (!callCenter.settings.serviceBaseUrl.trim() || !accessKey.trim()) {
      onStatus('Add the voice service URL and session access key before placing AI calls.');
      return;
    }
    const approved = window.confirm(
      `Place a consent-qualified AI call to ${selectedLead.business_name} at ${selectedLead.phone}? You are certifying that the written consent record is accurate.`
    );
    if (!approved) return;

    setWorking(true);
    try {
      await syncOperatingSettingsRequest();
      await syncConsent();
      const response = await fetch(serviceUrl(callCenter.settings.serviceBaseUrl, '/api/calls/outbound-ai'), {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ prospectId: selectedLead.place_id })
      });
      const body = await readApiResponse(response);
      const now = new Date().toISOString();
      const historyItem: CallHistoryItem = {
        id: typeof body.id === 'string' ? body.id : `ai-${Date.now()}`,
        prospectId: selectedLead.place_id,
        businessName: selectedLead.business_name,
        phone: normalizePhoneToE164(selectedLead.phone ?? '') ?? selectedLead.phone ?? '',
        direction: 'outbound',
        mode: 'ai',
        status: typeof body.status === 'string' ? body.status : 'queued',
        startedAt: now,
        updatedAt: now,
        providerCallSid: typeof body.providerCallSid === 'string' ? body.providerCallSid : undefined
      };
      onUpdateCallCenter({
        ...callCenter,
        records: {
          ...callCenter.records,
          [selectedLead.place_id]: {
            ...record,
            aiAttempts: record.aiAttempts + 1,
            lastAttemptAt: now,
            lastOutcome: historyItem.status
          }
        },
        history: [historyItem, ...callCenter.history].slice(0, 500)
      });
      onUpdateLead(selectedLead.place_id, { pipelineStatus: 'Contacted' });
      onStatus(`AI call queued for ${selectedLead.business_name}.`);
    } catch (error) {
      onStatus(error instanceof Error ? error.message : 'AI call could not be started.');
    } finally {
      setWorking(false);
    }
  }

  async function refreshHistory() {
    if (!callCenter.settings.serviceBaseUrl.trim() || !accessKey.trim()) {
      onStatus('Add the voice service URL and session access key first.');
      return;
    }
    setWorking(true);
    try {
      const [callsResponse, appointmentsResponse] = await Promise.all([
        fetch(serviceUrl(callCenter.settings.serviceBaseUrl, '/api/calls'), { headers: authHeaders() }),
        fetch(serviceUrl(callCenter.settings.serviceBaseUrl, '/api/appointments'), { headers: authHeaders() })
      ]);
      const callsBody = await readApiResponse(callsResponse);
      const appointmentsBody = await readApiResponse(appointmentsResponse);
      const history = Array.isArray(callsBody.calls) ? callsBody.calls as CallHistoryItem[] : [];
      const appointments = Array.isArray(appointmentsBody.appointments) ? appointmentsBody.appointments as CallbackAppointment[] : [];
      onUpdateCallCenter({ ...callCenter, history: history.slice(0, 500), appointments: appointments.slice(0, 500) });
      onStatus(`Loaded ${history.length} calls and ${appointments.filter((item) => item.status === 'scheduled').length} scheduled callbacks.`);
    } catch (error) {
      onStatus(error instanceof Error ? error.message : 'Call center activity could not be loaded.');
    } finally {
      setWorking(false);
    }
  }

  async function updateAppointmentStatus(appointment: CallbackAppointment, status: CallbackAppointmentStatus) {
    if (!callCenter.settings.serviceBaseUrl.trim() || !accessKey.trim()) {
      onStatus('Connect the voice service before changing an appointment.');
      return;
    }
    setWorking(true);
    try {
      const response = await fetch(serviceUrl(callCenter.settings.serviceBaseUrl, `/api/appointments/${encodeURIComponent(appointment.id)}/status`), {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ status })
      });
      const body = await readApiResponse(response);
      const updated = body.appointment as CallbackAppointment;
      onUpdateCallCenter({
        ...callCenter,
        appointments: callCenter.appointments.map((item) => item.id === appointment.id ? updated : item)
      });
      onStatus(`${appointment.contactName}'s callback was marked ${status}.`);
    } catch (error) {
      onStatus(error instanceof Error ? error.message : 'The callback could not be updated.');
    } finally {
      setWorking(false);
    }
  }

  function downloadAppointment(appointment: CallbackAppointment) {
    const filename = `launch-line-callback-${appointment.scheduledFor.slice(0, 10)}.ics`;
    downloadTextFile(filename, callbackCalendarContents(appointment), 'text/calendar;charset=utf-8');
    onStatus(`Calendar event created for ${appointment.contactName}.`);
  }

  if (!selectedLead || !record) {
    return <div className="empty-state"><h3>No lead selected</h3><p>Add or select a lead before opening the Call Center.</p></div>;
  }

  return (
    <div className="page-stack call-center-page">
      <section className="page-header split-header">
        <div>
          <p className="eyebrow">Call Center</p>
          <h2>Qualified conversations and booked human follow-ups</h2>
          <p>The AI can learn what a client needs, transfer high-intent callers, or confirm a callback appointment with the details a real person needs to continue.</p>
        </div>
        <div className="call-center-number">
          <span>Business line</span>
          <a href={phoneHref(callCenter.settings.businessPhone)}>{displayPhone(callCenter.settings.businessPhone)}</a>
        </div>
      </section>

      <div className="call-center-modes">
        <section className="panel mode-panel">
          <span className="mode-kicker">Inbound</span>
          <h3>AI receptionist</h3>
          <p>Answers callers, identifies itself as AI, captures the request, and offers a live transfer to {callCenter.settings.transferPhone ? displayPhone(callCenter.settings.transferPhone) : 'the human sales line'} or a scheduled human callback.</p>
          <label className="toggle-row">
            <input
              checked={callCenter.settings.receptionistEnabled}
              onChange={(event) => updateSettings({ receptionistEnabled: event.target.checked })}
              type="checkbox"
            />
            <span>Receptionist enabled</span>
          </label>
        </section>
        <section className="panel mode-panel">
          <span className="mode-kicker">Outbound</span>
          <h3>Consent-gated AI salesperson</h3>
          <p>Calls only after you approve the lead and document the source, evidence, and date of written consent.</p>
          <label className="toggle-row">
            <input
              checked={callCenter.settings.aiOutboundEnabled}
              onChange={(event) => updateSettings({ aiOutboundEnabled: event.target.checked })}
              type="checkbox"
            />
            <span>AI outbound enabled</span>
          </label>
        </section>
      </div>

      <section className="panel call-service-panel">
        <div className="section-heading">
          <p className="eyebrow">Secure service</p>
          <h2>Connect the hosted voice backend</h2>
        </div>
        <div className="form-grid call-service-grid">
          <label>
            Voice service URL
            <input
              onChange={(event) => updateSettings({ serviceBaseUrl: event.target.value })}
              placeholder="https://voice.example.com"
              type="url"
              value={callCenter.settings.serviceBaseUrl}
            />
          </label>
          <label>
            Session access key
            <input
              autoComplete="off"
              onChange={(event) => saveAccessKey(event.target.value)}
              placeholder="Stored for this browser session only"
              type="password"
              value={accessKey}
            />
          </label>
        </div>
        <div className="action-row">
          <button className="secondary-action" disabled={working} onClick={testService} type="button">Test service</button>
          <button className="secondary-action" disabled={working} onClick={refreshHistory} type="button">Refresh calls & callbacks</button>
          {serviceHealth ? (
            <span className={serviceHealth.configured.twilio && serviceHealth.configured.openai ? 'service-state ready' : 'service-state warning'}>
              Twilio {serviceHealth.configured.twilio ? 'ready' : 'setup needed'} / OpenAI {serviceHealth.configured.openai ? 'ready' : 'setup needed'}
            </span>
          ) : null}
        </div>
      </section>

      <div className="call-workspace-grid">
        <section className="panel call-lead-panel">
          <div className="section-heading">
            <p className="eyebrow">Call queue</p>
            <h2>Review the lead before dialing</h2>
          </div>
          <label>
            Selected business
            <select value={selectedLead.place_id} onChange={(event) => onSelectLead(event.target.value)}>
              {prospects.map((lead) => (
                <option key={lead.place_id} value={lead.place_id}>{lead.business_name} - {lead.city}</option>
              ))}
            </select>
          </label>
          <div className="selected-call-lead">
            <div>
              <span>Business</span>
              <strong>{selectedLead.business_name}</strong>
            </div>
            <div>
              <span>Phone</span>
              <strong>{selectedLead.phone || 'Missing'}</strong>
            </div>
            <div>
              <span>Priority</span>
              <strong>{selectedLead.scores.priority_score} / 100</strong>
            </div>
            <div>
              <span>Offer</span>
              <strong>{selectedLead.packageRecommendation.package}</strong>
            </div>
          </div>
          <div className="call-script">
            <span>Human opener</span>
            <p>{selectedLead.coldCallOpener}</p>
          </div>
          <div className="call-action-stack">
            <a
              aria-disabled={!manualEligibility.allowed}
              className={manualEligibility.allowed ? 'primary-action' : 'primary-action disabled-link'}
              href={manualEligibility.allowed ? phoneHref(selectedLead.phone ?? '') : undefined}
              onClick={manualEligibility.allowed ? logManualCall : (event) => event.preventDefault()}
            >
              Open human call
            </a>
            <small>{manualEligibility.reason}</small>
          </div>
        </section>

        <section className="panel consent-panel">
          <div className="section-heading">
            <p className="eyebrow">Consent gate</p>
            <h2>Document permission for AI calling</h2>
          </div>
          <div className="form-grid consent-grid">
            <label>
              Consent status
              <select value={record.consent.status} onChange={(event) => updateConsent(event.target.value as CallConsentStatus)}>
                {consentOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            </label>
            <label>
              Capture date
              <input
                disabled={record.consent.status !== 'written'}
                onChange={(event) => updateRecord({
                  consent: {
                    ...record.consent,
                    capturedAt: event.target.value ? new Date(`${event.target.value}T12:00:00`).toISOString() : undefined,
                    updatedAt: new Date().toISOString()
                  }
                })}
                type="date"
                value={dateInputValue(record.consent.capturedAt)}
              />
            </label>
            <label className="span-two">
              Consent source
              <input
                onChange={(event) => updateRecord({ consent: { ...record.consent, source: event.target.value, updatedAt: new Date().toISOString() } })}
                placeholder="Signed agreement, website callback form, recorded request"
                value={record.consent.source}
              />
            </label>
            <label className="span-two">
              Evidence note
              <textarea
                onChange={(event) => updateRecord({ consent: { ...record.consent, evidenceNote: event.target.value, updatedAt: new Date().toISOString() } })}
                placeholder="Where the permission is retained and exactly what the contact agreed to"
                value={record.consent.evidenceNote}
              />
            </label>
          </div>
          <div className="call-policy-summary">
            <span className={aiEligibility.allowed ? 'policy-dot ready' : 'policy-dot'} aria-hidden="true" />
            <p>{aiEligibility.reason}</p>
          </div>
          <button className="primary-action" disabled={!aiEligibility.allowed || working} onClick={startAiCall} type="button">
            Approve and place AI call
          </button>
        </section>
      </div>

      <section className="panel callback-panel">
        <div className="section-heading callback-heading">
          <div>
            <p className="eyebrow">Human follow-up</p>
            <h2>Scheduled callbacks</h2>
          </div>
          <span className="callback-count">{callCenter.appointments.filter((item) => item.status === 'scheduled').length} scheduled</span>
        </div>
        {sortedAppointments.length ? (
          <div className="table-wrap">
            <table className="prospect-table callback-table">
              <thead><tr><th>Appointment</th><th>Contact</th><th>Requested outcome</th><th>Status</th><th>Actions</th></tr></thead>
              <tbody>
                {sortedAppointments.map((appointment) => (
                  <tr key={appointment.id}>
                    <td><strong>{displayAppointmentTime(appointment)}</strong><small>{appointment.durationMinutes} minutes</small></td>
                    <td><strong>{appointment.contactName}</strong><small>{appointment.businessName}</small><small>{displayPhone(appointment.phone)}{appointment.email ? ` / ${appointment.email}` : ''}</small></td>
                    <td><strong>{appointment.needsSummary}</strong>{appointment.details ? <small>{appointment.details}</small> : null}</td>
                    <td><span className={`tag callback-status ${appointment.status}`}>{appointment.status}</span></td>
                    <td>
                      <div className="callback-actions">
                        <a className="secondary-action" href={phoneHref(appointment.phone)}>Call</a>
                        <button className="secondary-action" onClick={() => downloadAppointment(appointment)} type="button">Calendar</button>
                        {appointment.status === 'scheduled' ? (
                          <>
                            <button className="secondary-action" disabled={working} onClick={() => updateAppointmentStatus(appointment, 'completed')} type="button">Complete</button>
                            <button className="text-action" disabled={working} onClick={() => updateAppointmentStatus(appointment, 'cancelled')} type="button">Cancel</button>
                          </>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <div className="empty-state compact"><h3>No callbacks scheduled</h3><p>Appointments confirmed by the AI receptionist will appear here with the client's requested details.</p></div>}
      </section>

      <section className="panel call-rules-panel">
        <div className="section-heading">
          <p className="eyebrow">Operating controls</p>
          <h2>Receptionist and outbound safeguards</h2>
        </div>
        <div className="form-grid">
          <label>
            AI agent name
            <input value={callCenter.settings.agentName} onChange={(event) => updateSettings({ agentName: event.target.value })} />
          </label>
          <label>
            Human transfer number
            <input placeholder="Separate mobile or answering line" value={callCenter.settings.transferPhone} onChange={(event) => updateSettings({ transferPhone: event.target.value })} />
          </label>
          <label>
            Outbound start hour
            <input max="19" min="8" type="number" value={callCenter.settings.callWindowStart} onChange={(event) => updateSettings({ callWindowStart: Number(event.target.value) })} />
          </label>
          <label>
            Outbound end hour
            <input max="20" min="9" type="number" value={callCenter.settings.callWindowEnd} onChange={(event) => updateSettings({ callWindowEnd: Number(event.target.value) })} />
          </label>
          <label>
            Maximum AI attempts
            <input max="3" min="1" type="number" value={callCenter.settings.maxAiAttempts} onChange={(event) => updateSettings({ maxAiAttempts: Number(event.target.value) })} />
          </label>
          <label>
            Time zone
            <input value={callCenter.settings.timeZone} onChange={(event) => updateSettings({ timeZone: event.target.value })} />
          </label>
          <label>
            Callback days
            <select
              value={callbackDayPreset(callCenter.settings.callbackDays)}
              onChange={(event) => {
                const preset = callbackDayPresets.find((item) => item.value === event.target.value);
                if (preset) updateSettings({ callbackDays: preset.days });
              }}
            >
              {callbackDayPreset(callCenter.settings.callbackDays) === 'custom' ? <option value="custom">Custom server schedule</option> : null}
              {callbackDayPresets.map((preset) => <option key={preset.value} value={preset.value}>{preset.label}</option>)}
            </select>
          </label>
          <label>
            Callback length
            <select value={callCenter.settings.callbackDurationMinutes} onChange={(event) => updateSettings({ callbackDurationMinutes: Number(event.target.value) })}>
              {[15, 30, 45, 60].map((minutes) => <option key={minutes} value={minutes}>{minutes} minutes</option>)}
            </select>
          </label>
          <label>
            Callback start hour
            <input max="19" min="8" type="number" value={callCenter.settings.callbackWindowStart} onChange={(event) => updateSettings({ callbackWindowStart: Number(event.target.value) })} />
          </label>
          <label>
            Callback end hour
            <input max="20" min="9" type="number" value={callCenter.settings.callbackWindowEnd} onChange={(event) => updateSettings({ callbackWindowEnd: Number(event.target.value) })} />
          </label>
          <label className="span-two">
            Booking URL
            <input placeholder="https://calendly.com/..." type="url" value={callCenter.settings.bookingUrl} onChange={(event) => updateSettings({ bookingUrl: event.target.value })} />
          </label>
          <label className="span-two">
            Required AI disclosure
            <textarea value={callCenter.settings.aiDisclosure} onChange={(event) => updateSettings({ aiDisclosure: event.target.value })} />
          </label>
        </div>
        <div className="action-row call-rules-actions">
          <button className="secondary-action" disabled={working} onClick={syncOperatingSettings} type="button">Save controls to voice service</button>
          <span>Changes affect live inbound and outbound calls after this sync.</span>
        </div>
      </section>

      <section className="panel call-history-panel">
        <div className="section-heading">
          <p className="eyebrow">Call history</p>
          <h2>Recent call activity</h2>
        </div>
        {sortedHistory.length ? (
          <div className="table-wrap">
            <table className="prospect-table call-history-table">
              <thead><tr><th>Contact</th><th>Direction</th><th>Mode</th><th>Status</th><th>Started</th></tr></thead>
              <tbody>
                {sortedHistory.map((item) => (
                  <tr key={item.id}>
                    <td><strong>{item.businessName}</strong><small>{item.phone}</small></td>
                    <td>{item.direction}</td>
                    <td>{item.mode === 'ai' ? 'AI' : 'Human'}</td>
                    <td><span className="tag">{item.status}</span></td>
                    <td>{new Date(item.startedAt).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <div className="empty-state compact"><h3>No calls logged</h3><p>Human and AI call activity will appear here.</p></div>}
      </section>
    </div>
  );
}
