import { Component } from '@angular/core';
import { Routes } from '@angular/router';
import { authGuard } from '../core/guards/auth.guard';

// Componente placeholder para el dashboard — se reemplazará en una PR futura
@Component({
  standalone: true,
  template: `<p style="color: white; padding: 2rem;">Dashboard — próximamente</p>`,
})
class DashboardPlaceholderComponent {}

export const routes: Routes = [
  // Redirección por defecto a /login
  { path: '', redirectTo: '/login', pathMatch: 'full' },

  // Ruta de autenticación cargada de forma lazy
  {
    path: 'login',
    loadChildren: () =>
      import('../features/auth/auth.routes').then((m) => m.AUTH_ROUTES),
  },

  // Ruta protegida del dashboard — componente stub hasta la PR del dashboard
  {
    path: 'dashboard',
    component: DashboardPlaceholderComponent,
    canActivate: [authGuard],
  },
];
