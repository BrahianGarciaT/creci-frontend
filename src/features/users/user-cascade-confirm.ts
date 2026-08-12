import { ConfirmDialogData } from '../../shared/ui/confirm-dialog/confirm-dialog.component';
import { User } from './users.service';

// Acción que dispara la advertencia de cascada — cambia el copy del mensaje
export type CascadeAction = 'demote' | 'deactivate';

/**
 * Construye los datos del diálogo de confirmación genérico para advertir sobre
 * la cascada que elimina al usuario de sus proyectos asignados (al cambiar el
 * rol fuera de "developer" o al desactivar la cuenta). Nombra cada proyecto
 * afectado para que el admin sepa exactamente qué se ve impactado.
 */
export function buildCascadeConfirmData(user: User, action: CascadeAction): ConfirmDialogData {
  const projectNames = user.projects.map((project) => project.name).join(', ');
  const cascadeClause =
    user.projects.length > 0 ? ` y será removido de los siguientes proyectos: ${projectNames}` : '';

  if (action === 'demote') {
    return {
      title: 'Cambiar rol de usuario',
      message: `El usuario "${user.email}"${cascadeClause || ' no tiene proyectos asignados'}.`,
      confirmLabel: 'Cambiar rol',
    };
  }

  return {
    title: 'Desactivar usuario',
    message: `El usuario "${user.email}" no podrá iniciar sesión hasta que se reactive su cuenta${cascadeClause}.`,
    confirmLabel: 'Desactivar',
  };
}
