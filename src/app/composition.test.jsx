import { describe, expect, it } from "vitest"

import LegacyApp from "../App"
import LegacyErrorBoundary from "../components/Common/ErrorBoundary"
import LegacyButton from "../components/ui/Button"
import { catalogApi } from "../entities/catalog/api/catalogApi"
import { learningApi } from "../entities/learning/api/learningApi"
import * as legacyHttpClient from "../services/apiConnector"
import * as legacyEndpoints from "../services/apis"
import * as legacyCatalog from "../services/catalogApi"
import * as sharedEndpoints from "../shared/api/endpoints"
import * as sharedHttpClient from "../shared/api/httpClient"
import Button from "../shared/ui/Button"
import ErrorBoundary from "../shared/ui/ErrorBoundary"
import { store as legacyStore } from "../store"
import App from "./App"
import { store } from "./store"

describe("frontend composition compatibility", () => {
  it("keeps the legacy application, store, and shared UI imports stable", () => {
    expect(LegacyApp).toBe(App)
    expect(legacyStore).toBe(store)
    expect(LegacyErrorBoundary).toBe(ErrorBoundary)
    expect(LegacyButton).toBe(Button)
  })

  it("keeps legacy API modules wired to the new shared and entity owners", () => {
    expect(legacyHttpClient.apiConnector).toBe(sharedHttpClient.apiConnector)
    expect(legacyHttpClient.axiosInstance).toBe(sharedHttpClient.axiosInstance)
    expect(legacyHttpClient.SESSION_RESPONSE_SIGNALS).toBe(
      sharedHttpClient.SESSION_RESPONSE_SIGNALS
    )
    expect(legacyEndpoints.endpoints).toBe(sharedEndpoints.endpoints)
    expect(legacyEndpoints.courseEndpoints).toBe(
      sharedEndpoints.courseEndpoints
    )
    expect(legacyCatalog.catalogApi).toBe(catalogApi)
  })

  it("preserves every Redux reducer key", () => {
    expect(Object.keys(store.getState())).toEqual([
      "auth",
      "profile",
      "course",
      "cart",
      "viewCourse",
      "catalogApi",
      "learningApi",
    ])
    expect(store.getState().learningApi).toBeDefined()
    expect(learningApi.reducerPath).toBe("learningApi")
  })
})
