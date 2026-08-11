import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { of, throwError } from 'rxjs';
import { EditTaskDialogComponent, EditTaskDialogData } from './edit-task-dialog.component';
import { TasksService, Task } from './tasks.service';

const mockTask: Task = {
  id: 'task-1',
  title: 'Tarea existente',
  description: 'Descripción existente',
  status: 'in_progress',
  priority: 'medium',
  dueDate: '2024-06-15T00:00:00.000Z',
  projectId: 'project-1',
  project: { id: 'project-1', name: 'Proyecto A' },
  assigneeId: 'dev-1',
  assignee: { id: 'dev-1', email: 'dev@example.com' },
  createdAt: '',
  updatedAt: '',
};

const mockUpdatedTask: Task = { ...mockTask, title: 'Título actualizado' };

const mockDialogData: EditTaskDialogData = {
  task: mockTask,
  projects: [{ id: 'project-1', name: 'Proyecto A', status: 'active', developers: [], createdAt: '', updatedAt: '' }],
  users: [
    { id: 'dev-1', email: 'dev@example.com', role: 'developer', isActive: true, createdAt: '', updatedAt: '' },
  ],
};

const mockTasksService = {
  update: vi.fn(() => of(mockUpdatedTask)),
};

const mockDialogRef = {
  close: vi.fn(),
};

describe('EditTaskDialogComponent', () => {
  let component: EditTaskDialogComponent;
  let fixture: ComponentFixture<EditTaskDialogComponent>;

  beforeEach(async () => {
    vi.clearAllMocks();

    await TestBed.configureTestingModule({
      imports: [EditTaskDialogComponent, NoopAnimationsModule],
      providers: [
        { provide: TasksService, useValue: mockTasksService },
        { provide: MatDialogRef, useValue: mockDialogRef },
        { provide: MAT_DIALOG_DATA, useValue: mockDialogData },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(EditTaskDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should pre-fill form with task data', () => {
    expect(component.form.controls.title.value).toBe(mockTask.title);
    expect(component.form.controls.description.value).toBe(mockTask.description);
    expect(component.form.controls.status.value).toBe(mockTask.status);
    expect(component.form.controls.priority.value).toBe(mockTask.priority);
    expect(component.form.controls.projectId.value).toBe(mockTask.project?.id);
    expect(component.form.controls.assigneeId.value).toBe(mockTask.assignee?.id);
    expect(component.form.controls.dueDate.value).toEqual(new Date(mockTask.dueDate!));
  });

  describe('submit', () => {
    it('should mark form as touched and not call service when title is cleared', () => {
      component.form.controls.title.setValue('');
      component.submit();
      expect(mockTasksService.update).not.toHaveBeenCalled();
      expect(component.form.controls.title.touched).toBe(true);
    });

    it('should call update and close dialog on success', () => {
      component.form.controls.title.setValue('Título actualizado');

      component.submit();

      expect(mockTasksService.update).toHaveBeenCalledWith(
        mockTask.id,
        expect.objectContaining({ title: 'Título actualizado' })
      );
      expect(mockDialogRef.close).toHaveBeenCalledWith(mockUpdatedTask);
    });

    it('should set errorMessage on failure without closing dialog', () => {
      mockTasksService.update.mockReturnValueOnce(throwError(() => new Error('error')));
      component.form.controls.title.setValue('Título actualizado');

      component.submit();

      expect(component.errorMessage()).toBeTruthy();
      expect(mockDialogRef.close).not.toHaveBeenCalledWith(expect.anything());
    });
  });
});
