import { configureStore } from "@reduxjs/toolkit"
import { setupListeners } from "@reduxjs/toolkit/query"

import { catalogApi } from "../entities/catalog/api/catalogApi"
import { learningApi } from "../entities/learning/api/learningApi"
import { installSessionResponseIntegration } from "../features/session/model/sessionResponseIntegration"
import rootReducer from "../reducer"
import { setSession } from "../slices/authSlice"

const resetLearningCacheOnSessionEnd =
  ({ dispatch }) =>
  (next) =>
  (action) => {
    const result = next(action)

    if (setSession.match(action) && !action.payload) {
      dispatch(learningApi.util.resetApiState())
    }

    return result
  }

export const store = configureStore({
  reducer: rootReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(
      catalogApi.middleware,
      learningApi.middleware,
      resetLearningCacheOnSessionEnd
    ),
  devTools: import.meta.env.DEV,
})

installSessionResponseIntegration(store)
setupListeners(store.dispatch)
