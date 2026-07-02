import { inject, Injectable } from '@angular/core';
import { HttpClient, httpResource } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { User } from '../users/users.service';

// Representación de un proyecto tal como lo devuelve la API
export interface Project {
  id: string;
  name: string;
  description?: string;
  status: 'active' | 'inactive';
  developers: User[];
  createdAt: string;
  updatedAt: string;
}

// Payload para crear un nuevo proyecto
export interface CreateProjectPayload {
  name: string;
  description?: string;
}

// Payload para actualizar un proyecto existente
export interface UpdateProjectPayload {
  name?: string;
  description?: string;
}

// Payload para asignar desarrolladores a un proyecto
export interface AssignDevelopersPayload {
  developerIds: string[];
}

@Injectable({ providedIn: 'root' })
export class ProjectsService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;

  // Recurso reactivo que carga la lista de proyectos — se recarga con .reload()
  readonly projects = httpResource<Project[]>(() => ({ url: `${this.apiUrl}/projects` }));

  /**
   * Crea un nuevo proyecto en el sistema.
   * Retorna el proyecto creado según la respuesta del backend.
   */
  createProject(payload: CreateProjectPayload): Observable<Project> {
    return this.http.post<Project>(`${this.apiUrl}/projects`, payload);
  }

  /**
   * Actualiza el nombre y/o descripción de un proyecto existente.
   * Retorna el proyecto actualizado según la respuesta del backend.
   */
  updateProject(id: string, payload: UpdateProjectPayload): Observable<Project> {
    return this.http.patch<Project>(`${this.apiUrl}/projects/${id}`, payload);
  }

  /**
   * Desactiva un proyecto por su ID (soft-deactivate).
   * Retorna el proyecto actualizado según la respuesta del backend.
   */
  deactivateProject(id: string): Observable<Project> {
    return this.http.patch<Project>(`${this.apiUrl}/projects/${id}/deactivate`, {});
  }

  /**
   * Reactiva un proyecto por su ID (soft-reactivate).
   * Retorna el proyecto actualizado según la respuesta del backend.
   */
  reactivateProject(id: string): Observable<Project> {
    return this.http.patch<Project>(`${this.apiUrl}/projects/${id}/reactivate`, {});
  }

  /**
   * Reemplaza la lista completa de desarrolladores asignados al proyecto.
   * Retorna el proyecto actualizado con la nueva lista de desarrolladores.
   */
  assignDevelopers(id: string, payload: AssignDevelopersPayload): Observable<Project> {
    return this.http.put<Project>(`${this.apiUrl}/projects/${id}/developers`, payload);
  }
}
