import { computed, effect, inject, Injectable, signal } from '@angular/core';
import { Functions, httpsCallable } from '@angular/fire/functions';

import { ROLES, UserRole } from '../models/role.model';
import { environment } from '../../../environments/environment';
import { AuthService } from './auth.service';

interface SessionContextResponse {
  application: string;
  uid: string;
  email: string | null;
  role: UserRole;
  tokenRefreshRequired?: boolean;
}

const DEV_ROLE_STORAGE_KEY = 'wilauncher-dev-role';

@Injectable({
  providedIn: 'root',
})
export class SessionService {
  private readonly functions = inject(Functions);
  private readonly authService = inject(AuthService);

  readonly role = signal<UserRole>('viewer');
  readonly isLoading = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly canOperate = computed(() => this.authService.isAuthenticated());

  private readonly devRoleOverride = signal<UserRole | null>(this.readStoredDevRole());
  private loadRequestId = 0;

  constructor() {
    effect(() => {
      const user = this.authService.currentUser();
      if (user) {
        void this.loadSessionContext();
      } else {
        this.role.set('viewer');
        this.errorMessage.set(null);
        this.devRoleOverride.set(null);
        this.clearStoredDevRole();
      }
    });
  }

  setDevRoleOverride(role: UserRole): void {
    this.devRoleOverride.set(role);
    this.role.set(role);
    this.persistDevRole(role);
  }

  clearDevRoleOverride(): void {
    this.devRoleOverride.set(null);
    this.clearStoredDevRole();
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

    if (!environment.production && this.shouldUseLocalDevRole()) {
      this.role.set(environment.auth.devLogin.defaultRole);
      this.isLoading.set(false);
      return;
    }

    try {
      const callable = httpsCallable<void, SessionContextResponse>(this.functions, 'getSessionContext');
      const result = await callable();

      if (requestId !== this.loadRequestId) {
        return;
      }

      if (result.data.tokenRefreshRequired) {
        await this.authService.refreshIdToken();
      }

      const devRoleAfterLoad = this.resolveDevRole();
      const backendRole = result.data.role ?? 'viewer';

      if (!environment.production && devRoleAfterLoad && devRoleAfterLoad !== 'viewer') {
        this.role.set(devRoleAfterLoad);
        return;
      }

      if (!environment.production && backendRole === 'viewer') {
        this.role.set('operator');
        return;
      }

      this.role.set(backendRole);
    } catch (error) {
      if (requestId !== this.loadRequestId) {
        return;
      }

      if (!environment.production && this.shouldUseLocalDevRole()) {
        this.role.set(environment.auth.devLogin.defaultRole);
        this.errorMessage.set(null);
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

  private shouldUseLocalDevRole(): boolean {
    if (environment.production) {
      return false;
    }

    if (environment.useMockMachines) {
      return true;
    }

    const devLogin = environment.auth.devLogin;
    if (!devLogin.enabled) {
      return false;
    }

    const email = this.authService.currentUser()?.email;
    return Boolean(email && email === devLogin.email);
  }

  private resolveDevRole(): UserRole | null {
    const override = this.devRoleOverride() ?? this.readStoredDevRole();
    if (override) {
      return override;
    }

    if (this.shouldUseLocalDevRole()) {
      return environment.auth.devLogin.defaultRole;
    }

    return null;
  }

  private readStoredDevRole(): UserRole | null {
    if (environment.production || typeof sessionStorage === 'undefined') {
      return null;
    }

    const stored = sessionStorage.getItem(DEV_ROLE_STORAGE_KEY);
    if (stored && (ROLES as readonly string[]).includes(stored)) {
      return stored as UserRole;
    }

    return null;
  }

  private persistDevRole(role: UserRole): void {
    if (environment.production || typeof sessionStorage === 'undefined') {
      return;
    }

    sessionStorage.setItem(DEV_ROLE_STORAGE_KEY, role);
  }

  private clearStoredDevRole(): void {
    if (typeof sessionStorage === 'undefined') {
      return;
    }

    sessionStorage.removeItem(DEV_ROLE_STORAGE_KEY);
  }

  private toFriendlyError(error: unknown): string {
    if (error instanceof Error) {
      return `No se pudo cargar el contexto de sesion. ${error.message}`;
    }
    return 'No se pudo cargar el contexto de sesion.';
  }
}
