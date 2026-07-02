import { Component, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';

export interface SelectOption {
  value: string;
  label: string;
}

@Component({
  selector: 'app-select',
  imports: [FormsModule],
  template: `
    <label class="select-field">
      @if (label()) {
        <span class="select-field__label">{{ label() }}</span>
      }
      <select
        class="select-field__input"
        [ngModel]="value()"
        (ngModelChange)="valueChange.emit($event)"
      >
        @for (option of options(); track option.value) {
          <option [value]="option.value">{{ option.label }}</option>
        }
      </select>
    </label>
  `,
  styles: `
    .select-field {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .select-field__label {
      color: var(--text-secondary);
      font-size: 12px;
      font-weight: 600;
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }

    .select-field__input {
      background: var(--bg-elevated);
      border: 1px solid var(--border-default);
      border-radius: var(--radius-sm);
      color: var(--text-primary);
      font-family: var(--font-ui);
      font-size: 14px;
      padding: 8px 12px;
      transition: border-color var(--motion-fast);
    }

    .select-field__input:focus {
      border-color: var(--accent-primary);
      outline: none;
    }
  `,
})
export class Select {
  readonly label = input<string>('');
  readonly value = input.required<string>();
  readonly options = input.required<SelectOption[]>();
  readonly valueChange = output<string>();
}
