import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { httpResource } from '@angular/common/http';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { AuthService } from '../../core/services/auth.service';
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

/**
 * Vista unificada de tareas — un único flujo selector-de-proyecto + tablero kanban
 * para ambos roles. Admin elige entre todos los proyectos y gestiona cualquier
 * tarjeta (crear/editar/cancelar/drag); developer elige entre sus proyectos y
 * solo puede arrastrar/estimar sus propias tareas. No hay vista de lista ni
 * paginación: el tablero siempre trae el proyecto completo (`all=true`).
 */
@Component({
  selector: 'app-tasks',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatSelectModule,
    TasksKanbanBoardComponent,
  ],
  templateUrl: './tasks.component.html',
  styleUrl: './tasks.component.scss',
})
export class TasksComponent {
  private readonly authService = inject(AuthService);
  private readonly tasksService = inject(TasksService);
  private readonly dialog = inject(MatDialog);
  private readonly apiUrl = environment.apiUrl;

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

  // Proyectos del desarrollador (filtrados por membresía)
  readonly developerProjects = computed(() => {
    const userId = this.currentUser()?.id;
    if (!userId) return [];
    return (this.projectsResource.value()?.data ?? []).filter((p) =>
      p.developers.some((d) => d.id === userId)
    );
  });

  // Proyectos que alimentan el selector — todos para admin, solo los propios para developer
  readonly selectableProjects = computed(() =>
    this.isAdmin() ? (this.projectsResource.value()?.data ?? []) : this.developerProjects()
  );

  // ID del proyecto seleccionado — compartido por ambos roles
  readonly selectedProjectId = signal<string>('');

  // Recurso reactivo único de tareas del proyecto seleccionado, sin paginar (`all=true`).
  // Reemplaza tanto el antiguo `allTasksResource` (admin) como `developerTasksResource`.
  readonly projectTasksResource = httpResource<Paginated<Task>>(() => {
    const projectId = this.selectedProjectId();
    if (!projectId) return undefined;
    return {
      url: `${this.apiUrl}/tasks/project/${projectId}`,
      params: { all: true },
    };
  });

  // Overlay optimista de un movimiento de kanban pendiente de confirmación/mutación — se
  // aplica dentro de `tasksByStatus` y se limpia al confirmar/errar/cancelar (revert).
  // No se usa `transferArrayItem` de CDK: el overlay declarativo hace el revert un simple set(null).
  readonly pendingMove = signal<{ taskId: string; to: TaskStatus } | null>(null);

  // Overlay optimista de un reorder dentro de una misma columna, pendiente de
  // confirmación/mutación — mismo patrón que `pendingMove` (revert = set(null)).
  readonly pendingReorder = signal<{ status: TaskStatus; orderedIds: string[] } | null>(null);

  // Agrupa las tareas del proyecto seleccionado en las 4 columnas fijas del kanban,
  // aplicando el overlay de `pendingMove` antes de filtrar por columna, y el de
  // `pendingReorder` después, para reflejar el drag-and-drop antes de que confirme el backend.
  readonly tasksByStatus = computed<KanbanColumn[]>(() => {
    const move = this.pendingMove();
    const tasks = (this.projectTasksResource.value()?.data ?? []).map((t) =>
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

  // Mensaje de error de mutaciones
  readonly mutationError = signal<string | null>(null);

  /** Abre el diálogo de creación de tarea (solo admin), preseleccionando el proyecto activo */
  openCreateDialog(): void {
    const dialogData: CreateTaskDialogData = {
      projects: this.projectsResource.value()?.data ?? [],
      users: this.usersResource.value() ?? [],
      preselectedProjectId: this.selectedProjectId() || undefined,
    };

    const dialogRef = this.dialog.open(CreateTaskDialogComponent, {
      width: '520px',
      disableClose: false,
      data: dialogData,
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.projectTasksResource.reload();
      }
    });
  }

  /** Abre el diálogo de edición de tarea (solo admin, vía menú de la tarjeta) */
  editTask(task: Task): void {
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
        this.projectTasksResource.reload();
      }
    });
  }

  /** Solicita confirmación y cancela (soft-delete) una tarea (solo admin, vía menú de la tarjeta) */
  cancelTask(task: Task): void {
    this.mutationError.set(null);

    const dialogData: ConfirmDialogData = {
      title: 'Cancelar tarea',
      message: `¿Confirmas que quieres cancelar "${task.title}"? Esta acción no se puede deshacer.`,
      confirmLabel: 'Cancelar tarea',
    };

    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '420px',
      data: dialogData,
    });

    dialogRef.afterClosed().subscribe((confirmed) => {
      if (!confirmed) return;

      this.tasksService.cancel(task.id).subscribe({
        next: () => this.projectTasksResource.reload(),
        error: () => {
          this.mutationError.set('Error al cancelar la tarea. Intenta nuevamente.');
        },
      });
    });
  }

  /** Actualiza el estado de una tarea (developer: solo propias; admin: cualquiera) */
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

  /**
   * Envía la actualización de estado al backend e invoca el callback de reversión en caso
   * de error. Admin pasa por el endpoint `update` (no está limitado a tareas propias);
   * developer sigue usando el endpoint `/status`, restringido por el backend a su asignación.
   */
  private submitTaskStatus(task: Task, status: TaskStatus, revert?: () => void): void {
    const request$ = this.isAdmin()
      ? this.tasksService.update(task.id, { status })
      : this.tasksService.updateStatus(task.id, {
          status: status as UpdateStatusPayload['status'],
        });

    request$.subscribe({
      next: () => {
        // Limpia cualquier overlay optimista de kanban pendiente: la recarga trae el estado real
        this.pendingMove.set(null);
        this.projectTasksResource.reload();
      },
      error: () => {
        this.mutationError.set('Error al actualizar el estado. Intenta nuevamente.');
        revert?.();
      },
    });
  }

  /** Determina si una tarjeta del kanban puede arrastrarse — admin: cualquiera; developer: solo propias */
  readonly canDragTask = (task: Task): boolean => this.isAdmin() || this.isOwnTask(task);

  /** Determina si una tarjeta del kanban ofrece acciones de gestión (editar/cancelar) — solo admin */
  readonly canManageTask = (): boolean => this.isAdmin();

  /** Determina si una tarjeta del kanban muestra el input editable de horas estimadas — solo developer, tarea propia */
  readonly canEstimateTask = (task: Task): boolean => !this.isAdmin() && this.isOwnTask(task);

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
   * vuelve a mostrar el orden real del backend. Alcanzable por admin desde que
   * `reorderColumn` en el backend admite acceso `allowAdmin: true`.
   */
  onKanbanReorder({ status, taskIds }: { status: TaskStatus; taskIds: string[] }): void {
    const projectId = this.selectedProjectId();
    if (!projectId || (status !== 'todo' && status !== 'in_progress')) return;

    this.pendingReorder.set({ status, orderedIds: taskIds });
    this.tasksService.reorderColumn(projectId, { status, taskIds }).subscribe({
      next: () => {
        this.pendingReorder.set(null);
        this.projectTasksResource.reload();
      },
      error: () => {
        this.mutationError.set('Error al reordenar las tareas. Intenta nuevamente.');
        this.pendingReorder.set(null);
      },
    });
  }

  /** Verifica si una tarea pertenece al usuario autenticado */
  isOwnTask(task: Task): boolean {
    return task.assignee?.id === this.currentUser()?.id;
  }

  /** Actualiza las horas estimadas de una tarea (developer — solo tareas propias) */
  updateTaskEstimate(task: Task, estimatedHours: number): void {
    if (!estimatedHours || estimatedHours <= 0) return;
    const payload: UpdateEstimatePayload = { estimatedHours };

    this.tasksService.updateEstimate(task.id, payload).subscribe({
      next: () => {
        this.projectTasksResource.reload();
      },
      error: () => {
        this.mutationError.set('Error al actualizar las horas estimadas. Intenta nuevamente.');
      },
    });
  }

  /** Recibe el intent de actualización de horas estimadas emitido por el tablero kanban */
  onKanbanEstimateChange({ task, estimatedHours }: { task: Task; estimatedHours: number }): void {
    this.updateTaskEstimate(task, estimatedHours);
  }
}
