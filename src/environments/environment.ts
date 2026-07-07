import { Environment } from './environment.model';

export const environment: Environment = {
  production: false,
  useMockMachines: true,
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
    auth: 'http://127.0.0.1:9099',
    firestoreHost: '127.0.0.1',
    firestorePort: 8080,
    functionsHost: '127.0.0.1',
    functionsPort: 5001,
  },
  auth: {
    microsoftTenantId: '38c864ec-1b76-42bc-bd0f-f8ea1efe10e0',
    devLogin: {
      enabled: false,
      email: 'dev@wiloc.local',
      password: 'dev-wilauncher',
      displayName: 'Dev Operator',
      defaultRole: 'operator',
    },
  },
};
