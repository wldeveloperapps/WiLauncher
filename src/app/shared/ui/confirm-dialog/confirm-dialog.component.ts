import { Component, computed, effect, input, output, signal } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';

import { ButtonComponent } from '../button/button.component';
import { EnvChipComponent } from '../env-chip/env-chip.component';

@Component({
  selector: 'app-confirm-dialog',
  imports: [ButtonComponent, EnvChipComponent, TranslocoPipe],
  templateUrl: './confirm-dialog.component.html',
  styleUrl: './confirm-dialog.component.scss',
})
export class ConfirmDialogComponent {
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
