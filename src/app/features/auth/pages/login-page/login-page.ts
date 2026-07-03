import { Component, computed, effect, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';

import { ROLES, UserRole } from '../../../../core/models/role.model';
import { AuthService } from '../../../../core/services/auth.service';
import { LocaleService } from '../../../../core/services/locale.service';
import { SessionService } from '../../../../core/services/session.service';
import { ThemeService } from '../../../../core/services/theme.service';
import { environment } from '../../../../../environments/environment';

@Component({
  selector: 'app-login-page',
  imports: [TranslocoPipe],
  templateUrl: './login-page.html',
  styleUrl: './login-page.scss',
})
export class LoginPage {
  private readonly router = inject(Router);
  protected readonly authService = inject(AuthService);
  protected readonly sessionService = inject(SessionService);
  protected readonly themeService = inject(ThemeService);
  protected readonly localeService = inject(LocaleService);
  protected readonly devRoles = ROLES;

  protected readonly devRole = signal<UserRole>(environment.auth.devLogin.defaultRole);

  protected readonly themeToggleLabel = computed(() =>
    this.themeService.isDark() ? 'common.themeLight' : 'common.themeDark',
  );

  constructor() {
    effect(() => {
      if (this.authService.isAuthenticated()) {
        void this.router.navigateByUrl('/');
      }
    });
  }

  protected async signInWithDev(): Promise<void> {
    const role = this.devRole();
    await this.authService.signInWithDev(role);

    if (this.authService.isAuthenticated()) {
      this.sessionService.setDevRoleOverride(role);
    }
  }

  protected onDevRoleChange(event: Event): void {
    const value = (event.target as HTMLSelectElement).value as UserRole;
    this.devRole.set(value);
  }
}
