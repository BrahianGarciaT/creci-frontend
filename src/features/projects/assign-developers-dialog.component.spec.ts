import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { signal } from '@angular/core';
import { of, throwError } from 'rxjs';
import { AssignDevelopersDialogComponent } from './assign-developers-dialog.component';
import { ProjectsService } from './projects.service';
import { UsersService } from '../users/users.service';

const mockDeveloper = {
  id: 'dev-1',
  email: 'dev@example.com',
  role: 'developer' as const,
  isActive: true,
  createdAt: '',
  updatedAt: '',
};

const mockAdmin = {
  id: 'admin-1',
  email: 'admin@example.com',
  role: 'admin' as const,
  isActive: true,
  createdAt: '',
  updatedAt: '',
};

const mockProject = {
  id: 'proj-1',
  name: 'Proyecto Test',
  status: 'active' as const,
  developers: [mockDeveloper],
  createdAt: '',
  updatedAt: '',
};

const mockUsersResource = {
  value: signal([mockDeveloper, mockAdmin]),
  isLoading: signal(false),
  error: signal(undefined),
};

const mockUsersService = {
  users: mockUsersResource,
};

const mockUpdatedProject = { ...mockProject, developers: [] };

const mockProjectsService = {
  assignDevelopers: vi.fn(() => of(mockUpdatedProject)),
};

const mockDialogRef = {
  close: vi.fn(),
};

describe('AssignDevelopersDialogComponent', () => {
  let component: AssignDevelopersDialogComponent;
  let fixture: ComponentFixture<AssignDevelopersDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AssignDevelopersDialogComponent, NoopAnimationsModule],
      providers: [
        { provide: ProjectsService, useValue: mockProjectsService },
        { provide: UsersService, useValue: mockUsersService },
        { provide: MatDialogRef, useValue: mockDialogRef },
        { provide: MAT_DIALOG_DATA, useValue: mockProject },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AssignDevelopersDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should filter available developers — only active developers (not admins)', () => {
    const devs = component.availableDevelopers();
    expect(devs).toHaveLength(1);
    expect(devs[0].id).toBe('dev-1');
    expect(devs.some((u) => u.role === 'admin')).toBe(false);
  });

  it('should pre-select current project developers', () => {
    expect(component.developersControl.value).toEqual(['dev-1']);
  });

  describe('submit', () => {
    it('should call assignDevelopers with selected IDs and close dialog on success', () => {
      component.developersControl.setValue(['dev-1']);
      component.submit();
      expect(mockProjectsService.assignDevelopers).toHaveBeenCalledWith('proj-1', {
        developerIds: ['dev-1'],
      });
      expect(mockDialogRef.close).toHaveBeenCalledWith(mockUpdatedProject);
    });

    it('should call assignDevelopers with empty array to clear all developers', () => {
      component.developersControl.setValue([]);
      component.submit();
      expect(mockProjectsService.assignDevelopers).toHaveBeenCalledWith('proj-1', {
        developerIds: [],
      });
    });

    it('should display error message inline on 400 without closing dialog', () => {
      mockProjectsService.assignDevelopers.mockReturnValueOnce(
        throwError(() => ({ status: 400 }))
      );
      component.submit();
      expect(component.errorMessage()).toContain('desarrolladores activos');
      expect(mockDialogRef.close).not.toHaveBeenCalledWith(expect.anything());
    });

    it('should display generic error message on non-400 errors', () => {
      mockProjectsService.assignDevelopers.mockReturnValueOnce(
        throwError(() => ({ status: 500 }))
      );
      component.submit();
      expect(component.errorMessage()).toBeTruthy();
      expect(mockDialogRef.close).not.toHaveBeenCalledWith(expect.anything());
    });
  });
});
