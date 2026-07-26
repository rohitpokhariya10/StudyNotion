# Widgets

Widgets compose reusable page regions from features, entities, and shared UI.
They do not issue network requests or own domain state.

`app-shell/AppShell.jsx` preserves the current Navbar, route error boundary,
Suspense fallback, and page layout. The Navbar remains a legacy component edge
until navigation is migrated as a separate reviewed slice.
