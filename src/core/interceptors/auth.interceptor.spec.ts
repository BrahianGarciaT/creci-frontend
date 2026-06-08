import { TestBed } from '@angular/core/testing';
import {
  HttpClient,
  HttpErrorResponse,
  provideHttpClient,
  withInterceptors,
} from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { authInterceptor } from './auth.interceptor';
import { AuthService } from '../services/auth.service';
import { environment } from '../../environments/environment';

describe('authInterceptor', () => {
  let httpClient: HttpClient;
  let httpMock: HttpTestingController;
  let authService: AuthService;

  beforeEach(() => {
    localStorage.clear();

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        provideRouter([]),
        AuthService,
      ],
    });

    httpClient = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
    authService = TestBed.inject(AuthService);
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
  });

  // --- Adjuntar Bearer ---

  it('debe adjuntar el header Authorization: Bearer cuando hay accessToken', () => {
    localStorage.setItem('accessToken', 'my-access-token');

    httpClient.get(`${environment.apiUrl}/api/data`).subscribe();

    const req = httpMock.expectOne(`${environment.apiUrl}/api/data`);
    expect(req.request.headers.get('Authorization')).toBe('Bearer my-access-token');
    req.flush({});
  });

  it('no debe adjuntar Authorization si no hay accessToken', () => {
    httpClient.get(`${environment.apiUrl}/api/data`).subscribe();

    const req = httpMock.expectOne(`${environment.apiUrl}/api/data`);
    expect(req.request.headers.has('Authorization')).toBe(false);
    req.flush({});
  });

  // --- Bypass de endpoints de autenticación ---

  it('no debe adjuntar Bearer a peticiones a /auth/login', () => {
    localStorage.setItem('accessToken', 'my-token');

    httpClient.post(`${environment.apiUrl}/auth/login`, {}).subscribe();

    const req = httpMock.expectOne(`${environment.apiUrl}/auth/login`);
    expect(req.request.headers.has('Authorization')).toBe(false);
    req.flush({ accessToken: 'tok', refreshToken: 'ref' });
  });

  it('no debe adjuntar Bearer a peticiones a /auth/refresh', () => {
    localStorage.setItem('accessToken', 'my-token');

    httpClient.post(`${environment.apiUrl}/auth/refresh`, {}).subscribe();

    const req = httpMock.expectOne(`${environment.apiUrl}/auth/refresh`);
    expect(req.request.headers.has('Authorization')).toBe(false);
    req.flush({ accessToken: 'new-tok', refreshToken: 'new-ref' });
  });

  // --- 401 → refresh → reintento ---

  it('debe renovar el token y reintentar la petición original al recibir 401', () => {
    localStorage.setItem('accessToken', 'expired-token');
    localStorage.setItem('refreshToken', 'valid-refresh');

    let responseData: unknown;
    httpClient.get(`${environment.apiUrl}/api/protected`).subscribe({
      next: (data) => { responseData = data; },
    });

    // Primera petición → 401
    const firstReq = httpMock.expectOne(`${environment.apiUrl}/api/protected`);
    firstReq.flush('Unauthorized', { status: 401, statusText: 'Unauthorized' });

    // El interceptor llama a /auth/refresh
    const refreshReq = httpMock.expectOne(`${environment.apiUrl}/auth/refresh`);
    expect(refreshReq.request.method).toBe('POST');
    refreshReq.flush({ accessToken: 'new-access', refreshToken: 'new-refresh' });

    // Reintento con el nuevo token
    const retryReq = httpMock.expectOne(`${environment.apiUrl}/api/protected`);
    expect(retryReq.request.headers.get('Authorization')).toBe('Bearer new-access');
    retryReq.flush({ ok: true });

    expect(responseData).toEqual({ ok: true });
  });

  // --- Falla del refresh → logout ---

  it('debe limpiar tokens y llamar logout cuando el refresh falla', () => {
    localStorage.setItem('accessToken', 'expired-access');
    localStorage.setItem('refreshToken', 'expired-refresh');

    const logoutSpy = vi.spyOn(authService, 'logout').mockImplementation(() => {
      authService.clearTokens();
    });
    let errorReceived = false;

    httpClient.get(`${environment.apiUrl}/api/protected`).subscribe({
      error: () => { errorReceived = true; },
    });

    // Primera petición → 401
    const firstReq = httpMock.expectOne(`${environment.apiUrl}/api/protected`);
    firstReq.flush('Unauthorized', { status: 401, statusText: 'Unauthorized' });

    // El interceptor llama a /auth/refresh
    const refreshReq = httpMock.expectOne(`${environment.apiUrl}/auth/refresh`);
    refreshReq.flush('Unauthorized', { status: 401, statusText: 'Unauthorized' });

    expect(localStorage.getItem('accessToken')).toBeNull();
    expect(logoutSpy).toHaveBeenCalled();
    expect(errorReceived).toBe(true);
  });

  // --- Sin loop en /auth/refresh con 401 ---

  it('no debe intentar refresh cuando /auth/refresh recibe 401 (guarda-loop)', () => {
    localStorage.setItem('accessToken', 'token');
    let errorReceived = false;

    httpClient.post(`${environment.apiUrl}/auth/refresh`, {}).subscribe({
      error: (e: HttpErrorResponse) => {
        errorReceived = true;
        expect(e.status).toBe(401);
      },
    });

    const req = httpMock.expectOne(`${environment.apiUrl}/auth/refresh`);
    req.flush('Unauthorized', { status: 401, statusText: 'Unauthorized' });

    // NO debe haber ninguna otra petición a /auth/refresh
    httpMock.expectNone(`${environment.apiUrl}/auth/refresh`);
    expect(errorReceived).toBe(true);
  });

  // --- Peticiones concurrentes comparten un solo refresh ---

  it('debe compartir un único refresh para múltiples 401 simultáneos', () => {
    localStorage.setItem('accessToken', 'expired');
    localStorage.setItem('refreshToken', 'refresh');

    let res1: unknown, res2: unknown;

    httpClient.get(`${environment.apiUrl}/api/resource1`).subscribe({ next: (d) => { res1 = d; } });
    httpClient.get(`${environment.apiUrl}/api/resource2`).subscribe({ next: (d) => { res2 = d; } });

    // Ambas peticiones reciben 401
    const req1 = httpMock.expectOne(`${environment.apiUrl}/api/resource1`);
    const req2 = httpMock.expectOne(`${environment.apiUrl}/api/resource2`);
    req1.flush('Unauthorized', { status: 401, statusText: 'Unauthorized' });
    req2.flush('Unauthorized', { status: 401, statusText: 'Unauthorized' });

    // Solo debe existir UN llamado a /auth/refresh
    const refreshRequests = httpMock.match(`${environment.apiUrl}/auth/refresh`);
    expect(refreshRequests.length).toBe(1);
    refreshRequests[0].flush({ accessToken: 'new', refreshToken: 'new-ref' });

    // Ambas peticiones se reintentan
    const retry1 = httpMock.expectOne(`${environment.apiUrl}/api/resource1`);
    const retry2 = httpMock.expectOne(`${environment.apiUrl}/api/resource2`);
    retry1.flush({ data: 'resource1' });
    retry2.flush({ data: 'resource2' });

    expect(res1).toEqual({ data: 'resource1' });
    expect(res2).toEqual({ data: 'resource2' });
  });
});
