import { ComponentFixture, TestBed } from '@angular/core/testing';
import { render, screen } from '@testing-library/angular';
import { describe, it, expect } from 'vitest';
import { WorkloadTableComponent } from './workload-table.component';
import { WorkloadEntry } from './dashboard.types';

const entries: WorkloadEntry[] = [
  { userId: 'user-1', email: 'ana@example.com', open: 4, done: 6, overdue: 1 },
  { userId: 'user-2', email: 'beto@example.com', open: 0, done: 3, overdue: 0 },
];

describe('WorkloadTableComponent', () => {
  it('renderiza una fila por cada WorkloadEntry con sus conteos', async () => {
    await render(WorkloadTableComponent, {
      inputs: { entries },
    });

    expect(screen.getByText('ana@example.com')).toBeTruthy();
    expect(screen.getByText('beto@example.com')).toBeTruthy();
    expect(screen.getAllByRole('row')).toHaveLength(entries.length + 1); // + header row
  });

  it('muestra un estado vacío explícito cuando entries está vacío', async () => {
    await render(WorkloadTableComponent, {
      inputs: { entries: [] },
    });

    expect(screen.getByText(/sin carga de trabajo/i)).toBeTruthy();
    expect(screen.queryByRole('table')).toBeNull();
  });
});
