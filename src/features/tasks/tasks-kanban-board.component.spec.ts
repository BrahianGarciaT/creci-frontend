import { render, screen } from '@testing-library/angular';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { CdkDragDrop } from '@angular/cdk/drag-drop';
import { describe, it, expect, vi } from 'vitest';
import { TasksKanbanBoardComponent, KanbanColumn } from './tasks-kanban-board.component';
import { Task } from './tasks.service';

// Tarea mínima de ejemplo — solo los campos que el tablero lee
function buildTask(overrides: Partial<Task> = {}): Task {
  return {
    id: 'task-1',
    title: 'Tarea de ejemplo',
    status: 'todo',
    priority: 'medium',
    projectId: 'project-1',
    project: { id: 'project-1', name: 'Proyecto Alpha' },
    assigneeId: 'dev-1',
    assignee: { id: 'dev-1', email: 'dev@example.com' },
    createdAt: '',
    updatedAt: '',
    ...overrides,
  };
}

// Las 4 columnas fijas, vacías por defecto — cada test rellena `tasks` según el escenario
function buildColumns(overrides: Partial<Record<KanbanColumn['status'], Task[]>> = {}): KanbanColumn[] {
  return [
    { status: 'todo', label: 'Pendiente', droppable: true, tasks: overrides.todo ?? [] },
    { status: 'in_progress', label: 'En progreso', droppable: true, tasks: overrides.in_progress ?? [] },
    { status: 'done', label: 'Completada', droppable: true, tasks: overrides.done ?? [] },
    { status: 'cancelled', label: 'Cancelada', droppable: false, tasks: overrides.cancelled ?? [] },
  ];
}

// Construye a mano un CdkDragDrop<Task[]>-shaped object — jsdom no simula drags con puntero,
// así que los tests de drop invocan `component.drop(...)` directamente con este fake event.
function buildDragDropEvent(
  task: Task,
  previousContainerId: string,
  containerId: string,
): CdkDragDrop<Task[]> {
  return {
    previousContainer: { id: previousContainerId, data: [] } as any,
    container: { id: containerId, data: [] } as any,
    item: { data: task } as any,
    currentIndex: 0,
    previousIndex: 0,
    isPointerOverContainer: true,
    distance: { x: 0, y: 0 },
    dropPoint: { x: 0, y: 0 },
    event: new MouseEvent('mouseup'),
  } as CdkDragDrop<Task[]>;
}

describe('TasksKanbanBoardComponent', () => {
  it('renderiza exactamente 4 columnas en orden fijo, incluida "Cancelada" vacía con estado vacío', async () => {
    await render(TasksKanbanBoardComponent, {
      inputs: { columns: buildColumns() },
      providers: [provideAnimationsAsync()],
    });

    const titles = screen.getAllByRole('heading', { level: 3 }).map((el) => el.textContent?.trim());
    expect(titles).toEqual([
      expect.stringContaining('Pendiente'),
      expect.stringContaining('En progreso'),
      expect.stringContaining('Completada'),
      expect.stringContaining('Cancelada'),
    ]);

    expect(screen.getAllByText('Sin tareas')).toHaveLength(4);
  });

  it('deshabilita el drag de tarjetas en columnas terminales (done/cancelled)', async () => {
    const doneTask = buildTask({ id: 'task-done', status: 'done' });
    const cancelledTask = buildTask({ id: 'task-cancelled', status: 'cancelled' });

    const { fixture } = await render(TasksKanbanBoardComponent, {
      inputs: { columns: buildColumns({ done: [doneTask], cancelled: [cancelledTask] }) },
      providers: [provideAnimationsAsync()],
    });

    const component = fixture.componentInstance;
    const doneColumn = component.columns().find((c) => c.status === 'done')!;
    const cancelledColumn = component.columns().find((c) => c.status === 'cancelled')!;

    expect(component.isCardDragDisabled(doneTask, doneColumn)).toBe(true);
    expect(component.isCardDragDisabled(cancelledTask, cancelledColumn)).toBe(true);
  });

  it('el menú de accesibilidad en done/cancelled no ofrece ninguna transición de salida', async () => {
    const { fixture } = await render(TasksKanbanBoardComponent, {
      inputs: { columns: buildColumns() },
      providers: [provideAnimationsAsync()],
    });

    expect(fixture.componentInstance.transitionTargets('done')).toEqual([]);
    expect(fixture.componentInstance.transitionTargets('cancelled')).toEqual([]);
  });

  it('el menú de accesibilidad en todo/in_progress emite statusChange con el destino correcto', async () => {
    const ownTask = buildTask({ id: 'task-todo' });
    const { fixture } = await render(TasksKanbanBoardComponent, {
      inputs: { columns: buildColumns({ todo: [ownTask] }) },
      providers: [provideAnimationsAsync()],
    });

    const emitted = vi.fn();
    fixture.componentInstance.statusChange.subscribe(emitted);

    fixture.componentInstance.requestStatusChange(ownTask, 'in_progress');

    expect(emitted).toHaveBeenCalledWith({ task: ownTask, status: 'in_progress' });
  });

  it('drop() emite statusChange para todo → in_progress y no emite para un drop en la misma columna', async () => {
    const task = buildTask({ id: 'task-1', status: 'todo' });
    const { fixture } = await render(TasksKanbanBoardComponent, {
      inputs: { columns: buildColumns({ todo: [task] }) },
      providers: [provideAnimationsAsync()],
    });

    const emitted = vi.fn();
    fixture.componentInstance.statusChange.subscribe(emitted);

    fixture.componentInstance.drop(
      buildDragDropEvent(task, 'kanban-column-todo', 'kanban-column-in_progress'),
    );
    expect(emitted).toHaveBeenCalledWith({ task, status: 'in_progress' });

    emitted.mockClear();
    fixture.componentInstance.drop(
      buildDragDropEvent(task, 'kanban-column-todo', 'kanban-column-todo'),
    );
    expect(emitted).not.toHaveBeenCalled();
  });

  it('dropear en "cancelled" no emite statusChange (drop rechazado)', async () => {
    const task = buildTask({ id: 'task-1', status: 'in_progress' });
    const { fixture } = await render(TasksKanbanBoardComponent, {
      inputs: { columns: buildColumns({ in_progress: [task] }) },
      providers: [provideAnimationsAsync()],
    });

    const emitted = vi.fn();
    fixture.componentInstance.statusChange.subscribe(emitted);

    fixture.componentInstance.drop(
      buildDragDropEvent(task, 'kanban-column-in_progress', 'kanban-column-cancelled'),
    );

    expect(emitted).not.toHaveBeenCalled();
  });
});
