import { ComponentFixture, TestBed } from '@angular/core/testing';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TrendChartComponent } from './trend-chart.component';

// `vi.mock` se hoistea por encima de los imports/const del módulo — las
// variables que su factory usa deben declararse con `vi.hoisted()` para
// evitar referenciarlas antes de su inicialización (TDZ).
const { chartInstanceMock, ChartMock } = vi.hoisted(() => {
  // Instancia falsa del chart devuelta por el constructor mockeado
  const chartInstanceMock = {
    destroy: vi.fn(),
    update: vi.fn(),
    data: {
      labels: [] as string[],
      datasets: [{ label: '', data: [] as number[] }],
    },
  };

  // `new Chart(...)` — necesita una función clásica (no arrow) para que
  // vitest permita invocarla con `new`; devuelve la instancia falsa.
  const ChartMock = Object.assign(
    vi.fn(function ChartCtor() {
      return chartInstanceMock;
    }),
    { register: vi.fn() },
  );

  return { chartInstanceMock, ChartMock };
});

vi.mock('chart.js', () => ({
  Chart: ChartMock,
  LineController: {},
  CategoryScale: {},
  LinearScale: {},
  PointElement: {},
  LineElement: {},
  Tooltip: {},
}));

describe('TrendChartComponent', () => {
  let fixture: ComponentFixture<TrendChartComponent>;

  beforeEach(async () => {
    ChartMock.mockClear();
    chartInstanceMock.destroy.mockClear();
    chartInstanceMock.update.mockClear();

    await TestBed.configureTestingModule({
      imports: [TrendChartComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(TrendChartComponent);
  });

  it('crea el chart al recibir datos no vacíos por primera vez', async () => {
    fixture.componentRef.setInput('points', [{ date: '2026-01-01', count: 3 }]);
    fixture.detectChanges();
    await fixture.whenStable();

    expect(ChartMock).toHaveBeenCalledTimes(1);
  });

  it('llama a update() en vez de recrear el chart cuando cambian los puntos', async () => {
    fixture.componentRef.setInput('points', [{ date: '2026-01-01', count: 3 }]);
    fixture.detectChanges();
    await fixture.whenStable();

    fixture.componentRef.setInput('points', [{ date: '2026-01-02', count: 5 }]);
    fixture.detectChanges();
    await fixture.whenStable();

    expect(ChartMock).toHaveBeenCalledTimes(1);
    expect(chartInstanceMock.update).toHaveBeenCalled();
    expect(chartInstanceMock.data.datasets[0].data).toEqual([5]);
  });

  it('destruye la instancia del chart al destruirse el componente', async () => {
    fixture.componentRef.setInput('points', [{ date: '2026-01-01', count: 3 }]);
    fixture.detectChanges();
    await fixture.whenStable();

    fixture.destroy();

    expect(chartInstanceMock.destroy).toHaveBeenCalled();
  });

  it('no instancia el chart cuando todos los puntos están en cero (rama vacía)', async () => {
    fixture.componentRef.setInput('points', [
      { date: '2026-01-01', count: 0 },
      { date: '2026-01-02', count: 0 },
    ]);
    fixture.detectChanges();
    await fixture.whenStable();

    expect(ChartMock).not.toHaveBeenCalled();
  });

  it('no instancia el chart cuando no hay puntos', async () => {
    fixture.componentRef.setInput('points', []);
    fixture.detectChanges();
    await fixture.whenStable();

    expect(ChartMock).not.toHaveBeenCalled();
  });
});
