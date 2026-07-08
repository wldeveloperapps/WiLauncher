import { effect, inject, Injectable, signal } from '@angular/core';

import { AuditLogEntry } from '../models/audit-log.model';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root',
})
export class AuditService {
  private readonly authService = inject(AuthService);

  readonly entries = signal<AuditLogEntry[]>([]);
  readonly isLoading = signal(false);
  readonly errorMessage = signal<string | null>(null);

  constructor() {
    effect(() => {
      const user = this.authService.currentUser();
      if (!user) {
        this.entries.set([]);
        this.errorMessage.set(null);
        this.isLoading.set(false);
      }
    });
  }
}
