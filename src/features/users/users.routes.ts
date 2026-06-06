import { Routes } from '@angular/router';
import { UsersComponent } from './users.component';

// Rutas del módulo de usuarios — lazy-loaded desde app.routes.ts
export const USERS_ROUTES: Routes = [{ path: '', component: UsersComponent }];
