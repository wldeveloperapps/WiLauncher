import { computed, effect, inject, Injectable, signal } from '@angular/core';

import { AuditLogEntry } from '../models/audit-log.model';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root',
})
export class AuditService {
  private readonly authService = inject(AuthService);

  readonly isLoading = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly entries = computed<AuditLogEntry[]>(() => []);

  constructor() {
    effect(() => {
      const user = this.authService.currentUser();
      if (!user) {
        this.errorMessage.set(null);
        this.isLoading.set(false);
      }
    });
  }
}
