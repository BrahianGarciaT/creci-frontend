import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

// Estado posible de una tarea
export type TaskStatus = 'todo' | 'in_progress' | 'done' | 'cancelled';

// Prioridad de una tarea
export type TaskPriority = 'high' | 'medium' | 'low';

// Representación de una tarea tal como la devuelve la API
export interface Task {
  id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate?: string;
  estimatedHours?: number;
  projectId: string;
  project: { id: string; name: string } | null;
  assigneeId: string | null;
  assignee: { id: string; email: string } | null;
  createdAt: string;
  updatedAt: string;
}

// Payload para crear una nueva tarea
export interface CreateTaskPayload {
  title: string;
  priority: TaskPriority;
  projectId: string;
  description?: string;
  assigneeId?: string;
  estimatedHours?: number;
  dueDate?: string;
}

// Payload para actualizar una tarea (admin)
export interface UpdateTaskPayload {
  title?: string;
  description?: string;
  priority?: TaskPriority;
  projectId?: string;
  assigneeId?: string;
  estimatedHours?: number;
  dueDate?: string;
  status?: TaskStatus;
}

// Payload para actualizar el estado de una tarea (desarrollador)
export interface UpdateStatusPayload {
  status: 'todo' | 'in_progress' | 'done';
}

// Payload para actualizar las horas estimadas de una tarea (desarrollador)
export interface UpdateEstimatePayload {
  estimatedHours: number;
}

@Injectable({ providedIn: 'root' })
export class TasksService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;

  /**
   * Crea una nueva tarea en el sistema (solo admin).
   */
  create(payload: CreateTaskPayload): Observable<Task> {
    return this.http.post<Task>(`${this.apiUrl}/tasks`, payload);
  }

  /**
   * Actualiza cualquier campo de una tarea existente (solo admin).
   */
  update(id: string, payload: UpdateTaskPayload): Observable<Task> {
    return this.http.patch<Task>(`${this.apiUrl}/tasks/${id}`, payload);
  }

  /**
   * Actualiza el estado de una tarea asignada al desarrollador autenticado.
   * No permite establecer estado "cancelled".
   */
  updateStatus(id: string, payload: UpdateStatusPayload): Observable<Task> {
    return this.http.patch<Task>(`${this.apiUrl}/tasks/${id}/status`, payload);
  }

  /**
   * Actualiza las horas estimadas de una tarea asignada al desarrollador autenticado.
   */
  updateEstimate(id: string, payload: UpdateEstimatePayload): Observable<Task> {
    return this.http.patch<Task>(`${this.apiUrl}/tasks/${id}/estimate`, payload);
  }

  /**
   * Cancela (soft-delete) una tarea por su ID (solo admin).
   * Establece status="cancelled" sin eliminar el registro.
   */
  cancel(id: string): Observable<Task> {
    return this.http.delete<Task>(`${this.apiUrl}/tasks/${id}`);
  }
}
