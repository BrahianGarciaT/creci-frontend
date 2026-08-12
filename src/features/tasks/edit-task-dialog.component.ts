import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MAT_DIALOG_DATA, MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { Project } from '../projects/projects.service';
import { User } from '../users/users.service';
import {
  ConfirmDialogComponent,
  ConfirmDialogData,
} from '../../shared/ui/confirm-dialog/confirm-dialog.component';
import { bindAssigneeGating } from './assignee-gating';
import { Task, TaskPriority, TaskStatus, TasksService } from './tasks.service';

// Datos inyectados al abrir el diálogo desde el componente padre
export interface EditTaskDialogData {
  task: Task;
  projects: Project[];
  users: User[];
}

@Component({
  selector: 'app-edit-task-dialog',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatSelectModule,
    MatDatepickerModule,
    MatNativeDateModule,
  ],
  template: `
    <h2 mat-dialog-title>Editar tarea</h2>

    <mat-dialog-content>
      <form
        [formGroup]="form"
        (ngSubmit)="submit()"
        novalidate
        aria-label="Formulario de edición de tarea"
        class="dialog-form"
      >
        <!-- Título -->
        <mat-form-field appearance="outline" class="dialog-field">
          <mat-label>Título</mat-label>
          <input
            matInput
            type="text"
            formControlName="title"
            autocomplete="off"
            aria-label="Título de la tarea"
            aria-required="true"
          />
          @if (form.controls.title.hasError('required') && form.controls.title.touched) {
            <mat-error>El título es requerido</mat-error>
          }
        </mat-form-field>

        <!-- Descripción (opcional) -->
        <mat-form-field appearance="outline" class="dialog-field">
          <mat-label>Descripción (opcional)</mat-label>
          <textarea
            matInput
            formControlName="description"
            rows="3"
            aria-label="Descripción de la tarea"
          ></textarea>
        </mat-form-field>

        <!-- Estado -->
        <mat-form-field appearance="outline" class="dialog-field">
          <mat-label>Estado</mat-label>
          <mat-select formControlName="status" aria-label="Estado de la tarea">
            <mat-option value="todo">Pendiente</mat-option>
            <mat-option value="in_progress">En progreso</mat-option>
            <mat-option value="done">Completada</mat-option>
            <mat-option value="cancelled">Cancelada</mat-option>
          </mat-select>
        </mat-form-field>

        <!-- Prioridad -->
        <mat-form-field appearance="outline" class="dialog-field">
          <mat-label>Prioridad</mat-label>
          <mat-select formControlName="priority" aria-label="Prioridad de la tarea" aria-required="true">
            <mat-option value="high">Alta</mat-option>
            <mat-option value="medium">Media</mat-option>
            <mat-option value="low">Baja</mat-option>
          </mat-select>
          @if (form.controls.priority.hasError('required') && form.controls.priority.touched) {
            <mat-error>La prioridad es requerida</mat-error>
          }
        </mat-form-field>

        <!-- Proyecto -->
        <mat-form-field appearance="outline" class="dialog-field">
          <mat-label>Proyecto</mat-label>
          <mat-select formControlName="projectId" aria-label="Proyecto de la tarea" aria-required="true">
            @for (project of data.projects; track project.id) {
              <mat-option [value]="project.id">{{ project.name }}</mat-option>
            }
          </mat-select>
          @if (form.controls.projectId.hasError('required') && form.controls.projectId.touched) {
            <mat-error>El proyecto es requerido</mat-error>
          }
        </mat-form-field>

        <!-- Asignado a (opcional) -->
        <mat-form-field appearance="outline" class="dialog-field">
          <mat-label>Asignado a (opcional)</mat-label>
          <mat-select formControlName="assigneeId" aria-label="Desarrollador asignado">
            <mat-option [value]="null">Sin asignar</mat-option>
            @for (user of eligibleDevelopers(); track user.id) {
              <mat-option [value]="user.id">{{ user.email }}</mat-option>
            }
          </mat-select>
        </mat-form-field>

        <!-- Fecha límite (opcional) -->
        <mat-form-field appearance="outline" class="dialog-field">
          <mat-label>Fecha límite (opcional)</mat-label>
          <input
            matInput
            [matDatepicker]="picker"
            formControlName="dueDate"
            aria-label="Fecha límite de la tarea"
          />
          <mat-datepicker-toggle matIconSuffix [for]="picker" />
          <mat-datepicker #picker />
        </mat-form-field>

        <!-- Banner de error genérico -->
        @if (errorMessage()) {
          <div class="dialog-error" role="alert" aria-live="polite">
            <mat-icon class="dialog-error__icon">error_outline</mat-icon>
            <span>{{ errorMessage() }}</span>
          </div>
        }
      </form>
    </mat-dialog-content>

    <mat-dialog-actions align="end">
      <button type="button" mat-button mat-dialog-close aria-label="Cancelar">Cancelar</button>
      <button
        type="submit"
        mat-raised-button
        color="primary"
        [disabled]="form.invalid || isSubmitting()"
        (click)="submit()"
        aria-label="Guardar cambios"
      >
        @if (isSubmitting()) {
          <mat-spinner diameter="20" />
        } @else {
          Guardar
        }
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    .dialog-form {
      display: flex;
      flex-direction: column;
      min-width: 400px;
      padding-top: 0.75rem;
    }

    .dialog-field {
      width: 100%;
      margin-bottom: 0.5rem;
    }

    .dialog-error {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.75rem 1rem;
      border-radius: 8px;
      background: rgba(244, 67, 54, 0.12);
      border: 1px solid rgba(244, 67, 54, 0.3);
      color: #ef9a9a;
      font-size: 0.875rem;
      margin-top: 0.5rem;

    }

    .dialog-error__icon {
      font-size: 1.1rem;
      width: 1.1rem;
      height: 1.1rem;
      flex-shrink: 0;
    }
  `],
})
export class EditTaskDialogComponent {
  private readonly tasksService = inject(TasksService);
  private readonly dialogRef = inject(MatDialogRef<EditTaskDialogComponent>);
  private readonly dialog = inject(MatDialog);
  private readonly destroyRef = inject(DestroyRef);

  // Datos inyectados desde el componente padre (tarea a editar, proyectos y usuarios disponibles)
  readonly data = inject<EditTaskDialogData>(MAT_DIALOG_DATA);

  // Estado de la UI
  readonly isSubmitting = signal(false);
  readonly errorMessage = signal<string | null>(null);

  // Formulario pre-cargado con los datos de la tarea
  readonly form = new FormGroup({
    title: new FormControl(this.data.task.title, {
      nonNullable: true,
      validators: [Validators.required],
    }),
    description: new FormControl(this.data.task.description ?? '', {
      nonNullable: true,
    }),
    status: new FormControl<TaskStatus>(this.data.task.status, {
      nonNullable: true,
    }),
    priority: new FormControl<TaskPriority>(this.data.task.priority, {
      nonNullable: true,
      validators: [Validators.required],
    }),
    projectId: new FormControl(this.data.task.project?.id ?? '', {
      nonNullable: true,
      validators: [Validators.required],
    }),
    assigneeId: new FormControl<string | null>(this.data.task.assignee?.id ?? null),
    dueDate: new FormControl<Date | null>(
      this.data.task.dueDate ? new Date(this.data.task.dueDate) : null
    ),
  });

  // Desarrolladores elegibles según el proyecto seleccionado; también
  // habilita/deshabilita y limpia el control de asignado según corresponda
  readonly eligibleDevelopers = bindAssigneeGating({
    projectControl: this.form.controls.projectId,
    assigneeControl: this.form.controls.assigneeId,
    projects: this.data.projects,
    users: this.data.users,
    destroyRef: this.destroyRef,
  });

  /** Maneja el envío del formulario */
  submit(): void {
    if (this.form.invalid || this.isSubmitting()) {
      this.form.markAllAsTouched();
      return;
    }

    const status = this.form.controls.status.value;
    const isCompletingTask = status === 'done' && this.data.task.status !== 'done';

    if (isCompletingTask) {
      const dialogData: ConfirmDialogData = {
        title: 'Completar tarea',
        message:
          'Al marcar la tarea como completada no podrás cambiar su estado de nuevo. ' +
          'Esta acción no se puede deshacer. Si queda trabajo pendiente, crea una tarea nueva.',
        confirmLabel: 'Completar',
      };

      const confirmRef = this.dialog.open(ConfirmDialogComponent, {
        width: '420px',
        data: dialogData,
      });

      confirmRef.afterClosed().subscribe((confirmed) => {
        if (confirmed) {
          this.performUpdate();
        } else {
          this.form.controls.status.setValue(this.data.task.status);
        }
      });
      return;
    }

    this.performUpdate();
  }

  /** Envía la actualización de la tarea al backend */
  private performUpdate(): void {
    this.isSubmitting.set(true);
    this.errorMessage.set(null);

    const { title, description, status, priority, projectId, assigneeId, dueDate } =
      this.form.getRawValue();

    this.tasksService
      .update(this.data.task.id, {
        title,
        description: description || undefined,
        status,
        priority,
        projectId,
        assigneeId,
        dueDate: dueDate ? dueDate.toISOString() : undefined,
      })
      .subscribe({
        next: (updated) => {
          this.isSubmitting.set(false);
          this.dialogRef.close(updated);
        },
        error: () => {
          this.isSubmitting.set(false);
          this.errorMessage.set('Error al actualizar la tarea. Intenta nuevamente.');
        },
      });
  }
}
