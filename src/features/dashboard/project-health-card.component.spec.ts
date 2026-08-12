import { render, screen } from '@testing-library/angular';
import { provideRouter } from '@angular/router';
import { describe, it, expect } from 'vitest';
import { ProjectHealthCardComponent } from './project-health-card.component';
import { ProjectHealth } from './dashboard.types';

const healthyProject: ProjectHealth = {
  projectId: 'project-1',
  name: 'Proyecto Alpha',
  total: 10,
  counts: { todo: 3, in_progress: 2, done: 5, cancelled: 0 },
  completionRate: 0.5,
};

const emptyProject: ProjectHealth = {
  projectId: 'project-2',
  name: 'Proyecto Beta',
  total: 0,
  counts: { todo: 0, in_progress: 0, done: 0, cancelled: 0 },
  completionRate: null,
};

describe('ProjectHealthCardComponent', () => {
  it('renderiza el nombre, los conteos de estado y el porcentaje de completitud', async () => {
    await render(ProjectHealthCardComponent, {
      inputs: { project: healthyProject },
      providers: [provideRouter([])],
    });

    expect(screen.getByText('Proyecto Alpha')).toBeTruthy();
    expect(screen.getByText('50%')).toBeTruthy();
    expect(screen.getByText(/10/)).toBeTruthy();
  });

  it('muestra un estado vacío explícito cuando el proyecto no tiene tareas', async () => {
    await render(ProjectHealthCardComponent, {
      inputs: { project: emptyProject },
      providers: [provideRouter([])],
    });

    expect(screen.getByText('Proyecto Beta')).toBeTruthy();
    expect(screen.getByText('Sin tareas')).toBeTruthy();
    expect(screen.queryByText('NaN%')).toBeNull();
  });

  it('enlaza la tarjeta a la ruta de detalle del proyecto', async () => {
    await render(ProjectHealthCardComponent, {
      inputs: { project: healthyProject },
      providers: [provideRouter([])],
    });

    const link = screen.getByRole('link', { name: /proyecto alpha/i });
    expect(link.getAttribute('href')).toBe('/dashboard/projects/project-1');
  });
});
