import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialogRef } from '@angular/material/dialog';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { of, throwError } from 'rxjs';
import { CreateProjectDialogComponent } from './create-project-dialog.component';
import { ProjectsService } from './projects.service';

const mockProject = {
  id: '1',
  name: 'Nuevo Proyecto',
  status: 'active' as const,
  developers: [],
  createdAt: '',
  updatedAt: '',
};

const mockProjectsService = {
  createProject: vi.fn(() => of(mockProject)),
};

const mockDialogRef = {
  close: vi.fn(),
};

describe('CreateProjectDialogComponent', () => {
  let component: CreateProjectDialogComponent;
  let fixture: ComponentFixture<CreateProjectDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CreateProjectDialogComponent, NoopAnimationsModule],
      providers: [
        { provide: ProjectsService, useValue: mockProjectsService },
        { provide: MatDialogRef, useValue: mockDialogRef },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(CreateProjectDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize form with empty name and description', () => {
    expect(component.form.controls.name.value).toBe('');
    expect(component.form.controls.description.value).toBe('');
  });

  describe('submit', () => {
    it('should mark form as touched and not call service if name is empty', () => {
      component.submit();
      expect(mockProjectsService.createProject).not.toHaveBeenCalled();
      expect(component.form.controls.name.touched).toBe(true);
    });

    it('should call createProject and close dialog on success', () => {
      component.form.controls.name.setValue('Mi Proyecto');
      component.submit();
      expect(mockProjectsService.createProject).toHaveBeenCalledWith({
        name: 'Mi Proyecto',
        description: undefined,
      });
      expect(mockDialogRef.close).toHaveBeenCalledWith(mockProject);
    });

    it('should set errorMessage on failure', () => {
      mockProjectsService.createProject.mockReturnValueOnce(throwError(() => new Error('error')));
      component.form.controls.name.setValue('Mi Proyecto');
      component.submit();
      expect(component.errorMessage()).toBeTruthy();
      expect(mockDialogRef.close).not.toHaveBeenCalledWith(expect.anything());
    });
  });
});
