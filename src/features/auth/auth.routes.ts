import { Routes } from '@angular/router';
import { LoginComponent } from './login/login.component';

// Rutas de la feature de autenticación (lazy-loaded desde app.routes.ts)
export const AUTH_ROUTES: Routes = [
  {
    path: '',
    component: LoginComponent,
  },
];
