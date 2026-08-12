import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTableModule } from '@angular/material/table';
import { CreateUserDialogComponent } from './create-user-dialog.component';
import { EditUserDialogComponent } from './edit-user-dialog.component';
import { buildCascadeConfirmData } from './user-cascade-confirm';
import { User, UsersService } from './users.service';
import {
  ConfirmDialogComponent,
  ConfirmDialogData,
} from '../../shared/ui/confirm-dialog/confirm-dialog.component';

@Component({
  selector: 'app-users',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatTableModule, MatButtonModule, MatIconModule, MatProgressSpinnerModule],
  templateUrl: './users.component.html',
  styleUrl: './users.component.scss',
})
export class UsersComponent {
  private readonly usersService = inject(UsersService);
  private readonly dialog = inject(MatDialog);

  // Recurso reactivo de la lista — .reload() recarga los datos desde el servidor
  readonly usersResource = this.usersService.users;

  // Columnas visibles en la tabla
  readonly displayedColumns = ['email', 'role', 'status', 'actions'];

  // Mensaje de error de mutaciones (deactivate/reactivate) — independiente del recurso
  readonly mutationError = signal<string | null>(null);

  /** Abre el diálogo de creación y recarga la lista si se creó un usuario. */
  openCreateDialog(): void {
    const dialogRef = this.dialog.open(CreateUserDialogComponent, {
      width: '480px',
      disableClose: false,
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.usersResource.reload();
      }
    });
  }

  /** Abre el diálogo de edición y recarga la lista si el usuario fue actualizado. */
  openEditDialog(user: User): void {
    const dialogRef = this.dialog.open(EditUserDialogComponent, {
      width: '480px',
      data: user,
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.usersResource.reload();
      }
    });
  }

  /**
   * Pide confirmación mediante el diálogo modal compartido antes de desactivar al usuario:
   * el usuario deja de poder iniciar sesión de inmediato y pierde sus asignaciones de
   * proyecto, por lo que amerita el mismo copy que advierte sobre la cascada en edición.
   */
  requestDeactivate(user: User): void {
    this.mutationError.set(null);

    const dialogData: ConfirmDialogData = buildCascadeConfirmData(user, 'deactivate');

    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '420px',
      data: dialogData,
    });

    dialogRef.afterClosed().subscribe((confirmed) => {
      if (confirmed) {
        this.deactivate(user.id);
      }
    });
  }

  /** Ejecuta la desactivación del usuario indicado tras la confirmación. */
  private deactivate(id: string): void {
    this.usersService.deactivate(id).subscribe({
      next: () => this.usersResource.reload(),
      error: () => {
        this.mutationError.set('Error al desactivar el usuario. Intenta nuevamente.');
      },
    });
  }

  /**
   * Reactiva al usuario directamente, sin confirmación: es la operación inversa de
   * desactivar y no destruye datos, así que no justifica el mismo modal (mismo criterio
   * que "tasks" al no confirmar transiciones reversibles).
   */
  reactivate(user: User): void {
    this.mutationError.set(null);

    this.usersService.reactivate(user.id).subscribe({
      next: () => this.usersResource.reload(),
      error: () => {
        this.mutationError.set('Error al reactivar el usuario. Intenta nuevamente.');
      },
    });
  }
}
