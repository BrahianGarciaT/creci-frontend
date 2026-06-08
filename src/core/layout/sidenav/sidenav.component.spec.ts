import { render, screen } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideRouter } from '@angular/router';
import { SidenavComponent } from './sidenav.component';
import { NavItem } from '../nav-item.model';
import { CurrentUser } from '../../services/auth.service';

const navItems: NavItem[] = [
  { label: 'Dashboard', icon: 'dashboard', route: '/dashboard' },
  { label: 'Usuarios', icon: 'group', route: '/users', requiredRole: 'admin' },
  { label: 'Proyectos', icon: 'folder', route: '/projects', disabled: true },
  { label: 'Tareas', icon: 'checklist', route: '/tasks', disabled: true },
];

const adminUser: CurrentUser = { id: '1', email: 'admin@test.com', role: 'admin' };

const buildRenderOptions = (overrides: {
  navItems?: NavItem[];
  currentUser?: CurrentUser | null;
} = {}) => ({
  componentInputs: {
    navItems: overrides.navItems ?? navItems,
    currentUser: 'currentUser' in overrides ? overrides.currentUser : adminUser,
  },
  providers: [
    provideAnimationsAsync(),
    provideRouter([{ path: '**', redirectTo: '' }]),
  ],
});

describe('SidenavComponent', () => {
  describe('Renderizado de elementos de navegación', () => {
    it('debe renderizar todos los nav items recibidos', async () => {
      await render(SidenavComponent, buildRenderOptions());

      expect(screen.getByText('Dashboard')).toBeTruthy();
      expect(screen.getByText('Usuarios')).toBeTruthy();
      expect(screen.getByText('Proyectos')).toBeTruthy();
      expect(screen.getByText('Tareas')).toBeTruthy();
    });

    it('debe mostrar el email y rol del usuario autenticado', async () => {
      await render(SidenavComponent, buildRenderOptions({ currentUser: adminUser }));

      expect(screen.getByText('admin@test.com')).toBeTruthy();
      expect(screen.getByText('admin')).toBeTruthy();
    });

    it('debe renderizar el botón de logout', async () => {
      await render(SidenavComponent, buildRenderOptions());

      expect(screen.getByRole('button', { name: /cerrar sesión/i })).toBeTruthy();
    });
  });

  describe('Items deshabilitados', () => {
    it('los items disabled NO deben tener atributo href (no navegan)', async () => {
      const { container } = await render(SidenavComponent, buildRenderOptions());

      // Find all mat-list-items
      const listItems = container.querySelectorAll('mat-list-item');

      // Find Proyectos and Tareas items — they should not have href
      let proyectosHasLink = false;
      let tareasHasLink = false;

      listItems.forEach((item) => {
        const text = item.textContent ?? '';
        if (text.includes('Proyectos') && item.hasAttribute('href')) {
          proyectosHasLink = true;
        }
        if (text.includes('Tareas') && item.hasAttribute('href')) {
          tareasHasLink = true;
        }
      });

      expect(proyectosHasLink).toBe(false);
      expect(tareasHasLink).toBe(false);
    });

    it('los items navigables SÍ deben renderizar mat-list-item sin la clase disabled', async () => {
      const { container } = await render(SidenavComponent, buildRenderOptions());

      // Dashboard is navigable — its list-item should not carry the disabled class
      const allItems = container.querySelectorAll('mat-list-item');
      const dashboardItem = Array.from(allItems).find((el) =>
        el.textContent?.includes('Dashboard'),
      );

      expect(dashboardItem).toBeTruthy();
      expect(dashboardItem!.classList.contains('nav-item--disabled')).toBe(false);
    });
  });

  describe('Evento de logout', () => {
    it('debe emitir el evento logout al hacer clic en el botón', async () => {
      const logoutSpy = vi.fn();

      await render(SidenavComponent, {
        ...buildRenderOptions(),
        on: { logout: logoutSpy },
      });

      await userEvent.click(screen.getByRole('button', { name: /cerrar sesión/i }));

      expect(logoutSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('Estado sin usuario', () => {
    it('NO debe mostrar info del usuario si currentUser es null', async () => {
      await render(SidenavComponent, buildRenderOptions({ currentUser: null }));

      expect(screen.queryByText('admin@test.com')).toBeNull();
    });
  });
});
