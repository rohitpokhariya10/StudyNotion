import "../App.css"

import SessionBootstrap from "../features/session/SessionBootstrap"
import AppShell from "../widgets/app-shell/AppShell"
import AppRouter from "./router/AppRouter"

function App() {
  return (
    <SessionBootstrap>
      <AppShell>
        <AppRouter />
      </AppShell>
    </SessionBootstrap>
  )
}

export default App
