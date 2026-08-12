import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  computed,
  effect,
  inject,
  input,
  viewChild,
} from '@angular/core';
import {
  CategoryScale,
  Chart,
  LineController,
  LineElement,
  LinearScale,
  PointElement,
  Tooltip,
} from 'chart.js';

// Registro acotado — solo los controllers/elements/scales que este wrapper usa
// (tree-shakeable, en vez de `Chart.register(...registerables)`).
Chart.register(LineController, CategoryScale, LinearScale, PointElement, LineElement, Tooltip);

// Punto de tendencia genérico consumido por el wrapper — sin tipos del dominio dashboard.
export interface TrendChartPoint {
  date: string;
  count: number;
}

/**
 * Wrapper delgado y propio sobre Chart.js (sin librería de charting para Angular).
 * Zoneless-safe: Chart.js vive fuera del conocimiento de Angular, así que el
 * redibujado se dispara explícitamente desde un `effect()` que observa las
 * signals de entrada, en vez de depender de la detección de cambios implícita.
 */
@Component({
  selector: 'app-trend-chart',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './trend-chart.component.html',
  styleUrl: './trend-chart.component.scss',
})
export class TrendChartComponent {
  readonly points = input.required<TrendChartPoint[]>();
  readonly seriesLabel = input('Completadas');
  readonly emptyMessage = input('Sin datos desde el despliegue');

  // Un trend totalmente en cero (o vacío) nunca instancia un chart —
  // se muestra el mensaje vacío en su lugar (nunca un canvas en blanco).
  readonly hasData = computed(() => this.points().some((p) => p.count > 0));

  private readonly canvasRef = viewChild<ElementRef<HTMLCanvasElement>>('canvas');
  private chart: Chart | undefined;

  constructor() {
    effect(() => {
      const canvasEl = this.canvasRef()?.nativeElement;
      const points = this.points();
      const label = this.seriesLabel();

      if (!canvasEl) {
        this.chart?.destroy();
        this.chart = undefined;
        return;
      }

      const labels = points.map((p) => p.date);
      const data = points.map((p) => p.count);

      if (!this.chart) {
        this.chart = new Chart(canvasEl, {
          type: 'line',
          data: {
            labels,
            datasets: [{ label, data }],
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
          },
        });
        return;
      }

      this.chart.data.labels = labels;
      this.chart.data.datasets[0].label = label;
      this.chart.data.datasets[0].data = data;
      this.chart.update();
    });

    inject(DestroyRef).onDestroy(() => this.chart?.destroy());
  }
}
