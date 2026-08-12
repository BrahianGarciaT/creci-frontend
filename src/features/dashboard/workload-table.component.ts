import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { WorkloadEntry } from './dashboard.types';

/**
 * Tabla de carga de trabajo por usuario — presentacional, sin peticiones propias.
 * Consume `WorkloadEntry[]` tal cual llega del backend (sin re-agregación).
 */
@Component({
  selector: 'app-workload-table',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './workload-table.component.html',
  styleUrl: './workload-table.component.scss',
})
export class WorkloadTableComponent {
  readonly entries = input.required<WorkloadEntry[]>();

  readonly isEmpty = computed(() => this.entries().length === 0);
}
