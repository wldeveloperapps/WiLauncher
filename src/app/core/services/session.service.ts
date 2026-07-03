import { computed, effect, inject, Injectable, signal } from '@angular/core';
import { Functions, httpsCallable } from '@angular/fire/functions';

import { canOperate, UserRole } from '../models/role.model';
import { environment } from '../../../environments/environment';
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
  readonly canOperate = computed(() => canOperate(this.role()));

  private readonly devRoleOverride = signal<UserRole | null>(null);

  constructor() {
    effect(() => {
      const user = this.authService.currentUser();
      if (user) {
        void this.loadSessionContext();
      } else {
        this.role.set('viewer');
        this.errorMessage.set(null);
        this.devRoleOverride.set(null);
      }
    });
  }

  setDevRoleOverride(role: UserRole): void {
    this.devRoleOverride.set(role);
    this.role.set(role);
  }

  clearDevRoleOverride(): void {
    this.devRoleOverride.set(null);
  }

  reloadSession(): void {
    if (this.authService.currentUser()) {
      void this.loadSessionContext();
    }
  }

  private async loadSessionContext(): Promise<void> {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    const devOverride = this.devRoleOverride();
    if (!environment.production && devOverride) {
      this.role.set(devOverride);
      this.isLoading.set(false);
      return;
    }

    try {
      const callable = httpsCallable<void, SessionContextResponse>(this.functions, 'getSessionContext');
      const result = await callable();
      this.role.set(result.data.role ?? 'viewer');
    } catch (error) {
      this.role.set('viewer');
      this.errorMessage.set(this.toFriendlyError(error));
    } finally {
      this.isLoading.set(false);
    }
  }

  private toFriendlyError(error: unknown): string {
    if (error instanceof Error) {
      return `No se pudo cargar el contexto de sesion. ${error.message}`;
    }
    return 'No se pudo cargar el contexto de sesion.';
  }
}
