import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';

// Datos inyectados al abrir el diálogo de confirmación genérico
export interface ConfirmDialogData {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
}

/**
 * Diálogo de confirmación genérico y agnóstico de feature (primitiva de UI compartida).
 * Se cierra con `true` al confirmar o `false` al cancelar/descartar.
 */
@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatButtonModule, MatDialogModule],
  template: `
    <h2 mat-dialog-title>{{ data.title }}</h2>

    <mat-dialog-content>
      <p>{{ data.message }}</p>
    </mat-dialog-content>

    <mat-dialog-actions align="end">
      <button
        type="button"
        mat-button
        (click)="dialogRef.close(false)"
        [attr.aria-label]="data.cancelLabel ?? 'Cancelar'"
      >
        {{ data.cancelLabel ?? 'Cancelar' }}
      </button>
      <button
        type="button"
        mat-raised-button
        color="primary"
        (click)="dialogRef.close(true)"
        [attr.aria-label]="data.confirmLabel ?? 'Confirmar'"
      >
        {{ data.confirmLabel ?? 'Confirmar' }}
      </button>
    </mat-dialog-actions>
  `,
})
export class ConfirmDialogComponent {
  readonly dialogRef = inject(MatDialogRef<ConfirmDialogComponent>);
  readonly data = inject<ConfirmDialogData>(MAT_DIALOG_DATA);
}
