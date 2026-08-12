import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialog, MatDialogRef } from '@angular/material/dialog';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { of, throwError } from 'rxjs';
import { EditUserDialogComponent } from './edit-user-dialog.component';
import { User, UsersService } from './users.service';

const developerWithProjects: User = {
  id: 'dev-1',
  email: 'developer@example.com',
  role: 'developer',
  isActive: true,
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
  projects: [{ id: 'proj-1', name: 'Proyecto Alfa' }],
};

const developerWithoutProjects: User = {
  ...developerWithProjects,
  id: 'dev-2',
  projects: [],
};

const adminUser: User = {
  ...developerWithProjects,
  id: 'admin-1',
  role: 'admin',
};

const mockUpdatedUser: User = { ...developerWithProjects, role: 'admin' };

const mockUsersService = {
  updateUser: vi.fn(() => of(mockUpdatedUser)),
};

const mockDialogRef = {
  close: vi.fn(),
};

describe('EditUserDialogComponent', () => {
  let component: EditUserDialogComponent;
  let fixture: ComponentFixture<EditUserDialogComponent>;
  let mockConfirmDialogRef: { afterClosed: ReturnType<typeof vi.fn> };
  let mockDialog: { open: ReturnType<typeof vi.fn> };

  const setup = async (user: User) => {
    vi.clearAllMocks();
    TestBed.resetTestingModule();
    mockConfirmDialogRef = { afterClosed: vi.fn().mockReturnValue(of(true)) };
    mockDialog = { open: vi.fn().mockReturnValue(mockConfirmDialogRef) };

    await TestBed.configureTestingModule({
      imports: [EditUserDialogComponent, NoopAnimationsModule],
      providers: [
        { provide: UsersService, useValue: mockUsersService },
        { provide: MatDialog, useValue: mockDialog },
        { provide: MatDialogRef, useValue: mockDialogRef },
        { provide: MAT_DIALOG_DATA, useValue: user },
      ],
    })
      // `MatDialogModule` re-declares `providers: [MatDialog]`, which shadows the
      // TestBed-level override at the component's own injector level — override
      // it directly on the component so `this.dialog` resolves to the mock.
      .overrideComponent(EditUserDialogComponent, {
        set: { providers: [{ provide: MatDialog, useValue: mockDialog }] },
      })
      .compileComponents();

    fixture = TestBed.createComponent(EditUserDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  };

  beforeEach(async () => {
    await setup(developerWithProjects);
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should pre-fill the form with the current role', () => {
    expect(component.form.controls.role.value).toBe('developer');
  });

  it('should expose the injected user', () => {
    expect(component.user).toBe(developerWithProjects);
  });

  describe('submit — sin cascada', () => {
    it('no debe abrir el diálogo de confirmación cuando el rol no cambia', () => {
      component.form.controls.role.setValue('developer');
      component.submit();

      expect(mockDialog.open).not.toHaveBeenCalled();
      expect(mockUsersService.updateUser).toHaveBeenCalledWith(
        developerWithProjects.id,
        expect.objectContaining({ role: 'developer' }),
      );
    });

    it('no debe abrir el diálogo de confirmación al promover a developer', async () => {
      await setup(adminUser);
      component.form.controls.role.setValue('developer');
      component.submit();

      expect(mockDialog.open).not.toHaveBeenCalled();
      expect(mockUsersService.updateUser).toHaveBeenCalled();
    });

    it('no debe abrir el diálogo de confirmación si el usuario no tiene proyectos asignados', async () => {
      await setup(developerWithoutProjects);
      component.form.controls.role.setValue('admin');
      component.submit();

      expect(mockDialog.open).not.toHaveBeenCalled();
      expect(mockUsersService.updateUser).toHaveBeenCalledWith(
        developerWithoutProjects.id,
        expect.objectContaining({ role: 'admin' }),
      );
    });
  });

  describe('submit — con cascada', () => {
    it('debe abrir el diálogo de confirmación nombrando los proyectos afectados al degradar', () => {
      component.form.controls.role.setValue('admin');
      component.submit();

      expect(mockDialog.open).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          data: expect.objectContaining({ message: expect.stringContaining('Proyecto Alfa') }),
        }),
      );
    });

    it('no debe enviar el PATCH si se cancela el diálogo de confirmación', () => {
      mockConfirmDialogRef.afterClosed.mockReturnValue(of(false));
      component.form.controls.role.setValue('admin');
      component.submit();

      expect(mockUsersService.updateUser).not.toHaveBeenCalled();
    });

    it('debe enviar el PATCH tras confirmar el diálogo', () => {
      mockConfirmDialogRef.afterClosed.mockReturnValue(of(true));
      component.form.controls.role.setValue('admin');
      component.submit();

      expect(mockUsersService.updateUser).toHaveBeenCalledWith(
        developerWithProjects.id,
        expect.objectContaining({ role: 'admin' }),
      );
    });
  });

  describe('payload de contraseña', () => {
    it('debe omitir password del payload cuando el campo está vacío', () => {
      component.form.controls.role.setValue('developer');
      component.submit();

      expect(mockUsersService.updateUser).toHaveBeenCalledWith(
        developerWithProjects.id,
        expect.not.objectContaining({ password: expect.anything() }),
      );
    });

    it('debe incluir password en el payload cuando se completa el campo', () => {
      component.form.controls.role.setValue('developer');
      component.form.controls.password.setValue('newpassword123');
      component.submit();

      expect(mockUsersService.updateUser).toHaveBeenCalledWith(
        developerWithProjects.id,
        expect.objectContaining({ password: 'newpassword123' }),
      );
    });
  });

  describe('resultado', () => {
    it('debe cerrar el diálogo con el usuario actualizado en éxito', () => {
      component.form.controls.role.setValue('developer');
      component.submit();

      expect(mockDialogRef.close).toHaveBeenCalledWith(mockUpdatedUser);
    });

    it('debe setear errorMessage sin cerrar el diálogo en error', () => {
      mockUsersService.updateUser.mockReturnValueOnce(throwError(() => new Error('error')));
      component.form.controls.role.setValue('developer');
      component.submit();

      expect(component.errorMessage()).toBeTruthy();
      expect(mockDialogRef.close).not.toHaveBeenCalled();
    });
  });
});
