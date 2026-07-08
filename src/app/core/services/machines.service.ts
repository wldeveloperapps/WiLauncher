import { effect, inject, Injectable, OnDestroy, signal } from '@angular/core';
import { Functions, httpsCallable } from '@angular/fire/functions';

import { MOCK_MACHINES } from '../data/mock-machines';
import { Machine, MachineStatus, Provider } from '../models/machine.model';
import { environment } from '../../../environments/environment';
import { AuthService } from './auth.service';

interface MachineActionInput {
  machineId: string;
  provider: Provider;
  environment: string;
  subscriptionId: string;
  resourceGroup: string;
}

interface MachineActionResponse {
  machineId: string;
  status: MachineStatus;
  message: string;
}

interface ListMachinesResponse {
  machines: Array<Record<string, unknown>>;
  subscriptions: number;
  syncedAt: string;
}

@Injectable({
  providedIn: 'root',
})
export class MachinesService implements OnDestroy {
  private readonly functions = inject(Functions);
  private readonly authService = inject(AuthService);
  private readonly useMockMachines = environment.useMockMachines;

  readonly machines = signal<Machine[]>([]);
  readonly isLoading = signal(true);
  readonly isRefreshing = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly actionInProgress = signal<string | null>(null);
  readonly lastSyncedAt = signal<string | null>(null);

  private mockTransitionTimer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    effect(() => {
      const user = this.authService.currentUser();
      if (user) {
        void this.loadMachines();
      } else {
        this.clearMockTransitionTimer();
        this.machines.set([]);
        this.lastSyncedAt.set(null);
        this.isLoading.set(false);
      }
    });
  }

  ngOnDestroy(): void {
    this.clearMockTransitionTimer();
  }

  async refresh(): Promise<void> {
    if (!this.authService.isAuthenticated()) {
      return;
    }

    await this.loadMachines({ refresh: true });
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

  private async loadMachines(options: { refresh?: boolean } = {}): Promise<void> {
    const { refresh = false } = options;

    if (refresh) {
      this.isRefreshing.set(true);
    } else {
      this.isLoading.set(true);
    }

    this.errorMessage.set(null);

    if (this.useMockMachines) {
      const machines = [...MOCK_MACHINES].sort((a, b) =>
        this.machineSortKey(a).localeCompare(this.machineSortKey(b)),
      );
      this.machines.set(machines);
      this.lastSyncedAt.set(null);
      this.isLoading.set(false);
      this.isRefreshing.set(false);
      return;
    }

    try {
      const callable = httpsCallable<void, ListMachinesResponse>(this.functions, 'listMachines');
      const result = await callable();
      const machines = result.data.machines
        .map((machine) => this.mapMachine(machine))
        .sort((a, b) => this.machineSortKey(a).localeCompare(this.machineSortKey(b)));

      this.machines.set(machines);
      this.lastSyncedAt.set(result.data.syncedAt);
    } catch (error) {
      this.errorMessage.set(this.toListError(error));
    } finally {
      this.isLoading.set(false);
      this.isRefreshing.set(false);
    }
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
    const actionKey = machine.machineId ?? machine.id;
    this.actionInProgress.set(actionKey);
    this.errorMessage.set(null);

    try {
      const callable = httpsCallable<MachineActionInput, MachineActionResponse>(
        this.functions,
        functionName,
      );
      const response = await callable({
        machineId: machine.machineId ?? machine.id,
        provider: machine.provider,
        environment: machine.environment,
        subscriptionId: machine.subscriptionId ?? '',
        resourceGroup: machine.resourceGroup ?? '',
      });

      this.machines.update((machines) =>
        machines.map((entry) => {
          const id = entry.machineId ?? entry.id;
          if (id !== actionKey) return entry;
          return {
            ...entry,
            status: response.data.status,
            updatedAt: new Date(),
            updatedBy: this.authService.currentUser()?.email ?? undefined,
          };
        }),
      );
    } catch (error) {
      this.errorMessage.set(this.toFriendlyError(error));
      throw error;
    } finally {
      this.actionInProgress.set(null);
    }
  }

  private mapMachine(data: Record<string, unknown>): Machine {
    const id = typeof data['id'] === 'string' ? data['id'] : '';
    return {
      id,
      machineId: typeof data['machineId'] === 'string' ? data['machineId'] : id,
      name: typeof data['name'] === 'string' ? data['name'] : undefined,
      provider: (data['provider'] as Provider) ?? 'azure',
      environment: typeof data['environment'] === 'string' ? data['environment'] : 'DEV',
      status: (data['status'] as MachineStatus) ?? 'stopped',
      region: typeof data['region'] === 'string' ? data['region'] : undefined,
      instanceType: typeof data['instanceType'] === 'string' ? data['instanceType'] : undefined,
      subscriptionId: typeof data['subscriptionId'] === 'string' ? data['subscriptionId'] : undefined,
      resourceGroup: typeof data['resourceGroup'] === 'string' ? data['resourceGroup'] : undefined,
      azureResourceId: typeof data['azureResourceId'] === 'string' ? data['azureResourceId'] : undefined,
      updatedAt: new Date(),
    };
  }

  private machineSortKey(machine: Machine): string {
    return machine.name ?? machine.machineId ?? machine.id;
  }

  private toListError(error: unknown): string {
    if (error instanceof Error) {
      if (error.message.includes('permission-denied')) {
        return 'No tienes permisos para consultar el inventario.';
      }
      if (error.message.includes('unauthenticated')) {
        return 'Debes iniciar sesion para consultar el inventario.';
      }
      return `No se pudo cargar el inventario. ${error.message}`;
    }
    return 'No se pudo cargar el inventario.';
  }

  private toFriendlyError(error: unknown): string {
    if (error instanceof Error) {
      if (error.message.includes('permission-denied')) {
        return 'No tienes permisos para realizar esta accion.';
      }
      if (error.message.includes('unimplemented')) {
        return 'Esta accion aun no esta disponible para ese proveedor.';
      }
      return `No se pudo completar la accion. ${error.message}`;
    }
    return 'No se pudo completar la accion.';
  }
}
