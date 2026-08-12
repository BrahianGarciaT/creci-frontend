import { render, screen } from '@testing-library/angular';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { describe, it, expect, afterEach } from 'vitest';
import { ProjectDashboardComponent } from './project-dashboard.component';
import { ProjectDashboardDto } from './dashboard.types';
import { environment } from '../../environments/environment';

const apiUrl = environment.apiUrl;

const emptyTrend = { granularity: 'day' as const, from: '', to: '', points: [] };

const projectDashboard: ProjectDashboardDto = {
  projectId: 'project-1',
  name: 'Proyecto Alpha',
  total: 10,
  counts: { todo: 3, in_progress: 2, done: 5, cancelled: 0 },
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

const zeroDashboard: ProjectDashboardDto = {
  projectId: 'project-2',
  name: 'Proyecto Beta',
  total: 0,
  counts: { todo: 0, in_progress: 0, done: 0, cancelled: 0 },
  workload: [],
  overdue: [],
  overdueCount: 0,
  trend: emptyTrend,
};

describe('ProjectDashboardComponent', () => {
  let httpMock: HttpTestingController;

  afterEach(() => {
    httpMock.verify();
  });

  it('renderiza los cuatro widgets a partir de un único ProjectDashboardDto', async () => {
    await render(ProjectDashboardComponent, {
      inputs: { id: 'project-1' },
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });
    httpMock = TestBed.inject(HttpTestingController);

    httpMock.expectOne(`${apiUrl}/dashboard/projects/project-1`).flush(projectDashboard);

    expect(await screen.findByText('Proyecto Alpha')).toBeTruthy();
    expect(screen.getByText('ana@example.com')).toBeTruthy();
    expect(screen.getByText('Tarea vencida A')).toBeTruthy();
    expect(screen.getByText(/tendencia de completitud/i)).toBeTruthy();
    expect(screen.getByText(/sin datos desde el despliegue/i)).toBeTruthy();
  });

  it('muestra estados vacíos explícitos cuando counts y points están en cero', async () => {
    await render(ProjectDashboardComponent, {
      inputs: { id: 'project-2' },
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });
    httpMock = TestBed.inject(HttpTestingController);

    httpMock.expectOne(`${apiUrl}/dashboard/projects/project-2`).flush(zeroDashboard);

    expect(await screen.findByText('Proyecto Beta')).toBeTruthy();
    expect(screen.getByText(/sin tareas registradas/i)).toBeTruthy();
    expect(screen.getByText(/sin carga de trabajo/i)).toBeTruthy();
    expect(screen.getByText(/sin tareas vencidas/i)).toBeTruthy();
    expect(screen.getByText(/sin datos desde el despliegue/i)).toBeTruthy();
  });

  it('muestra un estado de error cuando el backend responde 403 y no reintenta con una segunda petición', async () => {
    await render(ProjectDashboardComponent, {
      inputs: { id: 'project-forbidden' },
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });
    httpMock = TestBed.inject(HttpTestingController);

    httpMock
      .expectOne(`${apiUrl}/dashboard/projects/project-forbidden`)
      .flush('Forbidden', { status: 403, statusText: 'Forbidden' });

    expect(await screen.findByText(/no tienes acceso a este proyecto/i)).toBeTruthy();
    // `httpMock.verify()` en el afterEach ya confirma que no hay una segunda petición pendiente
  });

  it('muestra un estado de error cuando el backend responde 404', async () => {
    await render(ProjectDashboardComponent, {
      inputs: { id: 'project-missing' },
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });
    httpMock = TestBed.inject(HttpTestingController);

    httpMock
      .expectOne(`${apiUrl}/dashboard/projects/project-missing`)
      .flush('Not Found', { status: 404, statusText: 'Not Found' });

    expect(await screen.findByText(/no tienes acceso a este proyecto/i)).toBeTruthy();
  });
});
