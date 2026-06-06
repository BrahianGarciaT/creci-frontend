import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

/**
 * Guard funcional de administrador.
 * Permite la navegación solo si el usuario autenticado tiene rol 'admin'.
 * En cualquier otro caso (sin sesión o rol diferente) redirige a /login.
 */
export const adminGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.currentUser()?.role === 'admin') {
    return true;
  }

  // Devuelve un UrlTree que redirige al login
  return router.parseUrl('/login');
};
