import { effect, inject, Injectable, OnDestroy, signal } from '@angular/core';
import { collection, Firestore, onSnapshot, orderBy, query, Timestamp } from '@angular/fire/firestore';

import { AuditLogEntry } from '../models/audit-log.model';
import { Provider } from '../models/machine.model';
import { UserRole } from '../models/role.model';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root',
})
export class AuditService implements OnDestroy {
  private readonly firestore = inject(Firestore);
  private readonly authService = inject(AuthService);

  readonly entries = signal<AuditLogEntry[]>([]);
  readonly isLoading = signal(true);
  readonly errorMessage = signal<string | null>(null);

  private unsubscribe: (() => void) | null = null;

  constructor() {
    effect(() => {
      const user = this.authService.currentUser();
      if (user) {
        this.startListening();
      } else {
        this.stopListening();
        this.entries.set([]);
        this.isLoading.set(false);
      }
    });
  }

  ngOnDestroy(): void {
    this.stopListening();
  }

  startListening(): void {
    this.stopListening();
    this.isLoading.set(true);
    this.errorMessage.set(null);

    const auditQuery = query(collection(this.firestore, 'audit_logs'), orderBy('createdAt', 'desc'));

    this.unsubscribe = onSnapshot(
      auditQuery,
      (snapshot) => {
        const entries = snapshot.docs.map((doc) => this.mapEntry(doc.id, doc.data()));
        this.entries.set(entries);
        this.isLoading.set(false);
      },
      (error) => {
        this.errorMessage.set(`No se pudo cargar la auditoria. ${error.message}`);
        this.isLoading.set(false);
      },
    );
  }

  stopListening(): void {
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }
  }

  private mapEntry(id: string, data: Record<string, unknown>): AuditLogEntry {
    const requestedBy = (data['requestedBy'] as Record<string, unknown>) ?? {};

    return {
      id,
      action: data['action'] as AuditLogEntry['action'],
      machineId: typeof data['machineId'] === 'string' ? data['machineId'] : '',
      provider: (data['provider'] as Provider) ?? 'aws',
      environment: typeof data['environment'] === 'string' ? data['environment'] : '',
      requestedBy: {
        uid: typeof requestedBy['uid'] === 'string' ? requestedBy['uid'] : '',
        email: typeof requestedBy['email'] === 'string' ? requestedBy['email'] : null,
        role: (requestedBy['role'] as UserRole) ?? 'viewer',
      },
      createdAt: this.toDate(data['createdAt']),
    };
  }

  private toDate(value: unknown): Date | null {
    if (value instanceof Timestamp) {
      return value.toDate();
    }
    if (value instanceof Date) {
      return value;
    }
    return null;
  }
}
