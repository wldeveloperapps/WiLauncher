import { effect, inject, Injectable, signal } from '@angular/core';
import { Functions, httpsCallable } from '@angular/fire/functions';

import { Machine, MachineStatus, Provider } from '../models/machine.model';
import { AuthService } from './auth.service';
import { MachineActivityService } from './machine-activity.service';

interface MachineActionInput {
  machineId: string;
  provider: Provider;
  environment: string;
  subscriptionId: string;
  resourceGroup: string;
  region: string;
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
  providerErrors?: Array<{ provider: Provider; message: string }>;
}

@Injectable({
  providedIn: 'root',
})
export class MachinesService {
  private readonly functions = inject(Functions);
  private readonly authService = inject(AuthService);
  private readonly activityService = inject(MachineActivityService);

  readonly machines = signal<Machine[]>([]);
  readonly isLoading = signal(true);
  readonly isRefreshing = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly warningMessage = signal<string | null>(null);
  readonly actionInProgress = signal<string | null>(null);
  readonly lastSyncedAt = signal<string | null>(null);

  constructor() {
    effect(() => {
      const user = this.authService.currentUser();
      if (user) {
        void this.loadMachines();
      } else {
        this.machines.set([]);
        this.lastSyncedAt.set(null);
        this.errorMessage.set(null);
        this.warningMessage.set(null);
        this.isLoading.set(false);
      }
    });
  }

  async refresh(): Promise<void> {
    if (!this.authService.isAuthenticated()) {
      return;
    }

    await this.loadMachines({ refresh: true });
  }

  async startMachine(machine: Machine): Promise<void> {
    await this.executeAction(machine, 'startMachine');
  }

  async stopMachine(machine: Machine): Promise<void> {
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
    this.warningMessage.set(null);

    try {
      const callable = httpsCallable<void, ListMachinesResponse>(this.functions, 'listMachines');
      const result = await callable();
      const machines = result.data.machines
        .map((machine) => this.mapMachine(machine))
        .sort((a, b) => this.machineSortKey(a).localeCompare(this.machineSortKey(b)));

      this.machines.set(machines);
      this.lastSyncedAt.set(result.data.syncedAt);
      this.applyProviderFeedback(machines.length, result.data.providerErrors);
    } catch (error) {
      this.errorMessage.set(this.toListError(error));
    } finally {
      this.isLoading.set(false);
      this.isRefreshing.set(false);
    }
  }

  private async executeAction(
    machine: Machine,
    functionName: 'startMachine' | 'stopMachine',
  ): Promise<void> {
    const actionKey = machine.machineId ?? machine.id;
    this.actionInProgress.set(actionKey);
    this.errorMessage.set(null);
    this.warningMessage.set(null);

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
        region: machine.region ?? '',
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

      window.setTimeout(() => {
        void this.loadMachines({ refresh: true });
        void this.activityService.loadActivity(machine, { force: true });
      }, 4000);
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
      ipAddress: typeof data['ipAddress'] === 'string' ? data['ipAddress'] : undefined,
      instanceType: typeof data['instanceType'] === 'string' ? data['instanceType'] : undefined,
      subscriptionId: typeof data['subscriptionId'] === 'string' ? data['subscriptionId'] : undefined,
      resourceGroup: typeof data['resourceGroup'] === 'string' ? data['resourceGroup'] : undefined,
      azureResourceId: typeof data['azureResourceId'] === 'string' ? data['azureResourceId'] : undefined,
      awsResourceId: typeof data['awsResourceId'] === 'string' ? data['awsResourceId'] : undefined,
      updatedAt: new Date(),
    };
  }

  private machineSortKey(machine: Machine): string {
    return machine.name ?? machine.machineId ?? machine.id;
  }

  private applyProviderFeedback(
    machineCount: number,
    providerErrors: ListMachinesResponse['providerErrors'],
  ): void {
    if (!providerErrors?.length) {
      this.errorMessage.set(null);
      this.warningMessage.set(null);
      return;
    }

    const message = providerErrors
      .map((entry) => `${entry.provider.toUpperCase()}: ${entry.message}`)
      .join(' ');

    if (machineCount > 0) {
      this.warningMessage.set(message);
      this.errorMessage.set(null);
      return;
    }

    this.errorMessage.set(message);
    this.warningMessage.set(null);
  }

  private toListError(error: unknown): string {
    if (error instanceof Error) {
      if (error.message.includes('permission-denied')) {
        if (error.message.includes('AWS') || error.message.includes('ec2:')) {
          return error.message.replace(/^.*permission-denied[:\s]*/i, '').trim() ||
            'Las credenciales AWS no tienen permiso para listar instancias EC2.';
        }
        return 'No tienes permisos para consultar el inventario.';
      }
      if (error.message.includes('failed-precondition')) {
        return error.message.replace(/^.*failed-precondition[:\s]*/i, '').trim() ||
          'La configuracion de AWS no es valida.';
      }
      if (error.message.includes('unauthenticated')) {
        return 'Debes iniciar sesion para consultar el inventario.';
      }
      if (error.message.includes('INTERNAL')) {
        return 'No se pudo cargar el inventario. Revisa la configuracion del proveedor cloud.';
      }
      return `No se pudo cargar el inventario. ${error.message}`;
    }
    return 'No se pudo cargar el inventario.';
  }

  private toFriendlyError(error: unknown): string {
    if (error instanceof Error) {
      if (error.message.includes('permission-denied')) {
        return 'No tienes permisos de operador para arrancar o apagar maquinas.';
      }
      if (error.message.includes('unimplemented')) {
        return 'Esta accion aun no esta disponible para ese proveedor.';
      }
      return `No se pudo completar la accion. ${error.message}`;
    }
    return 'No se pudo completar la accion.';
  }
}
