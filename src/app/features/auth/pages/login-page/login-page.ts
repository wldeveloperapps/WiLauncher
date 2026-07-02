import { Component, effect, inject } from '@angular/core';
import { Router } from '@angular/router';

import { AuthService } from '../../../../core/services/auth.service';
import { Button } from '../../../../shared/ui/button/button';

@Component({
  selector: 'app-login-page',
  imports: [Button],
  templateUrl: './login-page.html',
  styleUrl: './login-page.scss',
})
export class LoginPage {
  private readonly router = inject(Router);
  protected readonly authService = inject(AuthService);

  constructor() {
    effect(() => {
      if (this.authService.isAuthenticated()) {
        void this.router.navigateByUrl('/');
      }
    });
  }
}
