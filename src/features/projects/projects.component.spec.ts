import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { signal } from '@angular/core';
import { of } from 'rxjs';
import { ProjectsComponent } from './projects.component';
import { ProjectsService } from './projects.service';

// Mock mínimo del recurso httpResource
const mockProjects = [
  {
    id: '1',
    name: 'Proyecto Alpha',
    description: 'Descripción Alpha',
    status: 'active' as const,
    developers: [],
    createdAt: '',
    updatedAt: '',
  },
];

const mockResource = {
  value: signal(mockProjects),
  isLoading: signal(false),
  error: signal(undefined),
  reload: vi.fn(),
};

const mockProjectsService = {
  projects: mockResource,
  deactivateProject: vi.fn(() => of({})),
  reactivateProject: vi.fn(() => of({})),
};

const mockDialogRef = {
  afterClosed: () => of(true),
};

const mockDialog = {
  open: vi.fn(() => mockDialogRef),
};

describe('ProjectsComponent', () => {
  let component: ProjectsComponent;
  let fixture: ComponentFixture<ProjectsComponent>;

  beforeEach(async () => {
    vi.clearAllMocks();
    mockDialog.open.mockReturnValue(mockDialogRef);

    await TestBed.configureTestingModule({
      imports: [ProjectsComponent, NoopAnimationsModule],
      providers: [
        { provide: ProjectsService, useValue: mockProjectsService },
        { provide: MatDialog, useValue: mockDialog },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ProjectsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should expose projects resource from service', () => {
    expect(component.projectsResource).toBe(mockResource);
  });

  it('should display correct column definitions', () => {
    expect(component.displayedColumns).toEqual(['name', 'description', 'status', 'developers', 'actions']);
  });

  describe('openCreateDialog', () => {
    it('should open CreateProjectDialogComponent and reload on result', () => {
      component.openCreateDialog();
      expect(mockDialog.open).toHaveBeenCalled();
      expect(mockResource.reload).toHaveBeenCalled();
    });
  });

  describe('openEditDialog', () => {
    it('should open EditProjectDialogComponent with project data and reload on result', () => {
      component.openEditDialog(mockProjects[0]);
      expect(mockDialog.open).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ data: mockProjects[0] })
      );
      expect(mockResource.reload).toHaveBeenCalled();
    });
  });

  describe('openAssignDialog', () => {
    it('should open AssignDevelopersDialogComponent with project data and reload on result', () => {
      component.openAssignDialog(mockProjects[0]);
      expect(mockDialog.open).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ data: mockProjects[0] })
      );
    });
  });

  describe('flujo de desactivación', () => {
    it('debe abrir el diálogo de confirmación con copy en español', () => {
      component.requestDeactivate(mockProjects[0]);

      expect(mockDialog.open).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          data: expect.objectContaining({
            title: 'Desactivar proyecto',
            confirmLabel: 'Desactivar',
          }),
        }),
      );
    });

    it('debe desactivar y recargar cuando se confirma el diálogo', () => {
      mockDialog.open.mockReturnValue({ afterClosed: () => of(true) });

      component.requestDeactivate(mockProjects[0]);

      expect(mockProjectsService.deactivateProject).toHaveBeenCalledWith('1');
      expect(mockResource.reload).toHaveBeenCalled();
    });

    it('no debe desactivar cuando se cancela el diálogo', () => {
      mockDialog.open.mockReturnValue({ afterClosed: () => of(false) });

      component.requestDeactivate(mockProjects[0]);

      expect(mockProjectsService.deactivateProject).not.toHaveBeenCalled();
    });
  });

  describe('flujo de reactivación', () => {
    it('debe reactivar directamente sin abrir un diálogo de confirmación', () => {
      component.reactivate(mockProjects[0]);

      expect(mockDialog.open).not.toHaveBeenCalled();
      expect(mockProjectsService.reactivateProject).toHaveBeenCalledWith('1');
      expect(mockResource.reload).toHaveBeenCalled();
    });
  });
});
