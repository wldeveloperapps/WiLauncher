import { UserRole } from '../app/core/models/role.model';

export interface DevLoginConfig {
  enabled: boolean;
  email: string;
  password: string;
  displayName: string;
  defaultRole: UserRole;
}

export interface Environment {
  production: boolean;
  useMockMachines: boolean;
  firebase: {
    apiKey: string;
    authDomain: string;
    projectId: string;
    storageBucket: string;
    messagingSenderId: string;
    appId: string;
    measurementId?: string;
  };
  useEmulators: boolean;
  useFirestoreEmulator: boolean;
  emulators: {
    auth: string;
    firestoreHost: string;
    firestorePort: number;
    functionsHost: string;
    functionsPort: number;
  };
  auth: {
    microsoftTenantId: string;
    devLogin: DevLoginConfig;
  };
}
