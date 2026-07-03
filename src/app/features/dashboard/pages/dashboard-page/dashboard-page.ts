import { Component, computed, inject, signal } from '@angular/core';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';

import {
  Machine,
  Provider,
  PROVIDERS,
  isTransitioning,
  providerLabel,
} from '../../../../core/models/machine.model';
import { LocaleService } from '../../../../core/services/locale.service';
import { SessionService } from '../../../../core/services/session.service';
import { MachinesService } from '../../../../core/services/machines.service';
import { MachineDetailDrawer } from '../../components/machine-detail-drawer/machine-detail-drawer';
import { ConfirmDialog } from '../../../../shared/ui/confirm-dialog/confirm-dialog';
import { EnvChip } from '../../../../shared/ui/env-chip/env-chip';
import { ProviderGlyph } from '../../../../shared/ui/provider-glyph/provider-glyph';
import { Select, SelectOption } from '../../../../shared/ui/select/select';
import { StatusBadge } from '../../../../shared/ui/status-badge/status-badge';

interface PendingAction {
  machine: Machine;
  action: 'start' | 'stop';
}

interface MachineGroup {
  key: string;
  provider: Provider | null;
  label: string;
  machines: Machine[];
}

@Component({
  selector: 'app-dashboard-page',
  imports: [
    ConfirmDialog,
    EnvChip,
    MachineDetailDrawer,
    ProviderGlyph,
    Select,
    StatusBadge,
    TranslocoPipe,
  ],
  templateUrl: './dashboard-page.html',
  styleUrl: './dashboard-page.scss',
})
export class DashboardPage {
  private readonly transloco = inject(TranslocoService);
  protected readonly localeService = inject(LocaleService);

  protected readonly machinesService = inject(MachinesService);
  protected readonly sessionService = inject(SessionService);
  protected readonly providerLabel = providerLabel;

  readonly filterProvider = signal('all');
  readonly filterEnvironment = signal('all');
  readonly filterStatus = signal('all');
  readonly searchQuery = signal('');
  readonly groupBy = signal<'provider' | 'none'>('provider');
  readonly pendingAction = signal<PendingAction | null>(null);
  readonly confirmOpen = signal(false);
  readonly confirmLoading = signal(false);
  readonly filtersOpen = signal(false);
  readonly selectedMachine = signal<Machine | null>(null);

  readonly providerPills = [
    { value: 'all', labelKey: 'dashboard.all' },
    { value: 'aws', label: 'AWS' },
    { value: 'azure', label: 'Azure' },
    { value: 'gcp', label: 'GCP' },
    { value: 'oci', label: 'OCI' },
  ] as const;

  readonly environmentOptions = computed<SelectOption[]>(() => {
    this.localeService.activeLang();
    return [
      { value: 'all', labelKey: 'dashboard.allEnvironments' },
      { value: 'DEV', label: 'DEV' },
      { value: 'STG', label: 'STG' },
      { value: 'PROD', label: 'PROD' },
    ];
  });

  readonly statusOptions = computed<SelectOption[]>(() => {
    this.localeService.activeLang();
    return [
      { value: 'all', labelKey: 'dashboard.allStatuses' },
      { value: 'running', labelKey: 'dashboard.running' },
      { value: 'stopped', labelKey: 'dashboard.stopped' },
      { value: 'starting', label: 'Starting' },
      { value: 'stopping', label: 'Stopping' },
      { value: 'error', labelKey: 'dashboard.error' },
    ];
  });

  readonly groupOptions = computed<SelectOption[]>(() => {
    this.localeService.activeLang();
    return [
      { value: 'provider', labelKey: 'dashboard.groupProvider' },
      { value: 'none', labelKey: 'dashboard.groupNone' },
    ];
  });

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

  readonly groupedMachines = computed<MachineGroup[]>(() => {
    const machines = this.filteredMachines();
    if (this.groupBy() === 'none') {
      return [
        {
          key: 'all',
          provider: null,
          label: '',
          machines,
        },
      ];
    }

    const order = [...PROVIDERS];
    const groups = new Map<Provider, Machine[]>();
    for (const machine of machines) {
      const list = groups.get(machine.provider) ?? [];
      list.push(machine);
      groups.set(machine.provider, list);
    }

    return order
      .filter((provider) => groups.has(provider))
      .map((provider) => ({
        key: provider,
        provider,
        label: providerLabel(provider),
        machines: groups.get(provider) ?? [],
      }));
  });

  readonly totalCount = computed(() => this.machinesService.machines().length);
  readonly filteredCount = computed(() => this.filteredMachines().length);

  protected isTransitioning = isTransitioning;

  protected machineId(machine: Machine): string {
    return machine.machineId ?? machine.id;
  }

  protected machineMeta(machine: Machine): string {
    const parts = [this.machineId(machine), machine.region].filter(Boolean);
    return parts.join(' · ');
  }

  protected isActionDisabled(machine: Machine): boolean {
    const id = this.machineId(machine);
    return (
      this.machinesService.actionInProgress() === id || isTransitioning(machine.status)
    );
  }

  protected toggleFilters(): void {
    this.filtersOpen.update((open) => !open);
  }

  protected onSearchInput(event: Event): void {
    this.searchQuery.set((event.target as HTMLInputElement).value);
  }

  protected onGroupChange(value: string): void {
    this.groupBy.set(value === 'none' ? 'none' : 'provider');
  }

  protected toggleLanguage(): void {
    this.localeService.toggleLanguage();
  }

  protected refresh(): void {
    this.machinesService.refresh();
  }

  protected openDetail(machine: Machine): void {
    this.selectedMachine.set(machine);
  }

  protected closeDetail(): void {
    this.selectedMachine.set(null);
  }

  protected isSelected(machine: Machine): boolean {
    const selected = this.selectedMachine();
    if (!selected) return false;
    return this.machineId(selected) === this.machineId(machine);
  }

  protected selectedMachineSnapshot(): Machine | null {
    const selectedId = this.selectedMachine()?.id;
    if (!selectedId) return null;
    return this.machinesService.machines().find((machine) => machine.id === selectedId) ?? this.selectedMachine();
  }

  protected requestStart(machine: Machine, event?: Event): void {
    event?.stopPropagation();
    this.openConfirm({ machine, action: 'start' });
  }

  protected requestStop(machine: Machine, event?: Event): void {
    event?.stopPropagation();
    this.openConfirm({ machine, action: 'stop' });
  }

  private openConfirm(action: PendingAction): void {
    this.pendingAction.set(action);
    this.confirmOpen.set(true);
  }

  protected confirmTitle(): string {
    const pending = this.pendingAction();
    if (!pending) return this.transloco.translate('confirm.confirm');
    if (this.isProdConfirm()) {
      return this.transloco.translate('confirm.prodTitle');
    }
    return pending.action === 'start'
      ? this.transloco.translate('confirm.confirmStart')
      : this.transloco.translate('confirm.confirmStop');
  }

  protected confirmMessage(): string {
    const pending = this.pendingAction();
    if (!pending) return '';

    const machine = pending.machine;
    const name = this.confirmationTarget(machine);
    const id = this.machineId(machine);
    const params = { name, id, env: machine.environment };

    if (this.isProdConfirm()) {
      return pending.action === 'start'
        ? this.transloco.translate('confirm.prodMessageStart', params)
        : this.transloco.translate('confirm.prodMessageStop', params);
    }

    return pending.action === 'start'
      ? this.transloco.translate('confirm.messageStart', { id, env: machine.environment })
      : this.transloco.translate('confirm.messageStop', { id, env: machine.environment });
  }

  protected confirmationTarget(machine?: Machine): string {
    const target = machine ?? this.pendingAction()?.machine;
    if (!target) return '';
    return target.name ?? this.machineId(target);
  }

  protected confirmAction(): 'start' | 'stop' | null {
    return this.pendingAction()?.action ?? null;
  }

  protected isProdConfirm(): boolean {
    return this.pendingAction()?.machine.environment.toUpperCase() === 'PROD';
  }

  protected confirmLabel(): string {
    const pending = this.pendingAction();
    if (!pending) return this.transloco.translate('confirm.confirm');
    if (this.isProdConfirm()) {
      return pending.action === 'start'
        ? this.transloco.translate('confirm.prodConfirmStart')
        : this.transloco.translate('confirm.prodConfirmStop');
    }
    return pending.action === 'start'
      ? this.transloco.translate('dashboard.start')
      : this.transloco.translate('dashboard.stop');
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
