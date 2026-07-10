import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';

import { NavService } from '../../../navigation/nav.service';
import { SidebarNavIconComponent } from '../sidebar-nav-icon/sidebar-nav-icon.component';

@Component({
  selector: 'app-sidebar-nav',
  imports: [RouterLink, RouterLinkActive, TranslocoPipe, SidebarNavIconComponent],
  templateUrl: './sidebar-nav.component.html',
  styleUrl: './sidebar-nav.component.scss',
})
export class SidebarNavComponent {
  protected readonly navService = inject(NavService);
}
