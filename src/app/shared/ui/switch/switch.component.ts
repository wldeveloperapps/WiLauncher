import { Component, input, output } from '@angular/core';

@Component({
  selector: 'app-switch',
  template: `
    <button
      type="button"
      class="switch"
      role="switch"
      [attr.aria-checked]="checked()"
      [attr.aria-label]="label()"
      (click)="toggled.emit()"
    >
      <span class="switch__track" [class.switch__track--on]="checked()">
        <span class="switch__thumb"></span>
      </span>
      @if (label()) {
        <span class="switch__label">{{ label() }}</span>
      }
    </button>
  `,
  styles: `
    .switch {
      align-items: center;
      background: none;
      border: 0;
      color: var(--text-secondary);
      cursor: pointer;
      display: inline-flex;
      font-family: var(--font-ui);
      font-size: 14px;
      gap: var(--space-1);
      padding: 0;
    }

    .switch__track {
      background: var(--border-subtle);
      border-radius: var(--radius-pill);
      display: inline-block;
      height: 20px;
      position: relative;
      transition: background-color var(--motion-fast);
      width: 36px;
    }

    .switch__track--on {
      background: var(--accent-primary);
    }

    .switch__thumb {
      background: var(--color-white);
      border-radius: 50%;
      height: 16px;
      left: 2px;
      position: absolute;
      top: 2px;
      transition: transform var(--motion-fast);
      width: 16px;
    }

    .switch__track--on .switch__thumb {
      transform: translateX(16px);
    }
  `,
})
export class SwitchComponent {
  readonly checked = input(false);
  readonly label = input('');
  readonly toggled = output<void>();
}
