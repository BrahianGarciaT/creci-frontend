import { render, screen, waitFor } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { MatDialogRef } from '@angular/material/dialog';
import { of, throwError } from 'rxjs';
import { CreateUserDialogComponent } from './create-user-dialog.component';
import { UsersService } from './users.service';

// Usuario simulado que devuelve el servicio al crear exitosamente
const mockCreatedUser = {
  id: 'u-1',
  email: 'test@example.com',
  role: 'developer',
  isActive: true,
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
};

// Helpers para construir el mock del servicio y el dialogRef
const buildMockUsersService = (overrides: Partial<{ create: ReturnType<typeof vi.fn> }> = {}) => ({
  create: vi.fn().mockReturnValue(of(mockCreatedUser)),
  ...overrides,
});

const buildMockDialogRef = () => ({
  close: vi.fn(),
});

// Opciones base de render
const buildRenderOptions = (
  mockService: ReturnType<typeof buildMockUsersService>,
  mockRef: ReturnType<typeof buildMockDialogRef>,
) => ({
  providers: [
    provideAnimationsAsync(),
    { provide: UsersService, useValue: mockService },
    { provide: MatDialogRef, useValue: mockRef },
  ],
});

describe('CreateUserDialogComponent', () => {
  describe('Estado inicial del formulario', () => {
    it('el botón Create debe estar deshabilitado con el formulario vacío', async () => {
      const mockService = buildMockUsersService();
      const mockRef = buildMockDialogRef();

      await render(CreateUserDialogComponent, buildRenderOptions(mockService, mockRef));

      const createButton = screen.getByRole('button', { name: /create/i });
      expect((createButton as HTMLButtonElement).disabled).toBe(true);
    });

    it('el botón Create debe estar deshabilitado con email inválido', async () => {
      const mockService = buildMockUsersService();
      const mockRef = buildMockDialogRef();

      await render(CreateUserDialogComponent, buildRenderOptions(mockService, mockRef));

      await userEvent.type(screen.getByLabelText('Email address'), 'not-an-email');
      await userEvent.type(screen.getByLabelText('Password'), 'validpassword');

      await waitFor(() => {
        const createButton = screen.getByRole('button', { name: /create/i });
        expect((createButton as HTMLButtonElement).disabled).toBe(true);
      });
    });

    it('el botón Create debe habilitarse con datos válidos', async () => {
      const mockService = buildMockUsersService();
      const mockRef = buildMockDialogRef();

      await render(CreateUserDialogComponent, buildRenderOptions(mockService, mockRef));

      await userEvent.type(screen.getByLabelText('Email address'), 'user@example.com');
      await userEvent.type(screen.getByLabelText('Password'), 'password123');

      await waitFor(() => {
        const createButton = screen.getByRole('button', { name: /create/i });
        expect((createButton as HTMLButtonElement).disabled).toBe(false);
      });
    });
  });

  describe('Submit exitoso', () => {
    it('debe cerrar el dialog al crear el usuario exitosamente', async () => {
      const mockService = buildMockUsersService();
      const mockRef = buildMockDialogRef();

      await render(CreateUserDialogComponent, buildRenderOptions(mockService, mockRef));

      await userEvent.type(screen.getByLabelText('Email address'), 'user@example.com');
      await userEvent.type(screen.getByLabelText('Password'), 'password123');
      await userEvent.click(screen.getByRole('button', { name: /create/i }));

      await waitFor(() => {
        expect(mockRef.close).toHaveBeenCalledWith(mockCreatedUser);
      });
    });
  });

  describe('Error 409 — email duplicado', () => {
    it('debe mostrar el error "Email already in use" en el campo email', async () => {
      const mockService = buildMockUsersService({
        create: vi.fn().mockReturnValue(throwError(() => ({ status: 409 }))),
      });
      const mockRef = buildMockDialogRef();

      await render(CreateUserDialogComponent, buildRenderOptions(mockService, mockRef));

      await userEvent.type(screen.getByLabelText('Email address'), 'existing@example.com');
      await userEvent.type(screen.getByLabelText('Password'), 'password123');
      await userEvent.click(screen.getByRole('button', { name: /create/i }));

      await waitFor(() => {
        expect(screen.getByText(/email already in use/i)).toBeTruthy();
      });
      // El diálogo permanece abierto
      expect(mockRef.close).not.toHaveBeenCalled();
    });
  });

  describe('Error 500 — error del servidor', () => {
    it('debe mostrar el banner de error genérico', async () => {
      const mockService = buildMockUsersService({
        create: vi.fn().mockReturnValue(throwError(() => ({ status: 500 }))),
      });
      const mockRef = buildMockDialogRef();

      await render(CreateUserDialogComponent, buildRenderOptions(mockService, mockRef));

      await userEvent.type(screen.getByLabelText('Email address'), 'user@example.com');
      await userEvent.type(screen.getByLabelText('Password'), 'password123');
      await userEvent.click(screen.getByRole('button', { name: /create/i }));

      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeTruthy();
        expect(screen.getByText(/error al crear el usuario/i)).toBeTruthy();
      });
      // El diálogo permanece abierto
      expect(mockRef.close).not.toHaveBeenCalled();
    });
  });
});
