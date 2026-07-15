import { inject, Injectable, signal } from '@angular/core';
import { Functions, httpsCallable } from '@angular/fire/functions';

import { Machine, Provider } from '../models/machine.model';
import { MachineActivityLog } from '../models/machine-activity.model';

interface MachineActivityInput {
  machineId: string;
  provider: Provider;
  subscriptionId: string;
  resourceGroup: string;
  region: string;
  azureResourceId?: string;
}

interface MachineActivityResponse {
  logs: Array<{
    id: string;
    action: string;
    actor: string;
    timestamp: string;
    status: string;
    operation: string;
  }>;
}

@Injectable({
  providedIn: 'root',
})
export class MachineActivityService {
  private readonly functions = inject(Functions);

  readonly revision = signal(0);

  private readonly cache = signal<Record<string, MachineActivityLog[]>>({});
  private readonly loadingKeys = signal<Record<string, boolean>>({});
  private readonly errorByKey = signal<Record<string, string | null>>({});
  private readonly loadedKeys = signal<Record<string, true>>({});

  getActivity(machine: Machine): MachineActivityLog[] {
    this.revision();
    return this.cache()[this.machineKey(machine)] ?? [];
  }

  isLoading(machine: Machine): boolean {
    return Boolean(this.loadingKeys()[this.machineKey(machine)]);
  }

  isLoaded(machine: Machine): boolean {
    return Boolean(this.loadedKeys()[this.machineKey(machine)]);
  }

  getError(machine: Machine): string | null {
    return this.errorByKey()[this.machineKey(machine)] ?? null;
  }

  async loadActivity(machine: Machine, options: { force?: boolean } = {}): Promise<void> {
    const key = this.machineKey(machine);
    if (!options.force && this.loadedKeys()[key]) {
      return;
    }
    if (this.loadingKeys()[key] && !options.force) {
      return;
    }

    this.loadingKeys.update((current) => ({ ...current, [key]: true }));
    this.errorByKey.update((current) => ({ ...current, [key]: null }));

    try {
      const callable = httpsCallable<MachineActivityInput, MachineActivityResponse>(
        this.functions,
        'listMachineActivity',
      );
      const result = await callable({
        machineId: machine.machineId ?? machine.id,
        provider: machine.provider,
        subscriptionId: machine.subscriptionId ?? '',
        resourceGroup: machine.resourceGroup ?? '',
        region: machine.region ?? '',
        azureResourceId: machine.azureResourceId,
      });

      const logs = result.data.logs.map((log) => ({
        id: log.id,
        action: log.action,
        actor: log.actor,
        timestamp: new Date(log.timestamp),
        machineId: key,
        provider: machine.provider,
        environment: machine.environment,
      }));

      this.cache.update((current) => ({ ...current, [key]: logs }));
      this.revision.update((value) => value + 1);
    } catch (error) {
      this.errorByKey.update((current) => ({
        ...current,
        [key]: this.toFriendlyError(error, machine.provider),
      }));
    } finally {
      this.loadedKeys.update((current) => ({ ...current, [key]: true }));
      this.loadingKeys.update((current) => ({ ...current, [key]: false }));
    }
  }

  clear(): void {
    this.cache.set({});
    this.loadingKeys.set({});
    this.errorByKey.set({});
    this.loadedKeys.set({});
    this.revision.update((value) => value + 1);
  }

  private machineKey(machine: Machine): string {
    return `${machine.provider}:${machine.machineId ?? machine.id}`;
  }

  private toFriendlyError(error: unknown, provider: Provider): string {
    if (error instanceof Error) {
      if (error.message.includes('unimplemented')) {
        return `La actividad para ${provider.toUpperCase()} aun no esta disponible.`;
      }
      return `No se pudo cargar la actividad. ${error.message}`;
    }
    return 'No se pudo cargar la actividad.';
  }
}
