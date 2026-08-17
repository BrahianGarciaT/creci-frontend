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
import { PageMeta } from '../../shared/models/paginated';
import { AuthService, CurrentUser } from '../../core/services/auth.service';
import { environment } from '../../environments/environment';

const apiUrl = environment.apiUrl;

// Construye el `meta` de una respuesta paginada — se sigue usando la misma envolvente
// `Paginated<T>` para la respuesta `all=true` (meta.total === data.length).
function pageMeta(total: number): PageMeta {
  return { total, page: 1, limit: total, totalPages: 1 };
}

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
      { id: 'dev-1', email: 'developer@example.com', role: 'developer', isActive: true, createdAt: '', updatedAt: '', projects: [] },
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
  { id: 'dev-1', email: 'developer@example.com', role: 'developer', isActive: true, createdAt: '', updatedAt: '', projects: [] },
];

// Tareas de ejemplo del proyecto seleccionado — cubre casos admin (tarea ajena) y developer (propia/ajena)
const mockTasks: Task[] = [
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
  {
    id: 'task-own-done',
    title: 'Tarea propia completada',
    status: 'done',
    priority: 'medium',
    estimatedHours: 8,
    projectId: 'project-1',
    project: { id: 'project-1', name: 'Proyecto Alpha' },
    assigneeId: 'dev-1',
    assignee: { id: 'dev-1', email: 'developer@example.com' },
    createdAt: '',
    updatedAt: '',
  },
];

describe('TasksComponent', () => {
  let httpMock: HttpTestingController;

  afterEach(() => {
    httpMock.verify();
  });

  describe('Selector de proyecto (ambos roles)', () => {
    it('admin: carga todos los proyectos, no renderiza tablero ni "Nueva tarea" habilitado sin selección', async () => {
      const { fixture } = await render(TasksComponent, {
        providers: [
          provideHttpClient(),
          provideHttpClientTesting(),
          provideAnimationsAsync(),
          { provide: AuthService, useValue: buildFakeAuthService(adminUser) },
        ],
      });
      httpMock = TestBed.inject(HttpTestingController);

      httpMock.expectOne(`${apiUrl}/projects?limit=100`).flush({ data: mockProjects, meta: pageMeta(mockProjects.length) });
      httpMock.expectOne(`${apiUrl}/users`).flush(mockUsers);

      await fixture.whenStable();

      expect(fixture.componentInstance.selectableProjects()).toEqual(mockProjects);

      const createButton = screen.getByRole('button', { name: /nueva tarea/i });
      expect(createButton).toBeTruthy();
      expect((createButton as HTMLButtonElement).disabled).toBe(true);

      expect(screen.getByText('Selecciona un proyecto para ver su tablero.')).toBeTruthy();
      expect(screen.queryByRole('heading', { level: 3 })).toBeNull();
    });

    it('developer: filtra los proyectos a los propios y no muestra "Nueva tarea"', async () => {
      const { fixture } = await render(TasksComponent, {
        providers: [
          provideHttpClient(),
          provideHttpClientTesting(),
          provideAnimationsAsync(),
          { provide: AuthService, useValue: buildFakeAuthService(developerUser) },
        ],
      });
      httpMock = TestBed.inject(HttpTestingController);

      httpMock.expectOne(`${apiUrl}/projects/mine?limit=100`).flush({ data: mockProjects, meta: pageMeta(mockProjects.length) });

      await fixture.whenStable();

      // Solo el proyecto donde el developer está asignado debe sobrevivir al filtro cliente
      expect(fixture.componentInstance.selectableProjects()).toEqual([mockProjects[0]]);
      expect(screen.queryByRole('button', { name: /nueva tarea/i })).toBeNull();
    });

    it('sin proyectos disponibles muestra el estado vacío correspondiente', async () => {
      const { fixture } = await render(TasksComponent, {
        providers: [
          provideHttpClient(),
          provideHttpClientTesting(),
          provideAnimationsAsync(),
          { provide: AuthService, useValue: buildFakeAuthService(developerUser) },
        ],
      });
      httpMock = TestBed.inject(HttpTestingController);

      httpMock.expectOne(`${apiUrl}/projects/mine?limit=100`).flush({ data: [], meta: pageMeta(0) });

      await fixture.whenStable();

      expect(screen.getByText('No hay proyectos disponibles.')).toBeTruthy();
    });
  });

  describe('Tablero kanban unificado — carga del proyecto seleccionado', () => {
    const setupAdminBoard = async () => {
      const { fixture } = await render(TasksComponent, {
        providers: [
          provideHttpClient(),
          provideHttpClientTesting(),
          provideAnimationsAsync(),
          { provide: AuthService, useValue: buildFakeAuthService(adminUser) },
        ],
      });
      httpMock = TestBed.inject(HttpTestingController);

      httpMock.expectOne(`${apiUrl}/projects?limit=100`).flush({ data: mockProjects, meta: pageMeta(mockProjects.length) });
      httpMock.expectOne(`${apiUrl}/users`).flush(mockUsers);
      await fixture.whenStable();

      fixture.componentInstance.selectedProjectId.set('project-1');
      fixture.detectChanges();

      httpMock
        .expectOne(`${apiUrl}/tasks/project/project-1?all=true`)
        .flush({ data: mockTasks, meta: pageMeta(mockTasks.length) });
      await fixture.whenStable();

      return fixture;
    };

    const setupDeveloperBoard = async () => {
      const { fixture } = await render(TasksComponent, {
        providers: [
          provideHttpClient(),
          provideHttpClientTesting(),
          provideAnimationsAsync(),
          { provide: AuthService, useValue: buildFakeAuthService(developerUser) },
        ],
      });
      httpMock = TestBed.inject(HttpTestingController);

      httpMock.expectOne(`${apiUrl}/projects/mine?limit=100`).flush({ data: mockProjects, meta: pageMeta(mockProjects.length) });
      await fixture.whenStable();

      fixture.componentInstance.selectedProjectId.set('project-1');
      fixture.detectChanges();

      httpMock
        .expectOne(`${apiUrl}/tasks/project/project-1?all=true`)
        .flush({ data: mockTasks, meta: pageMeta(mockTasks.length) });
      await fixture.whenStable();

      return fixture;
    };

    it('admin: solicita `all=true` sin paginar y agrupa las tareas en las 4 columnas fijas', async () => {
      const fixture = await setupAdminBoard();

      const columns = fixture.componentInstance.tasksByStatus();
      expect(columns.map((c) => c.status)).toEqual(['todo', 'in_progress', 'done', 'cancelled']);
      expect(columns.find((c) => c.status === 'todo')!.tasks.map((t) => t.id)).toEqual(['task-own']);
      expect(columns.find((c) => c.status === 'in_progress')!.tasks.map((t) => t.id)).toEqual(['task-other']);
      expect(columns.find((c) => c.status === 'done')!.tasks.map((t) => t.id)).toEqual(['task-own-done']);
      expect(columns.find((c) => c.status === 'cancelled')!.tasks).toEqual([]);

      // No queda ni rastro de paginador, tabla admin o toggle de vista
      expect(screen.queryByRole('button', { name: /siguiente página/i })).toBeNull();
      expect(screen.queryByRole('table')).toBeNull();
      expect(screen.queryByRole('group', { name: /modo de vista de tareas/i })).toBeNull();
    });

    it('developer: solicita `all=true` en el mismo endpoint unificado', async () => {
      const fixture = await setupDeveloperBoard();

      const columns = fixture.componentInstance.tasksByStatus();
      expect(columns.find((c) => c.status === 'todo')!.tasks.map((t) => t.id)).toEqual(['task-own']);
    });

    it('el botón "Nueva tarea" se habilita al seleccionar un proyecto', async () => {
      await setupAdminBoard();

      const createButton = screen.getByRole('button', { name: /nueva tarea/i }) as HTMLButtonElement;
      expect(createButton.disabled).toBe(false);
    });
  });

  describe('canDrag — admin puede arrastrar cualquier tarjeta, developer solo las propias', () => {
    it('admin: `canDragTask` es true incluso para una tarea ajena', async () => {
      const { fixture } = await render(TasksComponent, {
        providers: [
          provideHttpClient(),
          provideHttpClientTesting(),
          provideAnimationsAsync(),
          { provide: AuthService, useValue: buildFakeAuthService(adminUser) },
        ],
      });
      httpMock = TestBed.inject(HttpTestingController);

      httpMock.expectOne(`${apiUrl}/projects?limit=100`).flush({ data: mockProjects, meta: pageMeta(mockProjects.length) });
      httpMock.expectOne(`${apiUrl}/users`).flush(mockUsers);
      await fixture.whenStable();

      const foreignTask = mockTasks.find((t) => t.id === 'task-other')!;
      expect(fixture.componentInstance.canDragTask(foreignTask)).toBe(true);
    });

    it('developer: `canDragTask` es false para una tarea ajena y true para una propia', async () => {
      const { fixture } = await render(TasksComponent, {
        providers: [
          provideHttpClient(),
          provideHttpClientTesting(),
          provideAnimationsAsync(),
          { provide: AuthService, useValue: buildFakeAuthService(developerUser) },
        ],
      });
      httpMock = TestBed.inject(HttpTestingController);

      httpMock.expectOne(`${apiUrl}/projects/mine?limit=100`).flush({ data: mockProjects, meta: pageMeta(mockProjects.length) });
      await fixture.whenStable();

      const ownTask = mockTasks.find((t) => t.id === 'task-own')!;
      const foreignTask = mockTasks.find((t) => t.id === 'task-other')!;
      expect(fixture.componentInstance.canDragTask(ownTask)).toBe(true);
      expect(fixture.componentInstance.canDragTask(foreignTask)).toBe(false);
    });
  });

  describe('canManageTask — solo admin obtiene acciones de gestión', () => {
    it('admin: `canManageTask` es true', async () => {
      const { fixture } = await render(TasksComponent, {
        providers: [
          provideHttpClient(),
          provideHttpClientTesting(),
          provideAnimationsAsync(),
          { provide: AuthService, useValue: buildFakeAuthService(adminUser) },
        ],
      });
      httpMock = TestBed.inject(HttpTestingController);
      httpMock.expectOne(`${apiUrl}/projects?limit=100`).flush({ data: mockProjects, meta: pageMeta(mockProjects.length) });
      httpMock.expectOne(`${apiUrl}/users`).flush(mockUsers);
      await fixture.whenStable();

      expect(fixture.componentInstance.canManageTask()).toBe(true);
    });

    it('developer: `canManageTask` es false', async () => {
      const { fixture } = await render(TasksComponent, {
        providers: [
          provideHttpClient(),
          provideHttpClientTesting(),
          provideAnimationsAsync(),
          { provide: AuthService, useValue: buildFakeAuthService(developerUser) },
        ],
      });
      httpMock = TestBed.inject(HttpTestingController);
      httpMock.expectOne(`${apiUrl}/projects/mine?limit=100`).flush({ data: mockProjects, meta: pageMeta(mockProjects.length) });
      await fixture.whenStable();

      expect(fixture.componentInstance.canManageTask()).toBe(false);
    });
  });

  describe('canEstimateTask — solo developer, tarea propia', () => {
    it('admin: `canEstimateTask` es false incluso para una tarea que le fue asignada', async () => {
      const { fixture } = await render(TasksComponent, {
        providers: [
          provideHttpClient(),
          provideHttpClientTesting(),
          provideAnimationsAsync(),
          { provide: AuthService, useValue: buildFakeAuthService(adminUser) },
        ],
      });
      httpMock = TestBed.inject(HttpTestingController);
      httpMock.expectOne(`${apiUrl}/projects?limit=100`).flush({ data: mockProjects, meta: pageMeta(mockProjects.length) });
      httpMock.expectOne(`${apiUrl}/users`).flush(mockUsers);
      await fixture.whenStable();

      const ownTask = mockTasks.find((t) => t.id === 'task-own')!;
      expect(fixture.componentInstance.canEstimateTask(ownTask)).toBe(false);
    });

    it('developer: `canEstimateTask` es false para una tarea ajena y true para una propia', async () => {
      const { fixture } = await render(TasksComponent, {
        providers: [
          provideHttpClient(),
          provideHttpClientTesting(),
          provideAnimationsAsync(),
          { provide: AuthService, useValue: buildFakeAuthService(developerUser) },
        ],
      });
      httpMock = TestBed.inject(HttpTestingController);
      httpMock.expectOne(`${apiUrl}/projects/mine?limit=100`).flush({ data: mockProjects, meta: pageMeta(mockProjects.length) });
      await fixture.whenStable();

      const ownTask = mockTasks.find((t) => t.id === 'task-own')!;
      const foreignTask = mockTasks.find((t) => t.id === 'task-other')!;
      expect(fixture.componentInstance.canEstimateTask(ownTask)).toBe(true);
      expect(fixture.componentInstance.canEstimateTask(foreignTask)).toBe(false);
    });
  });

  describe('updateTaskEstimate / onKanbanEstimateChange (developer, tarea propia)', () => {
    it('envía PATCH /tasks/:id/estimate con las horas provistas y recarga el tablero', async () => {
      const { fixture } = await render(TasksComponent, {
        providers: [
          provideHttpClient(),
          provideHttpClientTesting(),
          provideAnimationsAsync(),
          { provide: AuthService, useValue: buildFakeAuthService(developerUser) },
        ],
      });
      httpMock = TestBed.inject(HttpTestingController);
      httpMock.expectOne(`${apiUrl}/projects/mine?limit=100`).flush({ data: mockProjects, meta: pageMeta(mockProjects.length) });
      await fixture.whenStable();

      fixture.componentInstance.selectedProjectId.set('project-1');
      fixture.detectChanges();

      httpMock
        .expectOne(`${apiUrl}/tasks/project/project-1?all=true`)
        .flush({ data: mockTasks, meta: pageMeta(mockTasks.length) });
      await fixture.whenStable();

      const ownTask = mockTasks.find((t) => t.id === 'task-own')!;
      fixture.componentInstance.onKanbanEstimateChange({ task: ownTask, estimatedHours: 6 });

      const req = httpMock.expectOne(`${apiUrl}/tasks/${ownTask.id}/estimate`);
      expect(req.request.method).toBe('PATCH');
      expect(req.request.body).toEqual({ estimatedHours: 6 });
      req.flush({ ...ownTask, estimatedHours: 6 });

      fixture.detectChanges();
      httpMock
        .expectOne(`${apiUrl}/tasks/project/project-1?all=true`)
        .flush({ data: mockTasks, meta: pageMeta(mockTasks.length) });
      await fixture.whenStable();
    });

    it('ignora un valor de horas estimadas inválido (0 o negativo) sin llamar al backend', async () => {
      const { fixture } = await render(TasksComponent, {
        providers: [
          provideHttpClient(),
          provideHttpClientTesting(),
          provideAnimationsAsync(),
          { provide: AuthService, useValue: buildFakeAuthService(developerUser) },
        ],
      });
      httpMock = TestBed.inject(HttpTestingController);
      httpMock.expectOne(`${apiUrl}/projects/mine?limit=100`).flush({ data: mockProjects, meta: pageMeta(mockProjects.length) });
      await fixture.whenStable();

      const ownTask = mockTasks.find((t) => t.id === 'task-own')!;
      fixture.componentInstance.updateTaskEstimate(ownTask, 0);

      httpMock.verify();
    });
  });

  describe('Cambio de estado por drag — admin usa `update`, developer usa `/status`', () => {
    const setupAdminBoard = async () => {
      const { fixture } = await render(TasksComponent, {
        providers: [
          provideHttpClient(),
          provideHttpClientTesting(),
          provideAnimationsAsync(),
          { provide: AuthService, useValue: buildFakeAuthService(adminUser) },
        ],
      });
      httpMock = TestBed.inject(HttpTestingController);

      httpMock.expectOne(`${apiUrl}/projects?limit=100`).flush({ data: mockProjects, meta: pageMeta(mockProjects.length) });
      httpMock.expectOne(`${apiUrl}/users`).flush(mockUsers);
      await fixture.whenStable();

      fixture.componentInstance.selectedProjectId.set('project-1');
      fixture.detectChanges();

      httpMock
        .expectOne(`${apiUrl}/tasks/project/project-1?all=true`)
        .flush({ data: mockTasks, meta: pageMeta(mockTasks.length) });
      await fixture.whenStable();

      return fixture;
    };

    it('admin: drag de una tarea ajena a "in_progress" llama PATCH /tasks/:id (update), no /status', async () => {
      const fixture = await setupAdminBoard();
      const foreignTask = mockTasks.find((t) => t.id === 'task-other')!; // status: in_progress -> target distinto
      const targetTask = mockTasks.find((t) => t.id === 'task-own')!; // status: todo

      fixture.componentInstance.onKanbanStatusChange({ task: targetTask, status: 'in_progress' });

      const req = httpMock.expectOne(`${apiUrl}/tasks/${targetTask.id}`);
      expect(req.request.method).toBe('PATCH');
      expect(req.request.body).toEqual({ status: 'in_progress' });
      req.flush({ ...targetTask, status: 'in_progress' });

      fixture.detectChanges();

      httpMock
        .expectOne(`${apiUrl}/tasks/project/project-1?all=true`)
        .flush({ data: mockTasks, meta: pageMeta(mockTasks.length) });
      await fixture.whenStable();

      // Prueba adicional: admin también puede mover una tarea que no es suya (foreignTask)
      expect(fixture.componentInstance.canDragTask(foreignTask)).toBe(true);
    });

    it('admin: drop a "done" abre confirmación y, al confirmar, llama update con status "done"', async () => {
      const mockDialogRef = { afterClosed: vi.fn().mockReturnValue(of(true)) };
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

      httpMock.expectOne(`${apiUrl}/projects?limit=100`).flush({ data: mockProjects, meta: pageMeta(mockProjects.length) });
      httpMock.expectOne(`${apiUrl}/users`).flush(mockUsers);
      await fixture.whenStable();

      fixture.componentInstance.selectedProjectId.set('project-1');
      fixture.detectChanges();

      httpMock
        .expectOne(`${apiUrl}/tasks/project/project-1?all=true`)
        .flush({ data: mockTasks, meta: pageMeta(mockTasks.length) });
      await fixture.whenStable();

      const targetTask = mockTasks.find((t) => t.id === 'task-other')!;
      fixture.componentInstance.onKanbanStatusChange({ task: targetTask, status: 'done' });

      expect(mockDialog.open).toHaveBeenCalled();

      const req = httpMock.expectOne(`${apiUrl}/tasks/${targetTask.id}`);
      expect(req.request.method).toBe('PATCH');
      expect(req.request.body).toEqual({ status: 'done' });
      req.flush({ ...targetTask, status: 'done' });

      fixture.detectChanges();
      httpMock
        .expectOne(`${apiUrl}/tasks/project/project-1?all=true`)
        .flush({ data: mockTasks, meta: pageMeta(mockTasks.length) });
      await fixture.whenStable();
    });

    it('developer: drag a "in_progress" sigue llamando PATCH /tasks/:id/status', async () => {
      const { fixture } = await render(TasksComponent, {
        providers: [
          provideHttpClient(),
          provideHttpClientTesting(),
          provideAnimationsAsync(),
          { provide: AuthService, useValue: buildFakeAuthService(developerUser) },
        ],
      });
      httpMock = TestBed.inject(HttpTestingController);

      httpMock.expectOne(`${apiUrl}/projects/mine?limit=100`).flush({ data: mockProjects, meta: pageMeta(mockProjects.length) });
      await fixture.whenStable();

      fixture.componentInstance.selectedProjectId.set('project-1');
      fixture.detectChanges();

      httpMock
        .expectOne(`${apiUrl}/tasks/project/project-1?all=true`)
        .flush({ data: mockTasks, meta: pageMeta(mockTasks.length) });
      await fixture.whenStable();

      const ownTask = mockTasks.find((t) => t.id === 'task-own')!;
      fixture.componentInstance.onKanbanStatusChange({ task: ownTask, status: 'in_progress' });

      const req = httpMock.expectOne(`${apiUrl}/tasks/${ownTask.id}/status`);
      expect(req.request.method).toBe('PATCH');
      expect(req.request.body).toEqual({ status: 'in_progress' });
      req.flush({ ...ownTask, status: 'in_progress' });

      fixture.detectChanges();
      httpMock
        .expectOne(`${apiUrl}/tasks/project/project-1?all=true`)
        .flush({ data: mockTasks, meta: pageMeta(mockTasks.length) });
      await fixture.whenStable();
    });

    it('muestra un error y revierte cuando el backend rechaza el cambio de estado del admin', async () => {
      const fixture = await setupAdminBoard();
      const targetTask = mockTasks.find((t) => t.id === 'task-own')!;

      fixture.componentInstance.onKanbanStatusChange({ task: targetTask, status: 'in_progress' });

      httpMock
        .expectOne(`${apiUrl}/tasks/${targetTask.id}`)
        .flush('error', { status: 500, statusText: 'Internal Server Error' });
      await fixture.whenStable();

      expect(
        screen.getByText('Error al actualizar el estado. Intenta nuevamente.'),
      ).toBeTruthy();
      expect(fixture.componentInstance.pendingMove()).toBeNull();
    });
  });

  describe('Reorder — alcanzable por ambos roles', () => {
    it('onKanbanReorder aplica el overlay optimista y persiste el nuevo orden (admin)', async () => {
      const { fixture } = await render(TasksComponent, {
        providers: [
          provideHttpClient(),
          provideHttpClientTesting(),
          provideAnimationsAsync(),
          { provide: AuthService, useValue: buildFakeAuthService(adminUser) },
        ],
      });
      httpMock = TestBed.inject(HttpTestingController);

      httpMock.expectOne(`${apiUrl}/projects?limit=100`).flush({ data: mockProjects, meta: pageMeta(mockProjects.length) });
      httpMock.expectOne(`${apiUrl}/users`).flush(mockUsers);
      await fixture.whenStable();

      fixture.componentInstance.selectedProjectId.set('project-1');
      fixture.detectChanges();

      httpMock
        .expectOne(`${apiUrl}/tasks/project/project-1?all=true`)
        .flush({ data: mockTasks, meta: pageMeta(mockTasks.length) });
      await fixture.whenStable();

      fixture.componentInstance.onKanbanReorder({ status: 'todo', taskIds: ['task-own'] });

      expect(fixture.componentInstance.pendingReorder()).toEqual({
        status: 'todo',
        orderedIds: ['task-own'],
      });

      httpMock.expectOne(`${apiUrl}/tasks/project/project-1/reorder`).flush(null);
      fixture.detectChanges();

      httpMock
        .expectOne(`${apiUrl}/tasks/project/project-1?all=true`)
        .flush({ data: mockTasks, meta: pageMeta(mockTasks.length) });
      await fixture.whenStable();

      expect(fixture.componentInstance.pendingReorder()).toBeNull();
    });
  });

  describe('Acciones de gestión del admin (crear/editar/cancelar) vía menú de la tarjeta', () => {
    const setupAdminBoard = async (mockDialog: { open: ReturnType<typeof vi.fn> }) => {
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

      httpMock.expectOne(`${apiUrl}/projects?limit=100`).flush({ data: mockProjects, meta: pageMeta(mockProjects.length) });
      httpMock.expectOne(`${apiUrl}/users`).flush(mockUsers);
      await fixture.whenStable();

      fixture.componentInstance.selectedProjectId.set('project-1');
      fixture.detectChanges();

      httpMock
        .expectOne(`${apiUrl}/tasks/project/project-1?all=true`)
        .flush({ data: mockTasks, meta: pageMeta(mockTasks.length) });
      await fixture.whenStable();

      return fixture;
    };

    it('openCreateDialog preselecciona el proyecto activo y recarga el tablero al cerrar con resultado', async () => {
      const mockDialogRef = { afterClosed: vi.fn().mockReturnValue(of({ id: 'task-new' })) };
      const mockDialog = { open: vi.fn().mockReturnValue(mockDialogRef) };
      const fixture = await setupAdminBoard(mockDialog);

      fixture.componentInstance.openCreateDialog();

      expect(mockDialog.open).toHaveBeenCalled();
      const dialogData = mockDialog.open.mock.calls[0][1].data;
      expect(dialogData.preselectedProjectId).toBe('project-1');

      fixture.detectChanges();
      httpMock
        .expectOne(`${apiUrl}/tasks/project/project-1?all=true`)
        .flush({ data: mockTasks, meta: pageMeta(mockTasks.length) });
      await fixture.whenStable();
    });

    it('editTask abre el diálogo de edición con la tarea y recarga al cerrar con resultado', async () => {
      const mockDialogRef = { afterClosed: vi.fn().mockReturnValue(of({ id: 'task-own' })) };
      const mockDialog = { open: vi.fn().mockReturnValue(mockDialogRef) };
      const fixture = await setupAdminBoard(mockDialog);

      const task = mockTasks.find((t) => t.id === 'task-own')!;
      fixture.componentInstance.editTask(task);

      expect(mockDialog.open).toHaveBeenCalled();
      const dialogData = mockDialog.open.mock.calls[0][1].data;
      expect(dialogData.task).toEqual(task);

      fixture.detectChanges();
      httpMock
        .expectOne(`${apiUrl}/tasks/project/project-1?all=true`)
        .flush({ data: mockTasks, meta: pageMeta(mockTasks.length) });
      await fixture.whenStable();
    });

    it('cancelTask abre ConfirmDialogComponent y, al confirmar, llama DELETE /tasks/:id', async () => {
      const mockDialogRef = { afterClosed: vi.fn().mockReturnValue(of(true)) };
      const mockDialog = { open: vi.fn().mockReturnValue(mockDialogRef) };
      const fixture = await setupAdminBoard(mockDialog);

      const task = mockTasks.find((t) => t.id === 'task-own')!;
      fixture.componentInstance.cancelTask(task);

      expect(mockDialog.open).toHaveBeenCalled();

      const req = httpMock.expectOne(`${apiUrl}/tasks/${task.id}`);
      expect(req.request.method).toBe('DELETE');
      req.flush({ ...task, status: 'cancelled' });

      fixture.detectChanges();
      httpMock
        .expectOne(`${apiUrl}/tasks/project/project-1?all=true`)
        .flush({ data: mockTasks, meta: pageMeta(mockTasks.length) });
      await fixture.whenStable();
    });

    it('cancelTask no envía nada cuando se declina la confirmación', async () => {
      const mockDialogRef = { afterClosed: vi.fn().mockReturnValue(of(false)) };
      const mockDialog = { open: vi.fn().mockReturnValue(mockDialogRef) };
      const fixture = await setupAdminBoard(mockDialog);

      const task = mockTasks.find((t) => t.id === 'task-own')!;
      fixture.componentInstance.cancelTask(task);

      expect(mockDialog.open).toHaveBeenCalled();
      httpMock.verify();
    });

    it('muestra un mensaje de error si la cancelación de una tarea falla', async () => {
      const mockDialogRef = { afterClosed: vi.fn().mockReturnValue(of(true)) };
      const mockDialog = { open: vi.fn().mockReturnValue(mockDialogRef) };
      const fixture = await setupAdminBoard(mockDialog);

      const task = mockTasks.find((t) => t.id === 'task-own')!;
      fixture.componentInstance.cancelTask(task);

      httpMock
        .expectOne(`${apiUrl}/tasks/${task.id}`)
        .flush('error', { status: 500, statusText: 'Internal Server Error' });
      await fixture.whenStable();

      expect(
        screen.getByText('Error al cancelar la tarea. Intenta nuevamente.'),
      ).toBeTruthy();
    });
  });

  describe('Confirmación de completar tarea (developer)', () => {
    const setupDeveloperView = async (mockDialog: {
      open: ReturnType<typeof vi.fn>;
    }) => {
      const { fixture } = await render(TasksComponent, {
        providers: [
          provideHttpClient(),
          provideHttpClientTesting(),
          provideAnimationsAsync(),
          { provide: AuthService, useValue: buildFakeAuthService(developerUser) },
          { provide: MatDialog, useValue: mockDialog },
        ],
      });
      httpMock = TestBed.inject(HttpTestingController);

      httpMock.expectOne(`${apiUrl}/projects/mine?limit=100`).flush({ data: mockProjects, meta: pageMeta(mockProjects.length) });
      await fixture.whenStable();

      fixture.componentInstance.selectedProjectId.set('project-1');
      fixture.detectChanges();

      httpMock
        .expectOne(`${apiUrl}/tasks/project/project-1?all=true`)
        .flush({ data: mockTasks, meta: pageMeta(mockTasks.length) });
      await fixture.whenStable();

      return fixture;
    };

    it('abre el diálogo de confirmación y envía la actualización cuando el desarrollador confirma', async () => {
      const mockDialogRef = { afterClosed: vi.fn().mockReturnValue(of(true)) };
      const mockDialog = { open: vi.fn().mockReturnValue(mockDialogRef) };

      const fixture = await setupDeveloperView(mockDialog);
      const ownTask = mockTasks.find((t) => t.id === 'task-own')!;
      const revert = vi.fn();

      fixture.componentInstance.updateTaskStatus(ownTask, 'done', revert);

      expect(mockDialog.open).toHaveBeenCalled();

      httpMock
        .expectOne(`${apiUrl}/tasks/${ownTask.id}/status`)
        .flush({ ...ownTask, status: 'done' });

      fixture.detectChanges();
      httpMock
        .expectOne(`${apiUrl}/tasks/project/project-1?all=true`)
        .flush({ data: mockTasks, meta: pageMeta(mockTasks.length) });
      await fixture.whenStable();
    });

    it('no envía ninguna solicitud y revierte cuando el desarrollador declina', async () => {
      const mockDialogRef = { afterClosed: vi.fn().mockReturnValue(of(false)) };
      const mockDialog = { open: vi.fn().mockReturnValue(mockDialogRef) };

      const fixture = await setupDeveloperView(mockDialog);
      const ownTask = mockTasks.find((t) => t.id === 'task-own')!;
      const revert = vi.fn();

      fixture.componentInstance.updateTaskStatus(ownTask, 'done', revert);

      expect(mockDialog.open).toHaveBeenCalled();
      expect(revert).toHaveBeenCalled();

      httpMock.verify();
    });

    it('no abre el diálogo de confirmación para selecciones distintas de "done"', async () => {
      const mockDialog = { open: vi.fn() };

      const fixture = await setupDeveloperView(mockDialog);
      const ownTask = mockTasks.find((t) => t.id === 'task-own')!;
      const revert = vi.fn();

      fixture.componentInstance.updateTaskStatus(ownTask, 'in_progress', revert);

      expect(mockDialog.open).not.toHaveBeenCalled();

      httpMock
        .expectOne(`${apiUrl}/tasks/${ownTask.id}/status`)
        .flush({ ...ownTask, status: 'in_progress' });

      fixture.detectChanges();
      httpMock
        .expectOne(`${apiUrl}/tasks/project/project-1?all=true`)
        .flush({ data: mockTasks, meta: pageMeta(mockTasks.length) });
      await fixture.whenStable();
    });
  });
});
