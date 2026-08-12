import { DestroyRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FormControl } from '@angular/forms';
import { describe, it, expect } from 'vitest';
import { bindAssigneeGating } from './assignee-gating';
import { Project } from '../projects/projects.service';
import { User } from '../users/users.service';

const devA: User = {
  id: 'dev-a',
  email: 'a@example.com',
  role: 'developer',
  isActive: true,
  createdAt: '',
  updatedAt: '',
  projects: [],
};
const devB: User = {
  id: 'dev-b',
  email: 'b@example.com',
  role: 'developer',
  isActive: true,
  createdAt: '',
  updatedAt: '',
  projects: [],
};
const admin: User = {
  id: 'admin-1',
  email: 'admin@example.com',
  role: 'admin',
  isActive: true,
  createdAt: '',
  updatedAt: '',
  projects: [],
};

const projectP: Project = {
  id: 'project-p',
  name: 'Proyecto P',
  status: 'active',
  developers: [devA, admin],
  createdAt: '',
  updatedAt: '',
};
const projectQ: Project = {
  id: 'project-q',
  name: 'Proyecto Q',
  status: 'active',
  developers: [devA, devB],
  createdAt: '',
  updatedAt: '',
};

const projects = [projectP, projectQ];
const users = [devA, devB, admin];

function setup(initialProjectId = '', initialAssigneeId: string | null = null) {
  const projectControl = new FormControl(initialProjectId, { nonNullable: true });
  const assigneeControl = new FormControl<string | null>(initialAssigneeId);

  const eligibleDevelopers = TestBed.runInInjectionContext(() =>
    bindAssigneeGating({
      projectControl,
      assigneeControl,
      projects,
      users,
      destroyRef: TestBed.inject(DestroyRef),
    })
  );

  TestBed.tick();

  return { projectControl, assigneeControl, eligibleDevelopers };
}

describe('bindAssigneeGating', () => {
  it('disables the assignee control while no project is selected', () => {
    const { assigneeControl } = setup();

    expect(assigneeControl.disabled).toBe(true);
  });

  it('enables the assignee control once a project is selected', () => {
    const { assigneeControl, projectControl } = setup();

    projectControl.setValue('project-p');
    TestBed.tick();

    expect(assigneeControl.disabled).toBe(false);
  });

  it('lists only developers of the selected project (excluding non-developer roles)', () => {
    const { eligibleDevelopers, projectControl } = setup();

    projectControl.setValue('project-p');
    TestBed.tick();

    expect(eligibleDevelopers()).toEqual([devA]);
  });

  it('recomputes eligible developers when the project changes', () => {
    const { eligibleDevelopers, projectControl } = setup('project-p');
    TestBed.tick();

    projectControl.setValue('project-q');
    TestBed.tick();

    expect(eligibleDevelopers()).toEqual([devA, devB]);
  });

  it('clears the assignee when the new project invalidates the current selection', () => {
    const { assigneeControl, projectControl } = setup('project-q', 'dev-b');
    TestBed.tick();
    expect(assigneeControl.value).toBe('dev-b');

    projectControl.setValue('project-p');
    TestBed.tick();

    expect(assigneeControl.value).toBeNull();
  });

  it('preserves the assignee when it is still valid on the new project', () => {
    const { assigneeControl, projectControl } = setup('project-p', 'dev-a');
    TestBed.tick();
    expect(assigneeControl.value).toBe('dev-a');

    projectControl.setValue('project-q');
    TestBed.tick();

    expect(assigneeControl.value).toBe('dev-a');
  });
});
