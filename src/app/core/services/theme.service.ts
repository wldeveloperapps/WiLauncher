import { Injectable, signal } from '@angular/core';

const THEME_STORAGE_KEY = 'wilauncher-theme';

@Injectable({
  providedIn: 'root',
})
export class ThemeService {
  readonly isDark = signal(true);

  constructor() {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    const prefersDark = stored ? stored === 'dark' : true;
    this.applyTheme(prefersDark);
  }

  toggle(): void {
    this.applyTheme(!this.isDark());
  }

  private applyTheme(dark: boolean): void {
    this.isDark.set(dark);
    document.documentElement.classList.toggle('wiloc-dark', dark);
    localStorage.setItem(THEME_STORAGE_KEY, dark ? 'dark' : 'light');
  }
}
