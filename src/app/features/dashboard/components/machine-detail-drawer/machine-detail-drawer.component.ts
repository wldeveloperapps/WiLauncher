import { Component, computed, effect, inject, input, output } from '@angular/core';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';

import { Machine, isTransitioning, providerLabel } from '../../../../core/models/machine.model';
import { LocaleService } from '../../../../core/services/locale.service';
import { MachineActivityService } from '../../../../core/services/machine-activity.service';
import { EnvChipComponent } from '../../../../shared/ui/env-chip/env-chip.component';
import { ProviderGlyphComponent } from '../../../../shared/ui/provider-glyph/provider-glyph.component';
import { StatusBadgeComponent } from '../../../../shared/ui/status-badge/status-badge.component';

@Component({
  selector: 'app-machine-detail-drawer',
  imports: [EnvChipComponent, ProviderGlyphComponent, StatusBadgeComponent, TranslocoPipe],
  templateUrl: './machine-detail-drawer.component.html',
  styleUrl: './machine-detail-drawer.component.scss',
})
export class MachineDetailDrawerComponent {
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

  protected readonly providerLabel = providerLabel;
  protected readonly isTransitioning = isTransitioning;

  protected readonly activityLogs = computed(() => {
    this.activityService.revision();
    const machine = this.machine();
    if (!machine) {
      return [];
    }
    return this.activityService.getActivity(machine);
  });

  protected readonly activityLoading = computed(() => {
    const machine = this.machine();
    return machine ? this.activityService.isLoading(machine) : false;
  });

  protected readonly activityLoaded = computed(() => {
    const machine = this.machine();
    return machine ? this.activityService.isLoaded(machine) : false;
  });

  protected readonly activityError = computed(() => {
    const machine = this.machine();
    return machine ? this.activityService.getError(machine) : null;
  });

  constructor() {
    effect(() => {
      if (!this.open()) {
        return;
      }

      const machine = this.machine();
      if (!machine) {
        return;
      }

      const machineKey = `${machine.provider}:${machine.machineId ?? machine.id}`;
      void machineKey;
      void this.activityService.loadActivity(machine);
    });
  }

  protected machineId(machine: Machine): string {
    return machine.machineId ?? machine.id;
  }

  protected machineName(machine: Machine): string {
    return machine.name ?? this.machineId(machine);
  }

  protected showMachineId(machine: Machine): boolean {
    return this.machineName(machine) !== this.machineId(machine);
  }

  protected formatLogTime(timestamp: Date): string {
    const time = this.formatTime(timestamp);
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfLogDay = new Date(timestamp.getFullYear(), timestamp.getMonth(), timestamp.getDate());
    const dayDiff = Math.round((startOfToday.getTime() - startOfLogDay.getTime()) / 86_400_000);

    if (dayDiff === 0) {
      return time;
    }

    if (dayDiff === 1) {
      return `${this.transloco.translate('dashboard.yesterday')} ${time}`;
    }

    const date = new Intl.DateTimeFormat(this.localeService.activeLang(), {
      day: '2-digit',
      month: 'short',
    }).format(timestamp);

    return `${date} ${time}`;
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

  protected refreshActivity(): void {
    const machine = this.machine();
    if (!machine || this.activityLoading()) {
      return;
    }

    void this.activityService.loadActivity(machine, { force: true });
  }

  private formatTime(timestamp: Date): string {
    const hours = timestamp.getHours().toString().padStart(2, '0');
    const minutes = timestamp.getMinutes().toString().padStart(2, '0');
    const seconds = timestamp.getSeconds().toString().padStart(2, '0');
    return `${hours}:${minutes}:${seconds}`;
  }
}
