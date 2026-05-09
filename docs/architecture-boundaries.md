# Architecture Boundaries

## Route Loading

- Keep page modules route-lazy through `src/App.tsx`.
- Keep shared shell providers, auth guards, and small UI primitives in the app shell.
- Feature-heavy widgets that are optional on a page, such as AI controls, should use their own `Suspense` boundary so the route stays visible while the widget chunk loads.

## Domain Imports

- Avoid mixing static and dynamic imports for large domain modules in the same dependency path.
- If a module already imports `@/lib/operationsDomain` statically, import additional helpers from it statically too.
- Use dynamic imports for genuinely optional feature paths only, not as a partial split inside a module that already has static domain imports.

## Feature Scope

- Keep deal, shipment, finance, and purchase-request intelligence helpers under their feature/domain folders.
- Avoid importing dashboard-only feature modules from public pages unless the page explicitly renders that feature.
