import { Component, computed, inject, signal } from '@angular/core';

import { Machine, isTransitioning } from '../../../../core/models/machine.model';
import { SessionService } from '../../../../core/services/session.service';
import { MachinesService } from '../../../../core/services/machines.service';
import { Button } from '../../../../shared/ui/button/button';
import { ConfirmDialog } from '../../../../shared/ui/confirm-dialog/confirm-dialog';
import { EnvChip } from '../../../../shared/ui/env-chip/env-chip';
import { Input } from '../../../../shared/ui/input/input';
import { MetricCard } from '../../../../shared/ui/metric-card/metric-card';
import { ProviderGlyph } from '../../../../shared/ui/provider-glyph/provider-glyph';
import { Select, SelectOption } from '../../../../shared/ui/select/select';
import { StatusBadge } from '../../../../shared/ui/status-badge/status-badge';

interface PendingAction {
  machine: Machine;
  action: 'start' | 'stop';
}

@Component({
  selector: 'app-dashboard-page',
  imports: [
    Button,
    ConfirmDialog,
    EnvChip,
    Input,
    MetricCard,
    ProviderGlyph,
    Select,
    StatusBadge,
  ],
  templateUrl: './dashboard-page.html',
  styleUrl: './dashboard-page.scss',
})
export class DashboardPage {
  protected readonly machinesService = inject(MachinesService);
  protected readonly sessionService = inject(SessionService);

  readonly filterProvider = signal('all');
  readonly filterEnvironment = signal('all');
  readonly filterStatus = signal('all');
  readonly searchQuery = signal('');
  readonly pendingAction = signal<PendingAction | null>(null);
  readonly confirmOpen = signal(false);
  readonly confirmLoading = signal(false);

  readonly providerOptions: SelectOption[] = [
    { value: 'all', label: 'Todos' },
    { value: 'aws', label: 'AWS' },
    { value: 'azure', label: 'Azure' },
    { value: 'gcp', label: 'GCP' },
    { value: 'oci', label: 'OCI' },
  ];

  readonly environmentOptions: SelectOption[] = [
    { value: 'all', label: 'Todos' },
    { value: 'DEV', label: 'DEV' },
    { value: 'STG', label: 'STG' },
    { value: 'PROD', label: 'PROD' },
  ];

  readonly statusOptions: SelectOption[] = [
    { value: 'all', label: 'Todos' },
    { value: 'running', label: 'Running' },
    { value: 'stopped', label: 'Stopped' },
    { value: 'starting', label: 'Starting' },
    { value: 'stopping', label: 'Stopping' },
    { value: 'error', label: 'Error' },
  ];

  readonly filteredMachines = computed(() => {
    const provider = this.filterProvider();
    const environment = this.filterEnvironment();
    const status = this.filterStatus();
    const query = this.searchQuery().toLowerCase().trim();

    return this.machinesService.machines().filter((machine) => {
      if (provider !== 'all' && machine.provider !== provider) return false;
      if (environment !== 'all' && machine.environment.toUpperCase() !== environment) return false;
      if (status !== 'all' && machine.status !== status) return false;
      if (query) {
        const haystack = [
          machine.name,
          machine.machineId,
          machine.id,
          machine.region,
          machine.ipAddress,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        if (!haystack.includes(query)) return false;
      }
      return true;
    });
  });

  readonly metrics = computed(() => {
    const machines = this.machinesService.machines();
    return {
      running: machines.filter((m) => m.status === 'running').length,
      stopped: machines.filter((m) => m.status === 'stopped').length,
      error: machines.filter((m) => m.status === 'error').length,
      total: machines.length,
    };
  });

  protected isTransitioning = isTransitioning;

  protected machineId(machine: Machine): string {
    return machine.machineId ?? machine.id;
  }

  protected isActionDisabled(machine: Machine): boolean {
    const id = this.machineId(machine);
    return (
      this.machinesService.actionInProgress() === id || isTransitioning(machine.status)
    );
  }

  protected requestStart(machine: Machine): void {
    this.openConfirm({ machine, action: 'start' });
  }

  protected requestStop(machine: Machine): void {
    this.openConfirm({ machine, action: 'stop' });
  }

  private openConfirm(action: PendingAction): void {
    this.pendingAction.set(action);
    this.confirmOpen.set(true);
  }

  protected confirmTitle(): string {
    const pending = this.pendingAction();
    if (!pending) return 'Confirmar accion';
    const verb = pending.action === 'start' ? 'arrancar' : 'apagar';
    return `Confirmar ${verb}`;
  }

  protected confirmMessage(): string {
    const pending = this.pendingAction();
    if (!pending) return '';
    const verb = pending.action === 'start' ? 'arrancar' : 'apagar';
    const id = this.machineId(pending.machine);
    return `Vas a ${verb} la maquina ${id} en entorno ${pending.machine.environment}.`;
  }

  protected isProdConfirm(): boolean {
    return this.pendingAction()?.machine.environment.toUpperCase() === 'PROD';
  }

  protected confirmLabel(): string {
    const pending = this.pendingAction();
    if (!pending) return 'Confirmar';
    return pending.action === 'start' ? 'Arrancar' : 'Apagar';
  }

  protected async onConfirm(): Promise<void> {
    const pending = this.pendingAction();
    if (!pending) return;

    this.confirmLoading.set(true);
    try {
      if (pending.action === 'start') {
        await this.machinesService.startMachine(pending.machine);
      } else {
        await this.machinesService.stopMachine(pending.machine);
      }
      this.closeConfirm();
    } catch {
      // Error handled by service
    } finally {
      this.confirmLoading.set(false);
    }
  }

  protected closeConfirm(): void {
    this.confirmOpen.set(false);
    this.pendingAction.set(null);
  }
}
