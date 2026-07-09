import { Component, computed, effect, inject, input, output, signal } from '@angular/core';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';

import { Machine, isTransitioning, providerLabel } from '../../../../core/models/machine.model';
import { LocaleService } from '../../../../core/services/locale.service';
import { MachineActivityService } from '../../../../core/services/machine-activity.service';
import { EnvChip } from '../../../../shared/ui/env-chip/env-chip';
import { ProviderGlyph } from '../../../../shared/ui/provider-glyph/provider-glyph';
import { StatusBadge } from '../../../../shared/ui/status-badge/status-badge';

const ACTIVITY_PREVIEW_COUNT = 3;

@Component({
  selector: 'app-machine-detail-drawer',
  imports: [EnvChip, ProviderGlyph, StatusBadge, TranslocoPipe],
  templateUrl: './machine-detail-drawer.html',
  styleUrl: './machine-detail-drawer.scss',
})
export class MachineDetailDrawer {
  private readonly transloco = inject(TranslocoService);
  private readonly activityService = inject(MachineActivityService);
  protected readonly localeService = inject(LocaleService);

  readonly machine = input<Machine | null>(null);
  readonly open = input(false);
  readonly canOperate = input(false);
  readonly actionDisabled = input(false);
  readonly closed = output<void>();
  readonly startRequested = output<Machine>();
  readonly stopRequested = output<Machine>();

  protected readonly logsExpanded = signal(false);
  protected readonly providerLabel = providerLabel;
  protected readonly isTransitioning = isTransitioning;

  private readonly activityLogs = computed(() => {
    this.activityService.revision();
    const machine = this.machine();
    if (!machine) {
      return [];
    }
    return this.activityService.getActivity(machine);
  });

  protected readonly visibleLogs = computed(() => {
    const logs = this.activityLogs();
    if (this.logsExpanded()) {
      return logs;
    }
    return logs.slice(0, ACTIVITY_PREVIEW_COUNT);
  });

  protected readonly hiddenLogCount = computed(() =>
    Math.max(0, this.activityLogs().length - ACTIVITY_PREVIEW_COUNT),
  );

  protected readonly hasMoreLogs = computed(() => this.hiddenLogCount() > 0);

  protected readonly activityLoading = computed(() => {
    const machine = this.machine();
    return machine ? this.activityService.isLoading(machine) : false;
  });

  protected readonly activityError = computed(() => {
    const machine = this.machine();
    return machine ? this.activityService.getError(machine) : null;
  });

  constructor() {
    effect(() => {
      if (!this.open()) {
        this.logsExpanded.set(false);
        return;
      }

      const machine = this.machine();
      if (machine) {
        void this.activityService.loadActivity(machine);
      }
    });
  }

  protected machineId(machine: Machine): string {
    return machine.machineId ?? machine.id;
  }

  protected machineName(machine: Machine): string {
    return machine.name ?? this.machineId(machine);
  }

  protected toggleLogs(): void {
    this.logsExpanded.update((expanded) => !expanded);
  }

  protected formatLogTime(timestamp: Date): string {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfLogDay = new Date(timestamp.getFullYear(), timestamp.getMonth(), timestamp.getDate());
    const dayDiff = Math.round((startOfToday.getTime() - startOfLogDay.getTime()) / 86_400_000);

    if (dayDiff === 0) {
      return this.formatUtcTime(timestamp);
    }

    if (dayDiff === 1) {
      return this.transloco.translate('dashboard.yesterday');
    }

    return new Intl.DateTimeFormat(this.localeService.activeLang(), {
      day: '2-digit',
      month: 'short',
    }).format(timestamp);
  }

  protected onClose(): void {
    this.closed.emit();
  }

  protected onStart(machine: Machine, event: Event): void {
    event.stopPropagation();
    this.startRequested.emit(machine);
  }

  protected onStop(machine: Machine, event: Event): void {
    event.stopPropagation();
    this.stopRequested.emit(machine);
  }

  private formatUtcTime(timestamp: Date): string {
    const hours = timestamp.getUTCHours().toString().padStart(2, '0');
    const minutes = timestamp.getUTCMinutes().toString().padStart(2, '0');
    const seconds = timestamp.getUTCSeconds().toString().padStart(2, '0');
    return `${hours}:${minutes}:${seconds}Z`;
  }
}
