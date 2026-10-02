import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir:'./tests',workers:1,timeout:60000,
  use:{baseURL:process.env.PREVIEW_URL||'http://127.0.0.1:4180',viewport:{width:1440,height:1000},reducedMotion:'reduce',trace:'retain-on-failure'},
});
