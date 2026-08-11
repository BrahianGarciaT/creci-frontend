import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { DatePipe } from '@angular/common';
import { httpResource } from '@angular/common/http';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { AuthService } from '../../core/services/auth.service';
import { Project } from '../projects/projects.service';
import { User } from '../users/users.service';
import { environment } from '../../environments/environment';
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

@Component({
  selector: 'app-tasks',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatSelectModule,
    MatTooltipModule,
    DatePipe,
  ],
  templateUrl: './tasks.component.html',
  styleUrl: './tasks.component.scss',
})
export class TasksComponent {
  private readonly authService = inject(AuthService);
  private readonly tasksService = inject(TasksService);
  private readonly dialog = inject(MatDialog);
  private readonly apiUrl = environment.apiUrl;

  // Medianoche local capturada en la construcción — hace determinista isOverdue() en tests
  private readonly todayStart: Date;

  constructor() {
    const now = new Date();
    this.todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  }

  // Usuario autenticado actual
  readonly currentUser = this.authService.currentUser;

  // Indica si el usuario es administrador
  readonly isAdmin = computed(() => this.currentUser()?.role === 'admin');

  // Proyectos: admin carga todos, developer carga solo los suyos
  readonly projectsResource = httpResource<Project[]>(() =>
    this.isAdmin()
      ? { url: `${this.apiUrl}/projects` }
      : { url: `${this.apiUrl}/projects/mine` }
  );

  // Usuarios: solo el admin los necesita (para los diálogos de asignación)
  readonly usersResource = httpResource<User[]>(() =>
    this.isAdmin() ? { url: `${this.apiUrl}/users` } : undefined
  );

  // Recurso reactivo de tareas para el admin (lista completa — solo se dispara si es admin)
  readonly allTasksResource = httpResource<Task[]>(() =>
    this.isAdmin() ? { url: `${this.apiUrl}/tasks` } : undefined
  );

  // ID del proyecto seleccionado para la vista de desarrollador
  readonly selectedProjectId = signal<string>('');

  // Recurso reactivo para tareas del proyecto del desarrollador
  // Se inicializa vacío y se actualiza cuando el desarrollador selecciona un proyecto
  readonly developerTasksResource = httpResource<Task[]>(() => {
    const projectId = this.selectedProjectId();
    if (!projectId) return undefined;
    return { url: `${environment.apiUrl}/tasks/project/${projectId}` };
  });

  // Columnas de la tabla — varían según el rol
  readonly adminColumns = ['title', 'priority', 'status', 'project', 'assignee', 'dueDate', 'actions'];
  readonly developerColumns = ['title', 'priority', 'status', 'project', 'assignee', 'statusAction', 'estimateAction'];

  // Filtros de la tabla admin (solo cliente, no disparan peticiones de red)
  readonly statusFilter = signal<TaskStatus | 'all'>('all');
  readonly priorityFilter = signal<TaskPriority | 'all'>('all');

  // Lista admin filtrada por estado/prioridad
  readonly filteredAdminTasks = computed<Task[]>(() => {
    const tasks = this.allTasksResource.value() ?? [];
    const status = this.statusFilter();
    const priority = this.priorityFilter();
    return tasks.filter((task) => {
      if (status !== 'all' && task.status !== status) return false;
      if (priority !== 'all' && task.priority !== priority) return false;
      return true;
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
    return (this.projectsResource.value() ?? []).filter((p) =>
      p.developers.some((d) => d.id === userId)
    );
  });

  /** Abre el diálogo de creación de tarea (solo admin) */
  openCreateDialog(): void {
    const dialogData: CreateTaskDialogData = {
      projects: this.projectsResource.value() ?? [],
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
      projects: this.projectsResource.value() ?? [],
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
  updateTaskStatus(task: Task, status: TaskStatus): void {
    if (status === 'cancelled') return;
    const payload: UpdateStatusPayload = { status: status as 'todo' | 'in_progress' | 'done' };

    this.tasksService.updateStatus(task.id, payload).subscribe({
      next: () => {
        this.developerTasksResource.reload();
      },
      error: () => {
        this.mutationError.set('Error al actualizar el estado. Intenta nuevamente.');
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
