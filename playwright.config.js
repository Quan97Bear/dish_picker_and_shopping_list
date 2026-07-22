import { defineConfig, devices } from '@playwright/test';
export default defineConfig({ testDir:'tests', testMatch:'e2e.spec.js', use:{ baseURL:'http://127.0.0.1:4173', ...devices['iPhone 13'] }, webServer:{ command:'./node_modules/.bin/vite preview --host 127.0.0.1', port:4173, reuseExistingServer:true } });
