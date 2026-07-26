import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: 'tests',
  testMatch: 'e2e.spec.js',
  projects: [
    {
      name: 'mobile-chromium',
      use: {
        ...devices['iPhone 13'],
        browserName: 'chromium',
        baseURL: 'http://127.0.0.1:4173'
      }
    },
    {
      // The product is used on iPhone Safari. mobile-chromium only borrows the
      // iPhone viewport and UA -- the engine is Blink, so it cannot reproduce
      // WebKit compositing, focus or scroll behaviour. Run both, always: adding
      // this project immediately surfaced two defects every Chromium run had
      // passed, including a stepper focus requirement that had never actually
      // held on the target platform.
      name: 'mobile-webkit',
      use: {
        ...devices['iPhone 13'],
        browserName: 'webkit',
        baseURL: 'http://127.0.0.1:4173'
      }
    }
  ],
  webServer: {
    command: './node_modules/.bin/vite preview --host 127.0.0.1',
    port: 4173,
    reuseExistingServer: true
  }
});
