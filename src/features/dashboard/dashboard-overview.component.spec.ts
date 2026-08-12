import { render, screen } from '@testing-library/angular';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { signal } from '@angular/core';
import { describe, it, expect, afterEach } from 'vitest';
import { DashboardOverviewComponent } from './dashboard-overview.component';
import { DashboardOverviewDto } from './dashboard.types';
import { AuthService, CurrentUser } from '../../core/services/auth.service';
import { environment } from '../../environments/environment';

const apiUrl = environment.apiUrl;

const adminUser: CurrentUser = { id: 'admin-1', email: 'admin@example.com', role: 'admin' };
const developerUser: CurrentUser = { id: 'dev-1', email: 'developer@example.com', role: 'developer' };

const buildFakeAuthService = (user: CurrentUser | null) => ({
  currentUser: signal<CurrentUser | null>(user),
});

const emptyTrend = { granularity: 'day' as const, from: '', to: '', points: [] };

const orgOverview: DashboardOverviewDto = {
  scope: 'org',
  projects: [
    {
      projectId: 'project-1',
      name: 'Proyecto Alpha',
      total: 10,
      counts: { todo: 3, in_progress: 2, done: 5, cancelled: 0 },
      completionRate: 0.5,
    },
    {
      projectId: 'project-2',
      name: 'Proyecto Beta',
      total: 0,
      counts: { todo: 0, in_progress: 0, done: 0, cancelled: 0 },
      completionRate: null,
    },
  ],
  workload: [{ userId: 'user-1', email: 'ana@example.com', open: 4, done: 6, overdue: 1 }],
  overdue: [
    {
      id: 'task-1',
      title: 'Tarea vencida A',
      dueDate: '2026-08-01',
      projectId: 'project-1',
      projectName: 'Proyecto Alpha',
      assigneeEmail: 'ana@example.com',
    },
  ],
  overdueCount: 1,
  trend: emptyTrend,
};

const participantOverviewEmpty: DashboardOverviewDto = {
  scope: 'participant',
  projects: [],
  workload: [],
  overdue: [],
  overdueCount: 0,
  trend: emptyTrend,
};

describe('DashboardOverviewComponent', () => {
  let httpMock: HttpTestingController;

  afterEach(() => {
    httpMock.verify();
  });

  it('muestra copy de alcance organizacional y las tarjetas de proyecto para un admin', async () => {
    const { fixture } = await render(DashboardOverviewComponent, {
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: AuthService, useValue: buildFakeAuthService(adminUser) },
      ],
    });
    httpMock = TestBed.inject(HttpTestingController);

    httpMock.expectOne(`${apiUrl}/dashboard/overview`).flush(orgOverview);
    await fixture.whenStable();

    expect(screen.getByText(/organización/i)).toBeTruthy();
    expect(screen.getByText('Proyecto Alpha')).toBeTruthy();
    expect(screen.getByText('Proyecto Beta')).toBeTruthy();
    // Tarjeta de proyecto sin tareas debe mostrar estado vacío explícito, no NaN%
    expect(screen.getByText('Sin tareas')).toBeTruthy();
    expect(screen.queryByText('NaN%')).toBeNull();

    // Widgets de carga de trabajo, vencidas y tendencia se alimentan del mismo resource
    expect(screen.getByText('ana@example.com')).toBeTruthy();
    expect(screen.getByText('Tarea vencida A')).toBeTruthy();
    expect(screen.getByText(/tendencia de completitud/i)).toBeTruthy();
    // trend está vacío (emptyTrend) — nunca un canvas en blanco
    expect(screen.getByText(/sin datos desde el despliegue/i)).toBeTruthy();
  });

  it('muestra copy de alcance de participante para un developer', async () => {
    const developerOverview: DashboardOverviewDto = { ...orgOverview, scope: 'participant' };

    const { fixture } = await render(DashboardOverviewComponent, {
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: AuthService, useValue: buildFakeAuthService(developerUser) },
      ],
    });
    httpMock = TestBed.inject(HttpTestingController);

    httpMock.expectOne(`${apiUrl}/dashboard/overview`).flush(developerOverview);
    await fixture.whenStable();

    expect(screen.getByText(/tus proyectos/i)).toBeTruthy();
  });

  it('muestra un estado vacío cuando projects[] está vacío, sin intentar renderizar otros widgets', async () => {
    const { fixture } = await render(DashboardOverviewComponent, {
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: AuthService, useValue: buildFakeAuthService(developerUser) },
      ],
    });
    httpMock = TestBed.inject(HttpTestingController);

    httpMock.expectOne(`${apiUrl}/dashboard/overview`).flush(participantOverviewEmpty);
    await fixture.whenStable();

    expect(screen.getByText('No tienes proyectos asignados todavía.')).toBeTruthy();
    // Cada widget resuelve su propio estado vacío a partir de su propio arreglo
    expect(screen.getByText(/sin carga de trabajo/i)).toBeTruthy();
    expect(screen.getByText(/sin tareas vencidas/i)).toBeTruthy();
  });

  it('enlaza cada tarjeta a /dashboard/projects/:id', async () => {
    const { fixture } = await render(DashboardOverviewComponent, {
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: AuthService, useValue: buildFakeAuthService(adminUser) },
      ],
    });
    httpMock = TestBed.inject(HttpTestingController);

    httpMock.expectOne(`${apiUrl}/dashboard/overview`).flush(orgOverview);
    await fixture.whenStable();

    const link = screen.getByRole('link', { name: /proyecto alpha/i });
    expect(link.getAttribute('href')).toBe('/dashboard/projects/project-1');
  });
});
