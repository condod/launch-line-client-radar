import { existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { chromium } from 'playwright-core';

const root = resolve(import.meta.dirname, '..');
const executablePath = [
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe'
].find(existsSync);

if (!executablePath) throw new Error('Chrome or Edge is required for browser QA.');

const target = process.env.QA_URL || 'http://127.0.0.1:4191/#calls';
const viewports = [
  { name: 'mobile', width: 390, height: 844 },
  { name: 'ipad-portrait', width: 768, height: 1024 },
  { name: 'ipad-landscape', width: 1024, height: 768 },
  { name: 'desktop', width: 1440, height: 1000 }
];

const browser = await chromium.launch({ executablePath, headless: true });
const report = [];

try {
  for (const viewport of viewports) {
    const context = await browser.newContext({ viewport, deviceScaleFactor: 1 });
    const page = await context.newPage();
    const browserErrors = [];
    page.on('console', (message) => {
      if (message.type() === 'error') browserErrors.push(message.text());
    });
    page.on('pageerror', (error) => browserErrors.push(error.message));

    await page.goto(target, { waitUntil: 'networkidle', timeout: 20_000 });
    await page.waitForSelector('.call-center-page', { state: 'visible' });
    const metrics = await page.evaluate(() => {
      const visible = (element) => {
        const style = getComputedStyle(element);
        const rect = element.getBoundingClientRect();
        return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0;
      };
      const controls = [...document.querySelectorAll('button, a.primary-action, input:not([type="checkbox"]), select, textarea')]
        .filter(visible)
        .map((element) => {
          const rect = element.getBoundingClientRect();
          return { label: (element.textContent || element.getAttribute('aria-label') || element.getAttribute('placeholder') || element.tagName).trim().slice(0, 60), height: rect.height };
        });
      return {
        title: document.title,
        callCenterVisible: document.body.innerText.includes('Human-approved outreach and an inbound AI receptionist'),
        transferNumberVisible: document.body.innerText.includes('(941) 735-2514'),
        horizontalOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        shortControls: controls.filter((control) => control.height < 43.5),
        controlCount: controls.length
      };
    });

    await page.screenshot({ path: join(root, `qa-call-${viewport.name}.png`), fullPage: false });
    report.push({ ...viewport, ...metrics, browserErrors });
    await context.close();
  }
} finally {
  await browser.close();
}

const failures = report.filter((item) => !item.callCenterVisible || !item.transferNumberVisible || item.horizontalOverflow > 1 || item.shortControls.length || item.browserErrors.length);
console.log(JSON.stringify(report, null, 2));
if (failures.length) throw new Error(`Browser QA failed for: ${failures.map((item) => item.name).join(', ')}`);
