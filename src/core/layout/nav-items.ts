import { NavItem } from './nav-item.model';

export const NAV_ITEMS: NavItem[] = [
  {
    label: 'Dashboard',
    icon: 'dashboard',
    route: '/dashboard',
  },
  {
    label: 'Usuarios',
    icon: 'group',
    route: '/users',
    requiredRole: 'admin',
  },
  {
    label: 'Proyectos',
    icon: 'folder',
    route: '/projects',
    requiredRole: 'admin',
  },
  {
    label: 'Tareas',
    icon: 'checklist',
    route: '/tasks',
  },
];
