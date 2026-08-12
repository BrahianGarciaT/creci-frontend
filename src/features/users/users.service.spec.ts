import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { UsersService, User, CreateUserPayload, UpdateUserPayload } from './users.service';
import { environment } from '../../environments/environment';

// Usuario de ejemplo para respuestas simuladas
const mockUser: User = {
  id: 'user-1',
  email: 'dev@example.com',
  role: 'developer',
  isActive: true,
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
  projects: [],
};

describe('UsersService', () => {
  let service: UsersService;
  let httpTesting: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });

    service = TestBed.inject(UsersService);
    httpTesting = TestBed.inject(HttpTestingController);
    // En zoneless los efectos no corren sincrónicamente — flush para que httpResource dispare la GET inicial
    TestBed.flushEffects();
  });

  afterEach(() => {
    // Verifica que no queden solicitudes pendientes sin manejar
    httpTesting.verify();
  });

  describe('users (httpResource)', () => {
    it('debe apuntar al endpoint correcto de listado de usuarios', () => {
      // El httpResource dispara la solicitud al inicializarse
      const req = httpTesting.expectOne(`${environment.apiUrl}/users`);
      expect(req.request.method).toBe('GET');
      req.flush([mockUser]);
    });
  });

  describe('create()', () => {
    it('debe enviar POST al endpoint de usuarios con el payload correcto', () => {
      const payload: CreateUserPayload = {
        email: 'new@example.com',
        password: 'password123',
        role: 'developer',
      };

      // Consumimos el GET del httpResource primero
      httpTesting.expectOne(`${environment.apiUrl}/users`).flush([]);

      service.create(payload).subscribe((user) => {
        expect(user).toEqual(mockUser);
      });

      const req = httpTesting.expectOne(`${environment.apiUrl}/users`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(payload);
      req.flush(mockUser);
    });

    it('debe enviar POST sin campo role cuando no se provee', () => {
      const payload: CreateUserPayload = {
        email: 'minimal@example.com',
        password: 'password123',
      };

      httpTesting.expectOne(`${environment.apiUrl}/users`).flush([]);

      service.create(payload).subscribe();

      const req = httpTesting.expectOne(`${environment.apiUrl}/users`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(payload);
      req.flush(mockUser);
    });
  });

  describe('deactivate()', () => {
    it('debe enviar PATCH a la URL correcta con el ID del usuario', () => {
      const userId = 'user-42';

      httpTesting.expectOne(`${environment.apiUrl}/users`).flush([]);

      service.deactivate(userId).subscribe((user) => {
        expect(user).toEqual(mockUser);
      });

      const req = httpTesting.expectOne(`${environment.apiUrl}/users/${userId}/deactivate`);
      expect(req.request.method).toBe('PATCH');
      req.flush(mockUser);
    });
  });

  describe('updateUser()', () => {
    it('debe enviar PATCH a /users/:id con el payload provisto', () => {
      const userId = 'user-42';
      const payload: UpdateUserPayload = { role: 'admin' };

      httpTesting.expectOne(`${environment.apiUrl}/users`).flush([]);

      service.updateUser(userId, payload).subscribe((user) => {
        expect(user).toEqual(mockUser);
      });

      const req = httpTesting.expectOne(`${environment.apiUrl}/users/${userId}`);
      expect(req.request.method).toBe('PATCH');
      expect(req.request.body).toEqual(payload);
      req.flush(mockUser);
    });

    it('debe omitir password del payload cuando no se provee', () => {
      const userId = 'user-42';
      const payload: UpdateUserPayload = { role: 'developer' };

      httpTesting.expectOne(`${environment.apiUrl}/users`).flush([]);

      service.updateUser(userId, payload).subscribe();

      const req = httpTesting.expectOne(`${environment.apiUrl}/users/${userId}`);
      expect(req.request.body).not.toHaveProperty('password');
      req.flush(mockUser);
    });
  });
});
