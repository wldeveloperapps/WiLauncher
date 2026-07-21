export const MACHINE_STATUSES = ['running', 'stopped', 'starting', 'stopping', 'error'] as const;
export const PROVIDERS = ['aws', 'azure', 'gcp', 'oci'] as const;
export const ENVIRONMENTS = ['DEV', 'PRE', 'PRO'] as const;

export type MachineStatus = (typeof MACHINE_STATUSES)[number];
export type Provider = (typeof PROVIDERS)[number];
export type Environment = (typeof ENVIRONMENTS)[number];

export interface Machine {
  id: string;
  machineId?: string;
  name?: string;
  provider: Provider;
  environment: string;
  status: MachineStatus;
  region?: string;
  ipAddress?: string;
  instanceType?: string;
  subscriptionId?: string;
  resourceGroup?: string;
  azureResourceId?: string;
  awsResourceId?: string;
  cpuUsage?: number;
  updatedAt?: Date | null;
  updatedBy?: string;
}

export function statusLabel(status: MachineStatus): string {
  switch (status) {
    case 'running':
      return 'Running';
    case 'stopped':
      return 'Stopped';
    case 'starting':
      return 'Starting';
    case 'stopping':
      return 'Stopping';
    default:
      return 'Error';
  }
}

export function providerLabel(provider: Provider): string {
  switch (provider) {
    case 'aws':
      return 'AWS';
    case 'azure':
      return 'Azure';
    case 'gcp':
      return 'GCP';
    default:
      return 'OCI';
  }
}

export function providerInitial(provider: Provider): string {
  switch (provider) {
    case 'aws':
      return 'A';
    case 'azure':
      return 'A';
    case 'gcp':
      return 'G';
    default:
      return 'O';
  }
}

export function isTransitioning(status: MachineStatus): boolean {
  return status === 'starting' || status === 'stopping';
}

export function isProductionEnvironment(environment: string): boolean {
  return environment.toUpperCase() === 'PRO';
}
