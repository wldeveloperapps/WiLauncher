import { Component, input } from '@angular/core';

import { MachineStatus, statusLabel } from '../../../core/models/machine.model';

@Component({
  selector: 'app-status-badge',
  template: `
    <span class="status-badge" [class]="'status-badge--' + status()">
      <span class="status-badge__dot" [class.status-badge__dot--pulse]="isPulsing()"></span>
      <span class="status-badge__label">{{ statusLabel(status()) }}</span>
    </span>
  `,
  styles: `
    .status-badge {
      align-items: center;
      background: var(--surface-card);
      border: 1px solid var(--border-default);
      border-radius: var(--radius-pill);
      display: inline-flex;
      gap: 6px;
      padding: 4px 10px;
    }

    .status-badge__dot {
      border-radius: 50%;
      height: 8px;
      width: 8px;
    }

    .status-badge__dot--pulse {
      animation: pulse 1.5s ease-in-out infinite;
    }

    .status-badge__label {
      font-size: 12px;
      font-weight: 600;
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }

    .status-badge--running .status-badge__dot {
      background: var(--color-running);
    }

    .status-badge--stopped .status-badge__dot {
      background: var(--color-stopped);
    }

    .status-badge--starting .status-badge__dot,
    .status-badge--stopping .status-badge__dot {
      background: var(--color-transitioning);
    }

    .status-badge--error .status-badge__dot {
      background: var(--color-error);
    }

    @keyframes pulse {
      0%,
      100% {
        opacity: 1;
      }
      50% {
        opacity: 0.4;
      }
    }
  `,
})
export class StatusBadgeComponent {
  readonly status = input.required<MachineStatus>();

  protected statusLabel = statusLabel;

  protected isPulsing(): boolean {
    const s = this.status();
    return s === 'starting' || s === 'stopping';
  }
}
