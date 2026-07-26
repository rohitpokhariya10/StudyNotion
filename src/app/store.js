import { configureStore } from "@reduxjs/toolkit"
import { setupListeners } from "@reduxjs/toolkit/query"

import { catalogApi } from "../entities/catalog/api/catalogApi"
import { installSessionResponseIntegration } from "../features/session/model/sessionResponseIntegration"
import rootReducer from "../reducer"

export const store = configureStore({
  reducer: rootReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(catalogApi.middleware),
  devTools: import.meta.env.DEV,
})

installSessionResponseIntegration(store)
setupListeners(store.dispatch)
