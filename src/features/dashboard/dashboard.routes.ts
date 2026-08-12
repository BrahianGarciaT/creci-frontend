import { Routes } from '@angular/router';
import { DashboardOverviewComponent } from './dashboard-overview.component';
import { ProjectDashboardComponent } from './project-dashboard.component';

// Rutas del módulo de dashboard — lazy-loaded desde app.routes.ts.
// Nivel 1 (`''`) y Nivel 2 (`projects/:id`) comparten el mismo shell
// `authGuard`-protegido; el `id` del proyecto llega a `ProjectDashboardComponent`
// vía `withComponentInputBinding()` (provisto en `app.config.ts` desde PR1).
export const DASHBOARD_ROUTES: Routes = [
  { path: '', component: DashboardOverviewComponent },
  { path: 'projects/:id', component: ProjectDashboardComponent },
];
