import { store as defaultStore } from "@/app/store"
import ErrorBoundary from "@/shared/ui/ErrorBoundary"
import { Toaster } from "react-hot-toast"
import { Provider } from "react-redux"
import { BrowserRouter } from "react-router"

function AppProviders({ children, store = defaultStore }) {
  return (
    <Provider store={store}>
      <BrowserRouter>
        <ErrorBoundary scope="application">{children}</ErrorBoundary>
        <Toaster position="top-center" />
      </BrowserRouter>
    </Provider>
  )
}

export default AppProviders
