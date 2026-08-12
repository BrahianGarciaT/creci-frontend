import { ComponentFixture, TestBed } from '@angular/core/testing';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { Chart } from 'chart.js';
import { CHART_CTOR, TrendChartComponent } from './trend-chart.component';

// El constructor de Chart se reemplaza por DI (provider de `CHART_CTOR`) en
// vez de interceptar el módulo `chart.js` con `vi.mock`. `vi.mock` dependía
// del pre-bundling de Vite y era intermitente: en corridas paralelas con
// cache de dep-optimization frío, el mock a veces no llegaba a tiempo y se
// colaba el `chart.js` real, que en jsdom no tiene `canvas.getContext` y
// tira error. Con DI, el módulo real nunca se importa desde este spec.
const buildChartMock = () => {
  // Instancia falsa del chart devuelta por el constructor mockeado
  const chartInstanceMock = {
    destroy: vi.fn(),
    update: vi.fn(),
    data: {
      labels: [] as string[],
      datasets: [{ label: '', data: [] as number[] }],
    },
  };

  // Necesita ser una función clásica (no arrow) para que sea invocable con
  // `new` — se castea al tipo del constructor real de Chart.js.
  const ChartMock = vi.fn(function ChartCtor() {
    return chartInstanceMock;
  }) as unknown as typeof Chart;

  return { chartInstanceMock, ChartMock };
};

describe('TrendChartComponent', () => {
  let fixture: ComponentFixture<TrendChartComponent>;
  let chartInstanceMock: ReturnType<typeof buildChartMock>['chartInstanceMock'];
  let ChartMock: ReturnType<typeof buildChartMock>['ChartMock'];

  beforeEach(async () => {
    ({ chartInstanceMock, ChartMock } = buildChartMock());

    await TestBed.configureTestingModule({
      imports: [TrendChartComponent],
      providers: [{ provide: CHART_CTOR, useValue: ChartMock }],
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
