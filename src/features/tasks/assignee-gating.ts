import { DestroyRef, Signal, computed, effect, signal } from '@angular/core';
import { FormControl } from '@angular/forms';
import { Project } from '../projects/projects.service';
import { User } from '../users/users.service';

// Opciones para enlazar el control de proyecto con el de asignado
export interface AssigneeGatingOptions {
  projectControl: FormControl<string>;
  assigneeControl: FormControl<string | null>;
  projects: Project[];
  users: User[];
  destroyRef: DestroyRef;
}

/**
 * Enlaza el control de proyecto con el de asignado de una tarea:
 * - deshabilita el asignado mientras no haya proyecto seleccionado
 * - filtra la lista de desarrolladores elegibles al proyecto seleccionado
 * - limpia el asignado si deja de ser válido para el nuevo proyecto,
 *   preservándolo si sigue siendo válido
 *
 * Debe invocarse desde un inicializador de campo (contexto de inyección),
 * ya que crea un `effect()` internamente.
 */
export function bindAssigneeGating(opts: AssigneeGatingOptions): Signal<User[]> {
  const { projectControl, assigneeControl, projects, users, destroyRef } = opts;

  // Señal reactiva sobre el valor del control de proyecto
  const projectId = signal(projectControl.value);
  const subscription = projectControl.valueChanges.subscribe((value) => {
    projectId.set(value);
  });
  destroyRef.onDestroy(() => subscription.unsubscribe());

  // Desarrolladores del proyecto seleccionado que además tienen rol 'developer'
  const eligibleDevelopers = computed<User[]>(() => {
    const project = projects.find((p) => p.id === projectId());
    if (!project) {
      return [];
    }
    const projectDeveloperIds = new Set(project.developers.map((d) => d.id));
    return users.filter((u) => u.role === 'developer' && projectDeveloperIds.has(u.id));
  });

  effect(() => {
    const eligible = eligibleDevelopers();
    const hasProjectSelected = projectId() !== '';

    if (hasProjectSelected) {
      if (assigneeControl.disabled) {
        assigneeControl.enable({ emitEvent: false });
      }
    } else if (assigneeControl.enabled) {
      assigneeControl.disable({ emitEvent: false });
    }

    const currentAssigneeId = assigneeControl.value;
    if (currentAssigneeId && !eligible.some((u) => u.id === currentAssigneeId)) {
      assigneeControl.setValue(null);
    }
  });

  return eligibleDevelopers;
}
