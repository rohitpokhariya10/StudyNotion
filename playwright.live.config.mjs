import { defineConfig, devices } from "@playwright/test"

const localChrome = process.env.CI ? {} : { channel: "chrome" }

export default defineConfig({
  testDir: "./e2e",
  testMatch: "live-stack.spec.js",
  globalSetup: "./e2e/live-global-setup.js",
  outputDir: "test-results/playwright-live",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: "list",
  use: {
    baseURL: process.env.STUDYNOTION_LIVE_BASE_URL || "http://127.0.0.1:3000",
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
    video: "off",
  },
  projects: [
    {
      name: "live-desktop",
      use: { ...devices["Desktop Chrome"], ...localChrome },
    },
    {
      name: "live-mobile",
      use: { ...devices["Pixel 7"], ...localChrome },
    },
  ],
})
