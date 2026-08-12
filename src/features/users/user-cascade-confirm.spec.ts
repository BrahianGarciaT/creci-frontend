import { describe, it, expect } from 'vitest';
import { buildCascadeConfirmData } from './user-cascade-confirm';
import { User } from './users.service';

const developerWithProjects: User = {
  id: 'dev-1',
  email: 'developer@example.com',
  role: 'developer',
  isActive: true,
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
  projects: [
    { id: 'proj-1', name: 'Proyecto Alfa' },
    { id: 'proj-2', name: 'Proyecto Beta' },
  ],
};

const developerWithoutProjects: User = {
  ...developerWithProjects,
  id: 'dev-2',
  email: 'sinproyectos@example.com',
  projects: [],
};

describe('buildCascadeConfirmData', () => {
  it('debe nombrar cada proyecto asignado en el mensaje para la acción "demote"', () => {
    const data = buildCascadeConfirmData(developerWithProjects, 'demote');

    expect(data.message).toContain('Proyecto Alfa');
    expect(data.message).toContain('Proyecto Beta');
    expect(data.title).toBe('Cambiar rol de usuario');
    expect(data.confirmLabel).toBe('Cambiar rol');
  });

  it('debe nombrar cada proyecto asignado en el mensaje para la acción "deactivate"', () => {
    const data = buildCascadeConfirmData(developerWithProjects, 'deactivate');

    expect(data.message).toContain('Proyecto Alfa');
    expect(data.message).toContain('Proyecto Beta');
    expect(data.title).toBe('Desactivar usuario');
    expect(data.confirmLabel).toBe('Desactivar');
  });

  it('debe usar un copy distinto entre "demote" y "deactivate"', () => {
    const demoteData = buildCascadeConfirmData(developerWithProjects, 'demote');
    const deactivateData = buildCascadeConfirmData(developerWithProjects, 'deactivate');

    expect(demoteData.message).not.toBe(deactivateData.message);
    expect(demoteData.title).not.toBe(deactivateData.title);
  });

  it('debe incluir el email del usuario en el mensaje', () => {
    const data = buildCascadeConfirmData(developerWithProjects, 'demote');

    expect(data.message).toContain(developerWithProjects.email);
  });

  it('no debe dejar una lista de proyectos vacía en el mensaje cuando el usuario no tiene proyectos asignados', () => {
    const data = buildCascadeConfirmData(developerWithoutProjects, 'deactivate');

    expect(data.message).not.toContain('proyectos: .');
    expect(data.message).not.toMatch(/proyectos:\s*\./);
    expect(data.message).toContain(developerWithoutProjects.email);
  });
});
