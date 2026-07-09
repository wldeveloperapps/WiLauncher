import { inject, Injectable, signal } from '@angular/core';
import { Functions, httpsCallable } from '@angular/fire/functions';

import { getMockMachineActivity } from '../data/mock-machine-activity';
import { Machine } from '../models/machine.model';
import { MachineActivityLog } from '../models/machine-activity.model';
import { environment } from '../../../environments/environment';

interface MachineActivityInput {
  machineId: string;
  provider: Machine['provider'];
  subscriptionId: string;
  resourceGroup: string;
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

  getActivity(machine: Machine): MachineActivityLog[] {
    if (environment.useMockMachines) {
      return this.getMockActivity(machine);
    }

    this.revision();
    return this.cache()[this.machineKey(machine)] ?? [];
  }

  isLoading(machine: Machine): boolean {
    return Boolean(this.loadingKeys()[this.machineKey(machine)]);
  }

  getError(machine: Machine): string | null {
    return this.errorByKey()[this.machineKey(machine)] ?? null;
  }

  async loadActivity(machine: Machine, options: { force?: boolean } = {}): Promise<void> {
    if (environment.useMockMachines) {
      return;
    }

    const key = this.machineKey(machine);
    if (!options.force && key in this.cache()) {
      return;
    }
    if (this.loadingKeys()[key]) {
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
        [key]: this.toFriendlyError(error),
      }));
    } finally {
      this.loadingKeys.update((current) => ({ ...current, [key]: false }));
    }
  }

  clear(): void {
    this.cache.set({});
    this.loadingKeys.set({});
    this.errorByKey.set({});
    this.revision.update((value) => value + 1);
  }

  private getMockActivity(machine: Machine): MachineActivityLog[] {
    const keys = [machine.machineId, machine.id].filter(Boolean) as string[];
    for (const key of keys) {
      const logs = getMockMachineActivity(key);
      if (logs.length > 0) {
        return logs;
      }
    }

    return getMockMachineActivity(machine.id);
  }

  private machineKey(machine: Machine): string {
    return machine.machineId ?? machine.id;
  }

  private toFriendlyError(error: unknown): string {
    if (error instanceof Error) {
      return `No se pudo cargar la actividad de Azure. ${error.message}`;
    }
    return 'No se pudo cargar la actividad de Azure.';
  }
}
