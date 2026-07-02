import { render, screen } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { Component, signal } from '@angular/core';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideRouter } from '@angular/router';
import { ShellComponent } from './shell.component';
import { AuthService, CurrentUser } from '../../services/auth.service';

@Component({ standalone: true, template: '' })
class StubComponent {}

const adminUser: CurrentUser = { id: '1', email: 'admin@test.com', role: 'admin' };
const developerUser: CurrentUser = { id: '2', email: 'dev@test.com', role: 'developer' };

const buildMockAuthService = (user: CurrentUser | null = adminUser) => ({
  currentUser: signal<CurrentUser | null>(user),
  isAuthenticated: signal(user !== null),
  logout: vi.fn(),
});

const buildRenderOptions = (user: CurrentUser | null = adminUser) => ({
  providers: [
    provideAnimationsAsync(),
    provideRouter([
      { path: 'dashboard', component: StubComponent },
      { path: '**', redirectTo: 'dashboard' },
    ]),
    { provide: AuthService, useValue: buildMockAuthService(user) },
  ],
});

describe('ShellComponent', () => {
  describe('Renderizado estructural', () => {
    it('debe renderizar el componente app-sidenav', async () => {
      const { container } = await render(ShellComponent, buildRenderOptions());

      expect(container.querySelector('app-sidenav')).toBeTruthy();
    });

    it('debe renderizar el router-outlet', async () => {
      const { container } = await render(ShellComponent, buildRenderOptions());

      expect(container.querySelector('router-outlet')).toBeTruthy();
    });
  });

  describe('Filtrado de nav items por rol', () => {
    it('un usuario admin debe ver el item de Usuarios', async () => {
      await render(ShellComponent, buildRenderOptions(adminUser));

      expect(screen.getByText('Usuarios')).toBeTruthy();
    });

    it('un usuario developer NO debe ver el item de Usuarios', async () => {
      await render(ShellComponent, buildRenderOptions(developerUser));

      expect(screen.queryByText('Usuarios')).toBeNull();
    });

    it('un usuario developer debe ver Dashboard y Tareas, pero NO Proyectos', async () => {
      await render(ShellComponent, buildRenderOptions(developerUser));

      expect(screen.getByText('Dashboard')).toBeTruthy();
      expect(screen.queryByText('Proyectos')).toBeNull();
      expect(screen.getByText('Tareas')).toBeTruthy();
    });
  });

  describe('Logout', () => {
    it('debe llamar a AuthService.logout() cuando el sidenav emite logout', async () => {
      const mockAuth = buildMockAuthService(adminUser);

      await render(ShellComponent, {
        providers: [
          provideAnimationsAsync(),
          provideRouter([
            { path: 'dashboard', component: StubComponent },
            { path: '**', redirectTo: 'dashboard' },
          ]),
          { provide: AuthService, useValue: mockAuth },
        ],
      });

      await userEvent.click(screen.getByRole('button', { name: /cerrar sesión/i }));

      expect(mockAuth.logout).toHaveBeenCalledTimes(1);
    });
  });
});
