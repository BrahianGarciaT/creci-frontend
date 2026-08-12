import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialog, MatDialogRef } from '@angular/material/dialog';
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

const devUser1 = {
  id: 'dev-1',
  email: 'dev@example.com',
  role: 'developer' as const,
  isActive: true,
  createdAt: '',
  updatedAt: '',
  projects: [],
};
const devUser2 = {
  id: 'dev-2',
  email: 'dev2@example.com',
  role: 'developer' as const,
  isActive: true,
  createdAt: '',
  updatedAt: '',
  projects: [],
};

const mockDialogData: EditTaskDialogData = {
  task: mockTask,
  projects: [
    { id: 'project-1', name: 'Proyecto A', status: 'active', developers: [devUser1], createdAt: '', updatedAt: '' },
    { id: 'project-2', name: 'Proyecto B', status: 'active', developers: [devUser2], createdAt: '', updatedAt: '' },
  ],
  users: [devUser1, devUser2],
};

const mockTasksService = {
  update: vi.fn(() => of(mockUpdatedTask)),
};

const mockDialogRef = {
  close: vi.fn(),
};

const mockConfirmDialogRef = {
  afterClosed: vi.fn(() => of(true)),
};

const mockDialog = {
  open: vi.fn(() => mockConfirmDialogRef),
};

describe('EditTaskDialogComponent', () => {
  let component: EditTaskDialogComponent;
  let fixture: ComponentFixture<EditTaskDialogComponent>;

  beforeEach(async () => {
    vi.clearAllMocks();
    mockConfirmDialogRef.afterClosed.mockReturnValue(of(true));
    mockDialog.open.mockReturnValue(mockConfirmDialogRef);

    await TestBed.configureTestingModule({
      imports: [EditTaskDialogComponent, NoopAnimationsModule],
      providers: [
        { provide: TasksService, useValue: mockTasksService },
        { provide: MatDialogRef, useValue: mockDialogRef },
        { provide: MAT_DIALOG_DATA, useValue: mockDialogData },
      ],
    })
      .overrideProvider(MatDialog, { useValue: mockDialog })
      .compileComponents();

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

  it('should start with the assignee field enabled and populated for a valid pre-filled project+assignee', () => {
    TestBed.tick();

    expect(component.form.controls.assigneeId.disabled).toBe(false);
    expect(component.form.controls.assigneeId.value).toBe('dev-1');
    expect(component.eligibleDevelopers()).toEqual([devUser1]);
  });

  it('should clear the assignee when the project changes and it is no longer valid', () => {
    TestBed.tick();

    component.form.controls.projectId.setValue('project-2');
    TestBed.tick();

    expect(component.form.controls.assigneeId.value).toBeNull();
    expect(component.eligibleDevelopers()).toEqual([devUser2]);
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

    it('should send assigneeId as explicit null when clearing to "Sin asignar", not undefined', () => {
      component.form.controls.assigneeId.setValue(null);

      component.submit();

      expect(mockTasksService.update).toHaveBeenCalledWith(
        mockTask.id,
        expect.objectContaining({ assigneeId: null })
      );
    });

    it('should open a confirm dialog and call update when the admin confirms completing the task', () => {
      mockConfirmDialogRef.afterClosed.mockReturnValue(of(true));
      component.form.controls.status.setValue('done');

      component.submit();

      expect(mockDialog.open).toHaveBeenCalled();
      expect(mockTasksService.update).toHaveBeenCalledWith(
        mockTask.id,
        expect.objectContaining({ status: 'done' }),
      );
      expect(mockDialogRef.close).toHaveBeenCalledWith(mockUpdatedTask);
    });

    it('should skip update and reset the status control when the admin declines completing the task', () => {
      mockConfirmDialogRef.afterClosed.mockReturnValue(of(false));
      component.form.controls.status.setValue('done');

      component.submit();

      expect(mockTasksService.update).not.toHaveBeenCalled();
      expect(mockDialogRef.close).not.toHaveBeenCalled();
      expect(component.form.controls.status.value).toBe(mockTask.status);
    });

    it('should not open a confirm dialog when status stays done to done', () => {
      const doneTaskData: EditTaskDialogData = {
        ...mockDialogData,
        task: { ...mockTask, status: 'done' },
      };

      TestBed.resetTestingModule();
      return TestBed.configureTestingModule({
        imports: [EditTaskDialogComponent, NoopAnimationsModule],
        providers: [
          { provide: TasksService, useValue: mockTasksService },
          { provide: MatDialogRef, useValue: mockDialogRef },
          { provide: MAT_DIALOG_DATA, useValue: doneTaskData },
        ],
      })
        .overrideProvider(MatDialog, { useValue: mockDialog })
        .compileComponents()
        .then(() => {
          const doneFixture = TestBed.createComponent(EditTaskDialogComponent);
          const doneComponent = doneFixture.componentInstance;
          doneFixture.detectChanges();

          doneComponent.submit();

          expect(mockDialog.open).not.toHaveBeenCalled();
          expect(mockTasksService.update).toHaveBeenCalled();
        });
    });
  });
});
