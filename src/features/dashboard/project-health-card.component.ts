import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ProjectHealth } from './dashboard.types';

/**
 * Tarjeta de salud de un proyecto — presentacional, sin peticiones propias.
 * Renderiza nombre, conteos por estado y % de completitud; enlaza a Nivel 2
 * (`/dashboard/projects/:id`) vía `[routerLink]` (navegación de router, no modal).
 */
@Component({
  selector: 'app-project-health-card',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink],
  templateUrl: './project-health-card.component.html',
  styleUrl: './project-health-card.component.scss',
})
export class ProjectHealthCardComponent {
  readonly project = input.required<ProjectHealth>();

  // Proyecto sin tareas registradas — evita división/formato sobre completionRate: null
  readonly isEmpty = computed(() => this.project().total === 0);

  // Porcentaje de completitud redondeado, listo para mostrar (null cuando isEmpty)
  readonly completionPercent = computed(() => {
    const rate = this.project().completionRate;
    return rate === null ? null : Math.round(rate * 100);
  });
}
