import { Routes } from '@angular/router';

import { authGuard } from './core/guards/auth.guard';
import { NavItemConfig } from './core/navigation/nav-item.model';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./features/auth/pages/login-page/login-page.component').then((m) => m.LoginPageComponent),
  },
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./core/layouts/main-layout/main-layout.component').then((m) => m.MainLayoutComponent),
    children: [
      {
        path: '',
        data: {
          nav: {
            labelKey: 'layout.navInventory',
            icon: 'grid',
            order: 1,
          } satisfies NavItemConfig,
        },
        loadComponent: () =>
          import('./features/dashboard/pages/dashboard-page/dashboard-page.component').then(
            (m) => m.DashboardPageComponent,
          ),
      },
      // {
      //   path: 'audit',
      //   data: {
      //     nav: {
      //       labelKey: 'layout.navAudit',
      //       icon: 'audit',
      //       order: 2,
      //     } satisfies NavItemConfig,
      //   },
      //   loadComponent: () =>
      //     import('./features/audit/pages/audit-page/audit-page.component').then((m) => m.AuditPageComponent),
      // },
    ],
  },
  {
    path: '**',
    redirectTo: '',
  },
];
