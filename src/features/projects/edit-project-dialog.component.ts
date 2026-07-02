import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Project, ProjectsService } from './projects.service';

@Component({
  selector: 'app-edit-project-dialog',
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
  ],
  templateUrl: './edit-project-dialog.component.html',
  styleUrl: './edit-project-dialog.component.scss',
})
export class EditProjectDialogComponent {
  private readonly projectsService = inject(ProjectsService);
  private readonly dialogRef = inject(MatDialogRef<EditProjectDialogComponent>);

  // Proyecto inyectado desde el componente padre
  readonly project = inject<Project>(MAT_DIALOG_DATA);

  // Estado de la UI
  readonly isSubmitting = signal(false);
  readonly errorMessage = signal<string | null>(null);

  // Formulario pre-cargado con los datos del proyecto
  readonly form = new FormGroup({
    name: new FormControl(this.project.name, {
      nonNullable: true,
      validators: [Validators.required],
    }),
    description: new FormControl(this.project.description ?? '', {
      nonNullable: true,
    }),
  });

  /** Maneja el envío del formulario */
  submit(): void {
    if (this.form.invalid || this.isSubmitting()) {
      this.form.markAllAsTouched();
      return;
    }

    this.isSubmitting.set(true);
    this.errorMessage.set(null);

    const { name, description } = this.form.getRawValue();

    this.projectsService.updateProject(this.project.id, { name, description: description || undefined }).subscribe({
      next: (updated) => {
        this.isSubmitting.set(false);
        this.dialogRef.close(updated);
      },
      error: () => {
        this.isSubmitting.set(false);
        this.errorMessage.set('Error al actualizar el proyecto. Intenta nuevamente.');
      },
    });
  }
}
