import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { CdkDragDrop, DragDropModule, moveItemInArray } from '@angular/cdk/drag-drop';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { Task, TaskStatus } from './tasks.service';

// Columna fija del tablero kanban — `droppable` controla si acepta cards soltadas
// (cancelled es la única de solo-lectura total: ni entrada ni salida de drag).
export interface KanbanColumn {
  status: TaskStatus;
  label: string;
  tasks: Task[];
  droppable: boolean;
}

// Prefijo de los IDs de cdkDropList — usado para derivar el status destino en drop()
const KANBAN_DROP_LIST_PREFIX = 'kanban-column-';

// Tabla de transiciones válidas por columna de origen — compartida entre el
// handler de drag (drop()) y el fallback de accesibilidad (mat-menu por tarjeta).
const TRANSITIONS: Record<TaskStatus, TaskStatus[]> = {
  todo: ['in_progress', 'done'],
  in_progress: ['todo', 'done'],
  done: [],
  cancelled: [],
};

const STATUS_LABELS: Record<TaskStatus, string> = {
  todo: 'Pendiente',
  in_progress: 'En progreso',
  done: 'Completada',
  cancelled: 'Cancelada',
};

/**
 * Tablero kanban presentacional (desarrollador) — agrupa tareas en 4 columnas fijas
 * recibidas del contenedor y emite intents de cambio de estado hacia arriba. No
 * muta arrays de CDK (transferArrayItem): el revert del drag vive en el overlay
 * `pendingMove` del contenedor.
 */
@Component({
  selector: 'app-tasks-kanban-board',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DragDropModule, MatButtonModule, MatIconModule, MatMenuModule],
  templateUrl: './tasks-kanban-board.component.html',
  styleUrl: './tasks-kanban-board.component.scss',
})
export class TasksKanbanBoardComponent {
  readonly columns = input.required<KanbanColumn[]>();
  // Restringe qué tarjetas son arrastrables/editables (p.ej. solo tareas propias del developer)
  readonly canDrag = input<(task: Task) => boolean>();
  // Restringe qué tarjetas ofrecen acciones de gestión (editar/cancelar) en el menú por tarjeta
  // (solo admin). Ausente/`false` para una tarjeta oculta ambas acciones.
  readonly canManage = input<(task: Task) => boolean>();
  readonly statusChange = output<{ task: Task; status: TaskStatus }>();
  // Nuevo orden visual de una columna tras un drag-and-drop dentro de sí misma
  readonly reorderChange = output<{ status: TaskStatus; taskIds: string[] }>();
  // Intents de gestión emitidos desde el menú por tarjeta (solo cuando `canManage` lo permite)
  readonly editTask = output<Task>();
  readonly cancelTask = output<Task>();

  readonly dropListId = (status: TaskStatus): string => `${KANBAN_DROP_LIST_PREFIX}${status}`;

  readonly statusLabel = (status: TaskStatus): string => STATUS_LABELS[status];

  /** Estados destino válidos ofrecidos por el menú de accesibilidad de una tarjeta en `status` */
  transitionTargets(status: TaskStatus): TaskStatus[] {
    return TRANSITIONS[status];
  }

  /** Una tarjeta es arrastrable solo si su columna no es terminal y `canDrag` (si se provee) la permite */
  isCardDragDisabled(task: Task, column: KanbanColumn): boolean {
    if (this.isTerminalColumn(column.status)) return true;
    const allowed = this.canDrag();
    return allowed ? !allowed(task) : false;
  }

  // `done` es droppable (recibe tareas completadas desde otras columnas) pero
  // terminal para su propio contenido: ninguna tarjeta puede arrancar un drag
  // desde ahí (isCardDragDisabled), así que jamás debería reordenarse
  // internamente. `cancelled` es terminal y no-droppable. No se puede derivar
  // esto de `column.droppable` solo (esa flag mide "acepta drops externos",
  // no "acepta reorder interno") — de ahí este chequeo explícito.
  private isTerminalColumn(status: TaskStatus): boolean {
    return status === 'done' || status === 'cancelled';
  }

  /** Emite el intent de cambio de estado — usado tanto por drag como por el menú de accesibilidad */
  requestStatusChange(task: Task, status: TaskStatus): void {
    this.statusChange.emit({ task, status });
  }

  /**
   * Handler de drop de CDK. No usa `transferArrayItem`/mutación directa de
   * `column.tasks`: ese array lo recrea el `computed` del contenedor en cada
   * recálculo, así que cualquier mutación in-place se perdería. En su lugar
   * deriva origen/destino de los IDs de los `cdkDropList` y emite el intent —
   * el contenedor decide el overlay optimista y el revert.
   */
  drop(event: CdkDragDrop<Task[]>): void {
    if (event.previousContainer.id === event.container.id) {
      this.reorderWithinColumn(event);
      return;
    }

    const targetStatus = this.containerIdToStatus(event.container.id);
    if (!targetStatus) return;

    const targetColumn = this.columns().find((c) => c.status === targetStatus);
    if (!targetColumn || !targetColumn.droppable) return;

    const task = event.item.data as Task;
    this.requestStatusChange(task, targetStatus);
  }

  /**
   * Reordena visualmente dentro de la misma columna. En el flujo real de UI
   * esto solo puede ocurrir en todo/in_progress: `cancelled` no es droppable
   * y `done` no permite iniciar un drag desde sus tarjetas (isCardDragDisabled),
   * así que ningún drop real se origina ahí. El chequeo de `isTerminalColumn`
   * es defensa en profundidad ante un evento fabricado o un futuro cambio de
   * `droppable` (esa flag mide "acepta drops externos", no "reordenable").
   */
  private reorderWithinColumn(event: CdkDragDrop<Task[]>): void {
    if (event.previousIndex === event.currentIndex) return;

    const status = this.containerIdToStatus(event.container.id);
    if (!status || this.isTerminalColumn(status)) return;

    const column = this.columns().find((c) => c.status === status);
    if (!column || !column.droppable) return;

    const reordered = [...column.tasks];
    moveItemInArray(reordered, event.previousIndex, event.currentIndex);
    this.reorderChange.emit({ status, taskIds: reordered.map((t) => t.id) });
  }

  private containerIdToStatus(id: string): TaskStatus | null {
    if (!id.startsWith(KANBAN_DROP_LIST_PREFIX)) return null;
    return id.slice(KANBAN_DROP_LIST_PREFIX.length) as TaskStatus;
  }
}
