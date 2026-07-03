import { effect, inject, Injectable, OnDestroy, signal } from '@angular/core';
import { collection, Firestore, onSnapshot, Timestamp } from '@angular/fire/firestore';
import { Functions, httpsCallable } from '@angular/fire/functions';

import { Machine, MachineStatus, Provider } from '../models/machine.model';
import { AuthService } from './auth.service';

interface MachineActionInput {
  machineId: string;
  provider: Provider;
  environment: string;
}

interface MachineActionResponse {
  machineId: string;
  status: MachineStatus;
  message: string;
}

@Injectable({
  providedIn: 'root',
})
export class MachinesService implements OnDestroy {
  private readonly firestore = inject(Firestore);
  private readonly functions = inject(Functions);
  private readonly authService = inject(AuthService);

  readonly machines = signal<Machine[]>([]);
  readonly isLoading = signal(true);
  readonly errorMessage = signal<string | null>(null);
  readonly actionInProgress = signal<string | null>(null);

  private unsubscribe: (() => void) | null = null;

  constructor() {
    effect(() => {
      const user = this.authService.currentUser();
      if (user) {
        this.startListening();
      } else {
        this.stopListening();
        this.machines.set([]);
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

    this.unsubscribe = onSnapshot(
      collection(this.firestore, 'machines'),
      (snapshot) => {
        const machines = snapshot.docs
          .map((doc) => this.mapMachine(doc.id, doc.data()))
          .sort((a, b) => this.machineSortKey(a).localeCompare(this.machineSortKey(b)));
        this.machines.set(machines);
        this.isLoading.set(false);
      },
      (error) => {
        this.errorMessage.set(`No se pudo cargar el inventario. ${error.message}`);
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

  refresh(): void {
    if (this.authService.isAuthenticated()) {
      this.startListening();
    }
  }

  async startMachine(machine: Machine): Promise<void> {
    await this.executeAction(machine, 'startMachine');
  }

  async stopMachine(machine: Machine): Promise<void> {
    await this.executeAction(machine, 'stopMachine');
  }

  private async executeAction(
    machine: Machine,
    functionName: 'startMachine' | 'stopMachine',
  ): Promise<void> {
    const machineId = machine.machineId ?? machine.id;
    this.actionInProgress.set(machineId);
    this.errorMessage.set(null);

    try {
      const callable = httpsCallable<MachineActionInput, MachineActionResponse>(
        this.functions,
        functionName,
      );
      await callable({
        machineId,
        provider: machine.provider,
        environment: machine.environment,
      });
    } catch (error) {
      this.errorMessage.set(this.toFriendlyError(error));
      throw error;
    } finally {
      this.actionInProgress.set(null);
    }
  }

  private mapMachine(id: string, data: Record<string, unknown>): Machine {
    return {
      id,
      machineId: typeof data['machineId'] === 'string' ? data['machineId'] : id,
      name: typeof data['name'] === 'string' ? data['name'] : undefined,
      provider: (data['provider'] as Provider) ?? 'aws',
      environment: typeof data['environment'] === 'string' ? data['environment'] : 'DEV',
      status: (data['status'] as MachineStatus) ?? 'stopped',
      region: typeof data['region'] === 'string' ? data['region'] : undefined,
      ipAddress: typeof data['ipAddress'] === 'string' ? data['ipAddress'] : undefined,
      instanceType: typeof data['instanceType'] === 'string' ? data['instanceType'] : undefined,
      updatedBy: typeof data['updatedBy'] === 'string' ? data['updatedBy'] : undefined,
      updatedAt: this.toDate(data['updatedAt']),
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

  private machineSortKey(machine: Machine): string {
    return machine.name ?? machine.machineId ?? machine.id;
  }

  private toFriendlyError(error: unknown): string {
    if (error instanceof Error) {
      if (error.message.includes('permission-denied')) {
        return 'No tienes permisos para realizar esta accion.';
      }
      return `No se pudo completar la accion. ${error.message}`;
    }
    return 'No se pudo completar la accion.';
  }
}
