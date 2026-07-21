import { defineConfig, devices } from "@playwright/test"

const localChrome = process.env.CI ? {} : { channel: "chrome" }
const e2eApiBaseUrl =
  process.env.VITE_API_BASE_URL || "http://127.0.0.1:4000/api/v1"

export default defineConfig({
  testDir: "./e2e",
  outputDir: "test-results/playwright",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? [["html", { open: "never" }], ["list"]] : "list",
  use: {
    baseURL: "http://127.0.0.1:4173",
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
    video: "off",
  },
  webServer: {
    command: "npm run e2e:serve",
    env: { ...process.env, VITE_API_BASE_URL: e2eApiBaseUrl },
    url: "http://127.0.0.1:4173",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
  projects: [
    {
      name: "catalog-desktop",
      use: { ...devices["Desktop Chrome"], ...localChrome },
    },
    {
      name: "catalog-mobile",
      use: { ...devices["Pixel 7"], ...localChrome },
    },
  ],
})
