import { ApplicationConfig, isDevMode, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideFirebaseApp, initializeApp, getApp } from '@angular/fire/app';
import { provideAnalytics, getAnalytics } from '@angular/fire/analytics';
import { provideAuth, getAuth, connectAuthEmulator } from '@angular/fire/auth';
import { provideFunctions, getFunctions, connectFunctionsEmulator } from '@angular/fire/functions';
import { provideTransloco } from '@jsverse/transloco';

import { environment } from '../environments/environment';
import { TranslocoHttpLoader } from './core/i18n/transloco-loader';
import { routes } from './app.routes';

let emulatorsConnected = false;

function connectFirebaseEmulators(): void {
  if (emulatorsConnected || environment.production || !environment.useEmulators) {
    return;
  }

  connectAuthEmulator(getAuth(), environment.emulators.auth, { disableWarnings: true });

  connectFunctionsEmulator(
    getFunctions(getApp(), 'europe-west1'),
    environment.emulators.functionsHost,
    environment.emulators.functionsPort,
  );

  emulatorsConnected = true;
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideAnimationsAsync(),
    provideFirebaseApp(() => initializeApp(environment.firebase)),
    provideAuth(() => {
      const auth = getAuth();
      connectFirebaseEmulators();
      return auth;
    }),
    provideFunctions(() => getFunctions(getApp(), 'europe-west1')),
    provideHttpClient(),
    provideAnalytics(() => getAnalytics()),
    provideTransloco({
      config: {
        availableLangs: ['es', 'en'],
        defaultLang: 'es',
        reRenderOnLangChange: true,
        prodMode: !isDevMode(),
      },
      loader: TranslocoHttpLoader,
    }),
  ],
};
