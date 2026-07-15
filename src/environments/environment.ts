import { Environment } from './environment.model';

export const environment: Environment = {
  production: false,
  firebase: {
    apiKey: 'AIzaSyAwnL3ROJDFj7u3yR0CRxJ73W8KRRQo6v8',
    authDomain: 'wilauncher-9e648.firebaseapp.com',
    projectId: 'wilauncher-9e648',
    storageBucket: 'wilauncher-9e648.firebasestorage.app',
    messagingSenderId: '449410261314',
    appId: '1:449410261314:web:d70346a3fcdf82bda7a8db',
    measurementId: 'G-SD54BMYGC2',
  },
  useEmulators: false,
  useFunctionsEmulator: false,
  emulators: {
    auth: 'http://127.0.0.1:9099',
    functionsHost: '127.0.0.1',
    functionsPort: 5001,
  },
  auth: {
    microsoftTenantId: 'organizations',
  },
};
