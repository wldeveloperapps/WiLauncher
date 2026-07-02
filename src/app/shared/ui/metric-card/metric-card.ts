import { Component, input } from '@angular/core';

@Component({
  selector: 'app-metric-card',
  template: `
    <div class="metric-card">
      <span class="metric-card__label">{{ label() }}</span>
      <span class="metric-card__value font-mono" [class]="'metric-card__value--' + variant()">
        {{ value() }}
      </span>
    </div>
  `,
  styles: `
    .metric-card {
      background: var(--surface-card);
      border: 1px solid var(--border-default);
      border-radius: var(--radius-md);
      display: flex;
      flex-direction: column;
      gap: var(--space-1);
      padding: var(--space-2);
    }

    .metric-card__label {
      color: var(--text-secondary);
      font-size: 12px;
      font-weight: 600;
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }

    .metric-card__value {
      font-size: 32px;
      font-weight: 600;
      line-height: 1;
    }

    .metric-card__value--running {
      color: var(--color-running);
    }

    .metric-card__value--stopped {
      color: var(--color-stopped);
    }

    .metric-card__value--error {
      color: var(--color-error);
    }

    .metric-card__value--default {
      color: var(--text-primary);
    }
  `,
})
export class MetricCard {
  readonly label = input.required<string>();
  readonly value = input.required<string | number>();
  readonly variant = input<'running' | 'stopped' | 'error' | 'default'>('default');
}
