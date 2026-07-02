import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (!authService.isInitialized()) {
    return authService.waitUntilInitialized().then(() => {
      if (authService.isAuthenticated()) {
        return true;
      }
      return router.createUrlTree(['/login']);
    });
  }

  if (authService.isAuthenticated()) {
    return true;
  }

  return router.createUrlTree(['/login']);
};
