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
import {
  ConfirmDialogComponent,
  ConfirmDialogData,
} from '../../shared/ui/confirm-dialog/confirm-dialog.component';

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

  /**
   * Pide confirmación mediante el diálogo modal compartido antes de desactivar el proyecto:
   * deja de estar disponible para nuevas asignaciones y no es una acción trivial de deshacer
   * en el flujo de trabajo del equipo, por lo que amerita el mismo modal que usa "tasks".
   */
  requestDeactivate(project: Project): void {
    this.mutationError.set(null);

    const dialogData: ConfirmDialogData = {
      title: 'Desactivar proyecto',
      message: `El proyecto "${project.name}" pasará a estado inactivo y dejará de estar disponible para nuevas asignaciones hasta que se reactive.`,
      confirmLabel: 'Desactivar',
    };

    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '420px',
      data: dialogData,
    });

    dialogRef.afterClosed().subscribe((confirmed) => {
      if (confirmed) {
        this.deactivate(project.id);
      }
    });
  }

  /** Ejecuta la desactivación del proyecto indicado tras la confirmación del usuario. */
  private deactivate(id: string): void {
    this.projectsService.deactivateProject(id).subscribe({
      next: () => this.projectsResource.reload(),
      error: (err) => {
        const message =
          err?.status === 400
            ? 'El proyecto ya está inactivo.'
            : 'Error al desactivar el proyecto. Intenta nuevamente.';
        this.mutationError.set(message);
      },
    });
  }

  /**
   * Reactiva el proyecto directamente, sin confirmación: es la operación inversa de
   * desactivar, no destruye datos ni afecta a terceros, así que no justifica el mismo
   * modal (mismo criterio que "tasks" al no confirmar transiciones reversibles).
   */
  reactivate(project: Project): void {
    this.mutationError.set(null);

    this.projectsService.reactivateProject(project.id).subscribe({
      next: () => this.projectsResource.reload(),
      error: (err) => {
        const message =
          err?.status === 400
            ? 'El proyecto ya está activo.'
            : 'Error al reactivar el proyecto. Intenta nuevamente.';
        this.mutationError.set(message);
      },
    });
  }
}
