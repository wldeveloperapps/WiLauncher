import { Injectable, inject, signal } from '@angular/core';
import { TranslocoService } from '@jsverse/transloco';

export const AVAILABLE_LANGS = ['es', 'en'] as const;
export type AppLang = (typeof AVAILABLE_LANGS)[number];

const LOCALE_STORAGE_KEY = 'wilauncher-lang';

@Injectable({
  providedIn: 'root',
})
export class LocaleService {
  private readonly transloco = inject(TranslocoService);

  readonly availableLangs = AVAILABLE_LANGS;
  readonly activeLang = signal<AppLang>('es');

  constructor() {
    const stored = localStorage.getItem(LOCALE_STORAGE_KEY);
    const initial = this.isAppLang(stored) ? stored : 'es';
    this.setLanguage(initial, false);
  }

  setLanguage(lang: AppLang, persist = true): void {
    this.transloco.setActiveLang(lang);
    this.activeLang.set(lang);
    document.documentElement.lang = lang;

    if (persist) {
      localStorage.setItem(LOCALE_STORAGE_KEY, lang);
    }
  }

  toggleLanguage(): void {
    const next = this.activeLang() === 'es' ? 'en' : 'es';
    this.setLanguage(next);
  }

  langLabel(lang: AppLang): string {
    return lang.toUpperCase();
  }

  private isAppLang(value: string | null): value is AppLang {
    return value === 'es' || value === 'en';
  }
}
