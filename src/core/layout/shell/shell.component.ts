import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { MatSidenavModule } from '@angular/material/sidenav';
import { AuthService } from '../../services/auth.service';
import { SidenavComponent } from '../sidenav/sidenav.component';
import { NAV_ITEMS } from '../nav-items';

@Component({
  selector: 'app-shell',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet, MatSidenavModule, SidenavComponent],
  templateUrl: './shell.component.html',
  styleUrl: './shell.component.scss',
})
export class ShellComponent {
  private readonly auth = inject(AuthService);

  readonly currentUser = this.auth.currentUser;

  readonly visibleNavItems = computed(() => {
    const role = this.auth.currentUser()?.role ?? null;
    return NAV_ITEMS.filter((item) => !item.requiredRole || item.requiredRole === role);
  });

  onLogout(): void {
    this.auth.logout();
  }
}
