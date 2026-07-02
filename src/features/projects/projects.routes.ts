import { Routes } from '@angular/router';
import { ProjectsComponent } from './projects.component';

// Rutas del módulo de proyectos — lazy-loaded desde app.routes.ts
export const PROJECTS_ROUTES: Routes = [{ path: '', component: ProjectsComponent }];
