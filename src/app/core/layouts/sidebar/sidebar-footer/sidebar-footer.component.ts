import { Component, inject } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';

import { AuthService } from '../../../services/auth.service';
import { ThemeService } from '../../../services/theme.service';
import { IconButtonComponent } from '../../../../shared/ui/icon-button/icon-button.component';

@Component({
  selector: 'app-sidebar-footer',
  imports: [IconButtonComponent, TranslocoPipe],
  templateUrl: './sidebar-footer.component.html',
  styleUrl: './sidebar-footer.component.scss',
})
export class SidebarFooterComponent {
  protected readonly authService = inject(AuthService);
  protected readonly themeService = inject(ThemeService);
}
