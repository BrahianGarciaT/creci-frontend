import { TestBed } from '@angular/core/testing';
import { RouterTestingHarness } from '@angular/router/testing';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { describe, it, expect, afterEach, beforeEach } from 'vitest';
import { routes } from './app.routes';
import { ShellComponent } from '../core/layout/shell/shell.component';
import { AuthService, CurrentUser } from '../core/services/auth.service';
import { environment } from '../environments/environment';

const apiUrl = environment.apiUrl;

const adminUser: CurrentUser = { id: 'admin-1', email: 'admin@example.com', role: 'admin' };
const developerUser: CurrentUser = { id: 'dev-1', email: 'developer@example.com', role: 'developer' };

const emptyOverview = {
  scope: 'org' as const,
  projects: [],
  workload: [],
  overdue: [],
  overdueCount: 0,
  trend: { granularity: 'day' as const, from: '', to: '', points: [] },
};

const buildFakeAuthService = (user: CurrentUser) => ({
  isAuthenticated: signal(true),
  currentUser: signal<CurrentUser | null>(user),
});

describe('app.routes — /dashboard go-live', () => {
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.resetTestingModule();
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('resuelve /dashboard de forma lazy a DashboardOverviewComponent para un admin', async () => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter(routes),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: AuthService, useValue: buildFakeAuthService(adminUser) },
      ],
    });

    const harness = await RouterTestingHarness.create();
    // `/dashboard` primero activa el shell padre (`path: ''`); el hijo lazy
    // (`DashboardOverviewComponent`) se resuelve dentro de su `<router-outlet>`.
    const rootComponent = await harness.navigateByUrl('/dashboard', ShellComponent);

    httpMock = TestBed.inject(HttpTestingController);
    httpMock.expectOne(`${apiUrl}/dashboard/overview`).flush(emptyOverview);
    await harness.fixture.whenStable();

    expect(rootComponent).toBeInstanceOf(ShellComponent);
    expect(harness.routeNativeElement?.textContent).toContain('Dashboard');
  });

  it('resuelve /dashboard de forma lazy a DashboardOverviewComponent para un developer', async () => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter(routes),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: AuthService, useValue: buildFakeAuthService(developerUser) },
      ],
    });

    const harness = await RouterTestingHarness.create();
    const rootComponent = await harness.navigateByUrl('/dashboard', ShellComponent);

    httpMock = TestBed.inject(HttpTestingController);
    httpMock.expectOne(`${apiUrl}/dashboard/overview`).flush({ ...emptyOverview, scope: 'participant' });
    await harness.fixture.whenStable();

    expect(rootComponent).toBeInstanceOf(ShellComponent);
    expect(harness.routeNativeElement?.textContent).toContain('Dashboard');
  });
});

describe('app.routes — /dashboard/projects/:id (Nivel 2)', () => {
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.resetTestingModule();
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('resuelve /dashboard/projects/:id de forma lazy y enlaza el parámetro `id`', async () => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter(routes, withComponentInputBinding()),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: AuthService, useValue: buildFakeAuthService(adminUser) },
      ],
    });

    const harness = await RouterTestingHarness.create();
    const rootComponent = await harness.navigateByUrl('/dashboard/projects/project-1', ShellComponent);

    httpMock = TestBed.inject(HttpTestingController);
    httpMock.expectOne(`${apiUrl}/dashboard/projects/project-1`).flush({
      projectId: 'project-1',
      name: 'Proyecto Alpha',
      total: 0,
      counts: { todo: 0, in_progress: 0, done: 0, cancelled: 0 },
      workload: [],
      overdue: [],
      overdueCount: 0,
      trend: { granularity: 'day' as const, from: '', to: '', points: [] },
    });
    await harness.fixture.whenStable();

    expect(rootComponent).toBeInstanceOf(ShellComponent);
    expect(harness.routeNativeElement?.textContent).toContain('Proyecto Alpha');
  });
});
