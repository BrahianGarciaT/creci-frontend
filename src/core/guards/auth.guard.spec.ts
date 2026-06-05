import { TestBed } from '@angular/core/testing';
import { Router, UrlTree } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { authGuard } from './auth.guard';
import { AuthService } from '../services/auth.service';

describe('authGuard', () => {
  let router: Router;
  let authService: AuthService;

  beforeEach(() => {
    localStorage.clear();

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([{ path: '**', redirectTo: '' }]),
        AuthService,
      ],
    });

    router = TestBed.inject(Router);
    authService = TestBed.inject(AuthService);
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('debe permitir la navegación cuando el usuario está autenticado', () => {
    // Simulamos que hay un token válido
    localStorage.setItem('accessToken', 'valid-token');
    // Recreamos el servicio para que lea el token del localStorage
    authService.isAuthenticated.set(true);

    const result = TestBed.runInInjectionContext(() => authGuard({} as any, {} as any));

    expect(result).toBe(true);
  });

  it('debe redirigir a /login cuando el usuario NO está autenticado', () => {
    // Sin token en localStorage
    authService.isAuthenticated.set(false);

    const result = TestBed.runInInjectionContext(() => authGuard({} as any, {} as any));

    expect(result).toBeInstanceOf(UrlTree);
    const urlTree = result as UrlTree;
    expect(router.serializeUrl(urlTree)).toBe('/login');
  });
});
