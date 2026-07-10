import { Component, input, output } from '@angular/core';

export type ButtonVariant = 'primary' | 'outline' | 'danger';

@Component({
  selector: 'app-button',
  template: `
    <button
      type="button"
      class="btn"
      [class]="'btn--' + variant()"
      [disabled]="disabled() || loading()"
      (click)="clicked.emit()"
    >
      @if (loading()) {
        <span class="btn__spinner"></span>
      }
      <ng-content />
    </button>
  `,
  styles: `
    .btn {
      align-items: center;
      border: 1px solid transparent;
      border-radius: var(--radius-sm);
      cursor: pointer;
      display: inline-flex;
      font-family: var(--font-ui);
      font-size: 14px;
      font-weight: 600;
      gap: var(--space-1);
      justify-content: center;
      padding: 8px 16px;
      transition:
        background-color var(--motion-fast),
        border-color var(--motion-fast),
        color var(--motion-fast);
    }

    .btn:disabled {
      cursor: not-allowed;
      opacity: 0.5;
    }

    .btn--primary {
      background: var(--accent-primary);
      color: var(--color-white);
    }

    .btn--primary:hover:not(:disabled) {
      background: var(--accent-primary-hover);
    }

    .btn--outline {
      background: transparent;
      border-color: var(--border-subtle);
      color: var(--text-primary);
    }

    .btn--outline:hover:not(:disabled) {
      border-color: var(--text-secondary);
    }

    .btn--danger {
      background: var(--color-error);
      color: var(--color-white);
    }

    .btn--danger:hover:not(:disabled) {
      background: #b83838;
    }

    .btn__spinner {
      animation: spin 0.8s linear infinite;
      border: 2px solid currentcolor;
      border-radius: 50%;
      border-top-color: transparent;
      height: 14px;
      width: 14px;
    }

    @keyframes spin {
      to {
        transform: rotate(360deg);
      }
    }
  `,
})
export class Button {
  readonly variant = input<ButtonVariant>('primary');
  readonly disabled = input(false);
  readonly loading = input(false);
  readonly clicked = output<void>();
}
