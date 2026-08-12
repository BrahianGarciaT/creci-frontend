import { render, screen } from '@testing-library/angular';
import { describe, it, expect } from 'vitest';
import { OverdueListComponent } from './overdue-list.component';
import { OverdueEntry } from './dashboard.types';

const entries: OverdueEntry[] = [
  {
    id: 'task-1',
    title: 'Tarea vencida A',
    dueDate: '2026-08-01',
    projectId: 'project-1',
    projectName: 'Proyecto Alpha',
    assigneeEmail: 'ana@example.com',
  },
  {
    id: 'task-2',
    title: 'Tarea vencida B',
    dueDate: '2026-08-05',
    projectId: 'project-2',
    projectName: 'Proyecto Beta',
    assigneeEmail: null,
  },
];

describe('OverdueListComponent', () => {
  it('renderiza cada OverdueEntry y el conteo total de vencidas', async () => {
    await render(OverdueListComponent, {
      inputs: { entries, overdueCount: 2 },
    });

    expect(screen.getByText('Tarea vencida A')).toBeTruthy();
    expect(screen.getByText('Tarea vencida B')).toBeTruthy();
    expect(screen.getByText('Tareas vencidas (2)')).toBeTruthy();
    expect(screen.getByText(/venció 01\/08\/2026/)).toBeTruthy();
  });

  it('muestra un estado vacío explícito cuando entries está vacío', async () => {
    await render(OverdueListComponent, {
      inputs: { entries: [], overdueCount: 0 },
    });

    expect(screen.getByText(/sin tareas vencidas/i)).toBeTruthy();
    expect(screen.queryByRole('list')).toBeNull();
  });
});
