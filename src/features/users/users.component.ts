import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTableModule } from '@angular/material/table';
import { CreateUserDialogComponent } from './create-user-dialog.component';
import { UsersService } from './users.service';

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

  // ID del usuario pendiente de confirmar desactivación (null = ninguno)
  readonly pendingDeactivateId = signal<string | null>(null);

  // ID del usuario pendiente de confirmar reactivación (null = ninguno)
  readonly pendingReactivateId = signal<string | null>(null);

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

  /** Marca un usuario como "pendiente de confirmar desactivación". */
  requestDeactivate(id: string): void {
    this.mutationError.set(null);
    this.pendingDeactivateId.set(id);
  }

  /** Cancela el paso de confirmación de desactivación. */
  cancelDeactivate(): void {
    this.pendingDeactivateId.set(null);
  }

  /** Confirma y ejecuta la desactivación del usuario indicado. */
  confirmDeactivate(id: string): void {
    this.usersService.deactivate(id).subscribe({
      next: () => {
        this.usersResource.reload();
        this.pendingDeactivateId.set(null);
      },
      error: () => {
        this.mutationError.set('Error al desactivar el usuario. Intenta nuevamente.');
        this.pendingDeactivateId.set(null);
      },
    });
  }

  /** Marca un usuario como "pendiente de confirmar reactivación". */
  requestReactivate(id: string): void {
    this.mutationError.set(null);
    this.pendingReactivateId.set(id);
  }

  /** Cancela el paso de confirmación de reactivación. */
  cancelReactivate(): void {
    this.pendingReactivateId.set(null);
  }

  /** Confirma y ejecuta la reactivación del usuario indicado. */
  confirmReactivate(id: string): void {
    this.usersService.reactivate(id).subscribe({
      next: () => {
        this.usersResource.reload();
        this.pendingReactivateId.set(null);
      },
      error: () => {
        this.mutationError.set('Error al reactivar el usuario. Intenta nuevamente.');
        this.pendingReactivateId.set(null);
      },
    });
  }
}
