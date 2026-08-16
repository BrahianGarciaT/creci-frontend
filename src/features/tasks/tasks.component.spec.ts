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
import { UiPreferencesService, TasksViewMode } from '../../core/services/ui-preferences.service';
import { environment } from '../../environments/environment';

const apiUrl = environment.apiUrl;

// Construye el `meta` de una respuesta paginada — mismo cálculo que el backend (`Math.ceil`)
function pageMeta(total: number, page = 1, limit = 20): PageMeta {
  return { total, page, limit, totalPages: Math.ceil(total / limit) };
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

      httpMock.expectOne(`${apiUrl}/projects?limit=100`).flush({ data: mockProjects, meta: pageMeta(mockProjects.length, 1, 100) });
      httpMock.expectOne(`${apiUrl}/users`).flush(mockUsers);
      httpMock.expectOne(`${apiUrl}/tasks?page=1&limit=20`).flush({ data: mockTasks, meta: pageMeta(mockTasks.length) });

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

      // La vista admin no gana el toggle lista/kanban ni el tablero — es exclusivo de developer
      expect(screen.queryByRole('group', { name: /modo de vista de tareas/i })).toBeNull();
      expect(screen.queryByText(/el tablero muestra solo las tareas de la página actual/i)).toBeNull();
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

      httpMock.expectOne(`${apiUrl}/projects?limit=100`).flush({ data: mockProjects, meta: pageMeta(mockProjects.length, 1, 100) });
      httpMock.expectOne(`${apiUrl}/users`).flush(mockUsers);
      httpMock.expectOne(`${apiUrl}/tasks?page=1&limit=20`).flush({ data: mockTasks, meta: pageMeta(mockTasks.length) });

      await fixture.whenStable();

      screen.getByRole('button', { name: /nueva tarea/i }).click();

      expect(mockDialog.open).toHaveBeenCalled();

      // Fuerza el flush síncrono de los efectos pendientes para que el resource despache
      // el nuevo fetch (no se puede usar whenStable aquí: el resource queda "loading" hasta
      // que se resuelve el flush del mock, lo que crearía un deadlock).
      fixture.detectChanges();

      // El cierre del diálogo con resultado truthy debe disparar allTasksResource.reload()
      httpMock.expectOne(`${apiUrl}/tasks?page=1&limit=20`).flush({ data: mockTasks, meta: pageMeta(mockTasks.length) });

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

      httpMock.expectOne(`${apiUrl}/projects?limit=100`).flush({ data: mockProjects, meta: pageMeta(mockProjects.length, 1, 100) });
      httpMock.expectOne(`${apiUrl}/users`).flush(mockUsers);
      httpMock.expectOne(`${apiUrl}/tasks?page=1&limit=20`).flush({ data: mockTasks, meta: pageMeta(mockTasks.length) });

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

      httpMock.expectOne(`${apiUrl}/projects/mine?limit=100`).flush({ data: mockProjects, meta: pageMeta(mockProjects.length, 1, 100) });

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

      httpMock.expectOne(`${apiUrl}/projects/mine?limit=100`).flush({ data: mockProjects, meta: pageMeta(mockProjects.length, 1, 100) });
      await fixture.whenStable();

      // Selecciona el proyecto directamente vía el signal público (equivalente al (valueChange) del template)
      fixture.componentInstance.selectedProjectId.set('project-1');
      // Fuerza el flush síncrono de los efectos pendientes para que el resource despache
      // el nuevo fetch (no se puede usar whenStable aquí: el resource queda "loading" hasta
      // que se resuelve el flush del mock, lo que crearía un deadlock).
      fixture.detectChanges();

      httpMock.expectOne(`${apiUrl}/tasks/project/project-1?page=1&limit=20`).flush({ data: mockDeveloperTasks, meta: pageMeta(mockDeveloperTasks.length) });
      await fixture.whenStable();

      expect(screen.getByText('Tarea propia')).toBeTruthy();
      expect(screen.getByText('Tarea ajena')).toBeTruthy();

      // Tarea propia: acciones interactivas (2 tareas propias en este fixture: pendiente y completada)
      expect(screen.getAllByLabelText('Cambiar estado de la tarea')).toHaveLength(2);
      const estimateInputs = screen.getAllByLabelText('Horas estimadas');
      expect(estimateInputs).toHaveLength(2);

      // El backend rechaza updateEstimate sobre tareas 'done' (terminal) — el input debe
      // quedar deshabilitado en vez de dejar que el usuario dispare un error evitable.
      expect((estimateInputs[0] as HTMLInputElement).disabled).toBe(false); // task-own: todo
      expect((estimateInputs[1] as HTMLInputElement).disabled).toBe(true); // task-own-done: done

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

    it('deshabilita estado y estimación de una tarea propia cancelada (solo lectura)', async () => {
      // El backend ya no excluye status=cancelled de /tasks/project/:id — el dev
      // ve la tarea cancelada pero no puede tocar su estado ni su estimación
      // (backend rechaza ambas mutaciones con 400, ver tasks.service.ts).
      const { fixture } = await render(TasksComponent, {
        providers: [
          provideHttpClient(),
          provideHttpClientTesting(),
          provideAnimationsAsync(),
          { provide: AuthService, useValue: buildFakeAuthService(developerUser) },
        ],
      });
      httpMock = TestBed.inject(HttpTestingController);

      httpMock.expectOne(`${apiUrl}/projects/mine?limit=100`).flush({ data: mockProjects, meta: pageMeta(mockProjects.length, 1, 100) });
      await fixture.whenStable();

      fixture.componentInstance.selectedProjectId.set('project-1');
      fixture.detectChanges();

      const cancelledTask: Task = {
        ...mockDeveloperTasks[0],
        id: 'task-own-cancelled',
        title: 'Tarea propia cancelada',
        status: 'cancelled',
      };
      httpMock
        .expectOne(`${apiUrl}/tasks/project/project-1?page=1&limit=20`)
        .flush({ data: [cancelledTask], meta: pageMeta(1) });
      await fixture.whenStable();

      expect(screen.getByText('Cancelada')).toBeTruthy();

      const statusSelect = screen.getByLabelText('Cambiar estado de la tarea');
      expect(statusSelect.getAttribute('aria-disabled')).toBe('true');

      const estimateInput = screen.getByLabelText('Horas estimadas') as HTMLInputElement;
      expect(estimateInput.disabled).toBe(true);
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

      httpMock.expectOne(`${apiUrl}/projects?limit=100`).flush({ data: mockProjects, meta: pageMeta(mockProjects.length, 1, 100) });
      httpMock.expectOne(`${apiUrl}/users`).flush(mockUsers);
      httpMock.expectOne(`${apiUrl}/tasks?page=1&limit=20`).flush({ data: overdueScenarioTasks, meta: pageMeta(overdueScenarioTasks.length) });

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

    it('el cambio de filtro de estado dispara una nueva petición con el status como query param', async () => {
      const { fixture } = await render(TasksComponent, {
        providers: [
          provideHttpClient(),
          provideHttpClientTesting(),
          provideAnimationsAsync(),
          { provide: AuthService, useValue: buildFakeAuthService(adminUser) },
        ],
      });
      httpMock = TestBed.inject(HttpTestingController);

      httpMock.expectOne(`${apiUrl}/projects?limit=100`).flush({ data: mockProjects, meta: pageMeta(mockProjects.length, 1, 100) });
      httpMock.expectOne(`${apiUrl}/users`).flush(mockUsers);
      httpMock.expectOne(`${apiUrl}/tasks?page=1&limit=20`).flush({ data: filterScenarioTasks, meta: pageMeta(filterScenarioTasks.length) });

      await fixture.whenStable();

      const component = fixture.componentInstance;
      component.setStatusFilter('todo');
      fixture.detectChanges();

      const filtered = [filterScenarioTasks[0]];
      httpMock
        .expectOne(`${apiUrl}/tasks?page=1&limit=20&status=todo`)
        .flush({ data: filtered, meta: pageMeta(filtered.length) });
      await fixture.whenStable();
      fixture.detectChanges();

      expect(screen.getByText('Todo alta')).toBeTruthy();
      expect(screen.queryByText('Progreso media')).toBeNull();
    });

    it('cambiar el filtro estando en una página distinta de 1 resetea la página a 1', async () => {
      const { fixture } = await render(TasksComponent, {
        providers: [
          provideHttpClient(),
          provideHttpClientTesting(),
          provideAnimationsAsync(),
          { provide: AuthService, useValue: buildFakeAuthService(adminUser) },
        ],
      });
      httpMock = TestBed.inject(HttpTestingController);

      httpMock.expectOne(`${apiUrl}/projects?limit=100`).flush({ data: mockProjects, meta: pageMeta(mockProjects.length, 1, 100) });
      httpMock.expectOne(`${apiUrl}/users`).flush(mockUsers);
      httpMock
        .expectOne(`${apiUrl}/tasks?page=1&limit=20`)
        .flush({ data: filterScenarioTasks, meta: pageMeta(50, 1) });

      await fixture.whenStable();

      const component = fixture.componentInstance;
      component.onAdminPageChange({ pageIndex: 1, pageSize: 20, length: 50 });
      fixture.detectChanges();

      httpMock
        .expectOne(`${apiUrl}/tasks?page=2&limit=20`)
        .flush({ data: filterScenarioTasks, meta: pageMeta(50, 2) });
      await fixture.whenStable();
      fixture.detectChanges();

      expect(component.adminPage()).toBe(2);

      component.setPriorityFilter('high');
      fixture.detectChanges();

      expect(component.adminPage()).toBe(1);

      httpMock
        .expectOne(`${apiUrl}/tasks?page=1&limit=20&priority=high`)
        .flush({ data: [filterScenarioTasks[0]], meta: pageMeta(1) });
      await fixture.whenStable();
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

      httpMock.expectOne(`${apiUrl}/projects?limit=100`).flush({ data: mockProjects, meta: pageMeta(mockProjects.length, 1, 100) });
      httpMock.expectOne(`${apiUrl}/users`).flush(mockUsers);
      httpMock.expectOne(`${apiUrl}/tasks?page=1&limit=20`).flush({ data: filterScenarioTasks, meta: pageMeta(filterScenarioTasks.length) });

      await fixture.whenStable();

      fixture.componentInstance.setStatusFilter('cancelled');
      fixture.detectChanges();

      httpMock
        .expectOne(`${apiUrl}/tasks?page=1&limit=20&status=cancelled`)
        .flush({ data: [], meta: pageMeta(0) });
      await fixture.whenStable();
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

      httpMock.expectOne(`${apiUrl}/projects?limit=100`).flush({ data: mockProjects, meta: pageMeta(mockProjects.length, 1, 100) });
      httpMock.expectOne(`${apiUrl}/users`).flush(mockUsers);
      httpMock.expectOne(`${apiUrl}/tasks?page=1&limit=20`).flush({ data: filterScenarioTasks, meta: pageMeta(filterScenarioTasks.length) });

      await fixture.whenStable();

      fixture.componentInstance.setPriorityFilter('high');
      fixture.detectChanges();

      const filtered = [filterScenarioTasks[0]];
      httpMock
        .expectOne(`${apiUrl}/tasks?page=1&limit=20&priority=high`)
        .flush({ data: filtered, meta: pageMeta(filtered.length) });
      await fixture.whenStable();

      expect(fixture.componentInstance.priorityFilter()).toBe('high');

      // Simula una recarga (p.ej. tras cerrar un diálogo de edición con resultado)
      fixture.componentInstance.allTasksResource.reload();
      fixture.detectChanges();

      httpMock
        .expectOne(`${apiUrl}/tasks?page=1&limit=20&priority=high`)
        .flush({ data: filtered, meta: pageMeta(filtered.length) });
      await fixture.whenStable();

      expect(fixture.componentInstance.priorityFilter()).toBe('high');
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

      httpMock.expectOne(`${apiUrl}/projects/mine?limit=100`).flush({ data: mockProjects, meta: pageMeta(mockProjects.length, 1, 100) });
      await fixture.whenStable();

      fixture.componentInstance.selectedProjectId.set('project-1');
      fixture.detectChanges();

      httpMock.expectOne(`${apiUrl}/tasks/project/project-1?page=1&limit=20`).flush({ data: mockDeveloperTasks, meta: pageMeta(mockDeveloperTasks.length) });
      await fixture.whenStable();

      return fixture;
    };

    it('abre el diálogo de confirmación y envía la actualización cuando el desarrollador confirma', async () => {
      const mockDialogRef = { afterClosed: vi.fn().mockReturnValue(of(true)) };
      const mockDialog = { open: vi.fn().mockReturnValue(mockDialogRef) };

      const fixture = await setupDeveloperView(mockDialog);
      const revert = vi.fn();

      fixture.componentInstance.updateTaskStatus(ownTask, 'done', revert);

      expect(mockDialog.open).toHaveBeenCalled();

      httpMock
        .expectOne(`${apiUrl}/tasks/${ownTask.id}/status`)
        .flush({ ...ownTask, status: 'done' });

      // Fuerza el flush síncrono de los efectos pendientes para que el resource despache
      // el nuevo fetch tras reload() (whenStable() aquí deadlockearía).
      fixture.detectChanges();

      const reloadedTasks = [{ ...ownTask, status: 'done' as const }, mockDeveloperTasks[1]];
      httpMock.expectOne(`${apiUrl}/tasks/project/project-1?page=1&limit=20`).flush({ data: reloadedTasks, meta: pageMeta(reloadedTasks.length) });
      await fixture.whenStable();
    });

    it('no envía ninguna solicitud y revierte el select cuando el desarrollador declina', async () => {
      const mockDialogRef = { afterClosed: vi.fn().mockReturnValue(of(false)) };
      const mockDialog = { open: vi.fn().mockReturnValue(mockDialogRef) };

      const fixture = await setupDeveloperView(mockDialog);
      const revert = vi.fn();

      fixture.componentInstance.updateTaskStatus(ownTask, 'done', revert);

      expect(mockDialog.open).toHaveBeenCalled();
      expect(revert).toHaveBeenCalled();

      httpMock.verify();
    });

    it('revierte el select y muestra un error cuando el backend rechaza tras confirmar', async () => {
      const mockDialogRef = { afterClosed: vi.fn().mockReturnValue(of(true)) };
      const mockDialog = { open: vi.fn().mockReturnValue(mockDialogRef) };

      const fixture = await setupDeveloperView(mockDialog);
      const revert = vi.fn();

      fixture.componentInstance.updateTaskStatus(ownTask, 'done', revert);

      httpMock
        .expectOne(`${apiUrl}/tasks/${ownTask.id}/status`)
        .flush('error', { status: 400, statusText: 'Bad Request' });
      await fixture.whenStable();

      expect(revert).toHaveBeenCalled();
      expect(
        screen.getByText('Error al actualizar el estado. Intenta nuevamente.'),
      ).toBeTruthy();
    });

    it('no abre el diálogo de confirmación para selecciones distintas de "done"', async () => {
      const mockDialog = { open: vi.fn() };

      const fixture = await setupDeveloperView(mockDialog);
      const revert = vi.fn();

      fixture.componentInstance.updateTaskStatus(ownTask, 'in_progress', revert);

      expect(mockDialog.open).not.toHaveBeenCalled();

      httpMock
        .expectOne(`${apiUrl}/tasks/${ownTask.id}/status`)
        .flush({ ...ownTask, status: 'in_progress' });

      // Fuerza el flush síncrono de los efectos pendientes para que el resource despache
      // el nuevo fetch tras reload() (whenStable() aquí deadlockearía).
      fixture.detectChanges();

      const reloadedTasks = [{ ...ownTask, status: 'in_progress' as const }, mockDeveloperTasks[1]];
      httpMock
        .expectOne(`${apiUrl}/tasks/project/project-1?page=1&limit=20`)
        .flush({ data: reloadedTasks, meta: pageMeta(reloadedTasks.length) });
      await fixture.whenStable();
    });
  });

  describe('Vista kanban (developer)', () => {
    // UiPreferencesService falso — permite controlar la hidratación inicial y espiar la persistencia
    const buildFakeUiPreferences = (initialMode: TasksViewMode = 'list') => ({
      getTasksViewMode: vi.fn().mockReturnValue(initialMode),
      setTasksViewMode: vi.fn(),
    });

    const setupDeveloperKanban = async (
      fakeUiPreferences: ReturnType<typeof buildFakeUiPreferences>,
      mockDialog: { open: ReturnType<typeof vi.fn> } = { open: vi.fn() },
    ) => {
      const { fixture } = await render(TasksComponent, {
        providers: [
          provideHttpClient(),
          provideHttpClientTesting(),
          provideAnimationsAsync(),
          { provide: AuthService, useValue: buildFakeAuthService(developerUser) },
          { provide: UiPreferencesService, useValue: fakeUiPreferences },
          { provide: MatDialog, useValue: mockDialog },
        ],
      });
      httpMock = TestBed.inject(HttpTestingController);

      httpMock.expectOne(`${apiUrl}/projects/mine?limit=100`).flush({ data: mockProjects, meta: pageMeta(mockProjects.length, 1, 100) });
      await fixture.whenStable();

      fixture.componentInstance.selectedProjectId.set('project-1');
      fixture.detectChanges();

      httpMock.expectOne(`${apiUrl}/tasks/project/project-1?page=1&limit=20`).flush({ data: mockDeveloperTasks, meta: pageMeta(mockDeveloperTasks.length) });
      await fixture.whenStable();

      return fixture;
    };

    it('hidrata el modo de vista desde UiPreferencesService al iniciar', async () => {
      const fakeUiPreferences = buildFakeUiPreferences('kanban');
      const fixture = await setupDeveloperKanban(fakeUiPreferences);

      expect(fakeUiPreferences.getTasksViewMode).toHaveBeenCalled();
      expect(fixture.componentInstance.viewMode()).toBe('kanban');
    });

    it('el toggle cambia la vista renderizada y persiste la preferencia', async () => {
      const fakeUiPreferences = buildFakeUiPreferences('list');
      const fixture = await setupDeveloperKanban(fakeUiPreferences);

      expect(screen.getByRole('table', { name: /tabla de tareas del proyecto/i })).toBeTruthy();

      fixture.componentInstance.setViewMode('kanban');
      fixture.detectChanges();

      expect(fakeUiPreferences.setTasksViewMode).toHaveBeenCalledWith('kanban');
      expect(screen.queryByRole('table', { name: /tabla de tareas del proyecto/i })).toBeNull();
    });

    it('agrupa la página actual en las 4 columnas fijas, incluida "cancelled" vacía', async () => {
      const fakeUiPreferences = buildFakeUiPreferences('kanban');
      const fixture = await setupDeveloperKanban(fakeUiPreferences);

      const columns = fixture.componentInstance.developerTasksByStatus();
      expect(columns.map((c) => c.status)).toEqual(['todo', 'in_progress', 'done', 'cancelled']);

      const todoColumn = columns.find((c) => c.status === 'todo')!;
      const inProgressColumn = columns.find((c) => c.status === 'in_progress')!;
      const doneColumn = columns.find((c) => c.status === 'done')!;
      const cancelledColumn = columns.find((c) => c.status === 'cancelled')!;

      expect(todoColumn.tasks.map((t) => t.id)).toEqual(['task-own']);
      expect(inProgressColumn.tasks.map((t) => t.id)).toEqual(['task-other']);
      expect(doneColumn.tasks.map((t) => t.id)).toEqual(['task-own-done']);
      expect(cancelledColumn.tasks).toEqual([]);
    });

    it('muestra las tareas canceladas en la columna "cancelled" (solo lectura, no-droppable)', async () => {
      // El backend ya no excluye status=cancelled de /tasks/project/:id (ver
      // apps/backend tasks.service.ts findByProject) — el dev debe ver que su
      // tarea fue cancelada en vez de que desaparezca sin rastro.
      const fakeUiPreferences = buildFakeUiPreferences('kanban');
      const { fixture } = await render(TasksComponent, {
        providers: [
          provideHttpClient(),
          provideHttpClientTesting(),
          provideAnimationsAsync(),
          { provide: AuthService, useValue: buildFakeAuthService(developerUser) },
          { provide: UiPreferencesService, useValue: fakeUiPreferences },
        ],
      });
      httpMock = TestBed.inject(HttpTestingController);

      httpMock.expectOne(`${apiUrl}/projects/mine?limit=100`).flush({ data: mockProjects, meta: pageMeta(mockProjects.length, 1, 100) });
      await fixture.whenStable();

      fixture.componentInstance.selectedProjectId.set('project-1');
      fixture.detectChanges();

      const cancelledTask: Task = {
        ...mockDeveloperTasks[0],
        id: 'task-own-cancelled',
        status: 'cancelled',
      };
      const tasksWithCancelled = [...mockDeveloperTasks, cancelledTask];
      httpMock
        .expectOne(`${apiUrl}/tasks/project/project-1?page=1&limit=20`)
        .flush({ data: tasksWithCancelled, meta: pageMeta(tasksWithCancelled.length) });
      await fixture.whenStable();

      const columns = fixture.componentInstance.developerTasksByStatus();
      const cancelledColumn = columns.find((c) => c.status === 'cancelled')!;

      expect(cancelledColumn.droppable).toBe(false);
      expect(cancelledColumn.tasks.map((t) => t.id)).toEqual(['task-own-cancelled']);
    });

    it('onKanbanStatusChange para todo → in_progress envía PATCH vía la mutación existente', async () => {
      const fakeUiPreferences = buildFakeUiPreferences('kanban');
      const fixture = await setupDeveloperKanban(fakeUiPreferences);

      const ownTask = mockDeveloperTasks[0]; // status: 'todo'
      fixture.componentInstance.onKanbanStatusChange({ task: ownTask, status: 'in_progress' });

      httpMock
        .expectOne(`${apiUrl}/tasks/${ownTask.id}/status`)
        .flush({ ...ownTask, status: 'in_progress' });

      // Fuerza el flush síncrono de los efectos pendientes para que el resource despache
      // el nuevo fetch tras reload() (whenStable() aquí deadlockearía).
      fixture.detectChanges();

      const reloadedTasks = [{ ...ownTask, status: 'in_progress' as const }, mockDeveloperTasks[1], mockDeveloperTasks[2]];
      httpMock
        .expectOne(`${apiUrl}/tasks/project/project-1?page=1&limit=20`)
        .flush({ data: reloadedTasks, meta: pageMeta(reloadedTasks.length) });
      await fixture.whenStable();
    });

    it('drop a "done" abre el diálogo de confirmación existente y, al confirmar, envía la mutación', async () => {
      const mockDialogRef = { afterClosed: vi.fn().mockReturnValue(of(true)) };
      const mockDialog = { open: vi.fn().mockReturnValue(mockDialogRef) };
      const fakeUiPreferences = buildFakeUiPreferences('kanban');
      const fixture = await setupDeveloperKanban(fakeUiPreferences, mockDialog);

      const ownTask = mockDeveloperTasks[0]; // status: 'todo'
      fixture.componentInstance.onKanbanStatusChange({ task: ownTask, status: 'done' });

      expect(mockDialog.open).toHaveBeenCalled();
      expect(fixture.componentInstance.pendingMove()).toEqual({ taskId: ownTask.id, to: 'done' });

      httpMock
        .expectOne(`${apiUrl}/tasks/${ownTask.id}/status`)
        .flush({ ...ownTask, status: 'done' });

      fixture.detectChanges();

      const reloadedTasks = [{ ...ownTask, status: 'done' as const }, mockDeveloperTasks[1], mockDeveloperTasks[2]];
      httpMock
        .expectOne(`${apiUrl}/tasks/project/project-1?page=1&limit=20`)
        .flush({ data: reloadedTasks, meta: pageMeta(reloadedTasks.length) });
      await fixture.whenStable();

      // El overlay optimista se limpia tras la recarga con el estado real
      expect(fixture.componentInstance.pendingMove()).toBeNull();
    });

    it('cancelar el diálogo de "done" revierte el overlay optimista sin enviar mutación', async () => {
      const mockDialogRef = { afterClosed: vi.fn().mockReturnValue(of(false)) };
      const mockDialog = { open: vi.fn().mockReturnValue(mockDialogRef) };
      const fakeUiPreferences = buildFakeUiPreferences('kanban');
      const fixture = await setupDeveloperKanban(fakeUiPreferences, mockDialog);

      const ownTask = mockDeveloperTasks[0]; // status: 'todo'
      fixture.componentInstance.onKanbanStatusChange({ task: ownTask, status: 'done' });

      expect(mockDialog.open).toHaveBeenCalled();
      expect(fixture.componentInstance.pendingMove()).toBeNull();

      const columns = fixture.componentInstance.developerTasksByStatus();
      expect(columns.find((c) => c.status === 'todo')!.tasks.map((t) => t.id)).toContain(ownTask.id);
      expect(columns.find((c) => c.status === 'done')!.tasks.map((t) => t.id)).not.toContain(ownTask.id);

      httpMock.verify();
    });

    it('onKanbanReorder aplica el overlay optimista y persiste el nuevo orden', async () => {
      const fakeUiPreferences = buildFakeUiPreferences('kanban');
      const fixture = await setupDeveloperKanban(fakeUiPreferences);

      // mockDeveloperTasks: [task-own (todo), task-other (in_progress), task-own-done (done)]
      fixture.componentInstance.onKanbanReorder({
        status: 'todo',
        taskIds: ['task-own'], // única tarea propia en 'todo' en este fixture
      });

      // El overlay se aplica de inmediato, antes de que resuelva el PATCH
      expect(fixture.componentInstance.pendingReorder()).toEqual({
        status: 'todo',
        orderedIds: ['task-own'],
      });

      httpMock.expectOne(`${apiUrl}/tasks/project/project-1/reorder`).flush(null);
      fixture.detectChanges();

      httpMock
        .expectOne(`${apiUrl}/tasks/project/project-1?page=1&limit=20`)
        .flush({ data: mockDeveloperTasks, meta: pageMeta(mockDeveloperTasks.length) });
      await fixture.whenStable();

      // Se limpia tras la recarga con el estado real del backend
      expect(fixture.componentInstance.pendingReorder()).toBeNull();
    });

    it('onKanbanReorder revierte el overlay y muestra error si el PATCH falla', async () => {
      const fakeUiPreferences = buildFakeUiPreferences('kanban');
      const fixture = await setupDeveloperKanban(fakeUiPreferences);

      fixture.componentInstance.onKanbanReorder({
        status: 'todo',
        taskIds: ['task-own'],
      });

      httpMock
        .expectOne(`${apiUrl}/tasks/project/project-1/reorder`)
        .flush({ message: 'stale' }, { status: 400, statusText: 'Bad Request' });

      expect(fixture.componentInstance.pendingReorder()).toBeNull();
      expect(fixture.componentInstance.mutationError()).toBe(
        'Error al reordenar las tareas. Intenta nuevamente.',
      );
    });
  });

  describe('Paginación (admin)', () => {
    it('mantiene la página tras un .reload() (p.ej. al editar una tarea)', async () => {
      const { fixture } = await render(TasksComponent, {
        providers: [
          provideHttpClient(),
          provideHttpClientTesting(),
          provideAnimationsAsync(),
          { provide: AuthService, useValue: buildFakeAuthService(adminUser) },
        ],
      });
      httpMock = TestBed.inject(HttpTestingController);

      httpMock.expectOne(`${apiUrl}/projects?limit=100`).flush({ data: mockProjects, meta: pageMeta(mockProjects.length, 1, 100) });
      httpMock.expectOne(`${apiUrl}/users`).flush(mockUsers);
      httpMock.expectOne(`${apiUrl}/tasks?page=1&limit=20`).flush({ data: mockTasks, meta: pageMeta(50, 1) });

      await fixture.whenStable();

      // Simula avanzar a la página 2 mediante el paginador
      fixture.componentInstance.onAdminPageChange({ pageIndex: 1, pageSize: 20 } as any);
      fixture.detectChanges();

      httpMock.expectOne(`${apiUrl}/tasks?page=2&limit=20`).flush({ data: mockTasks, meta: pageMeta(50, 2) });
      await fixture.whenStable();

      expect(fixture.componentInstance.adminPage()).toBe(2);

      // Recarga (p.ej. tras editar una tarea) — debe pedir la misma página, no volver a la 1
      fixture.componentInstance.allTasksResource.reload();
      fixture.detectChanges();

      httpMock.expectOne(`${apiUrl}/tasks?page=2&limit=20`).flush({ data: mockTasks, meta: pageMeta(50, 2) });
      await fixture.whenStable();

      expect(fixture.componentInstance.adminPage()).toBe(2);
    });

    it('retrocede a la última página válida cuando la página actual queda vacía', async () => {
      const { fixture } = await render(TasksComponent, {
        providers: [
          provideHttpClient(),
          provideHttpClientTesting(),
          provideAnimationsAsync(),
          { provide: AuthService, useValue: buildFakeAuthService(adminUser) },
        ],
      });
      httpMock = TestBed.inject(HttpTestingController);

      httpMock.expectOne(`${apiUrl}/projects?limit=100`).flush({ data: mockProjects, meta: pageMeta(mockProjects.length, 1, 100) });
      httpMock.expectOne(`${apiUrl}/users`).flush(mockUsers);
      httpMock.expectOne(`${apiUrl}/tasks?page=1&limit=20`).flush({ data: mockTasks, meta: pageMeta(1, 1) });

      await fixture.whenStable();

      fixture.componentInstance.onAdminPageChange({ pageIndex: 2, pageSize: 20 } as any);
      fixture.detectChanges();

      // La página 3 (0-based 2) no existe para total=1/limit=20 → data:[] con page=3
      httpMock.expectOne(`${apiUrl}/tasks?page=3&limit=20`).flush({ data: [], meta: pageMeta(1, 3) });

      // El efecto de recuperación de página vacía escribe adminPage de forma asíncrona
      // (no se puede usar whenStable() aquí: el recurso queda "loading" hasta que se
      // resuelve el fetch resultante, lo que crearía un deadlock) — sondea con detectChanges
      // hasta que el efecto haya corrido.
      await vi.waitFor(() => {
        fixture.detectChanges();
        expect(fixture.componentInstance.adminPage()).toBe(1);
      });

      // El efecto de recuperación retrocede a totalPages=1 y dispara un nuevo fetch
      httpMock.expectOne(`${apiUrl}/tasks?page=1&limit=20`).flush({ data: mockTasks, meta: pageMeta(1, 1) });
      await fixture.whenStable();

      expect(fixture.componentInstance.adminPage()).toBe(1);
    });
  });
});
