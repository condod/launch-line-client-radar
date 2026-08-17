# Launch Line Voice Setup

The voice system has three live workflows:

- **Inbound AI receptionist:** callers reach `941-780-3258` and Twilio routes the call to OpenAI Realtime over SIP. After the caller shows buying intent and agrees to connect, the agent transfers the live call to `941-735-2514`.
- **Consent-gated AI outbound:** an operator documents written consent, approves one lead in Call Center, and the backend places one policy-checked call. Leads without written consent remain human click-to-call only.
- **Human callback scheduling:** the AI asks one question at a time, captures the contact, business need, desired result, current process, urgency, and constraints, then confirms an available callback time. Confirmed appointments are stored by the voice service and appear in Call Center.

The GitHub Pages app never receives Twilio or OpenAI secrets. It sends approved control requests to the separately hosted Node service using a session-only access key.

## 1. Put the business line under Twilio control

`941-780-3258` can receive the AI receptionist only after one of these is complete:

1. Port `941-780-3258` into Twilio. This is the cleanest option because the public number remains unchanged.
2. Buy a Twilio voice number and enable unconditional forwarding from `941-780-3258` through the current carrier.

Set `TWILIO_PHONE_NUMBER` to the Twilio-owned or ported E.164 number. Do not assume that entering a non-Twilio number in `.env` gives Twilio permission to use it.

In the Twilio number's **Voice configuration**, set the incoming call webhook to:

```text
POST https://YOUR_VOICE_HOST/webhooks/twilio/inbound
```

## 2. Configure the OpenAI project

1. Create a dedicated OpenAI API project and server-side API key.
2. Copy the project ID beginning with `proj_`.
3. Create a project webhook subscribed to `realtime.call.incoming`:

```text
https://YOUR_VOICE_HOST/webhooks/openai
```

4. Save the webhook signing secret beginning with `whsec_`; it is used to reject forged webhook requests.

OpenAI's official SIP flow sends Twilio calls to `sip:$PROJECT_ID@sip.api.openai.com;transport=tls`, then fires the signed incoming-call webhook so this service can accept the call with the Launch Line instructions.

## 3. Deploy the Node service

The included `render.yaml` defines a persistent single-instance Node deployment. Equivalent Node hosts are acceptable if they provide HTTPS, a stable public URL, and persistent storage.

Required environment variables:

```text
PUBLIC_BASE_URL=https://YOUR_VOICE_HOST
DASHBOARD_ORIGINS=https://condod.github.io,http://127.0.0.1:4191
DASHBOARD_API_KEY=GENERATE_A_LONG_RANDOM_SECRET
BUSINESS_PHONE_E164=+19417803258
HUMAN_TRANSFER_PHONE_E164=+19417352514
TWILIO_ACCOUNT_SID=AC...
TWILIO_AUTH_TOKEN=...
TWILIO_PHONE_NUMBER=+1...
OPENAI_API_KEY=sk-...
OPENAI_PROJECT_ID=proj_...
OPENAI_WEBHOOK_SECRET=whsec_...
OPENAI_REALTIME_MODEL=gpt-realtime-2.1-mini
CALL_DATA_FILE=/var/data/call-center.json
```

Build and start commands:

```powershell
npm.cmd ci
npm.cmd run build:server
npm.cmd run server:start
```

Use one service instance with the JSON store. Move consent and call records to a managed database before horizontal scaling or multi-user resale.

## 4. Connect Client Radar

1. Open **Call Center** in the live app.
2. Enter the deployed voice service URL.
3. Enter `DASHBOARD_API_KEY`; it stays in browser `sessionStorage` and is excluded from exports.
4. Select **Test service**.
5. Configure the agent, transfer number, calling window, callback days/hours, callback length, disclosure, and attempt limit.
6. Select **Save controls to voice service**.

The configured handoff line is `941-735-2514`. Keep it separate from the Twilio-controlled AI business line at `941-780-3258` to prevent routing loops.

The built-in callback book is authoritative until an external calendar integration is added. It rejects overlaps, times outside the configured schedule, ambiguous date-times without a UTC offset, appointments with less than 30 minutes notice, and appointments more than 180 days ahead. The Call Center can export any appointment as an `.ics` calendar event and mark it completed or cancelled.

## 5. Safe live test

1. Call the Twilio-controlled business number from a phone you own and verify the AI disclosure and human-transfer request.
2. Ask for a callback, explain a fictional business need, confirm a weekday time, and verify the appointment appears in **Scheduled callbacks** with the correct phone number and details.
3. Try the same time again and verify the AI offers a different available slot instead of double-booking.
4. Create a test prospect using another number you own.
5. Record test written-consent evidence, enable AI outbound, and approve one call.
6. Say "do not call me again" and verify the server call history shows `do-not-call`.
7. Confirm that a second AI attempt inside 24 hours is rejected.

Do not test by calling an unrelated business. This implementation intentionally has no bulk dialer, no scraped-number auto-dial path, and no call recording.

## Provider References

- [OpenAI Realtime SIP guide](https://developers.openai.com/api/docs/guides/realtime-sip)
- [OpenAI webhook verification](https://developers.openai.com/api/docs/guides/webhooks)
- [Twilio Calls API](https://www.twilio.com/docs/voice/api/call-resource)
- [Twilio SIP custom headers](https://www.twilio.com/docs/voice/twiml/sip)
