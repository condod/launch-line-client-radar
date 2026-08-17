import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { CallData, RuntimeVoiceSettings } from './types.js';

function newData(settings: RuntimeVoiceSettings): CallData {
  return {
    version: 2,
    settings,
    consents: {},
    calls: [],
    appointments: [],
    contexts: {},
    handledWebhookIds: []
  };
}

export class CallStore {
  private queue: Promise<void> = Promise.resolve();

  constructor(private readonly filePath: string, private readonly defaults: RuntimeVoiceSettings) {}

  private async loadUnsafe(): Promise<CallData> {
    try {
      const parsed = JSON.parse(await readFile(this.filePath, 'utf8')) as Partial<CallData>;
      return {
        ...newData(this.defaults),
        ...parsed,
        version: 2,
        settings: { ...this.defaults, ...parsed.settings },
        consents: parsed.consents && typeof parsed.consents === 'object' ? parsed.consents : {},
        calls: Array.isArray(parsed.calls) ? parsed.calls.slice(0, 1000) : [],
        appointments: Array.isArray(parsed.appointments) ? parsed.appointments.slice(0, 1000) : [],
        contexts: parsed.contexts && typeof parsed.contexts === 'object' ? parsed.contexts : {},
        handledWebhookIds: Array.isArray(parsed.handledWebhookIds) ? parsed.handledWebhookIds.slice(-500) : []
      };
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
      return newData(this.defaults);
    }
  }

  private async saveUnsafe(data: CallData): Promise<void> {
    await mkdir(path.dirname(this.filePath), { recursive: true });
    await writeFile(this.filePath, `${JSON.stringify(data, null, 2)}\n`, { encoding: 'utf8', mode: 0o600 });
  }

  async read(): Promise<CallData> {
    await this.queue;
    return structuredClone(await this.loadUnsafe());
  }

  async update<T>(mutator: (data: CallData) => T | Promise<T>): Promise<T> {
    let result!: T;
    const work = this.queue.then(async () => {
      const data = await this.loadUnsafe();
      result = await mutator(data);
      data.calls = data.calls.slice(0, 1000);
      data.appointments = data.appointments.slice(0, 1000);
      data.handledWebhookIds = data.handledWebhookIds.slice(-500);
      const cutoff = Date.now() - 24 * 60 * 60 * 1000;
      data.contexts = Object.fromEntries(Object.entries(data.contexts).filter(([, context]) => new Date(context.createdAt).getTime() >= cutoff));
      await this.saveUnsafe(data);
    });
    this.queue = work.then(() => undefined, () => undefined);
    await work;
    return result;
  }
}
