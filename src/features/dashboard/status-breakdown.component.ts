import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { StatusCounts } from './dashboard.types';

/**
 * Desglose de estado de un proyecto — presentacional, sin peticiones propias.
 * Consume `StatusCounts` tal cual llega del backend (sin re-agregación).
 */
@Component({
  selector: 'app-status-breakdown',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './status-breakdown.component.html',
  styleUrl: './status-breakdown.component.scss',
})
export class StatusBreakdownComponent {
  readonly counts = input.required<StatusCounts>();

  readonly isEmpty = computed(() => {
    const c = this.counts();
    return c.todo === 0 && c.in_progress === 0 && c.done === 0 && c.cancelled === 0;
  });
}
