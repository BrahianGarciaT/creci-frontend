import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { provideRouter } from '@angular/router';
import { Component } from '@angular/core';
import { AuthService } from './auth.service';
import { environment } from '../../environments/environment';

// Componente stub para que el router tenga la ruta /login disponible
@Component({ template: '', standalone: true })
class LoginStubComponent {}

describe('AuthService', () => {
  let service: AuthService;
  let httpMock: HttpTestingController;
  let router: Router;

  beforeEach(() => {
    // Limpiamos localStorage antes de cada prueba
    localStorage.clear();

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        // Proveemos la ruta /login para que el router no arroje NG04002
        provideRouter([{ path: 'login', component: LoginStubComponent }]),
        AuthService,
      ],
    });

    service = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
  });

  // --- login() ---

  it('debe almacenar los tokens en localStorage tras un login exitoso', () => {
    const tokens = { accessToken: 'access-123', refreshToken: 'refresh-456' };

    service.login('user@test.com', 'password123').subscribe();

    const req = httpMock.expectOne(`${environment.apiUrl}/auth/login`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ email: 'user@test.com', password: 'password123' });
    req.flush(tokens);

    expect(localStorage.getItem('accessToken')).toBe('access-123');
    expect(localStorage.getItem('refreshToken')).toBe('refresh-456');
  });

  it('debe marcar isAuthenticated como true tras login exitoso', () => {
    const tokens = { accessToken: 'access-123', refreshToken: 'refresh-456' };

    service.login('user@test.com', 'password123').subscribe();

    const req = httpMock.expectOne(`${environment.apiUrl}/auth/login`);
    req.flush(tokens);

    expect(service.isAuthenticated()).toBe(true);
  });

  it('debe propagar el error en caso de login fallido (401)', () => {
    let errorReceived = false;

    service.login('user@test.com', 'wrong-password').subscribe({
      error: () => { errorReceived = true; },
    });

    const req = httpMock.expectOne(`${environment.apiUrl}/auth/login`);
    req.flush('Unauthorized', { status: 401, statusText: 'Unauthorized' });

    expect(errorReceived).toBe(true);
    expect(localStorage.getItem('accessToken')).toBeNull();
  });

  // --- logout() ---

  it('debe limpiar los tokens de localStorage al hacer logout', () => {
    localStorage.setItem('accessToken', 'access-123');
    localStorage.setItem('refreshToken', 'refresh-456');

    service.logout();

    // Consumimos la petición de logout al backend (best-effort)
    const req = httpMock.expectOne(`${environment.apiUrl}/auth/logout`);
    req.flush({});

    expect(localStorage.getItem('accessToken')).toBeNull();
    expect(localStorage.getItem('refreshToken')).toBeNull();
  });

  it('debe marcar isAuthenticated como false tras logout', () => {
    localStorage.setItem('accessToken', 'access-123');
    localStorage.setItem('refreshToken', 'refresh-456');

    service.logout();

    const req = httpMock.expectOne(`${environment.apiUrl}/auth/logout`);
    req.flush({});

    expect(service.isAuthenticated()).toBe(false);
  });

  // --- refresh() ---

  it('debe actualizar los tokens tras un refresh exitoso', () => {
    localStorage.setItem('refreshToken', 'old-refresh');
    const newTokens = { accessToken: 'new-access', refreshToken: 'new-refresh' };

    service.refresh().subscribe();

    const req = httpMock.expectOne(`${environment.apiUrl}/auth/refresh`);
    expect(req.request.method).toBe('POST');
    req.flush(newTokens);

    expect(localStorage.getItem('accessToken')).toBe('new-access');
    expect(localStorage.getItem('refreshToken')).toBe('new-refresh');
  });

  it('debe limpiar el observable en vuelo tras un refresh fallido', () => {
    localStorage.setItem('refreshToken', 'expired-refresh');

    service.refresh().subscribe({ error: () => {} });

    const req = httpMock.expectOne(`${environment.apiUrl}/auth/refresh`);
    req.flush('Unauthorized', { status: 401, statusText: 'Unauthorized' });

    // Verificamos que se puede llamar refresh nuevamente (el observable en vuelo fue limpiado)
    service.refresh().subscribe({ error: () => {} });
    const req2 = httpMock.expectOne(`${environment.apiUrl}/auth/refresh`);
    req2.flush('Unauthorized', { status: 401, statusText: 'Unauthorized' });
  });

  it('debe compartir el mismo observable para requests paralelas de refresh', () => {
    localStorage.setItem('refreshToken', 'refresh-token');
    const newTokens = { accessToken: 'new-access', refreshToken: 'new-refresh' };

    // Dos llamadas simultáneas a refresh
    service.refresh().subscribe();
    service.refresh().subscribe();

    // Solo debe haber UNA petición HTTP
    const requests = httpMock.match(`${environment.apiUrl}/auth/refresh`);
    expect(requests.length).toBe(1);
    requests[0].flush(newTokens);
  });

  // --- getAccessToken() / getRefreshToken() ---

  it('debe devolver null cuando no hay accessToken almacenado', () => {
    expect(service.getAccessToken()).toBeNull();
  });

  it('debe devolver el accessToken almacenado', () => {
    localStorage.setItem('accessToken', 'my-token');
    expect(service.getAccessToken()).toBe('my-token');
  });

  // --- clearTokens() ---

  it('debe eliminar ambos tokens sin hacer ninguna petición HTTP', () => {
    localStorage.setItem('accessToken', 'access');
    localStorage.setItem('refreshToken', 'refresh');

    service.clearTokens();

    httpMock.expectNone(`${environment.apiUrl}/auth/logout`);
    expect(localStorage.getItem('accessToken')).toBeNull();
    expect(localStorage.getItem('refreshToken')).toBeNull();
    expect(service.isAuthenticated()).toBe(false);
  });

  // --- isAuthenticated (signal inicial) ---

  it('debe iniciar como autenticado si ya hay un accessToken en localStorage', () => {
    // Configuramos el token ANTES de crear el servicio
    localStorage.setItem('accessToken', 'existing-token');

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([{ path: 'login', component: LoginStubComponent }]),
        AuthService,
      ],
    });

    const freshService = TestBed.inject(AuthService);
    TestBed.inject(HttpTestingController); // registrar para afterEach verify

    expect(freshService.isAuthenticated()).toBe(true);
  });
});
