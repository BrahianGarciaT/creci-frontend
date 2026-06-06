import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { UsersService } from './users.service';

@Component({
  selector: 'app-create-user-dialog',
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
  templateUrl: './create-user-dialog.component.html',
  styleUrl: './create-user-dialog.component.scss',
})
export class CreateUserDialogComponent {
  private readonly usersService = inject(UsersService);
  private readonly dialogRef = inject(MatDialogRef<CreateUserDialogComponent>);

  // Estado de la UI
  readonly isSubmitting = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly hidePassword = signal(true);

  // Formulario reactivo con validaciones de campos
  readonly form = new FormGroup({
    email: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.email],
    }),
    password: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(8)],
    }),
    role: new FormControl('developer', {
      nonNullable: true,
    }),
  });

  /** Alterna la visibilidad del campo de contraseña */
  togglePasswordVisibility(event: MouseEvent): void {
    event.stopPropagation();
    this.hidePassword.update((v) => !v);
  }

  /** Maneja el envío del formulario */
  submit(): void {
    if (this.form.invalid || this.isSubmitting()) {
      this.form.markAllAsTouched();
      return;
    }

    this.isSubmitting.set(true);
    this.errorMessage.set(null);

    const { email, password, role } = this.form.getRawValue();

    this.usersService.create({ email, password, role }).subscribe({
      next: (user) => {
        this.isSubmitting.set(false);
        this.dialogRef.close(user);
      },
      error: (err) => {
        this.isSubmitting.set(false);
        if (err?.status === 409) {
          // Conflicto: email ya existe — error inline en el campo
          this.form.controls.email.setErrors({ conflict: true });
        } else {
          // Error genérico — banner visible al usuario
          this.errorMessage.set('Error al crear el usuario. Intentá nuevamente.');
        }
      },
    });
  }
}
