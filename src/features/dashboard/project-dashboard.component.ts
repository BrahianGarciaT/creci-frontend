import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { httpResource } from '@angular/common/http';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatIconModule } from '@angular/material/icon';
import { environment } from '../../environments/environment';
import { ProjectDashboardDto } from './dashboard.types';
import { StatusBreakdownComponent } from './status-breakdown.component';
import { WorkloadTableComponent } from './workload-table.component';
import { OverdueListComponent } from './overdue-list.component';
import { TrendChartComponent } from '../../shared/ui/trend-chart/trend-chart.component';

/**
 * Nivel 2 del dashboard — ruta `/dashboard/projects/:id`. Dueño de un único
 * `httpResource` sobre `ProjectDashboardDto`; renderiza el desglose de
 * estado, la carga de trabajo, las tareas vencidas y la tendencia, todos
 * acotados a un único proyecto.
 *
 * `id` llega vía `withComponentInputBinding()` (provisto en `app.config.ts`
 * en PR1) — sin `route.snapshot.paramMap`, para no perder cambios de
 * parámetro en reutilización de componente.
 *
 * Autorización: el backend ya decide 403 (no-miembro) / 404 (proyecto
 * inexistente); el frontend no reintenta con un scope elevado ni hace una
 * segunda petición — solo muestra el estado de error existente.
 */
@Component({
  selector: 'app-project-dashboard',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    MatProgressSpinnerModule,
    MatIconModule,
    StatusBreakdownComponent,
    WorkloadTableComponent,
    OverdueListComponent,
    TrendChartComponent,
  ],
  templateUrl: './project-dashboard.component.html',
  styleUrl: './project-dashboard.component.scss',
})
export class ProjectDashboardComponent {
  readonly id = input.required<string>();

  private readonly apiUrl = environment.apiUrl;

  // Único fetch del nivel 2 — un DTO compuesto, un loading, un error
  // (403/404 incluido): sin reintento ni segunda petición.
  readonly projectResource = httpResource<ProjectDashboardDto>(() => ({
    url: `${this.apiUrl}/dashboard/projects/${this.id()}`,
  }));
}
