import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { OverdueEntry } from './dashboard.types';

/**
 * Lista de tareas vencidas — presentacional, sin peticiones propias.
 * Consume `OverdueEntry[]` + `overdueCount` tal cual llegan del backend
 * (la lista ya viene acotada por el servidor; sin paginación en el cliente).
 */
@Component({
  selector: 'app-overdue-list',
  standalone: true,
  imports: [DatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './overdue-list.component.html',
  styleUrl: './overdue-list.component.scss',
})
export class OverdueListComponent {
  readonly entries = input.required<OverdueEntry[]>();
  readonly overdueCount = input.required<number>();

  readonly isEmpty = computed(() => this.entries().length === 0);
}
