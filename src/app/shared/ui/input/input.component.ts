import { Component, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-input',
  imports: [FormsModule],
  template: `
    <label class="input-field">
      @if (label()) {
        <span class="input-field__label">{{ label() }}</span>
      }
      <input
        class="input-field__input"
        [type]="type()"
        [placeholder]="placeholder()"
        [ngModel]="value()"
        (ngModelChange)="valueChange.emit($event)"
      />
    </label>
  `,
  styles: `
    .input-field {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .input-field__label {
      color: var(--text-secondary);
      font-size: 12px;
      font-weight: 600;
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }

    .input-field__input {
      background: var(--bg-elevated);
      border: 1px solid var(--border-default);
      border-radius: var(--radius-sm);
      color: var(--text-primary);
      font-family: var(--font-mono);
      font-size: 14px;
      padding: 8px 12px;
      transition: border-color var(--motion-fast);
    }

    .input-field__input::placeholder {
      color: var(--text-muted);
      font-family: var(--font-ui);
    }

    .input-field__input:focus {
      border-color: var(--accent-primary);
      outline: none;
    }
  `,
})
export class InputComponent {
  readonly label = input<string>('');
  readonly value = input.required<string>();
  readonly placeholder = input('');
  readonly type = input('text');
  readonly valueChange = output<string>();
}
