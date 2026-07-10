import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';

import { NavItem, NavItemConfig } from './nav-item.model';

@Injectable({ providedIn: 'root' })
export class NavService {
  private readonly router = inject(Router);

  readonly items: NavItem[] = this.buildNavItems();

  private buildNavItems(): NavItem[] {
    const layoutRoute = this.router.config.find((route) => route.path === '' && route.children);

    if (!layoutRoute?.children) {
      return [];
    }

    return layoutRoute.children
      .map((child) => {
        const config = child.data?.['nav'] as NavItemConfig | undefined;

        if (!config || config.hidden) {
          return null;
        }

        return {
          ...config,
          path: child.path === '' ? '/' : `/${child.path}`,
          exact: child.path === '',
        } satisfies NavItem;
      })
      .filter((item): item is NavItem => item !== null)
      .sort((a, b) => a.order - b.order);
  }
}
