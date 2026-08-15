import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ProjectsService } from './projects.service';
import { environment } from '../../environments/environment';

const mockProjectsList = [
  { id: '1', name: 'Proyecto Alpha', status: 'active' as const, developers: [], createdAt: '', updatedAt: '' },
];

describe('ProjectsService', () => {
  let service: ProjectsService;
  let httpMock: HttpTestingController;
  const apiUrl = environment.apiUrl;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
    });
    service = TestBed.inject(ProjectsService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('projects (httpResource)', () => {
    it('should request page/limit params and expose the paginated envelope', () => {
      // En zoneless los efectos no corren sincrónicamente — flush para que
      // httpResource dispare la GET inicial (mismo patrón que UsersService)
      TestBed.flushEffects();

      const req = httpMock.expectOne(`${apiUrl}/projects?page=1&limit=20`);
      expect(req.request.method).toBe('GET');
      const mockResponse = {
        data: mockProjectsList,
        meta: { total: 1, page: 1, limit: 20, totalPages: 1 },
      };
      req.flush(mockResponse);
    });

    it('should re-request with the updated page when the page signal changes', () => {
      TestBed.flushEffects();
      httpMock.expectOne(`${apiUrl}/projects?page=1&limit=20`).flush({
        data: mockProjectsList,
        meta: { total: 1, page: 1, limit: 20, totalPages: 1 },
      });

      service.page.set(2);
      TestBed.flushEffects();

      httpMock.expectOne(`${apiUrl}/projects?page=2&limit=20`).flush({
        data: [],
        meta: { total: 1, page: 2, limit: 20, totalPages: 1 },
      });
    });
  });

  describe('createProject', () => {
    it('should call POST /projects with the given payload', () => {
      const payload = { name: 'Test Project', description: 'A test' };
      const mockResponse = { id: '1', name: 'Test Project', description: 'A test', status: 'active' as const, developers: [], createdAt: '', updatedAt: '' };

      service.createProject(payload).subscribe((result) => {
        expect(result).toEqual(mockResponse);
      });

      const req = httpMock.expectOne(`${apiUrl}/projects`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(payload);
      req.flush(mockResponse);
    });
  });

  describe('updateProject', () => {
    it('should call PATCH /projects/:id with the given payload', () => {
      const id = 'abc-123';
      const payload = { name: 'Updated Name' };
      const mockResponse = { id, name: 'Updated Name', status: 'active' as const, developers: [], createdAt: '', updatedAt: '' };

      service.updateProject(id, payload).subscribe((result) => {
        expect(result).toEqual(mockResponse);
      });

      const req = httpMock.expectOne(`${apiUrl}/projects/${id}`);
      expect(req.request.method).toBe('PATCH');
      expect(req.request.body).toEqual(payload);
      req.flush(mockResponse);
    });
  });

  describe('deactivateProject', () => {
    it('should call PATCH /projects/:id/deactivate', () => {
      const id = 'abc-123';
      const mockResponse = { id, name: 'Project', status: 'inactive' as const, developers: [], createdAt: '', updatedAt: '' };

      service.deactivateProject(id).subscribe((result) => {
        expect(result).toEqual(mockResponse);
      });

      const req = httpMock.expectOne(`${apiUrl}/projects/${id}/deactivate`);
      expect(req.request.method).toBe('PATCH');
      req.flush(mockResponse);
    });
  });

  describe('assignDevelopers', () => {
    it('should call PUT /projects/:id/developers with developer IDs', () => {
      const id = 'abc-123';
      const payload = { developerIds: ['dev-1', 'dev-2'] };
      const mockResponse = { id, name: 'Project', status: 'active' as const, developers: [], createdAt: '', updatedAt: '' };

      service.assignDevelopers(id, payload).subscribe((result) => {
        expect(result).toEqual(mockResponse);
      });

      const req = httpMock.expectOne(`${apiUrl}/projects/${id}/developers`);
      expect(req.request.method).toBe('PUT');
      expect(req.request.body).toEqual(payload);
      req.flush(mockResponse);
    });

    it('should call PUT /projects/:id/developers with empty array to clear all developers', () => {
      const id = 'abc-123';
      const payload = { developerIds: [] };
      const mockResponse = { id, name: 'Project', status: 'active' as const, developers: [], createdAt: '', updatedAt: '' };

      service.assignDevelopers(id, payload).subscribe((result) => {
        expect(result).toEqual(mockResponse);
      });

      const req = httpMock.expectOne(`${apiUrl}/projects/${id}/developers`);
      expect(req.request.method).toBe('PUT');
      expect(req.request.body).toEqual(payload);
      req.flush(mockResponse);
    });
  });
});
