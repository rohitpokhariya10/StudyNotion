import { defineConfig, devices } from "@playwright/test"

import liveEnvironmentResolver from "./e2e/live-environment.cjs"

const localChrome = process.env.CI ? {} : { channel: "chrome" }
const { resolveLiveEnvironment } = liveEnvironmentResolver
const liveEnvironment = resolveLiveEnvironment()

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
    baseURL: liveEnvironment.baseURL,
    screenshot: "only-on-failure",
    trace: liveEnvironment.loopback ? "retain-on-failure" : "off",
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
    {
      name: "live-webkit",
      use: { ...devices["Desktop Safari"] },
    },
  ],
})
