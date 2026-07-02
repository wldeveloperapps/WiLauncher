import { computed, inject, Injectable, signal } from '@angular/core';
import { Auth } from '@angular/fire/auth';
import { OAuthProvider, User, onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth';

import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly auth = inject(Auth);
  private resolveInitialized!: () => void;
  private readonly initializedPromise = new Promise<void>((resolve) => {
    this.resolveInitialized = resolve;
  });

  readonly currentUser = signal<User | null>(null);
  readonly isInitialized = signal(false);
  readonly isBusy = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly isAuthenticated = computed(() => Boolean(this.currentUser()));
  readonly displayName = computed(
    () => this.currentUser()?.displayName || this.currentUser()?.email || this.currentUser()?.uid || '',
  );
  readonly hasTenantConfigured = computed(() => Boolean(environment.auth.microsoftTenantId?.trim()));

  private readonly unsubscribeAuthListener = onAuthStateChanged(this.auth, (user) => {
    this.currentUser.set(user);
    if (!this.isInitialized()) {
      this.isInitialized.set(true);
      this.resolveInitialized();
    }
  });

  async waitUntilInitialized(): Promise<void> {
    await this.initializedPromise;
  }

  async signInWithMicrosoft(): Promise<void> {
    this.isBusy.set(true);
    this.errorMessage.set(null);

    try {
      const provider = new OAuthProvider('microsoft.com');
      const tenantId = environment.auth.microsoftTenantId?.trim();

      provider.setCustomParameters({
        prompt: 'select_account',
        ...(tenantId ? { tenant: tenantId } : {}),
      });

      await signInWithPopup(this.auth, provider);
    } catch (error) {
      this.errorMessage.set(this.toFriendlyError(error));
    } finally {
      this.isBusy.set(false);
    }
  }

  async logout(): Promise<void> {
    this.isBusy.set(true);
    this.errorMessage.set(null);

    try {
      await signOut(this.auth);
    } catch (error) {
      this.errorMessage.set(this.toFriendlyError(error));
    } finally {
      this.isBusy.set(false);
    }
  }

  clearError(): void {
    this.errorMessage.set(null);
  }

  ngOnDestroy(): void {
    this.unsubscribeAuthListener();
  }

  private toFriendlyError(error: unknown): string {
    const fallback = 'No se pudo completar el inicio de sesion con Microsoft.';
    if (!(error instanceof Error)) {
      return fallback;
    }

    if (error.message.includes('auth/operation-not-allowed')) {
      return 'Debes activar el proveedor Microsoft en Firebase Authentication.';
    }
    if (error.message.includes('auth/popup-closed-by-user')) {
      return 'Se cerro la ventana emergente antes de completar el acceso.';
    }
    if (error.message.includes('auth/unauthorized-domain')) {
      return 'El dominio actual no esta autorizado en Firebase Authentication.';
    }

    return `${fallback} Detalle: ${error.message}`;
  }
}
