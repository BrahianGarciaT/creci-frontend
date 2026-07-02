import { Routes } from '@angular/router';
import { TasksComponent } from './tasks.component';

// Rutas del módulo de tareas — lazy-loaded desde app.routes.ts
export const TASKS_ROUTES: Routes = [{ path: '', component: TasksComponent }];
