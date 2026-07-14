import { Component, input } from '@angular/core';

import { NavIcon } from '../../../navigation/nav-item.model';

@Component({
  selector: 'app-sidebar-nav-icon',
  template: `
    @switch (icon()) {
      @case ('grid') {
        <svg viewBox="0 0 20 20" aria-hidden="true">
          <rect x="2" y="2" width="7" height="7" rx="1" fill="currentColor" />
          <rect x="11" y="2" width="7" height="7" rx="1" fill="currentColor" />
          <rect x="2" y="11" width="7" height="7" rx="1" fill="currentColor" />
          <rect x="11" y="11" width="7" height="7" rx="1" fill="currentColor" />
        </svg>
      }
    }
  `,
  styles: `
    :host {
      display: contents;
    }

    svg {
      height: 20px;
      width: 20px;
    }
  `,
})
export class SidebarNavIconComponent {
  readonly icon = input.required<NavIcon>();
}
