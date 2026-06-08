import { ChangeDetectionStrategy, Component } from '@angular/core';

// Placeholder component for the dashboard — will be replaced in a future PR
@Component({
  selector: 'app-dashboard-placeholder',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div style="padding: 2rem;">
      <p>Dashboard — próximamente</p>
    </div>
  `,
})
export class DashboardPlaceholderComponent {}
