import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { CreateProjectDialogComponent } from './create-project-dialog.component';
import { EditProjectDialogComponent } from './edit-project-dialog.component';
import { AssignDevelopersDialogComponent } from './assign-developers-dialog.component';
import { Project, ProjectsService } from './projects.service';

@Component({
  selector: 'app-projects',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
  ],
  templateUrl: './projects.component.html',
  styleUrl: './projects.component.scss',
})
export class ProjectsComponent {
  private readonly projectsService = inject(ProjectsService);
  private readonly dialog = inject(MatDialog);

  // Recurso reactivo de la lista — .reload() recarga los datos desde el servidor
  readonly projectsResource = this.projectsService.projects;

  // Columnas visibles en la tabla
  readonly displayedColumns = ['name', 'description', 'status', 'developers', 'actions'];

  // ID del proyecto pendiente de confirmar desactivación (null = ninguno)
  readonly pendingDeactivateId = signal<string | null>(null);

  // ID del proyecto pendiente de confirmar reactivación (null = ninguno)
  readonly pendingReactivateId = signal<string | null>(null);

  // Mensaje de error de mutaciones — independiente del recurso
  readonly mutationError = signal<string | null>(null);

  /** Abre el diálogo de creación y recarga la lista si se creó un proyecto. */
  openCreateDialog(): void {
    const dialogRef = this.dialog.open(CreateProjectDialogComponent, {
      width: '480px',
      disableClose: false,
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.projectsResource.reload();
      }
    });
  }

  /** Abre el diálogo de edición con el proyecto seleccionado y recarga la lista si se editó. */
  openEditDialog(project: Project): void {
    const dialogRef = this.dialog.open(EditProjectDialogComponent, {
      width: '480px',
      disableClose: false,
      data: project,
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.projectsResource.reload();
      }
    });
  }

  /** Abre el diálogo de asignación de desarrolladores y recarga la lista si se actualizó. */
  openAssignDialog(project: Project): void {
    const dialogRef = this.dialog.open(AssignDevelopersDialogComponent, {
      width: '520px',
      disableClose: false,
      data: project,
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.projectsResource.reload();
      }
    });
  }

  /** Marca un proyecto como "pendiente de confirmar desactivación". */
  requestDeactivate(id: string): void {
    this.mutationError.set(null);
    this.pendingDeactivateId.set(id);
  }

  /** Cancela el paso de confirmación de desactivación. */
  cancelDeactivate(): void {
    this.pendingDeactivateId.set(null);
  }

  /** Confirma y ejecuta la desactivación del proyecto indicado. */
  confirmDeactivate(id: string): void {
    this.projectsService.deactivateProject(id).subscribe({
      next: () => {
        this.projectsResource.reload();
        this.pendingDeactivateId.set(null);
      },
      error: (err) => {
        const message =
          err?.status === 400
            ? 'El proyecto ya está inactivo.'
            : 'Error al desactivar el proyecto. Intenta nuevamente.';
        this.mutationError.set(message);
        this.pendingDeactivateId.set(null);
      },
    });
  }

  /** Marca un proyecto como "pendiente de confirmar reactivación". */
  requestReactivate(id: string): void {
    this.mutationError.set(null);
    this.pendingReactivateId.set(id);
  }

  /** Cancela el paso de confirmación de reactivación. */
  cancelReactivate(): void {
    this.pendingReactivateId.set(null);
  }

  /** Confirma y ejecuta la reactivación del proyecto indicado. */
  confirmReactivate(id: string): void {
    this.projectsService.reactivateProject(id).subscribe({
      next: () => {
        this.projectsResource.reload();
        this.pendingReactivateId.set(null);
      },
      error: (err) => {
        const message =
          err?.status === 400
            ? 'El proyecto ya está activo.'
            : 'Error al reactivar el proyecto. Intenta nuevamente.';
        this.mutationError.set(message);
        this.pendingReactivateId.set(null);
      },
    });
  }
}
