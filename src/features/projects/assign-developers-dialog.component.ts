import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { UsersService } from '../users/users.service';
import { Project, ProjectsService } from './projects.service';

@Component({
  selector: 'app-assign-developers-dialog',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './assign-developers-dialog.component.html',
  styleUrl: './assign-developers-dialog.component.scss',
})
export class AssignDevelopersDialogComponent {
  private readonly projectsService = inject(ProjectsService);
  private readonly usersService = inject(UsersService);
  private readonly dialogRef = inject(MatDialogRef<AssignDevelopersDialogComponent>);

  // Proyecto inyectado desde el componente padre
  readonly project = inject<Project>(MAT_DIALOG_DATA);

  // Recurso reactivo de usuarios — filtramos client-side por role y estado
  private readonly usersResource = this.usersService.users;

  // Desarrolladores disponibles: solo usuarios activos con rol developer
  readonly availableDevelopers = computed(() =>
    (this.usersResource.value() ?? []).filter(
      (u) => u.role === 'developer' && u.isActive
    )
  );

  // Estado de carga del listado de usuarios
  readonly isLoadingUsers = computed(() => this.usersResource.isLoading());

  // Estado de la UI
  readonly isSubmitting = signal(false);
  readonly errorMessage = signal<string | null>(null);

  // Control del selector múltiple — pre-cargado con IDs de desarrolladores actuales
  readonly developersControl = new FormControl<string[]>(
    this.project.developers.map((d) => d.id),
    { nonNullable: true }
  );

  /** Maneja el envío del formulario */
  submit(): void {
    if (this.isSubmitting()) return;

    this.isSubmitting.set(true);
    this.errorMessage.set(null);

    const developerIds = this.developersControl.getRawValue();

    this.projectsService.assignDevelopers(this.project.id, { developerIds }).subscribe({
      next: (updated) => {
        this.isSubmitting.set(false);
        this.dialogRef.close(updated);
      },
      error: (err) => {
        this.isSubmitting.set(false);
        const message =
          err?.status === 400
            ? 'Algunos usuarios seleccionados no son desarrolladores activos válidos.'
            : 'Error al asignar desarrolladores. Intenta nuevamente.';
        this.errorMessage.set(message);
        // No se cierra el diálogo — el usuario puede corregir la selección
      },
    });
  }
}
