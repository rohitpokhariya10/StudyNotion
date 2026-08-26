import rootReducer from "@/app/store/rootReducer"
import { catalogApi } from "@/entities/catalog"
import { learningApi } from "@/entities/learning"
import { setSession } from "@/entities/user"
import { installSessionResponseIntegration } from "@/features/authentication"
import { configureStore } from "@reduxjs/toolkit"
import { setupListeners } from "@reduxjs/toolkit/query"

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
