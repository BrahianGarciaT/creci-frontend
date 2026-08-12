import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { ConfirmDialogComponent } from '../../shared/ui/confirm-dialog/confirm-dialog.component';
import { buildCascadeConfirmData } from './user-cascade-confirm';
import { User, UpdateUserPayload, UsersService } from './users.service';

@Component({
  selector: 'app-edit-user-dialog',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatSelectModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './edit-user-dialog.component.html',
  styleUrl: './edit-user-dialog.component.scss',
})
export class EditUserDialogComponent {
  private readonly usersService = inject(UsersService);
  private readonly dialog = inject(MatDialog);
  private readonly dialogRef = inject(MatDialogRef<EditUserDialogComponent>);

  // Usuario inyectado desde el componente padre
  readonly user = inject<User>(MAT_DIALOG_DATA);

  // Estado de la UI
  readonly isSubmitting = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly hidePassword = signal(true);

  // Formulario pre-cargado con el rol actual — email es de solo lectura, password opcional
  readonly form = new FormGroup({
    role: new FormControl<'admin' | 'developer'>(this.user.role, {
      nonNullable: true,
    }),
    password: new FormControl('', {
      nonNullable: true,
      validators: [Validators.minLength(8)],
    }),
  });

  /** Alterna la visibilidad del campo de contraseña */
  togglePasswordVisibility(event: MouseEvent): void {
    event.stopPropagation();
    this.hidePassword.update((v) => !v);
  }

  /** Maneja el envío del formulario, pidiendo confirmación si el cambio de rol produce cascada */
  submit(): void {
    if (this.form.invalid || this.isSubmitting()) {
      this.form.markAllAsTouched();
      return;
    }

    const { role, password } = this.form.getRawValue();
    const willCascade =
      this.user.role === 'developer' && role !== 'developer' && this.user.projects.length > 0;

    if (willCascade) {
      const dialogData = buildCascadeConfirmData(this.user, 'demote');
      const dialogRef = this.dialog.open(ConfirmDialogComponent, {
        width: '420px',
        data: dialogData,
      });

      dialogRef.afterClosed().subscribe((confirmed) => {
        if (confirmed) {
          this.performUpdate(role, password);
        }
      });
      return;
    }

    this.performUpdate(role, password);
  }

  /** Ejecuta el PATCH con solo los campos definidos — password vacío se omite del payload */
  private performUpdate(role: 'admin' | 'developer', password: string): void {
    this.isSubmitting.set(true);
    this.errorMessage.set(null);

    const payload: UpdateUserPayload = { role };
    if (password) {
      payload.password = password;
    }

    this.usersService.updateUser(this.user.id, payload).subscribe({
      next: (updated) => {
        this.isSubmitting.set(false);
        this.dialogRef.close(updated);
      },
      error: () => {
        this.isSubmitting.set(false);
        this.errorMessage.set('Error al actualizar el usuario. Intenta nuevamente.');
      },
    });
  }
}
