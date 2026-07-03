import { computed, inject, Injectable, signal } from '@angular/core';
import { Auth } from '@angular/fire/auth';
import {
  AuthError,
  OAuthProvider,
  User,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
} from 'firebase/auth';
import { Functions, httpsCallable } from '@angular/fire/functions';

import { UserRole } from '../models/role.model';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly auth = inject(Auth);
  private readonly functions = inject(Functions);
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
  readonly isDevLoginEnabled = computed(
    () => !environment.production && environment.auth.devLogin.enabled,
  );

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

  async signInWithDev(role: UserRole = environment.auth.devLogin.defaultRole): Promise<void> {
    if (!this.isDevLoginEnabled()) {
      return;
    }

    const devLogin = environment.auth.devLogin;
    this.isBusy.set(true);
    this.errorMessage.set(null);

    try {
      const credential = await this.ensureDevUser(devLogin.email, devLogin.password);

      if (devLogin.displayName && credential.user.displayName !== devLogin.displayName) {
        await updateProfile(credential.user, { displayName: devLogin.displayName });
      }

      if (environment.useEmulators) {
        const callable = httpsCallable<{ role: UserRole }, { role: UserRole }>(
          this.functions,
          'setDevRole',
        );
        await callable({ role });
        await credential.user.getIdToken(true);
      }
    } catch (error) {
      this.errorMessage.set(this.toDevFriendlyError(error));
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

  private async ensureDevUser(email: string, password: string) {
    try {
      return await signInWithEmailAndPassword(this.auth, email, password);
    } catch (error) {
      const authError = error as AuthError;
      if (
        authError.code === 'auth/user-not-found' ||
        authError.code === 'auth/invalid-credential' ||
        authError.code === 'auth/invalid-login-credentials'
      ) {
        return createUserWithEmailAndPassword(this.auth, email, password);
      }
      throw error;
    }
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

  private toDevFriendlyError(error: unknown): string {
    const fallback = 'No se pudo completar el inicio de sesion de desarrollo.';
    if (!(error instanceof Error)) {
      return fallback;
    }

    if (error.message.includes('auth/operation-not-allowed')) {
      return 'Activa Email/Password en Firebase Authentication o usa los emuladores locales.';
    }

    return `${fallback} Detalle: ${error.message}`;
  }
}
