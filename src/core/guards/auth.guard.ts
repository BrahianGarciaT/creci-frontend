import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

/**
 * Guard funcional de autenticación.
 * Permite la navegación si el usuario está autenticado;
 * de lo contrario, redirige a /login.
 */
export const authGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isAuthenticated()) {
    return true;
  }

  // Devuelve un UrlTree que redirige al login
  return router.parseUrl('/login');
};
