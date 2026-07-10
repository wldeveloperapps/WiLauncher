import { Component } from '@angular/core';

@Component({
  selector: 'app-card',
  template: `<div class="card"><ng-content /></div>`,
  styles: `
    .card {
      background: var(--surface-card);
      border: 1px solid var(--border-default);
      border-radius: var(--radius-md);
      padding: var(--space-2);
    }
  `,
})
export class CardComponent {}
