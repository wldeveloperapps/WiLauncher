import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';

import { LocaleService } from './core/services/locale.service';
import { ThemeService } from './core/services/theme.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
})
export class AppComponent {
  constructor() {
    inject(ThemeService);
    inject(LocaleService);
  }
}
