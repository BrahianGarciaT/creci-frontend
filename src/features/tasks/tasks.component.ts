import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { DatePipe } from '@angular/common';
import { httpResource } from '@angular/common/http';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { AuthService } from '../../core/services/auth.service';
import { UiPreferencesService, TasksViewMode } from '../../core/services/ui-preferences.service';
import { Project } from '../projects/projects.service';
import { User } from '../users/users.service';
import { environment } from '../../environments/environment';
import { Paginated } from '../../shared/models/paginated';
import {
  ConfirmDialogComponent,
  ConfirmDialogData,
} from '../../shared/ui/confirm-dialog/confirm-dialog.component';
import {
  Task,
  TasksService,
  TaskPriority,
  TaskStatus,
  UpdateEstimatePayload,
  UpdateStatusPayload,
} from './tasks.service';
import {
  CreateTaskDialogComponent,
  CreateTaskDialogData,
} from './create-task-dialog.component';
import {
  EditTaskDialogComponent,
  EditTaskDialogData,
} from './edit-task-dialog.component';
import { KanbanColumn, TasksKanbanBoardComponent } from './tasks-kanban-board.component';

// Definición de las 4 columnas fijas del tablero kanban, en orden de visualización.
// `cancelled` es la única no-droppable (de solo lectura total).
const KANBAN_COLUMN_DEFS: readonly Omit<KanbanColumn, 'tasks'>[] = [
  { status: 'todo', label: 'Pendiente', droppable: true },
  { status: 'in_progress', label: 'En progreso', droppable: true },
  { status: 'done', label: 'Completada', droppable: true },
  { status: 'cancelled', label: 'Cancelada', droppable: false },
];

@Component({
  selector: 'app-tasks',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    MatTableModule,
    MatButtonModule,
    MatButtonToggleModule,
    MatIconModule,
    MatPaginatorModule,
    MatProgressSpinnerModule,
    MatSelectModule,
    MatTooltipModule,
    DatePipe,
    TasksKanbanBoardComponent,
  ],
  templateUrl: './tasks.component.html',
  styleUrl: './tasks.component.scss',
})
export class TasksComponent {
  private readonly authService = inject(AuthService);
  private readonly tasksService = inject(TasksService);
  private readonly dialog = inject(MatDialog);
  private readonly uiPreferences = inject(UiPreferencesService);
  private readonly apiUrl = environment.apiUrl;

  // Medianoche local capturada en la construcción — hace determinista isOverdue() en tests
  private readonly todayStart: Date;

  constructor() {
    const now = new Date();
    this.todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // Recuperación de página vacía (admin): si el backend devuelve data:[] para una
    // página > 1 con total > 0, retrocede a la última página válida. El propio
    // signal de página dispara la recarga del recurso, sin lógica extra de reload().
    effect(() => {
      const result = this.allTasksResource.value();
      if (!result) return;
      if (result.data.length === 0 && result.meta.page > 1 && result.meta.total > 0) {
        this.adminPage.set(result.meta.totalPages);
      }
    });

    // Recuperación de página vacía (developer) — mismo criterio que el admin, aplicado
    // a la tabla de tareas del proyecto seleccionado.
    effect(() => {
      const result = this.developerTasksResource.value();
      if (!result) return;
      if (result.data.length === 0 && result.meta.page > 1 && result.meta.total > 0) {
        this.developerPage.set(result.meta.totalPages);
      }
    });
  }

  // Usuario autenticado actual
  readonly currentUser = this.authService.currentUser;

  // Indica si el usuario es administrador
  readonly isAdmin = computed(() => this.currentUser()?.role === 'admin');

  // Proyectos: admin carga todos, developer carga solo los suyos. Es una fuente de
  // dropdown/diálogo (no una tabla paginada), por eso queda capada en limit=100 sin paginador.
  readonly projectsResource = httpResource<Paginated<Project>>(() =>
    this.isAdmin()
      ? { url: `${this.apiUrl}/projects`, params: { limit: 100 } }
      : { url: `${this.apiUrl}/projects/mine`, params: { limit: 100 } }
  );

  // Usuarios: solo el admin los necesita (para los diálogos de asignación) — endpoint no paginado
  readonly usersResource = httpResource<User[]>(() =>
    this.isAdmin() ? { url: `${this.apiUrl}/users` } : undefined
  );

  // Página actual (1-based) y tamaño de página de la tabla admin de tareas
  readonly adminPage = signal(1);
  readonly adminPageSize = signal(20);

  // Filtros de la tabla admin — signals leídos dentro de la composición del request,
  // igual que adminPage/adminPageSize: sobreviven a .reload() sin lógica extra.
  readonly statusFilter = signal<TaskStatus | 'all'>('all');
  readonly priorityFilter = signal<TaskPriority | 'all'>('all');

  // Recurso reactivo de tareas para el admin (lista completa — solo se dispara si es admin).
  // status/priority se omiten del request cuando están en 'all' (el backend rechaza con 400
  // el valor centinela 'all' vía @IsEnum).
  readonly allTasksResource = httpResource<Paginated<Task>>(() => {
    if (!this.isAdmin()) return undefined;
    const params: Record<string, string | number> = {
      page: this.adminPage(),
      limit: this.adminPageSize(),
    };
    const status = this.statusFilter();
    if (status !== 'all') params['status'] = status;
    const priority = this.priorityFilter();
    if (priority !== 'all') params['priority'] = priority;
    return { url: `${this.apiUrl}/tasks`, params };
  });

  // ID del proyecto seleccionado para la vista de desarrollador
  readonly selectedProjectId = signal<string>('');

  // Página actual (1-based) y tamaño de página de la tabla de tareas del desarrollador
  readonly developerPage = signal(1);
  readonly developerPageSize = signal(20);

  // Recurso reactivo para tareas del proyecto del desarrollador
  // Se inicializa vacío y se actualiza cuando el desarrollador selecciona un proyecto
  readonly developerTasksResource = httpResource<Paginated<Task>>(() => {
    const projectId = this.selectedProjectId();
    if (!projectId) return undefined;
    return {
      url: `${environment.apiUrl}/tasks/project/${projectId}`,
      params: { page: this.developerPage(), limit: this.developerPageSize() },
    };
  });

  // Columnas de la tabla — varían según el rol
  readonly adminColumns = ['title', 'priority', 'status', 'project', 'assignee', 'dueDate', 'actions'];
  readonly developerColumns = ['title', 'priority', 'status', 'project', 'assignee', 'statusAction', 'estimateAction'];

  // Modo de vista de la tabla de tareas del desarrollador (list | kanban), hidratado desde localStorage
  readonly viewMode = signal<TasksViewMode>(this.uiPreferences.getTasksViewMode());

  // Overlay optimista de un movimiento de kanban pendiente de confirmación/mutación — se
  // aplica dentro de `developerTasksByStatus` y se limpia al confirmar/errar/cancelar (revert).
  // No se usa `transferArrayItem` de CDK: el overlay declarativo hace el revert un simple set(null).
  readonly pendingMove = signal<{ taskId: string; to: TaskStatus } | null>(null);

  // Overlay optimista de un reorder dentro de una misma columna, pendiente de
  // confirmación/mutación — mismo patrón que `pendingMove` (revert = set(null)).
  readonly pendingReorder = signal<{ status: TaskStatus; orderedIds: string[] } | null>(null);

  // Agrupa la página actual de `developerTasksResource` en las 4 columnas fijas del kanban,
  // aplicando el overlay de `pendingMove` antes de filtrar por columna, y el de
  // `pendingReorder` después, para reflejar el drag-and-drop antes de que confirme el backend.
  readonly developerTasksByStatus = computed<KanbanColumn[]>(() => {
    const move = this.pendingMove();
    const tasks = (this.developerTasksResource.value()?.data ?? []).map((t) =>
      move && t.id === move.taskId ? { ...t, status: move.to } : t
    );
    const reorder = this.pendingReorder();
    return KANBAN_COLUMN_DEFS.map((def) => {
      const columnTasks = tasks.filter((t) => t.status === def.status);
      if (!reorder || reorder.status !== def.status) {
        return { ...def, tasks: columnTasks };
      }
      const byId = new Map(columnTasks.map((t) => [t.id, t]));
      const ordered = reorder.orderedIds
        .map((id) => byId.get(id))
        .filter((t): t is Task => !!t);
      return { ...def, tasks: ordered };
    });
  });

  // ID de la tarea pendiente de cancelación (confirmación inline)
  readonly pendingCancelId = signal<string | null>(null);

  // Mensaje de error de mutaciones
  readonly mutationError = signal<string | null>(null);

  // Proyectos del desarrollador (filtrados por membresía)
  readonly developerProjects = computed(() => {
    const userId = this.currentUser()?.id;
    if (!userId) return [];
    return (this.projectsResource.value()?.data ?? []).filter((p) =>
      p.developers.some((d) => d.id === userId)
    );
  });

  /** Abre el diálogo de creación de tarea (solo admin) */
  openCreateDialog(): void {
    const dialogData: CreateTaskDialogData = {
      projects: this.projectsResource.value()?.data ?? [],
      users: this.usersResource.value() ?? [],
    };

    const dialogRef = this.dialog.open(CreateTaskDialogComponent, {
      width: '520px',
      disableClose: false,
      data: dialogData,
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.allTasksResource.reload();
      }
    });
  }

  /** Abre el diálogo de edición de tarea (solo admin) */
  openEditDialog(task: Task): void {
    const dialogData: EditTaskDialogData = {
      task,
      projects: this.projectsResource.value()?.data ?? [],
      users: this.usersResource.value() ?? [],
    };

    const dialogRef = this.dialog.open(EditTaskDialogComponent, {
      width: '520px',
      disableClose: false,
      data: dialogData,
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.allTasksResource.reload();
      }
    });
  }

  /** Marca una tarea como "pendiente de confirmar cancelación" (solo admin) */
  requestCancel(id: string): void {
    this.mutationError.set(null);
    this.pendingCancelId.set(id);
  }

  /** Cancela el paso de confirmación de cancelación */
  cancelConfirm(): void {
    this.pendingCancelId.set(null);
  }

  /** Confirma y ejecuta el soft-cancel de la tarea indicada (solo admin) */
  confirmCancel(id: string): void {
    this.tasksService.cancel(id).subscribe({
      next: () => {
        this.allTasksResource.reload();
        this.pendingCancelId.set(null);
      },
      error: () => {
        this.mutationError.set('Error al cancelar la tarea. Intenta nuevamente.');
        this.pendingCancelId.set(null);
      },
    });
  }

  /** Actualiza el estado de una tarea (desarrollador — solo tareas propias) */
  updateTaskStatus(task: Task, status: TaskStatus, revert?: () => void): void {
    if (status === 'cancelled') return;

    if (status === 'done') {
      const dialogData: ConfirmDialogData = {
        title: 'Completar tarea',
        message:
          'Al marcar la tarea como completada no podrás cambiar su estado de nuevo. ' +
          'Esta acción no se puede deshacer. Si queda trabajo pendiente, crea una tarea nueva.',
        confirmLabel: 'Completar',
      };

      const dialogRef = this.dialog.open(ConfirmDialogComponent, {
        width: '420px',
        data: dialogData,
      });

      dialogRef.afterClosed().subscribe((confirmed) => {
        if (confirmed) {
          this.submitTaskStatus(task, status, revert);
        } else {
          revert?.();
        }
      });
      return;
    }

    this.submitTaskStatus(task, status, revert);
  }

  /** Envía la actualización de estado al backend e invoca el callback de reversión en caso de error */
  private submitTaskStatus(task: Task, status: TaskStatus, revert?: () => void): void {
    const payload: UpdateStatusPayload = { status: status as 'todo' | 'in_progress' | 'done' };

    this.tasksService.updateStatus(task.id, payload).subscribe({
      next: () => {
        // Limpia cualquier overlay optimista de kanban pendiente: la recarga trae el estado real
        this.pendingMove.set(null);
        this.developerTasksResource.reload();
      },
      error: () => {
        this.mutationError.set('Error al actualizar el estado. Intenta nuevamente.');
        revert?.();
      },
    });
  }

  /** Cambia el modo de vista (list | kanban) y persiste la preferencia */
  setViewMode(mode: TasksViewMode): void {
    this.viewMode.set(mode);
    this.uiPreferences.setTasksViewMode(mode);
  }

  /** Determina si una tarjeta del kanban puede arrastrarse/editarse (solo tareas propias) */
  readonly canDragTask = (task: Task): boolean => this.isOwnTask(task);

  /**
   * Recibe el intent de cambio de estado emitido por el tablero kanban (drag o menú
   * de accesibilidad). Ignora drops al mismo estado o a un destino no permitido por
   * drag (`cancelled` nunca llega aquí porque su columna no es droppable, pero se
   * valida igual por defensa en profundidad). Aplica el overlay optimista y reutiliza
   * `updateTaskStatus` (incluida la confirmación de "done"); el revert limpia el overlay.
   */
  onKanbanStatusChange({ task, status }: { task: Task; status: TaskStatus }): void {
    if (task.status === status) return;
    if (status !== 'todo' && status !== 'in_progress' && status !== 'done') return;

    this.pendingMove.set({ taskId: task.id, to: status });
    this.updateTaskStatus(task, status, () => this.pendingMove.set(null));
  }

  /**
   * Recibe el nuevo orden de una columna tras un drag-and-drop dentro de sí misma
   * (emitido solo para todo/in_progress — done/cancelled no son droppable). Aplica
   * el overlay optimista y persiste; el revert ante error limpia el overlay, lo que
   * vuelve a mostrar el orden real del backend.
   */
  onKanbanReorder({ status, taskIds }: { status: TaskStatus; taskIds: string[] }): void {
    const projectId = this.selectedProjectId();
    if (!projectId || (status !== 'todo' && status !== 'in_progress')) return;

    this.pendingReorder.set({ status, orderedIds: taskIds });
    this.tasksService.reorderColumn(projectId, { status, taskIds }).subscribe({
      next: () => {
        this.pendingReorder.set(null);
        this.developerTasksResource.reload();
      },
      error: () => {
        this.mutationError.set('Error al reordenar las tareas. Intenta nuevamente.');
        this.pendingReorder.set(null);
      },
    });
  }

  /** Actualiza las horas estimadas de una tarea (desarrollador — solo tareas propias) */
  updateTaskEstimate(task: Task, estimatedHours: number): void {
    if (!estimatedHours || estimatedHours <= 0) return;
    const payload: UpdateEstimatePayload = { estimatedHours };

    this.tasksService.updateEstimate(task.id, payload).subscribe({
      next: () => {
        this.developerTasksResource.reload();
      },
      error: () => {
        this.mutationError.set('Error al actualizar las horas estimadas. Intenta nuevamente.');
      },
    });
  }

  /** Cambia el filtro de estado y resetea la página admin a la primera. */
  setStatusFilter(value: TaskStatus | 'all'): void {
    this.statusFilter.set(value);
    this.adminPage.set(1);
  }

  /** Cambia el filtro de prioridad y resetea la página admin a la primera. */
  setPriorityFilter(value: TaskPriority | 'all'): void {
    this.priorityFilter.set(value);
    this.adminPage.set(1);
  }

  /** Maneja el cambio de página/tamaño de página del paginador de la tabla admin. */
  onAdminPageChange(event: PageEvent): void {
    this.adminPage.set(event.pageIndex + 1);
    this.adminPageSize.set(event.pageSize);
  }

  /** Maneja el cambio de página/tamaño de página del paginador de la tabla developer. */
  onDeveloperPageChange(event: PageEvent): void {
    this.developerPage.set(event.pageIndex + 1);
    this.developerPageSize.set(event.pageSize);
  }

  /** Verifica si una tarea pertenece al usuario autenticado */
  isOwnTask(task: Task): boolean {
    return task.assignee?.id === this.currentUser()?.id;
  }

  /**
   * Indica si una tarea está vencida (solo admin): tiene fecha límite estrictamente
   * anterior a hoy y su estado no es "done" ni "cancelled". Una tarea que vence hoy
   * NO se considera vencida.
   */
  isOverdue(task: Task): boolean {
    return (
      !!task.dueDate &&
      new Date(task.dueDate) < this.todayStart &&
      task.status !== 'done' &&
      task.status !== 'cancelled'
    );
  }
}
