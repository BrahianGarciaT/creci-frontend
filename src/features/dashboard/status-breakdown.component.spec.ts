import { render, screen } from '@testing-library/angular';
import { describe, it, expect } from 'vitest';
import { StatusBreakdownComponent } from './status-breakdown.component';
import { StatusCounts } from './dashboard.types';

const counts: StatusCounts = { todo: 3, in_progress: 2, done: 5, cancelled: 1 };
const zeroCounts: StatusCounts = { todo: 0, in_progress: 0, done: 0, cancelled: 0 };

describe('StatusBreakdownComponent', () => {
  it('renderiza cada conteo de StatusCounts', async () => {
    await render(StatusBreakdownComponent, {
      inputs: { counts },
    });

    expect(screen.getByText('3')).toBeTruthy();
    expect(screen.getByText('2')).toBeTruthy();
    expect(screen.getByText('5')).toBeTruthy();
    expect(screen.getByText('1')).toBeTruthy();
  });

  it('muestra un estado vacío explícito cuando todos los conteos son cero', async () => {
    await render(StatusBreakdownComponent, {
      inputs: { counts: zeroCounts },
    });

    expect(screen.getByText(/sin tareas registradas/i)).toBeTruthy();
    expect(screen.queryByRole('list')).toBeNull();
  });
});
