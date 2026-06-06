import { Component, inject } from '@angular/core';
import { Routes } from '@angular/router';
import { AuthService } from '../core/services/auth.service';
import { authGuard } from '../core/guards/auth.guard';
import { noAuthGuard } from '../core/guards/no-auth.guard';
import { adminGuard } from '../core/guards/admin.guard';

// Componente placeholder para el dashboard — se reemplazará en una PR futura
@Component({
  standalone: true,
  template: `
    <div style="color: white; padding: 2rem; display: flex; flex-direction: column; gap: 1rem; align-items: flex-start;">
      <p>Dashboard — próximamente</p>
      <button (click)="logout()" style="padding: 0.5rem 1.5rem; background: #ef4444; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 0.9rem;">
        Cerrar sesión
      </button>
    </div>
  `,
})
class DashboardPlaceholderComponent {
  private auth = inject(AuthService);

  logout() {
    this.auth.logout();
  }
}

export const routes: Routes = [
  // Redirección por defecto a /login
  { path: '', redirectTo: '/login', pathMatch: 'full' },

  // Ruta de autenticación cargada de forma lazy
  {
    path: 'login',
    canActivate: [noAuthGuard],
    loadChildren: () =>
      import('../features/auth/auth.routes').then((m) => m.AUTH_ROUTES),
  },

  // Ruta protegida del dashboard — componente stub hasta la PR del dashboard
  {
    path: 'dashboard',
    component: DashboardPlaceholderComponent,
    canActivate: [authGuard],
  },

  // Ruta de administración de usuarios — solo accesible para admins
  {
    path: 'users',
    canActivate: [authGuard, adminGuard],
    loadChildren: () =>
      import('../features/users/users.routes').then((m) => m.USERS_ROUTES),
  },
];
