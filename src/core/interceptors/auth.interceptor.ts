import { inject } from '@angular/core';
import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { catchError, switchMap, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';

// URLs de autenticación que deben pasar sin modificación ni reintentos
const AUTH_BYPASS_URLS = ['/auth/login', '/auth/refresh'];

/**
 * Interceptor funcional de autenticación.
 *
 * Responsabilidades:
 * 1. Adjunta el header Authorization: Bearer <token> a todas las peticiones
 *    que no sean a endpoints de autenticación.
 * 2. Al recibir 401 en una petición normal:
 *    - Llama a AuthService.refresh() (compartido si hay otro en curso)
 *    - Reintenta la petición original con el nuevo token
 * 3. Si el refresh falla, limpia los tokens y redirige a /login.
 * 4. En peticiones a /auth/login o /auth/refresh que reciban 401,
 *    no se intenta refresh (guarda loop infinito).
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);

  // Verificamos si la URL pertenece a los endpoints de bypass
  const isAuthUrl = AUTH_BYPASS_URLS.some((url) => req.url.includes(url));

  // Adjuntamos Bearer si tenemos token y no es una URL de auth
  const accessToken = authService.getAccessToken();
  const authorizedReq =
    accessToken && !isAuthUrl
      ? req.clone({ setHeaders: { Authorization: `Bearer ${accessToken}` } })
      : req;

  return next(authorizedReq).pipe(
    catchError((error: HttpErrorResponse) => {
      // Solo manejamos 401 en peticiones que NO son de autenticación
      if (error.status !== 401 || isAuthUrl) {
        return throwError(() => error);
      }

      // Intentamos renovar el token — si ya hay un refresh en vuelo, se reutiliza
      return authService.refresh().pipe(
        switchMap(() => {
          // Reintento con el nuevo access token
          const newToken = authService.getAccessToken();
          const retryReq = newToken
            ? req.clone({ setHeaders: { Authorization: `Bearer ${newToken}` } })
            : req;
          return next(retryReq);
        }),
        catchError((refreshError) => {
          // El refresh falló — limpiamos sesión y redirigimos
          authService.clearTokens();
          authService.logout();
          return throwError(() => refreshError);
        }),
      );
    }),
  );
};
