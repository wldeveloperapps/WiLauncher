import { Component, input, output } from '@angular/core';

@Component({
  selector: 'app-icon-button',
  template: `
    <button
      type="button"
      class="icon-btn"
      [attr.aria-label]="label()"
      [disabled]="disabled()"
      (click)="clicked.emit()"
    >
      <ng-content />
    </button>
  `,
  styles: `
    .icon-btn {
      align-items: center;
      background: transparent;
      border: 1px solid var(--border-default);
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

    .icon-btn:hover:not(:disabled) {
      background: var(--bg-elevated);
      color: var(--text-primary);
    }

    .icon-btn:disabled {
      cursor: not-allowed;
      opacity: 0.5;
    }
  `,
})
export class IconButton {
  readonly label = input.required<string>();
  readonly disabled = input(false);
  readonly clicked = output<void>();
}
