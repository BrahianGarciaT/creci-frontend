import { inject, Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, shareReplay, tap } from 'rxjs';
import { environment } from '../../environments/environment';

// Contratos de la API de autenticación
interface Credentials {
  email: string;
  password: string;
}

interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

// Claves de localStorage para los tokens JWT
const ACCESS_TOKEN_KEY = 'accessToken';
const REFRESH_TOKEN_KEY = 'refreshToken';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);

  // Estado reactivo de autenticación basado en la existencia del access token
  readonly isAuthenticated = signal<boolean>(this.hasValidToken());

  // Observable compartido del refresh en vuelo — evita múltiples llamadas paralelas
  private refreshInFlight$: Observable<AuthTokens> | null = null;

  // --- Métodos públicos ---

  /**
   * Inicia sesión con las credenciales proporcionadas.
   * Almacena los tokens en localStorage y actualiza el estado.
   */
  login(email: string, password: string): Observable<AuthTokens> {
    return this.http
      .post<AuthTokens>(`${environment.apiUrl}/auth/login`, { email, password } satisfies Credentials)
      .pipe(tap((tokens) => this.setTokens(tokens)));
  }

  /**
   * Solicita un nuevo par de tokens usando el refreshToken almacenado.
   * Si ya hay un refresh en curso, reutiliza el mismo observable (shareReplay).
   */
  refresh(): Observable<AuthTokens> {
    if (this.refreshInFlight$) {
      return this.refreshInFlight$;
    }

    const refreshToken = this.getRefreshToken();

    this.refreshInFlight$ = this.http
      .post<AuthTokens>(`${environment.apiUrl}/auth/refresh`, { refreshToken })
      .pipe(
        tap({
          next: (tokens) => {
            this.setTokens(tokens);
            this.refreshInFlight$ = null;
          },
          error: () => {
            this.refreshInFlight$ = null;
          },
        }),
        shareReplay(1),
      );

    return this.refreshInFlight$;
  }

  /**
   * Cierra sesión: limpia tokens locales y navega a /login.
   * La llamada al backend es best-effort (fire-and-forget).
   */
  logout(): void {
    const accessToken = this.getAccessToken();

    this.http
      .post(`${environment.apiUrl}/auth/logout`, {}, {
        headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
      })
      .subscribe({ error: () => { /* ignoramos errores del logout remoto */ } });

    this.clearTokens();
    this.router.navigate(['/login']);
  }

  /** Devuelve el accessToken almacenado en localStorage, o null si no existe. */
  getAccessToken(): string | null {
    return localStorage.getItem(ACCESS_TOKEN_KEY);
  }

  /** Devuelve el refreshToken almacenado en localStorage, o null si no existe. */
  getRefreshToken(): string | null {
    return localStorage.getItem(REFRESH_TOKEN_KEY);
  }

  /** Elimina ambos tokens de localStorage y actualiza el estado de autenticación. */
  clearTokens(): void {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    this.isAuthenticated.set(false);
  }

  // --- Métodos privados ---

  /** Almacena los tokens y marca el usuario como autenticado. */
  private setTokens(tokens: AuthTokens): void {
    localStorage.setItem(ACCESS_TOKEN_KEY, tokens.accessToken);
    localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refreshToken);
    this.isAuthenticated.set(true);
  }

  /** Verifica si existe un accessToken válido (no vacío) en localStorage. */
  private hasValidToken(): boolean {
    const token = localStorage.getItem(ACCESS_TOKEN_KEY);
    return token !== null && token.length > 0;
  }
}
