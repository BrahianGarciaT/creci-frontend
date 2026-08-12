import { inject, Injectable } from '@angular/core';
import { HttpClient, httpResource } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

// Representación de un usuario tal como lo devuelve la API
export interface User {
  id: string;
  email: string;
  role: 'admin' | 'developer';
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  projects: { id: string; name: string }[];
}

// Payload para crear un nuevo usuario
export interface CreateUserPayload {
  email: string;
  password: string;
  role?: 'admin' | 'developer';
}

// Payload para editar un usuario existente — password se omite si no se cambia
export interface UpdateUserPayload {
  role?: 'admin' | 'developer';
  password?: string;
}

@Injectable({ providedIn: 'root' })
export class UsersService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;

  // Recurso reactivo que carga la lista de usuarios — se recarga con .reload()
  readonly users = httpResource<User[]>(() => ({ url: `${this.apiUrl}/users` }));

  /**
   * Crea un nuevo usuario en el sistema.
   * Retorna el usuario creado según la respuesta del backend.
   */
  create(payload: CreateUserPayload): Observable<User> {
    return this.http.post<User>(`${this.apiUrl}/users`, payload);
  }

  /**
   * Desactiva un usuario por su ID.
   * Retorna el usuario actualizado según la respuesta del backend.
   */
  deactivate(id: string): Observable<User> {
    return this.http.patch<User>(`${this.apiUrl}/users/${id}/deactivate`, {});
  }

  /**
   * Reactiva un usuario por su ID.
   * Retorna el usuario actualizado según la respuesta del backend.
   */
  reactivate(id: string): Observable<User> {
    return this.http.patch<User>(`${this.apiUrl}/users/${id}/reactivate`, {});
  }

  /**
   * Actualiza el rol y/o la contraseña de un usuario existente.
   * Retorna el usuario actualizado según la respuesta del backend.
   */
  updateUser(id: string, payload: UpdateUserPayload): Observable<User> {
    return this.http.patch<User>(`${this.apiUrl}/users/${id}`, payload);
  }
}
