import { render, screen, waitFor } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { signal } from '@angular/core';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { MatDialog } from '@angular/material/dialog';
import { of } from 'rxjs';
import { UsersComponent } from './users.component';
import { UsersService, User } from './users.service';

// Usuarios de ejemplo para las pruebas
const activeAdmin: User = {
  id: 'admin-1',
  email: 'admin@example.com',
  role: 'admin',
  isActive: true,
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
};

const activeDeveloper: User = {
  id: 'dev-1',
  email: 'developer@example.com',
  role: 'developer',
  isActive: true,
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
};

const inactiveDeveloper: User = {
  id: 'dev-2',
  email: 'inactive@example.com',
  role: 'developer',
  isActive: false,
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
};

// Construye un mock del recurso httpResource compatible con signals
const buildMockResource = (users: User[] = []) => ({
  value: signal<User[] | undefined>(users),
  isLoading: signal(false),
  error: signal<unknown>(undefined),
  reload: vi.fn(),
});

// Construye el mock de UsersService con un recurso configurable
const buildMockUsersService = (
  users: User[] = [],
  overrides: { deactivate?: ReturnType<typeof vi.fn>; reactivate?: ReturnType<typeof vi.fn> } = {},
) => ({
  users: buildMockResource(users),
  deactivate: vi.fn().mockReturnValue(of({ ...activeDeveloper, isActive: false })),
  reactivate: vi.fn().mockReturnValue(of({ ...inactiveDeveloper, isActive: true })),
  create: vi.fn().mockReturnValue(of(activeDeveloper)),
  ...overrides,
});

// Construye las opciones de render con providers inyectados
const buildRenderOptions = (
  mockService: ReturnType<typeof buildMockUsersService>,
  matDialogOverride?: { open: ReturnType<typeof vi.fn> },
) => ({
  providers: [
    provideAnimationsAsync(),
    { provide: UsersService, useValue: mockService },
    ...(matDialogOverride ? [{ provide: MatDialog, useValue: matDialogOverride }] : []),
  ],
});

describe('UsersComponent', () => {
  describe('Renderizado de la tabla', () => {
    it('debe mostrar las filas de usuarios desde el servicio', async () => {
      const mockService = buildMockUsersService([activeAdmin, activeDeveloper]);

      await render(UsersComponent, buildRenderOptions(mockService));

      expect(screen.getByText('admin@example.com')).toBeTruthy();
      expect(screen.getByText('developer@example.com')).toBeTruthy();
    });

    it('debe mostrar el encabezado "Usuarios"', async () => {
      const mockService = buildMockUsersService([]);

      await render(UsersComponent, buildRenderOptions(mockService));

      expect(screen.getByText('Usuarios')).toBeTruthy();
    });

    it('debe mostrar el botón "Nuevo usuario"', async () => {
      const mockService = buildMockUsersService([]);

      await render(UsersComponent, buildRenderOptions(mockService));

      expect(screen.getByRole('button', { name: /nuevo usuario/i })).toBeTruthy();
    });

    it('debe mostrar el estado vacío cuando no hay usuarios', async () => {
      const mockService = buildMockUsersService([]);

      await render(UsersComponent, buildRenderOptions(mockService));

      expect(screen.getByText('No hay usuarios registrados todavía.')).toBeTruthy();
    });

    it('NO debe mostrar el estado vacío cuando hay usuarios', async () => {
      const mockService = buildMockUsersService([activeDeveloper]);

      await render(UsersComponent, buildRenderOptions(mockService));

      expect(screen.queryByText('No hay usuarios registrados todavía.')).toBeNull();
    });
  });

  describe('Visibilidad del botón de desactivar', () => {
    it('debe mostrar el botón de desactivar para filas de developer activo', async () => {
      const mockService = buildMockUsersService([activeDeveloper]);

      await render(UsersComponent, buildRenderOptions(mockService));

      expect(
        screen.getByRole('button', { name: /desactivar developer@example\.com/i }),
      ).toBeTruthy();
    });

    it('NO debe mostrar el botón de desactivar para filas de admin', async () => {
      const mockService = buildMockUsersService([activeAdmin]);

      await render(UsersComponent, buildRenderOptions(mockService));

      expect(
        screen.queryByRole('button', { name: /desactivar admin@example\.com/i }),
      ).toBeNull();
    });

    it('NO debe mostrar el botón de desactivar para developer inactivo', async () => {
      const mockService = buildMockUsersService([inactiveDeveloper]);

      await render(UsersComponent, buildRenderOptions(mockService));

      expect(
        screen.queryByRole('button', { name: /desactivar inactive@example\.com/i }),
      ).toBeNull();
    });
  });

  describe('Flujo de desactivar usuario', () => {
    it('debe abrir el diálogo modal de confirmación con copy en español al hacer clic en Desactivar', async () => {
      const mockService = buildMockUsersService([activeDeveloper]);
      const mockDialogRef = { afterClosed: vi.fn().mockReturnValue(of(false)) };
      const mockDialog = { open: vi.fn().mockReturnValue(mockDialogRef) };

      await render(UsersComponent, buildRenderOptions(mockService, mockDialog));

      await userEvent.click(
        screen.getByRole('button', { name: /desactivar developer@example\.com/i }),
      );

      expect(mockDialog.open).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          data: expect.objectContaining({
            title: 'Desactivar usuario',
            confirmLabel: 'Desactivar',
          }),
        }),
      );
    });

    it('debe llamar a deactivate y recargar cuando se confirma el diálogo', async () => {
      const mockService = buildMockUsersService([activeDeveloper]);
      const mockDialogRef = { afterClosed: vi.fn().mockReturnValue(of(true)) };
      const mockDialog = { open: vi.fn().mockReturnValue(mockDialogRef) };

      await render(UsersComponent, buildRenderOptions(mockService, mockDialog));

      await userEvent.click(
        screen.getByRole('button', { name: /desactivar developer@example\.com/i }),
      );

      await waitFor(() => {
        expect(mockService.deactivate).toHaveBeenCalledWith(activeDeveloper.id);
        expect(mockService.users.reload).toHaveBeenCalled();
      });
    });

    it('NO debe llamar a deactivate cuando se cancela el diálogo', async () => {
      const mockService = buildMockUsersService([activeDeveloper]);
      const mockDialogRef = { afterClosed: vi.fn().mockReturnValue(of(false)) };
      const mockDialog = { open: vi.fn().mockReturnValue(mockDialogRef) };

      await render(UsersComponent, buildRenderOptions(mockService, mockDialog));

      await userEvent.click(
        screen.getByRole('button', { name: /desactivar developer@example\.com/i }),
      );

      await waitFor(() => {
        expect(mockDialog.open).toHaveBeenCalled();
      });

      expect(mockService.deactivate).not.toHaveBeenCalled();
    });
  });

  describe('Flujo de reactivar usuario', () => {
    it('debe reactivar directamente al hacer clic, sin abrir un diálogo de confirmación', async () => {
      const mockService = buildMockUsersService([inactiveDeveloper]);
      const mockDialog = { open: vi.fn() };

      await render(UsersComponent, buildRenderOptions(mockService, mockDialog));

      await userEvent.click(
        screen.getByRole('button', { name: /reactivar inactive@example\.com/i }),
      );

      expect(mockDialog.open).not.toHaveBeenCalled();
      await waitFor(() => {
        expect(mockService.reactivate).toHaveBeenCalledWith(inactiveDeveloper.id);
        expect(mockService.users.reload).toHaveBeenCalled();
      });
    });
  });

  describe('Apertura del diálogo de creación', () => {
    it('debe abrir MatDialog al hacer clic en "Nuevo usuario"', async () => {
      const mockService = buildMockUsersService([]);
      const mockDialogRef = { afterClosed: vi.fn().mockReturnValue(of(null)) };
      const mockDialog = { open: vi.fn().mockReturnValue(mockDialogRef) };

      await render(UsersComponent, buildRenderOptions(mockService, mockDialog));

      await userEvent.click(screen.getByRole('button', { name: /nuevo usuario/i }));

      await waitFor(() => {
        expect(mockDialog.open).toHaveBeenCalled();
      });
    });

    it('debe recargar la lista al cerrar el dialog con resultado', async () => {
      const mockService = buildMockUsersService([]);
      // afterClosed emite el usuario creado (truthy) → debe disparar reload()
      const mockDialogRef = { afterClosed: vi.fn().mockReturnValue(of(activeDeveloper)) };
      const mockDialog = { open: vi.fn().mockReturnValue(mockDialogRef) };

      await render(UsersComponent, buildRenderOptions(mockService, mockDialog));

      await userEvent.click(screen.getByRole('button', { name: /nuevo usuario/i }));

      await waitFor(() => {
        expect(mockService.users.reload).toHaveBeenCalled();
      });
    });

    it('NO debe recargar la lista si el dialog se cierra sin resultado', async () => {
      const mockService = buildMockUsersService([]);
      // afterClosed emite null → sin resultado → no debe llamar reload()
      const mockDialogRef = { afterClosed: vi.fn().mockReturnValue(of(null)) };
      const mockDialog = { open: vi.fn().mockReturnValue(mockDialogRef) };

      await render(UsersComponent, buildRenderOptions(mockService, mockDialog));

      await userEvent.click(screen.getByRole('button', { name: /nuevo usuario/i }));

      await waitFor(() => {
        expect(mockDialog.open).toHaveBeenCalled();
      });

      expect(mockService.users.reload).not.toHaveBeenCalled();
    });
  });
});
