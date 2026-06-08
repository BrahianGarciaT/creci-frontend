# Project conventions — Frontend (Angular)

## Git repository
This app has its **own independent git repository** rooted at `apps/frontend/`.
- All git commands must run from `apps/frontend/` (or deeper), never from the monorepo root.
- Never run `git` from `d:/proyects/creci-app` — there is no git repo there.
- Branches, commits, and PRs belong to this repo only.

## Language
- All code (variables, functions, classes, files, folders) in **English**
- Comments and documentation directed at the development team in **Spanish**

## Code style
- Variables and functions: `camelCase`
- Classes, interfaces, components, services: `PascalCase`
- Files: `kebab-case` (e.g. `user-profile.component.ts`, `auth.service.ts`)
- Constants: `UPPER_SNAKE_CASE`

## Component structure
Each feature follows this flat structure inside `features/`:
```
src/
└── features/
    └── users/
        ├── users.component.ts
        ├── users.component.html
        ├── users.component.scss
        ├── users.service.ts
        └── users.spec.ts
```

Shared elements go in:
```
src/
├── core/          ← guards, interceptors, auth service
├── shared/        ← reusable components, pipes, directives
└── features/      ← one folder per feature
```

## Angular patterns
- Standalone components only (no NgModules)
- Signals for local state (`signal()`, `computed()`, `effect()`)
- `inject()` for dependency injection, never constructor injection
- `input()` and `output()` functions, never `@Input()` / `@Output()` decorators
- Zoneless change detection (`provideZonelessChangeDetection()`)
- Native control flow (`@if`, `@for`, `@switch`), never `*ngIf` / `*ngFor`
- `OnPush` change detection strategy on all components

## Authentication
- JWT stored in `httpOnly` cookie (handled by the backend)
- Auth state managed via a signal-based `AuthService` in `core/`
- Auth guard using `CanActivateFn` functional guard
- HTTP interceptor to attach token and handle 401 responses

## HTTP communication
- All API calls via Angular `HttpClient` inside services, never in components
- Base URL from environment variables
- Handle errors in services, surface them to components via signals or observables
- Use `resource()` or `httpResource()` for data fetching where applicable

## Environment variables
- Use `src/environments/environment.ts` and `environment.production.ts`
- Never hardcode API URLs or keys in components or services

## Testing
- Framework: Vitest (native Angular 21 integration)
- One `.spec.ts` file per component and service, colocated in the same folder
- Use `@testing-library/angular` for component tests
- Test behavior, not implementation details

## General rules
- Components only handle presentation and user interaction
- Business logic and API calls live in services
- Keep templates simple: no complex logic in HTML
- Always use `async`/`await` for asynchronous operations
- Enable strict mode in TypeScript
- SCSS for all component styles, no inline styles
