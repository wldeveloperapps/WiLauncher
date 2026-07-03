import { effect, inject, Injectable, OnDestroy, signal } from '@angular/core';
import { collection, Firestore, onSnapshot, Timestamp } from '@angular/fire/firestore';
import { Functions, httpsCallable } from '@angular/fire/functions';

import { MOCK_MACHINES } from '../data/mock-machines';
import { Machine, MachineStatus, Provider } from '../models/machine.model';
import { environment } from '../../../environments/environment';
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
  private readonly useMockMachines = environment.useMockMachines;

  readonly machines = signal<Machine[]>([]);
  readonly isLoading = signal(true);
  readonly errorMessage = signal<string | null>(null);
  readonly actionInProgress = signal<string | null>(null);

  private unsubscribe: (() => void) | null = null;
  private mockTransitionTimer: ReturnType<typeof setTimeout> | null = null;

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
    this.clearMockTransitionTimer();
  }

  startListening(): void {
    this.stopListening();
    this.isLoading.set(true);
    this.errorMessage.set(null);

    if (this.useMockMachines) {
      const machines = [...MOCK_MACHINES].sort((a, b) =>
        this.machineSortKey(a).localeCompare(this.machineSortKey(b)),
      );
      this.machines.set(machines);
      this.isLoading.set(false);
      return;
    }

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
    this.clearMockTransitionTimer();
  }

  refresh(): void {
    if (this.authService.isAuthenticated()) {
      this.startListening();
    }
  }

  async startMachine(machine: Machine): Promise<void> {
    if (this.useMockMachines) {
      await this.executeMockAction(machine, 'start');
      return;
    }
    await this.executeAction(machine, 'startMachine');
  }

  async stopMachine(machine: Machine): Promise<void> {
    if (this.useMockMachines) {
      await this.executeMockAction(machine, 'stop');
      return;
    }
    await this.executeAction(machine, 'stopMachine');
  }

  private async executeMockAction(machine: Machine, action: 'start' | 'stop'): Promise<void> {
    const machineId = machine.machineId ?? machine.id;
    this.actionInProgress.set(machineId);
    this.errorMessage.set(null);
    this.clearMockTransitionTimer();

    const transitionStatus: MachineStatus = action === 'start' ? 'starting' : 'stopping';
    const finalStatus: MachineStatus = action === 'start' ? 'running' : 'stopped';

    this.updateMockMachine(machineId, {
      status: transitionStatus,
      updatedAt: new Date(),
      updatedBy: this.authService.currentUser()?.email ?? 'dev@wiloc.local',
    });

    await new Promise<void>((resolve) => {
      this.mockTransitionTimer = setTimeout(() => {
        this.updateMockMachine(machineId, {
          status: finalStatus,
          updatedAt: new Date(),
        });
        this.mockTransitionTimer = null;
        resolve();
      }, 1500);
    });

    this.actionInProgress.set(null);
  }

  private updateMockMachine(machineId: string, patch: Partial<Machine>): void {
    this.machines.update((machines) =>
      machines.map((machine) => {
        const id = machine.machineId ?? machine.id;
        if (id !== machineId) return machine;
        return { ...machine, ...patch };
      }),
    );
  }

  private clearMockTransitionTimer(): void {
    if (this.mockTransitionTimer) {
      clearTimeout(this.mockTransitionTimer);
      this.mockTransitionTimer = null;
    }
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
