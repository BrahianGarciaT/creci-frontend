import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { TasksService, Task } from './tasks.service';
import { environment } from '../../environments/environment';

const mockTask: Task = {
  id: 'task-1',
  title: 'Tarea de prueba',
  description: 'Descripción de prueba',
  status: 'todo',
  priority: 'medium',
  dueDate: undefined,
  estimatedHours: undefined,
  projectId: 'project-1',
  project: { id: 'project-1', name: 'Proyecto de prueba' },
  assigneeId: null,
  assignee: null,
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
};

describe('TasksService', () => {
  let service: TasksService;
  let httpMock: HttpTestingController;
  const apiUrl = environment.apiUrl;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });

    service = TestBed.inject(TasksService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('create()', () => {
    it('should call POST /tasks with the given payload', () => {
      const payload = {
        title: 'Nueva tarea',
        priority: 'high' as const,
        projectId: 'project-1',
      };

      service.create(payload).subscribe((result) => {
        expect(result).toEqual(mockTask);
      });

      const req = httpMock.expectOne(`${apiUrl}/tasks`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(payload);
      req.flush(mockTask);
    });
  });

  describe('update()', () => {
    it('should call PATCH /tasks/:id with the given payload', () => {
      const id = 'task-1';
      const payload = { title: 'Título actualizado' };

      service.update(id, payload).subscribe((result) => {
        expect(result).toEqual(mockTask);
      });

      const req = httpMock.expectOne(`${apiUrl}/tasks/${id}`);
      expect(req.request.method).toBe('PATCH');
      expect(req.request.body).toEqual(payload);
      req.flush(mockTask);
    });
  });

  describe('updateStatus()', () => {
    it('should call PATCH /tasks/:id/status with the given status', () => {
      const id = 'task-1';
      const payload = { status: 'in_progress' as const };

      service.updateStatus(id, payload).subscribe((result) => {
        expect(result).toEqual(mockTask);
      });

      const req = httpMock.expectOne(`${apiUrl}/tasks/${id}/status`);
      expect(req.request.method).toBe('PATCH');
      expect(req.request.body).toEqual(payload);
      req.flush(mockTask);
    });
  });

  describe('updateEstimate()', () => {
    it('should call PATCH /tasks/:id/estimate with the given hours', () => {
      const id = 'task-1';
      const payload = { estimatedHours: 8 };

      service.updateEstimate(id, payload).subscribe((result) => {
        expect(result).toEqual(mockTask);
      });

      const req = httpMock.expectOne(`${apiUrl}/tasks/${id}/estimate`);
      expect(req.request.method).toBe('PATCH');
      expect(req.request.body).toEqual(payload);
      req.flush(mockTask);
    });
  });

  describe('cancel()', () => {
    it('should call DELETE /tasks/:id', () => {
      const id = 'task-1';
      const cancelledTask = { ...mockTask, status: 'cancelled' as const };

      service.cancel(id).subscribe((result) => {
        expect(result).toEqual(cancelledTask);
      });

      const req = httpMock.expectOne(`${apiUrl}/tasks/${id}`);
      expect(req.request.method).toBe('DELETE');
      req.flush(cancelledTask);
    });
  });
});
