export interface Environment {
  production: boolean;
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
  useFunctionsEmulator: boolean;
  emulators: {
    auth: string;
    functionsHost: string;
    functionsPort: number;
  };
  auth: {
    microsoftTenantId: string;
  };
}
