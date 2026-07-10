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
      @case ('audit') {
        <svg viewBox="0 0 20 20" aria-hidden="true">
          <path
            d="M5 3h7l3 3v11a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z"
            fill="none"
            stroke="currentColor"
            stroke-width="1.5"
          />
          <path d="M12 3v4h4" fill="none" stroke="currentColor" stroke-width="1.5" />
          <path d="M7 11h6M7 14h4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
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
