import { Component, computed, effect, input, output, signal } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';

import { Button } from '../button/button';
import { EnvChip } from '../env-chip/env-chip';

@Component({
  selector: 'app-confirm-dialog',
  imports: [Button, EnvChip, TranslocoPipe],
  templateUrl: './confirm-dialog.html',
  styleUrl: './confirm-dialog.scss',
})
export class ConfirmDialog {
  readonly open = input(false);
  readonly title = input('Confirmar accion');
  readonly message = input('');
  readonly confirmLabel = input('Confirmar');
  readonly danger = input(false);
  readonly production = input(false);
  readonly action = input<'start' | 'stop' | null>(null);
  readonly confirmationTarget = input('');
  readonly loading = input(false);
  readonly confirmed = output<void>();
  readonly cancelled = output<void>();

  protected readonly confirmationInput = signal('');

  protected readonly canConfirm = computed(() => {
    if (this.loading()) {
      return false;
    }

    if (!this.production()) {
      return true;
    }

    const target = this.confirmationTarget().trim();
    return target.length > 0 && this.confirmationInput().trim() === target;
  });

  constructor() {
    effect(() => {
      if (this.open()) {
        this.confirmationInput.set('');
      }
    });
  }

  protected onConfirmationInput(event: Event): void {
    this.confirmationInput.set((event.target as HTMLInputElement).value);
  }
}
