import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ProjectsService } from './projects.service';

@Component({
  selector: 'app-create-project-dialog',
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
  templateUrl: './create-project-dialog.component.html',
  styleUrl: './create-project-dialog.component.scss',
})
export class CreateProjectDialogComponent {
  private readonly projectsService = inject(ProjectsService);
  private readonly dialogRef = inject(MatDialogRef<CreateProjectDialogComponent>);

  // Estado de la UI
  readonly isSubmitting = signal(false);
  readonly errorMessage = signal<string | null>(null);

  // Formulario reactivo con validaciones de campos
  readonly form = new FormGroup({
    name: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required],
    }),
    description: new FormControl('', {
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

    this.projectsService.createProject({ name, description: description || undefined }).subscribe({
      next: (project) => {
        this.isSubmitting.set(false);
        this.dialogRef.close(project);
      },
      error: () => {
        this.isSubmitting.set(false);
        this.errorMessage.set('Error al crear el proyecto. Intenta nuevamente.');
      },
    });
  }
}
