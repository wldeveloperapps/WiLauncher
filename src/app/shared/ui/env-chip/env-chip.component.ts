import { Component, input } from '@angular/core';

@Component({
  selector: 'app-env-chip',
  template: `
    <span class="env-chip" [class.env-chip--prod]="isProd()">
      {{ environment() }}
    </span>
  `,
  styles: `
    .env-chip {
      background: var(--bg-elevated);
      border: 1px solid var(--border-default);
      border-radius: var(--radius-pill);
      color: var(--text-secondary);
      display: inline-block;
      font-size: 12px;
      font-weight: 600;
      letter-spacing: 0.08em;
      padding: 2px 8px;
      text-transform: uppercase;
    }

    .env-chip--prod {
      border-color: var(--color-prod);
      color: var(--color-prod);
    }
  `,
})
export class EnvChipComponent {
  readonly environment = input.required<string>();

  protected isProd(): boolean {
    return this.environment().toUpperCase() === 'PRO';
  }
}
