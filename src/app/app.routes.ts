import { Routes } from '@angular/router';
import { authGuard } from '../core/guards/auth.guard';
import { noAuthGuard } from '../core/guards/no-auth.guard';
import { adminGuard } from '../core/guards/admin.guard';
import { ShellComponent } from '../core/layout/shell/shell.component';
import { DashboardPlaceholderComponent } from '../features/dashboard/dashboard-placeholder.component';

export const routes: Routes = [
  // Default redirect to login
  { path: '', redirectTo: '/login', pathMatch: 'full' },

  // Authentication route — lazy loaded, accessible only when NOT authenticated
  {
    path: 'login',
    canActivate: [noAuthGuard],
    loadChildren: () =>
      import('../features/auth/auth.routes').then((m) => m.AUTH_ROUTES),
  },

  // Authenticated shell — parent route guards all children
  {
    path: '',
    component: ShellComponent,
    canActivate: [authGuard],
    children: [
      {
        path: 'dashboard',
        component: DashboardPlaceholderComponent,
      },
      {
        path: 'users',
        canActivate: [adminGuard],
        loadChildren: () =>
          import('../features/users/users.routes').then((m) => m.USERS_ROUTES),
      },
    ],
  },
];
