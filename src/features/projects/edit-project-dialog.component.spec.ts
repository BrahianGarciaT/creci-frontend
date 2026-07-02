import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { of, throwError } from 'rxjs';
import { EditProjectDialogComponent } from './edit-project-dialog.component';
import { ProjectsService } from './projects.service';

const mockProject = {
  id: 'proj-1',
  name: 'Proyecto Existente',
  description: 'Descripción existente',
  status: 'active' as const,
  developers: [],
  createdAt: '',
  updatedAt: '',
};

const mockUpdatedProject = { ...mockProject, name: 'Nombre Actualizado' };

const mockProjectsService = {
  updateProject: vi.fn(() => of(mockUpdatedProject)),
};

const mockDialogRef = {
  close: vi.fn(),
};

describe('EditProjectDialogComponent', () => {
  let component: EditProjectDialogComponent;
  let fixture: ComponentFixture<EditProjectDialogComponent>;

  beforeEach(async () => {
    vi.clearAllMocks();

    await TestBed.configureTestingModule({
      imports: [EditProjectDialogComponent, NoopAnimationsModule],
      providers: [
        { provide: ProjectsService, useValue: mockProjectsService },
        { provide: MatDialogRef, useValue: mockDialogRef },
        { provide: MAT_DIALOG_DATA, useValue: mockProject },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(EditProjectDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should pre-fill form with project data', () => {
    expect(component.form.controls.name.value).toBe(mockProject.name);
    expect(component.form.controls.description.value).toBe(mockProject.description);
  });

  it('should expose the injected project', () => {
    expect(component.project).toBe(mockProject);
  });

  describe('submit', () => {
    it('should not call service if name is cleared', () => {
      component.form.controls.name.setValue('');
      component.submit();
      expect(mockProjectsService.updateProject).not.toHaveBeenCalled();
    });

    it('should call updateProject and close dialog on success', () => {
      component.form.controls.name.setValue('Nombre Actualizado');
      component.submit();
      expect(mockProjectsService.updateProject).toHaveBeenCalledWith(
        mockProject.id,
        expect.objectContaining({ name: 'Nombre Actualizado' })
      );
      expect(mockDialogRef.close).toHaveBeenCalledWith(mockUpdatedProject);
    });

    it('should set errorMessage on failure without closing dialog', () => {
      mockProjectsService.updateProject.mockReturnValueOnce(throwError(() => new Error('error')));
      component.form.controls.name.setValue('Nombre Actualizado');
      component.submit();
      expect(component.errorMessage()).toBeTruthy();
      expect(mockDialogRef.close).not.toHaveBeenCalledWith(expect.anything());
    });
  });
});
