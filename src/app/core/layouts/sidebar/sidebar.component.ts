import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NgOptimizedImage } from '@angular/common';
import { TranslocoPipe } from '@jsverse/transloco';

import { SidebarFooterComponent } from './sidebar-footer/sidebar-footer.component';
import { SidebarNavComponent } from './sidebar-nav/sidebar-nav.component';

@Component({
  selector: 'app-sidebar',
  imports: [RouterLink, NgOptimizedImage, TranslocoPipe, SidebarNavComponent, SidebarFooterComponent],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.scss',
})
export class SidebarComponent {}
