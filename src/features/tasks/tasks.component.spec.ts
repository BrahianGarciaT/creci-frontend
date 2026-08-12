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

      // Tarea propia: acciones interactivas (2 tareas propias en este fixture: pendiente y completada)
      expect(screen.getAllByLabelText('Cambiar estado de la tarea')).toHaveLength(2);
      expect(screen.getAllByLabelText('Horas estimadas')).toHaveLength(2);

      // Tarea ajena: sin acciones, marcador "No asignada a ti"
      expect(screen.getByLabelText('No asignada a ti')).toBeTruthy();

      // Nunca debe existir una opción de cancelar en la vista developer
      expect(screen.queryByRole('button', { name: /cancelar tarea/i })).toBeNull();
      expect(screen.queryByText(/cancelar/i)).toBeNull();

      // Tarea propia ya completada: el dropdown de estado existe pero deshabilitado
      // (done es terminal — ningún destino de transición es válido desde ahí)
      const statusSelects = screen.getAllByLabelText('Cambiar estado de la tarea');
      expect(statusSelects).toHaveLength(2);
      expect(statusSelects[0].getAttribute('aria-disabled')).not.toBe('true');
      expect(statusSelects[1].getAttribute('aria-disabled')).toBe('true');
    });
  });

  describe('Indicador de vencimiento (admin)', () => {
    // "Hoy" fijo para todas las aserciones — medianoche local del 11/08/2026
    const today = new Date(2026, 7, 11);
    const yesterday = new Date(2026, 7, 10);

    const overdueScenarioTasks: Task[] = [
      {
        id: 'task-overdue',
        title: 'Tarea vencida',
        status: 'todo',
        priority: 'high',
        dueDate: yesterday.toISOString(),
        projectId: 'project-1',
        project: { id: 'project-1', name: 'Proyecto Alpha' },
        assigneeId: null,
        assignee: null,
        createdAt: '',
        updatedAt: '',
      },
      {
        id: 'task-due-today',
        title: 'Tarea de hoy',
        status: 'todo',
        priority: 'medium',
        dueDate: today.toISOString(),
        projectId: 'project-1',
        project: { id: 'project-1', name: 'Proyecto Alpha' },
        assigneeId: null,
        assignee: null,
        createdAt: '',
        updatedAt: '',
      },
      {
        id: 'task-done-overdue',
        title: 'Tarea completada vencida',
        status: 'done',
        priority: 'low',
        dueDate: yesterday.toISOString(),
        projectId: 'project-1',
        project: { id: 'project-1', name: 'Proyecto Alpha' },
        assigneeId: null,
        assignee: null,
        createdAt: '',
        updatedAt: '',
      },
      {
        id: 'task-cancelled-overdue',
        title: 'Tarea cancelada vencida',
        status: 'cancelled',
        priority: 'low',
        dueDate: yesterday.toISOString(),
        projectId: 'project-1',
        project: { id: 'project-1', name: 'Proyecto Alpha' },
        assigneeId: null,
        assignee: null,
        createdAt: '',
        updatedAt: '',
      },
      {
        id: 'task-no-due-date',
        title: 'Tarea sin fecha',
        status: 'todo',
        priority: 'low',
        projectId: 'project-1',
        project: { id: 'project-1', name: 'Proyecto Alpha' },
        assigneeId: null,
        assignee: null,
        createdAt: '',
        updatedAt: '',
      },
    ];

    afterEach(() => {
      vi.useRealTimers();
    });

    it('marca vencidas solo las tareas activas con fecha estrictamente pasada', async () => {
      vi.setSystemTime(new Date(2026, 7, 11, 10, 0, 0));

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
      httpMock.expectOne(`${apiUrl}/tasks`).flush(overdueScenarioTasks);

      await fixture.whenStable();

      const component = fixture.componentInstance;
      expect(component.adminColumns).toContain('dueDate');

      // Vencida y activa → vencida
      expect(component.isOverdue(overdueScenarioTasks[0])).toBe(true);
      // Vence hoy → NO vencida
      expect(component.isOverdue(overdueScenarioTasks[1])).toBe(false);
      // Vencida pero completada → NO vencida
      expect(component.isOverdue(overdueScenarioTasks[2])).toBe(false);
      // Vencida pero cancelada → NO vencida
      expect(component.isOverdue(overdueScenarioTasks[3])).toBe(false);
      // Sin fecha límite → NO vencida
      expect(component.isOverdue(overdueScenarioTasks[4])).toBe(false);

      // Badge visual solo en la fecha de la tarea realmente vencida (activa),
      // no en las de estado "done"/"cancelled" que comparten la misma fecha
      const dateCells = screen.getAllByText('10/08/2026');
      const overdueCell = dateCells.find((el) =>
        el.closest('mat-row')?.textContent?.includes('Tarea vencida'),
      );
      expect(overdueCell?.classList.contains('overdue-badge')).toBe(true);

      const nonOverdueCells = dateCells.filter((el) => el !== overdueCell);
      for (const cell of nonOverdueCells) {
        expect(cell.classList.contains('overdue-badge')).toBe(false);
      }

      const dueTodayCell = screen.getByText('11/08/2026');
      expect(dueTodayCell.classList.contains('overdue-badge')).toBe(false);

      // Tarea sin fecha muestra guion largo
      expect(screen.getAllByText('—').length).toBeGreaterThan(0);
    });
  });

  describe('Filtro de estado y prioridad (admin)', () => {
    const filterScenarioTasks: Task[] = [
      {
        id: 'filter-todo-high',
        title: 'Todo alta',
        status: 'todo',
        priority: 'high',
        projectId: 'project-1',
        project: { id: 'project-1', name: 'Proyecto Alpha' },
        assigneeId: null,
        assignee: null,
        createdAt: '',
        updatedAt: '',
      },
      {
        id: 'filter-progress-medium',
        title: 'Progreso media',
        status: 'in_progress',
        priority: 'medium',
        projectId: 'project-1',
        project: { id: 'project-1', name: 'Proyecto Alpha' },
        assigneeId: null,
        assignee: null,
        createdAt: '',
        updatedAt: '',
      },
      {
        id: 'filter-done-low',
        title: 'Completada baja',
        status: 'done',
        priority: 'low',
        projectId: 'project-1',
        project: { id: 'project-1', name: 'Proyecto Alpha' },
        assigneeId: null,
        assignee: null,
        createdAt: '',
        updatedAt: '',
      },
    ];

    it('filtra la lista en cliente sin disparar peticiones de red adicionales', async () => {
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
      httpMock.expectOne(`${apiUrl}/tasks`).flush(filterScenarioTasks);

      await fixture.whenStable();

      const component = fixture.componentInstance;
      expect(component.filteredAdminTasks().length).toBe(3);

      component.statusFilter.set('todo');
      fixture.detectChanges();

      // httpMock.verify() en afterEach fallaría si el filtro disparase una petición nueva
      expect(component.filteredAdminTasks().length).toBe(1);
      expect(screen.getByText('Todo alta')).toBeTruthy();
      expect(screen.queryByText('Progreso media')).toBeNull();
    });

    it('muestra un mensaje de "sin resultados" distinto del estado vacío genuino', async () => {
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
      httpMock.expectOne(`${apiUrl}/tasks`).flush(filterScenarioTasks);

      await fixture.whenStable();

      fixture.componentInstance.statusFilter.set('cancelled');
      fixture.detectChanges();

      expect(
        screen.getByText('Ningún resultado coincide con los filtros seleccionados.'),
      ).toBeTruthy();
      expect(screen.queryByText('No hay tareas registradas. Crea la primera.')).toBeNull();
    });

    it('mantiene el filtro aplicado tras recargar la lista', async () => {
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
      httpMock.expectOne(`${apiUrl}/tasks`).flush(filterScenarioTasks);

      await fixture.whenStable();

      fixture.componentInstance.priorityFilter.set('high');
      fixture.detectChanges();

      expect(fixture.componentInstance.filteredAdminTasks().length).toBe(1);

      // Simula una recarga (p.ej. tras cerrar un diálogo de edición con resultado)
      fixture.componentInstance.allTasksResource.reload();
      fixture.detectChanges();

      httpMock.expectOne(`${apiUrl}/tasks`).flush(filterScenarioTasks);
      await fixture.whenStable();

      expect(fixture.componentInstance.priorityFilter()).toBe('high');
      expect(fixture.componentInstance.filteredAdminTasks().length).toBe(1);
    });
  });

  describe('Confirmación de completar tarea (developer)', () => {
    const ownTask = mockDeveloperTasks[0]; // status: 'todo'

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

      httpMock.expectOne(`${apiUrl}/projects/mine`).flush(mockProjects);
      await fixture.whenStable();

      fixture.componentInstance.selectedProjectId.set('project-1');
      fixture.detectChanges();

      httpMock.expectOne(`${apiUrl}/tasks/project/project-1`).flush(mockDeveloperTasks);
      await fixture.whenStable();

      return fixture;
    };

    it('abre el diálogo de confirmación y envía la actualización cuando el desarrollador confirma', async () => {
      const mockDialogRef = { afterClosed: vi.fn().mockReturnValue(of(true)) };
      const mockDialog = { open: vi.fn().mockReturnValue(mockDialogRef) };

      const fixture = await setupDeveloperView(mockDialog);
      const selectStub = { value: ownTask.status } as any;

      fixture.componentInstance.updateTaskStatus(ownTask, 'done', selectStub);

      expect(mockDialog.open).toHaveBeenCalled();

      httpMock
        .expectOne(`${apiUrl}/tasks/${ownTask.id}/status`)
        .flush({ ...ownTask, status: 'done' });

      // Fuerza el flush síncrono de los efectos pendientes para que el resource despache
      // el nuevo fetch tras reload() (whenStable() aquí deadlockearía).
      fixture.detectChanges();

      httpMock.expectOne(`${apiUrl}/tasks/project/project-1`).flush([{ ...ownTask, status: 'done' }, mockDeveloperTasks[1]]);
      await fixture.whenStable();
    });

    it('no envía ninguna solicitud y revierte el select cuando el desarrollador declina', async () => {
      const mockDialogRef = { afterClosed: vi.fn().mockReturnValue(of(false)) };
      const mockDialog = { open: vi.fn().mockReturnValue(mockDialogRef) };

      const fixture = await setupDeveloperView(mockDialog);
      const selectStub = { value: 'done' } as any;

      fixture.componentInstance.updateTaskStatus(ownTask, 'done', selectStub);

      expect(mockDialog.open).toHaveBeenCalled();
      expect(selectStub.value).toBe(ownTask.status);

      httpMock.verify();
    });

    it('revierte el select y muestra un error cuando el backend rechaza tras confirmar', async () => {
      const mockDialogRef = { afterClosed: vi.fn().mockReturnValue(of(true)) };
      const mockDialog = { open: vi.fn().mockReturnValue(mockDialogRef) };

      const fixture = await setupDeveloperView(mockDialog);
      const selectStub = { value: 'done' } as any;

      fixture.componentInstance.updateTaskStatus(ownTask, 'done', selectStub);

      httpMock
        .expectOne(`${apiUrl}/tasks/${ownTask.id}/status`)
        .flush('error', { status: 400, statusText: 'Bad Request' });
      await fixture.whenStable();

      expect(selectStub.value).toBe(ownTask.status);
      expect(
        screen.getByText('Error al actualizar el estado. Intenta nuevamente.'),
      ).toBeTruthy();
    });

    it('no abre el diálogo de confirmación para selecciones distintas de "done"', async () => {
      const mockDialog = { open: vi.fn() };

      const fixture = await setupDeveloperView(mockDialog);
      const selectStub = { value: 'todo' } as any;

      fixture.componentInstance.updateTaskStatus(ownTask, 'in_progress', selectStub);

      expect(mockDialog.open).not.toHaveBeenCalled();

      httpMock
        .expectOne(`${apiUrl}/tasks/${ownTask.id}/status`)
        .flush({ ...ownTask, status: 'in_progress' });

      // Fuerza el flush síncrono de los efectos pendientes para que el resource despache
      // el nuevo fetch tras reload() (whenStable() aquí deadlockearía).
      fixture.detectChanges();

      httpMock
        .expectOne(`${apiUrl}/tasks/project/project-1`)
        .flush([{ ...ownTask, status: 'in_progress' }, mockDeveloperTasks[1]]);
      await fixture.whenStable();
    });
  });
});
