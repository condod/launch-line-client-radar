import { loadConfig } from './config.js';
import { createVoiceApp } from './app.js';

const config = loadConfig();
const app = createVoiceApp(config);

const server = app.listen(config.port, '0.0.0.0', () => {
  console.log(`Launch Line voice service listening on port ${config.port}.`);
});

function shutdown(signal: string) {
  console.log(`${signal} received; closing the voice service.`);
  server.close(() => process.exit(0));
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

