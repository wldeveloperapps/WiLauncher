import { computed, effect, inject, Injectable, signal } from '@angular/core';
import { Functions, httpsCallable } from '@angular/fire/functions';

import { UserRole, canOperate as canOperateWithRole } from '../models/role.model';
import { AuthService } from './auth.service';

interface SessionContextResponse {
  application: string;
  uid: string;
  email: string | null;
  role: UserRole;
}

@Injectable({
  providedIn: 'root',
})
export class SessionService {
  private readonly functions = inject(Functions);
  private readonly authService = inject(AuthService);

  readonly role = signal<UserRole>('viewer');
  readonly isLoading = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly canOperate = computed(() => canOperateWithRole(this.role()));

  private loadRequestId = 0;

  constructor() {
    effect(() => {
      const user = this.authService.currentUser();
      if (user) {
        void this.loadSessionContext();
      } else {
        this.role.set('viewer');
        this.errorMessage.set(null);
        this.isLoading.set(false);
      }
    });
  }

  reloadSession(): void {
    if (this.authService.currentUser()) {
      void this.loadSessionContext();
    }
  }

  private async loadSessionContext(): Promise<void> {
    const requestId = ++this.loadRequestId;
    this.isLoading.set(true);
    this.errorMessage.set(null);

    try {
      const callable = httpsCallable<void, SessionContextResponse>(this.functions, 'getSessionContext');
      const result = await callable();

      if (requestId !== this.loadRequestId) {
        return;
      }

      this.role.set(result.data.role ?? 'viewer');
    } catch (error) {
      if (requestId !== this.loadRequestId) {
        return;
      }

      this.role.set('viewer');
      this.errorMessage.set(this.toFriendlyError(error));
    } finally {
      if (requestId === this.loadRequestId) {
        this.isLoading.set(false);
      }
    }
  }

  private toFriendlyError(error: unknown): string {
    if (error instanceof Error) {
      return `No se pudo cargar el contexto de sesion. ${error.message}`;
    }
    return 'No se pudo cargar el contexto de sesion.';
  }
}
