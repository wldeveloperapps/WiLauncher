import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

import { roleLabel } from '../../models/role.model';
import { AuthService } from '../../services/auth.service';
import { SessionService } from '../../services/session.service';
import { ThemeService } from '../../services/theme.service';
import { Switch } from '../../../shared/ui/switch/switch';

@Component({
  selector: 'app-main-layout',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, Switch],
  templateUrl: './main-layout.html',
  styleUrl: './main-layout.scss',
})
export class MainLayout {
  protected readonly authService = inject(AuthService);
  protected readonly sessionService = inject(SessionService);
  protected readonly themeService = inject(ThemeService);
  protected readonly roleLabel = roleLabel;
}
