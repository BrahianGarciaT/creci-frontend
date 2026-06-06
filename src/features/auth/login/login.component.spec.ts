import { render, screen, waitFor } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { Component } from '@angular/core';
import { of, throwError } from 'rxjs';
import { LoginComponent } from './login.component';
import { AuthService } from '../../../core/services/auth.service';

// Stub del componente dashboard para el router
@Component({ template: '', standalone: true })
class DashboardStubComponent {}

// Configuración base del render
const renderOptions = {
  providers: [
    provideRouter([{ path: 'dashboard', component: DashboardStubComponent }]),
    provideHttpClient(),
    provideHttpClientTesting(),
    provideAnimationsAsync(),
  ],
};

describe('LoginComponent', () => {
  describe('Renderizado del formulario', () => {
    it('debe renderizar el campo de email', async () => {
      await render(LoginComponent, renderOptions);
      // El campo email tiene aria-label="Dirección de email"
      expect(screen.getByLabelText('Dirección de email')).toBeTruthy();
    });

    it('debe renderizar el campo de contraseña', async () => {
      await render(LoginComponent, renderOptions);
      // El campo password tiene aria-label="Contraseña" (exacto, no el botón toggle)
      expect(screen.getByLabelText('Contraseña')).toBeTruthy();
    });

    it('debe renderizar el botón de submit', async () => {
      await render(LoginComponent, renderOptions);
      expect(screen.getByRole('button', { name: /iniciar sesión/i })).toBeTruthy();
    });

    it('el botón de submit debe estar deshabilitado con el formulario vacío', async () => {
      await render(LoginComponent, renderOptions);
      const submitButton = screen.getByRole('button', { name: /iniciar sesión/i });
      expect((submitButton as HTMLButtonElement).disabled).toBe(true);
    });
  });

  describe('Validación del formulario', () => {
    it('debe mostrar error cuando el email es requerido y se pierde el foco', async () => {
      await render(LoginComponent, renderOptions);
      const emailInput = screen.getByLabelText('Dirección de email');

      await userEvent.click(emailInput);
      await userEvent.tab();

      await waitFor(() => {
        expect(screen.getByText(/el email es requerido/i)).toBeTruthy();
      });
    });

    it('debe mostrar error cuando el email tiene formato inválido', async () => {
      await render(LoginComponent, renderOptions);
      const emailInput = screen.getByLabelText('Dirección de email');

      await userEvent.type(emailInput, 'no-es-un-email');
      await userEvent.tab();

      await waitFor(() => {
        expect(screen.getByText(/ingresa un email válido/i)).toBeTruthy();
      });
    });

    it('debe mostrar error cuando la contraseña es requerida y se pierde el foco', async () => {
      await render(LoginComponent, renderOptions);
      const passwordInput = screen.getByLabelText('Contraseña');

      await userEvent.click(passwordInput);
      await userEvent.tab();

      await waitFor(() => {
        expect(screen.getByText(/la contraseña es requerida/i)).toBeTruthy();
      });
    });

    it('el botón de submit debe habilitarse con datos válidos', async () => {
      await render(LoginComponent, renderOptions);

      await userEvent.type(screen.getByLabelText('Dirección de email'), 'user@example.com');
      await userEvent.type(screen.getByLabelText('Contraseña'), 'password123');

      await waitFor(() => {
        const submitButton = screen.getByRole('button', { name: /iniciar sesión/i });
        expect((submitButton as HTMLButtonElement).disabled).toBe(false);
      });
    });
  });

  describe('Submit con datos válidos', () => {
    it('debe llamar a authService.login con email y contraseña', async () => {
      const mockAuthService = {
        login: vi.fn().mockReturnValue(of({ accessToken: 'tok', refreshToken: 'ref' })),
      };

      await render(LoginComponent, {
        ...renderOptions,
        providers: [
          ...renderOptions.providers,
          { provide: AuthService, useValue: mockAuthService },
        ],
      });

      await userEvent.type(screen.getByLabelText('Dirección de email'), 'user@example.com');
      await userEvent.type(screen.getByLabelText('Contraseña'), 'secret123');
      await userEvent.click(screen.getByRole('button', { name: /iniciar sesión/i }));

      await waitFor(() => {
        expect(mockAuthService.login).toHaveBeenCalledWith('user@example.com', 'secret123');
      });
    });

    it('no debe llamar a authService.login si el formulario es inválido', async () => {
      const mockAuthService = {
        login: vi.fn().mockReturnValue(of({ accessToken: 'tok', refreshToken: 'ref' })),
      };

      await render(LoginComponent, {
        ...renderOptions,
        providers: [
          ...renderOptions.providers,
          { provide: AuthService, useValue: mockAuthService },
        ],
      });

      // El botón está deshabilitado — no se puede hacer click funcional
      // Verificamos que al no rellenar campos, login no se llama
      const submitButton = screen.getByRole('button', { name: /iniciar sesión/i });
      expect((submitButton as HTMLButtonElement).disabled).toBe(true);
      expect(mockAuthService.login).not.toHaveBeenCalled();
    });
  });

  describe('Estado de error del servicio', () => {
    it('debe mostrar mensaje de error cuando el servicio responde 401', async () => {
      const mockAuthService = {
        login: vi.fn().mockReturnValue(throwError(() => ({ status: 401 }))),
      };

      await render(LoginComponent, {
        ...renderOptions,
        providers: [
          ...renderOptions.providers,
          { provide: AuthService, useValue: mockAuthService },
        ],
      });

      await userEvent.type(screen.getByLabelText('Dirección de email'), 'bad@user.com');
      await userEvent.type(screen.getByLabelText('Contraseña'), 'wrongpass');
      await userEvent.click(screen.getByRole('button', { name: /iniciar sesión/i }));

      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeTruthy();
        expect(screen.getByText(/credenciales inválidas/i)).toBeTruthy();
      });
    });

    it('debe mostrar mensaje de error genérico para errores no 401', async () => {
      const mockAuthService = {
        login: vi.fn().mockReturnValue(throwError(() => ({ status: 500 }))),
      };

      await render(LoginComponent, {
        ...renderOptions,
        providers: [
          ...renderOptions.providers,
          { provide: AuthService, useValue: mockAuthService },
        ],
      });

      await userEvent.type(screen.getByLabelText('Dirección de email'), 'user@example.com');
      await userEvent.type(screen.getByLabelText('Contraseña'), 'password123');
      await userEvent.click(screen.getByRole('button', { name: /iniciar sesión/i }));

      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeTruthy();
        expect(screen.getByText(/error al iniciar sesión/i)).toBeTruthy();
      });
    });
  });

  describe('Estado de carga', () => {
    it('el botón debe deshabilitarse durante la carga', async () => {
      // Observable que nunca completa para simular loading indefinido
      let capturedHandlers: { next?: () => void; error?: (e: unknown) => void } = {};
      const mockAuthService = {
        login: vi.fn().mockReturnValue({
          subscribe: (handlers: { next?: () => void; error?: (e: unknown) => void }) => {
            capturedHandlers = handlers;
            return { unsubscribe: vi.fn() };
          },
        }),
      };

      await render(LoginComponent, {
        ...renderOptions,
        providers: [
          ...renderOptions.providers,
          { provide: AuthService, useValue: mockAuthService },
        ],
      });

      await userEvent.type(screen.getByLabelText('Dirección de email'), 'user@example.com');
      await userEvent.type(screen.getByLabelText('Contraseña'), 'password123');

      const submitButton = screen.getByRole('button', { name: /iniciar sesión/i });
      await userEvent.click(submitButton);

      await waitFor(() => {
        expect(mockAuthService.login).toHaveBeenCalled();
      });

      // El botón queda deshabilitado porque isLoading() es true y la suscripción no completó
      expect((submitButton as HTMLButtonElement).disabled).toBe(true);
    });
  });
});
