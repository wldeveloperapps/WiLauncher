import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';

import { ROLES, UserRole } from '../../models/role.model';
import { AuthService } from '../../services/auth.service';
import { SessionService } from '../../services/session.service';
import { ThemeService } from '../../services/theme.service';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-main-layout',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, TranslocoPipe],
  templateUrl: './main-layout.html',
  styleUrl: './main-layout.scss',
})
export class MainLayout {
  protected readonly authService = inject(AuthService);
  protected readonly sessionService = inject(SessionService);
  protected readonly themeService = inject(ThemeService);
  protected readonly devRoles = ROLES;
  protected readonly showDevRolePicker = !environment.production;

  protected async onDevRoleChange(event: Event): Promise<void> {
    const value = (event.target as HTMLSelectElement).value as UserRole;
    try {
      await this.sessionService.setRole(value);
    } catch {
      // Error surfaced via sessionService.errorMessage
    }
  }
}
