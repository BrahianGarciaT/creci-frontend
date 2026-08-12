import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ConfirmDialogComponent, ConfirmDialogData } from './confirm-dialog.component';

const mockData: ConfirmDialogData = {
  title: 'Completar tarea',
  message: 'Esta acción no se puede deshacer.',
  confirmLabel: 'Completar',
  cancelLabel: 'Cancelar',
};

const mockDialogRef = {
  close: vi.fn(),
};

describe('ConfirmDialogComponent', () => {
  let component: ConfirmDialogComponent;
  let fixture: ComponentFixture<ConfirmDialogComponent>;

  beforeEach(async () => {
    vi.clearAllMocks();

    await TestBed.configureTestingModule({
      imports: [ConfirmDialogComponent, NoopAnimationsModule],
      providers: [
        { provide: MatDialogRef, useValue: mockDialogRef },
        { provide: MAT_DIALOG_DATA, useValue: mockData },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ConfirmDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('renders the injected title, message and labels', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain(mockData.title);
    expect(compiled.textContent).toContain(mockData.message);
    expect(compiled.textContent).toContain(mockData.confirmLabel);
    expect(compiled.textContent).toContain(mockData.cancelLabel);
  });

  it('closes with true when confirm is activated', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const confirmButton = compiled.querySelector<HTMLButtonElement>(
      `button[aria-label="${mockData.confirmLabel}"]`,
    );
    confirmButton?.click();

    expect(mockDialogRef.close).toHaveBeenCalledWith(true);
  });

  it('closes with false when cancel is activated', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const cancelButton = compiled.querySelector<HTMLButtonElement>(
      `button[aria-label="${mockData.cancelLabel}"]`,
    );
    cancelButton?.click();

    expect(mockDialogRef.close).toHaveBeenCalledWith(false);
  });

  it('falls back to default labels when none are provided', async () => {
    const defaultData: ConfirmDialogData = { title: 'Título', message: 'Mensaje' };

    await TestBed.resetTestingModule()
      .configureTestingModule({
        imports: [ConfirmDialogComponent, NoopAnimationsModule],
        providers: [
          { provide: MatDialogRef, useValue: mockDialogRef },
          { provide: MAT_DIALOG_DATA, useValue: defaultData },
        ],
      })
      .compileComponents();

    const defaultFixture = TestBed.createComponent(ConfirmDialogComponent);
    defaultFixture.detectChanges();

    const compiled = defaultFixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Confirmar');
    expect(compiled.textContent).toContain('Cancelar');
  });
});
