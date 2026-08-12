import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { httpResource } from '@angular/common/http';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from '../../core/services/auth.service';
import { environment } from '../../environments/environment';
import { DashboardOverviewDto } from './dashboard.types';
import { ProjectHealthCardComponent } from './project-health-card.component';
import { WorkloadTableComponent } from './workload-table.component';
import { OverdueListComponent } from './overdue-list.component';
import { TrendChartComponent } from '../../shared/ui/trend-chart/trend-chart.component';

/**
 * Nivel 1 del dashboard — ruta `/dashboard`. Dueño de un único `httpResource`
 * sobre `DashboardOverviewDto`; renderiza las tarjetas de salud de proyecto
 * (`ProjectHealthCard[]`) más los widgets de carga de trabajo, vencidas y
 * tendencia, todos alimentados por el mismo resource (sin peticiones extra).
 *
 * El copy de alcance ('organización' vs. 'tus proyectos') se decide a partir
 * de `overview().scope`, devuelto por el backend — no se re-deriva de
 * `isAdmin()`, para no duplicar una decisión de autorización que el servidor
 * ya tomó.
 */
@Component({
  selector: 'app-dashboard-overview',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    MatProgressSpinnerModule,
    MatIconModule,
    ProjectHealthCardComponent,
    WorkloadTableComponent,
    OverdueListComponent,
    TrendChartComponent,
  ],
  templateUrl: './dashboard-overview.component.html',
  styleUrl: './dashboard-overview.component.scss',
})
export class DashboardOverviewComponent {
  private readonly authService = inject(AuthService);
  private readonly apiUrl = environment.apiUrl;

  readonly currentUser = this.authService.currentUser;

  // Único fetch del nivel 1 — un DTO compuesto, un loading, un error
  readonly overviewResource = httpResource<DashboardOverviewDto>(() => ({
    url: `${this.apiUrl}/dashboard/overview`,
  }));
}
