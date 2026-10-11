import { defineConfig, devices } from "@playwright/test"

export default defineConfig({
  testDir: "./e2e",
  testMatch: ["project-neet.spec.js", "neet-landing.spec.js"],
  outputDir: "test-results/neet-landing",
  reporter: "list",
  workers: 1,
  timeout: 45_000,
  retries: 0,
  use: {
    baseURL: "http://127.0.0.1:4173",
    channel: process.env.CI ? undefined : "chrome",
    contextOptions: { reducedMotion: "reduce" },
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
  },
  webServer: {
    command: "npm run e2e:serve",
    env: { ...process.env, VITE_API_BASE_URL: "http://127.0.0.1:4100/api/v1" },
    url: "http://127.0.0.1:4173",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
  projects: [
    { name: "neet-desktop", use: { viewport: { width: 1440, height: 900 } } },
    { name: "neet-tablet", use: { viewport: { width: 820, height: 1180 } } },
    {
      name: "neet-mobile",
      use: { ...devices["Pixel 7"], viewport: { width: 390, height: 844 } },
    },
  ],
})
