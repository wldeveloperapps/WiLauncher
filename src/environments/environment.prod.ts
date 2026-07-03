import { Environment } from './environment.model';

export const environment: Environment = {
  production: true,
  firebase: {
    apiKey: 'AIzaSyA19nFVsYUGDutcz17LeJsURQVoM48AOj0',
    authDomain: 'wilauncher.firebaseapp.com',
    projectId: 'wilauncher',
    storageBucket: 'wilauncher.firebasestorage.app',
    messagingSenderId: '775063189008',
    appId: '1:775063189008:web:e4e4515dc9bd569209fc95',
    measurementId: 'G-198LTZWTTC',
  },
  useEmulators: false,
  useFirestoreEmulator: false,
  emulators: {
    auth: '',
    firestoreHost: '',
    firestorePort: 8080,
    functionsHost: '',
    functionsPort: 5001,
  },
  auth: {
    microsoftTenantId: '',
    devLogin: {
      enabled: false,
      email: '',
      password: '',
      displayName: '',
      defaultRole: 'viewer',
    },
  },
};
