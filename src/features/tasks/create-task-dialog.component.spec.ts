import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { of, throwError } from 'rxjs';
import { CreateTaskDialogComponent, CreateTaskDialogData } from './create-task-dialog.component';
import { TasksService, Task } from './tasks.service';

const mockTask: Task = {
  id: 'task-1',
  title: 'Nueva tarea',
  status: 'todo',
  priority: 'high',
  projectId: 'project-1',
  project: { id: 'project-1', name: 'Proyecto A' },
  assigneeId: null,
  assignee: null,
  createdAt: '',
  updatedAt: '',
};

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

const mockDialogData: CreateTaskDialogData = {
  projects: [
    { id: 'project-1', name: 'Proyecto A', status: 'active', developers: [devUser1], createdAt: '', updatedAt: '' },
    { id: 'project-2', name: 'Proyecto B', status: 'active', developers: [devUser2], createdAt: '', updatedAt: '' },
  ],
  users: [devUser1, devUser2],
};

const mockTasksService = {
  create: vi.fn(() => of(mockTask)),
};

const mockDialogRef = {
  close: vi.fn(),
};

describe('CreateTaskDialogComponent', () => {
  let component: CreateTaskDialogComponent;
  let fixture: ComponentFixture<CreateTaskDialogComponent>;

  beforeEach(async () => {
    vi.clearAllMocks();

    await TestBed.configureTestingModule({
      imports: [CreateTaskDialogComponent, NoopAnimationsModule],
      providers: [
        { provide: TasksService, useValue: mockTasksService },
        { provide: MatDialogRef, useValue: mockDialogRef },
        { provide: MAT_DIALOG_DATA, useValue: mockDialogData },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(CreateTaskDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should start with the assignee field disabled when no project is selected', () => {
    expect(component.form.controls.assigneeId.disabled).toBe(true);
    expect(component.eligibleDevelopers()).toEqual([]);
  });

  it('should enable the assignee field and scope developers to the selected project', () => {
    component.form.controls.projectId.setValue('project-1');
    TestBed.tick();

    expect(component.form.controls.assigneeId.disabled).toBe(false);
    expect(component.eligibleDevelopers()).toEqual([devUser1]);
  });

  it('should clear the assignee when the selected project changes and it is no longer valid', () => {
    component.form.controls.projectId.setValue('project-1');
    TestBed.tick();
    component.form.controls.assigneeId.setValue('dev-1');

    component.form.controls.projectId.setValue('project-2');
    TestBed.tick();

    expect(component.form.controls.assigneeId.value).toBeNull();
    expect(component.eligibleDevelopers()).toEqual([devUser2]);
  });

  describe('submit', () => {
    it('should mark form as touched and not call service when required fields are missing', () => {
      component.submit();
      expect(mockTasksService.create).not.toHaveBeenCalled();
      expect(component.form.controls.title.touched).toBe(true);
    });

    it('should call create and close dialog on success', () => {
      component.form.controls.title.setValue('Nueva tarea');
      component.form.controls.priority.setValue('high');
      component.form.controls.projectId.setValue('project-1');

      component.submit();

      expect(mockTasksService.create).toHaveBeenCalledWith({
        title: 'Nueva tarea',
        priority: 'high',
        projectId: 'project-1',
        description: undefined,
        assigneeId: undefined,
        dueDate: undefined,
      });
      expect(mockDialogRef.close).toHaveBeenCalledWith(mockTask);
    });

    it('should set errorMessage on failure without closing dialog', () => {
      mockTasksService.create.mockReturnValueOnce(throwError(() => new Error('error')));
      component.form.controls.title.setValue('Nueva tarea');
      component.form.controls.priority.setValue('high');
      component.form.controls.projectId.setValue('project-1');

      component.submit();

      expect(component.errorMessage()).toBeTruthy();
      expect(mockDialogRef.close).not.toHaveBeenCalledWith(expect.anything());
    });
  });
});
