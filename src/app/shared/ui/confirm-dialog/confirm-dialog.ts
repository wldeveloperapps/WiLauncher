import { Component, input, output } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';

import { Button } from '../button/button';

@Component({
  selector: 'app-confirm-dialog',
  imports: [Button, TranslocoPipe],
  template: `
    @if (open()) {
      <div class="dialog-backdrop" (click)="cancelled.emit()" (keydown.escape)="cancelled.emit()">
        <div
          class="dialog"
          [class.dialog--danger]="danger()"
          role="dialog"
          aria-modal="true"
          (click)="$event.stopPropagation()"
        >
          <h2 class="dialog__title font-mono">{{ title() }}</h2>
          <p class="dialog__message">{{ message() }}</p>
          <div class="dialog__actions">
            <app-button variant="outline" (clicked)="cancelled.emit()">{{ 'confirm.cancel' | transloco }}</app-button>
            <app-button
              [variant]="danger() ? 'danger' : 'primary'"
              [loading]="loading()"
              (clicked)="confirmed.emit()"
            >
              {{ confirmLabel() }}
            </app-button>
          </div>
        </div>
      </div>
    }
  `,
  styles: `
    .dialog-backdrop {
      align-items: center;
      background: rgba(0, 0, 0, 0.6);
      display: flex;
      inset: 0;
      justify-content: center;
      padding: var(--space-2);
      position: fixed;
      z-index: 1000;
    }

    .dialog {
      background: var(--surface-card);
      border: 1px solid var(--border-default);
      border-radius: var(--radius-md);
      box-shadow: var(--shadow-md);
      max-width: 480px;
      padding: var(--space-3);
      width: 100%;
    }

    .dialog--danger {
      border-color: var(--color-error);
    }

    .dialog__title {
      font-size: 20px;
      margin: 0 0 var(--space-1);
    }

    .dialog__message {
      color: var(--text-secondary);
      margin: 0 0 var(--space-3);
    }

    .dialog__actions {
      display: flex;
      gap: var(--space-1);
      justify-content: flex-end;
    }
  `,
})
export class ConfirmDialog {
  readonly open = input(false);
  readonly title = input('Confirmar accion');
  readonly message = input('');
  readonly confirmLabel = input('Confirmar');
  readonly danger = input(false);
  readonly loading = input(false);
  readonly confirmed = output<void>();
  readonly cancelled = output<void>();
}
