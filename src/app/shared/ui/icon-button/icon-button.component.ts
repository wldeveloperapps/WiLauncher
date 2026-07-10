import { Component, input, output } from '@angular/core';

export type IconButtonSize = 'default' | 'sidebar';

@Component({
  selector: 'app-icon-button',
  host: {
    '[class.icon-btn-host--sidebar]': 'size() === "sidebar"',
  },
  template: `
    <button
      type="button"
      class="icon-btn"
      [class.icon-btn--sidebar]="size() === 'sidebar'"
      [attr.aria-label]="label()"
      [disabled]="disabled()"
      (click)="clicked.emit()"
    >
      <ng-content />
    </button>
  `,
  styles: `
    :host {
      display: inline-flex;
    }

    .icon-btn {
      align-items: center;
      background: transparent;
      border: 1px solid transparent;
      border-radius: var(--radius-sm);
      color: var(--text-secondary);
      cursor: pointer;
      display: inline-flex;
      height: 36px;
      justify-content: center;
      transition:
        background-color var(--motion-fast),
        border-color var(--motion-fast),
        color var(--motion-fast);
      width: 36px;
    }

    .icon-btn--sidebar {
      height: 40px;
      width: 40px;
    }

    .icon-btn:hover:not(:disabled) {
      color: var(--text-primary);
    }

    :host:not(.icon-btn-host--sidebar) .icon-btn {
      border-color: var(--border-default);
    }

    :host:not(.icon-btn-host--sidebar) .icon-btn:hover:not(:disabled) {
      background: var(--bg-elevated);
    }

    .icon-btn:disabled {
      cursor: not-allowed;
      opacity: 0.5;
    }
  `,
})
export class IconButtonComponent {
  readonly label = input.required<string>();
  readonly disabled = input(false);
  readonly size = input<IconButtonSize>('default');
  readonly clicked = output<void>();
}
