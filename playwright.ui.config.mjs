import { defineConfig, devices } from "@playwright/test"

import catalog from "./playwright.config.mjs"
import neet from "./playwright.neet.config.mjs"

// All data writes in these suites are intercepted. No live database is used.
export default defineConfig({
  testDir: "./e2e",
  outputDir: "test-results/ui-transformation",
  fullyParallel: true,
  workers: 3,
  retries: 0,
  reporter: "list",
  use: {
    baseURL: "http://127.0.0.1:4192",
    reducedMotion: "reduce",
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
  },
  webServer: {
    command:
      "npm run build:local && npm run preview --workspace studynotion-web -- --host 127.0.0.1 --port 4192",
    env: { ...process.env, VITE_API_BASE_URL: "/api/v1" },
    url: "http://127.0.0.1:4192",
    reuseExistingServer: false,
    timeout: 120000,
  },
  projects: [
    ...catalog.projects.map((project) => ({
      ...project,
      use: { ...project.use, reducedMotion: "reduce" },
      testMatch: ["catalog.spec.js", "learning.spec.js"],
    })),
    ...neet.projects.map((project) => ({
      ...project,
      use: { ...project.use, reducedMotion: "reduce" },
      testMatch: "project-neet.spec.js",
    })),
    ...[
      [
        "ui-desktop",
        {
          ...devices["Desktop Chrome"],
          viewport: { width: 1440, height: 1000 },
        },
      ],
      [
        "ui-mobile",
        { ...devices["Pixel 7"], viewport: { width: 390, height: 844 } },
      ],
      [
        "ui-tablet",
        {
          ...devices["Desktop Chrome"],
          viewport: { width: 820, height: 1180 },
        },
      ],
    ].map(([name, use]) => ({
      name,
      use: { ...use, reducedMotion: "reduce" },
      testMatch: "ui-transformation.spec.js",
    })),
  ],
})
