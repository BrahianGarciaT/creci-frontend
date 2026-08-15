import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { UiPreferencesService } from './ui-preferences.service';

describe('UiPreferencesService', () => {
  let service: UiPreferencesService;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({ providers: [UiPreferencesService] });
    service = TestBed.inject(UiPreferencesService);
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('getTasksViewMode()', () => {
    it('devuelve "list" cuando no hay valor almacenado', () => {
      expect(service.getTasksViewMode()).toBe('list');
    });

    it('devuelve "list" cuando el valor almacenado es inválido', () => {
      localStorage.setItem('creci.ui.tasksViewMode', 'not-a-real-mode');

      expect(service.getTasksViewMode()).toBe('list');
    });

    it('devuelve "kanban" cuando fue almacenado previamente', () => {
      localStorage.setItem('creci.ui.tasksViewMode', 'kanban');

      expect(service.getTasksViewMode()).toBe('kanban');
    });

    it('devuelve "list" cuando localStorage lanza una excepción al leer', () => {
      const getItemSpy = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
        throw new Error('QuotaExceededError');
      });

      expect(service.getTasksViewMode()).toBe('list');

      getItemSpy.mockRestore();
    });
  });

  describe('setTasksViewMode()', () => {
    it('persiste el modo elegido para que un getTasksViewMode() posterior lo devuelva', () => {
      service.setTasksViewMode('kanban');

      expect(service.getTasksViewMode()).toBe('kanban');
      expect(localStorage.getItem('creci.ui.tasksViewMode')).toBe('kanban');
    });

    it('no lanza cuando localStorage falla al escribir', () => {
      const setItemSpy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new Error('QuotaExceededError');
      });

      expect(() => service.setTasksViewMode('kanban')).not.toThrow();

      setItemSpy.mockRestore();
    });
  });
});
