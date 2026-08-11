import { render, screen } from '@testing-library/angular';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { MatDialog } from '@angular/material/dialog';
import { signal } from '@angular/core';
import { of } from 'rxjs';
import { describe, it, expect, afterEach, vi } from 'vitest';
import { TasksComponent } from './tasks.component';
import { Task } from './tasks.service';
import { Project } from '../projects/projects.service';
import { User } from '../users/users.service';
import { AuthService, CurrentUser } from '../../core/services/auth.service';
import { environment } from '../../environments/environment';

const apiUrl = environment.apiUrl;

// Usuarios autenticados de ejemplo
const adminUser: CurrentUser = { id: 'admin-1', email: 'admin@example.com', role: 'admin' };
const developerUser: CurrentUser = { id: 'dev-1', email: 'developer@example.com', role: 'developer' };

// Construye un AuthService falso cuyo currentUser es el signal provisto
const buildFakeAuthService = (user: CurrentUser | null) => ({
  currentUser: signal<CurrentUser | null>(user),
});

// Proyectos de ejemplo — uno con el developer asignado, otro sin él
const mockProjects: Project[] = [
  {
    id: 'project-1',
    name: 'Proyecto Alpha',
    description: 'Descripción Alpha',
    status: 'active',
    developers: [
      { id: 'dev-1', email: 'developer@example.com', role: 'developer', isActive: true, createdAt: '', updatedAt: '' },
    ],
    createdAt: '',
    updatedAt: '',
  },
  {
    id: 'project-2',
    name: 'Proyecto Beta',
    description: 'Descripción Beta',
    status: 'active',
    developers: [],
    createdAt: '',
    updatedAt: '',
  },
];

const mockUsers: User[] = [
  { id: 'dev-1', email: 'developer@example.com', role: 'developer', isActive: true, createdAt: '', updatedAt: '' },
];

// Tareas de ejemplo para la vista admin — una asignada al developer, otra no
const mockTasks: Task[] = [
  {
    id: 'task-1',
    title: 'Tarea de administrador',
    status: 'todo',
    priority: 'high',
    projectId: 'project-1',
    project: { id: 'project-1', name: 'Proyecto Alpha' },
    assigneeId: 'dev-1',
    assignee: { id: 'dev-1', email: 'developer@example.com' },
    createdAt: '',
    updatedAt: '',
  },
];

// Tareas de ejemplo para la vista developer — una propia, otra ajena
const mockDeveloperTasks: Task[] = [
  {
    id: 'task-own',
    title: 'Tarea propia',
    status: 'todo',
    priority: 'medium',
    estimatedHours: 4,
    projectId: 'project-1',
    project: { id: 'project-1', name: 'Proyecto Alpha' },
    assigneeId: 'dev-1',
    assignee: { id: 'dev-1', email: 'developer@example.com' },
    createdAt: '',
    updatedAt: '',
  },
  {
    id: 'task-other',
    title: 'Tarea ajena',
    status: 'in_progress',
    priority: 'low',
    projectId: 'project-1',
    project: { id: 'project-1', name: 'Proyecto Alpha' },
    assigneeId: 'dev-2',
    assignee: { id: 'dev-2', email: 'otro@example.com' },
    createdAt: '',
    updatedAt: '',
  },
];

describe('TasksComponent', () => {
  let httpMock: HttpTestingController;

  afterEach(() => {
    httpMock.verify();
  });

  describe('Vista admin', () => {
    it('debe exponer las columnas de admin y renderizar acciones de administrador', async () => {
      const { fixture } = await render(TasksComponent, {
        providers: [
          provideHttpClient(),
          provideHttpClientTesting(),
          provideAnimationsAsync(),
          { provide: AuthService, useValue: buildFakeAuthService(adminUser) },
        ],
      });
      httpMock = TestBed.inject(HttpTestingController);

      httpMock.expectOne(`${apiUrl}/projects`).flush(mockProjects);
      httpMock.expectOne(`${apiUrl}/users`).flush(mockUsers);
      httpMock.expectOne(`${apiUrl}/tasks`).flush(mockTasks);

      await fixture.whenStable();

      const component = fixture.componentInstance;
      // toContain — nunca igualdad exacta: PR3 añadirá 'dueDate' a adminColumns
      expect(component.adminColumns).toContain('title');
      expect(component.adminColumns).toContain('priority');
      expect(component.adminColumns).toContain('status');
      expect(component.adminColumns).toContain('project');
      expect(component.adminColumns).toContain('assignee');
      expect(component.adminColumns).toContain('actions');

      expect(screen.getByRole('button', { name: /nueva tarea/i })).toBeTruthy();
      expect(screen.getByText('Tarea de administrador')).toBeTruthy();
      expect(screen.getByRole('button', { name: /editar tarea de administrador/i })).toBeTruthy();
      expect(screen.getByRole('button', { name: /cancelar tarea tarea de administrador/i })).toBeTruthy();
    });

    it('debe abrir el diálogo de creación y recargar la lista al cerrar con resultado', async () => {
      const mockDialogRef = { afterClosed: vi.fn().mockReturnValue(of({ id: 'task-2' })) };
      const mockDialog = { open: vi.fn().mockReturnValue(mockDialogRef) };

      const { fixture } = await render(TasksComponent, {
        providers: [
          provideHttpClient(),
          provideHttpClientTesting(),
          provideAnimationsAsync(),
          { provide: AuthService, useValue: buildFakeAuthService(adminUser) },
          { provide: MatDialog, useValue: mockDialog },
        ],
      });
      httpMock = TestBed.inject(HttpTestingController);

      httpMock.expectOne(`${apiUrl}/projects`).flush(mockProjects);
      httpMock.expectOne(`${apiUrl}/users`).flush(mockUsers);
      httpMock.expectOne(`${apiUrl}/tasks`).flush(mockTasks);

      await fixture.whenStable();

      screen.getByRole('button', { name: /nueva tarea/i }).click();

      expect(mockDialog.open).toHaveBeenCalled();

      // Fuerza el flush síncrono de los efectos pendientes para que el resource despache
      // el nuevo fetch (no se puede usar whenStable aquí: el resource queda "loading" hasta
      // que se resuelve el flush del mock, lo que crearía un deadlock).
      fixture.detectChanges();

      // El cierre del diálogo con resultado truthy debe disparar allTasksResource.reload()
      httpMock.expectOne(`${apiUrl}/tasks`).flush(mockTasks);

      await fixture.whenStable();
    });

    it('debe mostrar un mensaje de error si la cancelación de una tarea falla', async () => {
      const { fixture } = await render(TasksComponent, {
        providers: [
          provideHttpClient(),
          provideHttpClientTesting(),
          provideAnimationsAsync(),
          { provide: AuthService, useValue: buildFakeAuthService(adminUser) },
        ],
      });
      httpMock = TestBed.inject(HttpTestingController);

      httpMock.expectOne(`${apiUrl}/projects`).flush(mockProjects);
      httpMock.expectOne(`${apiUrl}/users`).flush(mockUsers);
      httpMock.expectOne(`${apiUrl}/tasks`).flush(mockTasks);

      await fixture.whenStable();

      screen
        .getByRole('button', { name: /cancelar tarea tarea de administrador/i })
        .click();
      await fixture.whenStable();

      screen
        .getByRole('button', { name: /confirmar cancelación de tarea de administrador/i })
        .click();
      await fixture.whenStable();

      httpMock
        .expectOne(`${apiUrl}/tasks/task-1`)
        .flush('error', { status: 500, statusText: 'Internal Server Error' });

      await fixture.whenStable();

      expect(
        screen.getByText('Error al cancelar la tarea. Intenta nuevamente.'),
      ).toBeTruthy();
    });
  });

  describe('Vista developer', () => {
    it('debe filtrar los proyectos a los propios y no mostrar acciones de admin', async () => {
      const { fixture } = await render(TasksComponent, {
        providers: [
          provideHttpClient(),
          provideHttpClientTesting(),
          provideAnimationsAsync(),
          { provide: AuthService, useValue: buildFakeAuthService(developerUser) },
        ],
      });
      httpMock = TestBed.inject(HttpTestingController);

      httpMock.expectOne(`${apiUrl}/projects/mine`).flush(mockProjects);

      await fixture.whenStable();

      const component = fixture.componentInstance;

      expect(component.developerColumns).toEqual([
        'title',
        'priority',
        'status',
        'project',
        'assignee',
        'statusAction',
        'estimateAction',
      ]);

      // Solo el proyecto donde el developer está asignado debe sobrevivir al filtro cliente
      expect(component.developerProjects()).toEqual([mockProjects[0]]);

      expect(screen.queryByRole('button', { name: /nueva tarea/i })).toBeNull();
    });

    it('debe mostrar acciones de estado/estimación solo para tareas propias y no permitir cancelar', async () => {
      const { fixture } = await render(TasksComponent, {
        providers: [
          provideHttpClient(),
          provideHttpClientTesting(),
          provideAnimationsAsync(),
          { provide: AuthService, useValue: buildFakeAuthService(developerUser) },
        ],
      });
      httpMock = TestBed.inject(HttpTestingController);

      httpMock.expectOne(`${apiUrl}/projects/mine`).flush(mockProjects);
      await fixture.whenStable();

      // Selecciona el proyecto directamente vía el signal público (equivalente al (valueChange) del template)
      fixture.componentInstance.selectedProjectId.set('project-1');
      // Fuerza el flush síncrono de los efectos pendientes para que el resource despache
      // el nuevo fetch (no se puede usar whenStable aquí: el resource queda "loading" hasta
      // que se resuelve el flush del mock, lo que crearía un deadlock).
      fixture.detectChanges();

      httpMock.expectOne(`${apiUrl}/tasks/project/project-1`).flush(mockDeveloperTasks);
      await fixture.whenStable();

      expect(screen.getByText('Tarea propia')).toBeTruthy();
      expect(screen.getByText('Tarea ajena')).toBeTruthy();

      // Tarea propia: acciones interactivas
      expect(screen.getByLabelText('Cambiar estado de la tarea')).toBeTruthy();
      expect(screen.getByLabelText('Horas estimadas')).toBeTruthy();

      // Tarea ajena: sin acciones, marcador "No asignada a ti"
      expect(screen.getByLabelText('No asignada a ti')).toBeTruthy();

      // Nunca debe existir una opción de cancelar en la vista developer
      expect(screen.queryByRole('button', { name: /cancelar tarea/i })).toBeNull();
      expect(screen.queryByText(/cancelar/i)).toBeNull();
    });
  });
});
