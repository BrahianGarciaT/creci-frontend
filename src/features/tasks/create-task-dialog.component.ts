import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { Project } from '../projects/projects.service';
import { User } from '../users/users.service';
import { TaskPriority, TasksService } from './tasks.service';

// Datos inyectados al abrir el diálogo desde el componente padre
export interface CreateTaskDialogData {
  projects: Project[];
  users: User[];
}

@Component({
  selector: 'app-create-task-dialog',
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
    <h2 mat-dialog-title>Nueva tarea</h2>

    <mat-dialog-content>
      <form
        [formGroup]="form"
        (ngSubmit)="submit()"
        novalidate
        aria-label="Formulario de creación de tarea"
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
            @for (user of developerUsers; track user.id) {
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
        aria-label="Crear tarea"
      >
        @if (isSubmitting()) {
          <mat-spinner diameter="20" />
        } @else {
          Crear
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

      &__icon {
        font-size: 1.1rem;
        width: 1.1rem;
        height: 1.1rem;
        flex-shrink: 0;
      }
    }
  `],
})
export class CreateTaskDialogComponent {
  private readonly tasksService = inject(TasksService);
  private readonly dialogRef = inject(MatDialogRef<CreateTaskDialogComponent>);

  // Datos inyectados desde el componente padre (lista de proyectos y usuarios)
  readonly data = inject<CreateTaskDialogData>(MAT_DIALOG_DATA);

  // Estado de la UI
  readonly isSubmitting = signal(false);
  readonly errorMessage = signal<string | null>(null);

  // Solo desarrolladores pueden ser asignados a tareas
  get developerUsers(): User[] {
    return this.data.users.filter((u) => u.role === 'developer');
  }

  // Formulario reactivo con validaciones de campos
  readonly form = new FormGroup({
    title: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required],
    }),
    description: new FormControl('', {
      nonNullable: true,
    }),
    priority: new FormControl<TaskPriority | ''>('', {
      nonNullable: true,
      validators: [Validators.required],
    }),
    projectId: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required],
    }),
    assigneeId: new FormControl<string | null>(null),
    dueDate: new FormControl<Date | null>(null),
  });

  /** Maneja el envío del formulario */
  submit(): void {
    if (this.form.invalid || this.isSubmitting()) {
      this.form.markAllAsTouched();
      return;
    }

    this.isSubmitting.set(true);
    this.errorMessage.set(null);

    const { title, description, priority, projectId, assigneeId, dueDate } = this.form.getRawValue();

    this.tasksService
      .create({
        title,
        priority: priority as TaskPriority,
        projectId,
        description: description || undefined,
        assigneeId: assigneeId ?? undefined,
        dueDate: dueDate ? dueDate.toISOString() : undefined,
      })
      .subscribe({
        next: (task) => {
          this.isSubmitting.set(false);
          this.dialogRef.close(task);
        },
        error: () => {
          this.isSubmitting.set(false);
          this.errorMessage.set('Error al crear la tarea. Intenta nuevamente.');
        },
      });
  }
}
