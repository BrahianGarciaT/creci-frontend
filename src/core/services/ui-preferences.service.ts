import { Injectable } from '@angular/core';

// Modo de visualización de la vista de tareas del desarrollador
export type TasksViewMode = 'list' | 'kanban';

// Clave de localStorage para el modo de vista de tareas, namespaced por dominio/preferencia
const TASKS_VIEW_MODE_KEY = 'creci.ui.tasksViewMode';

const VALID_TASKS_VIEW_MODES: readonly TasksViewMode[] = ['list', 'kanban'];

/**
 * Persiste preferencias de UI del usuario en localStorage. Todo acceso a
 * localStorage queda protegido con try/catch: si el storage no existe, está
 * lleno, o lanza (modo privado, cuota excedida, etc.), se degrada de forma
 * silenciosa al valor por defecto en vez de romper la vista.
 */
@Injectable({ providedIn: 'root' })
export class UiPreferencesService {
  /** Lee el modo de vista de tareas persistido; 'list' si falta, es inválido, o localStorage falla */
  getTasksViewMode(): TasksViewMode {
    try {
      const stored = localStorage.getItem(TASKS_VIEW_MODE_KEY);
      if (this.isValidTasksViewMode(stored)) {
        return stored;
      }
      return 'list';
    } catch {
      return 'list';
    }
  }

  /** Persiste el modo de vista de tareas elegido; ignora el error si localStorage falla */
  setTasksViewMode(mode: TasksViewMode): void {
    try {
      localStorage.setItem(TASKS_VIEW_MODE_KEY, mode);
    } catch {
      // Almacenamiento no disponible (modo privado, cuota excedida, etc.) — no-op
    }
  }

  private isValidTasksViewMode(value: string | null): value is TasksViewMode {
    return VALID_TASKS_VIEW_MODES.includes(value as TasksViewMode);
  }
}
