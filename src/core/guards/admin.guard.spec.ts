import { TestBed } from '@angular/core/testing';
import { Router, UrlTree } from '@angular/router';
import { signal } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { adminGuard } from './admin.guard';
import { AuthService } from '../services/auth.service';
import { CurrentUser } from '../services/auth.service';

describe('adminGuard', () => {
  let router: Router;

  // Señal mutable que representa el usuario actual en cada test
  const mockCurrentUser = signal<CurrentUser | null>(null);

  beforeEach(() => {
    localStorage.clear();

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([{ path: '**', redirectTo: '' }]),
        {
          provide: AuthService,
          // Proveemos un mock mínimo: solo la señal currentUser que usa el guard
          useValue: { currentUser: mockCurrentUser },
        },
      ],
    });

    router = TestBed.inject(Router);
  });

  afterEach(() => {
    localStorage.clear();
    // Reseteamos la señal entre tests
    mockCurrentUser.set(null);
  });

  it('debe permitir la navegación cuando el rol es admin', () => {
    mockCurrentUser.set({ id: 'u1', email: 'admin@test.com', role: 'admin' });

    const result = TestBed.runInInjectionContext(() => adminGuard({} as any, {} as any));

    expect(result).toBe(true);
  });

  it('debe redirigir a /login cuando el rol es developer', () => {
    mockCurrentUser.set({ id: 'u2', email: 'dev@test.com', role: 'developer' });

    const result = TestBed.runInInjectionContext(() => adminGuard({} as any, {} as any));

    expect(result).toBeInstanceOf(UrlTree);
    expect(router.serializeUrl(result as UrlTree)).toBe('/login');
  });

  it('debe redirigir a /login cuando currentUser es null (sin sesión)', () => {
    mockCurrentUser.set(null);

    const result = TestBed.runInInjectionContext(() => adminGuard({} as any, {} as any));

    expect(result).toBeInstanceOf(UrlTree);
    expect(router.serializeUrl(result as UrlTree)).toBe('/login');
  });
});
