import { chromium } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import { testServiceVan } from './service-van.browser.mjs';

const browser = await chromium.launch({ channel: 'chrome', headless: true,
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
try {
  await mkdir('.test-artifacts', { recursive: true });
  await testServiceVan(browser, process.env.TEST_BASE_URL || 'http://127.0.0.1:5173/');
} finally { await browser.close(); }
