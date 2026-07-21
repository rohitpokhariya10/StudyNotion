import { configureStore } from "@reduxjs/toolkit"
import { setupListeners } from "@reduxjs/toolkit/query"

import rootReducer from "./reducer"
import { catalogApi } from "./services/catalogApi"

export const store = configureStore({
  reducer: rootReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(catalogApi.middleware),
  devTools: import.meta.env.DEV,
})

setupListeners(store.dispatch)
