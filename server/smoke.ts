import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createVoiceApp } from './app.js';
import { loadConfig } from './config.js';

const directory = await mkdtemp(path.join(os.tmpdir(), 'launch-line-voice-'));
const config = loadConfig({
  PORT: '0',
  CALL_DATA_FILE: path.join(directory, 'call-center.json'),
  BUSINESS_PHONE_E164: '+19417803258',
  DASHBOARD_API_KEY: 'smoke-test-key',
  TWILIO_VALIDATE_WEBHOOKS: 'false'
});
const app = createVoiceApp(config);
const server = app.listen(0, '127.0.0.1');

try {
  await new Promise<void>((resolve, reject) => {
    server.once('listening', resolve);
    server.once('error', reject);
  });
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('Smoke server did not expose a TCP port.');
  const response = await fetch(`http://127.0.0.1:${address.port}/api/health`);
  const body = await response.json() as { ok?: boolean; businessPhone?: string };
  if (!response.ok || body.ok !== true || body.businessPhone !== '+19417803258') throw new Error('Voice health response was invalid.');
  const unauthorized = await fetch(`http://127.0.0.1:${address.port}/api/calls`);
  if (unauthorized.status !== 401) throw new Error('Voice control endpoint did not enforce authentication.');
  const authorized = await fetch(`http://127.0.0.1:${address.port}/api/calls`, {
    headers: { Authorization: 'Bearer smoke-test-key' }
  });
  if (!authorized.ok) throw new Error('Voice control endpoint rejected valid authentication.');
  console.log('Voice service smoke check passed.');
} finally {
  await new Promise<void>((resolve) => server.close(() => resolve()));
  await rm(directory, { recursive: true, force: true });
}
