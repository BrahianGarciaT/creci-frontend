import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { noAuthGuard } from './no-auth.guard';
import { AuthService } from '../services/auth.service';

describe('noAuthGuard', () => {
  let authService: { isAuthenticated: ReturnType<typeof vi.fn> };
  let router: { parseUrl: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    authService = { isAuthenticated: vi.fn() };
    router = { parseUrl: vi.fn().mockReturnValue('/dashboard') };

    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: authService },
        { provide: Router, useValue: router },
      ],
    });
  });

  it('allows navigation when user is not authenticated', () => {
    authService.isAuthenticated.mockReturnValue(false);
    const result = TestBed.runInInjectionContext(() => noAuthGuard({} as never, {} as never));
    expect(result).toBe(true);
  });

  it('redirects to /dashboard when user is already authenticated', () => {
    authService.isAuthenticated.mockReturnValue(true);
    TestBed.runInInjectionContext(() => noAuthGuard({} as never, {} as never));
    expect(router.parseUrl).toHaveBeenCalledWith('/dashboard');
  });
});
