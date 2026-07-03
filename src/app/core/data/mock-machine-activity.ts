import { MachineActivityLog } from '../models/machine-activity.model';

function hoursAgo(hours: number): Date {
  return new Date(Date.now() - hours * 60 * 60 * 1000);
}

function daysAgo(days: number, hours = 10): Date {
  const date = new Date();
  date.setDate(date.getDate() - days);
  date.setHours(hours, 2, 11, 0);
  return date;
}

const API_GATEWAY_LOGS: MachineActivityLog[] = [
  { id: 'ag-1', action: 'health.check', actor: 'system', timestamp: hoursAgo(1) },
  { id: 'ag-2', action: 'config.sync', actor: 'system', timestamp: daysAgo(1, 9) },
  { id: 'ag-3', action: 'start', actor: 'v.bernal', timestamp: daysAgo(2, 14) },
  { id: 'ag-4', action: 'deploy.release', actor: 'ci.pipeline', timestamp: daysAgo(3, 11) },
  { id: 'ag-5', action: 'health.check', actor: 'system', timestamp: daysAgo(4, 8) },
  { id: 'ag-6', action: 'stop', actor: 'm.naveira', timestamp: daysAgo(5, 22) },
  { id: 'ag-7', action: 'start', actor: 'ops@wiloc.io', timestamp: daysAgo(6, 7) },
];

function defaultLogs(prefix: string): MachineActivityLog[] {
  return [
    { id: `${prefix}-1`, action: 'health.check', actor: 'system', timestamp: hoursAgo(2) },
    { id: `${prefix}-2`, action: 'config.sync', actor: 'system', timestamp: daysAgo(1, 12) },
    { id: `${prefix}-3`, action: 'start', actor: 'dev@wiloc.local', timestamp: daysAgo(3, 9) },
    { id: `${prefix}-4`, action: 'health.check', actor: 'system', timestamp: daysAgo(5, 15) },
    { id: `${prefix}-5`, action: 'stop', actor: 'ops@wiloc.io', timestamp: daysAgo(7, 18) },
  ];
}

export const MOCK_MACHINE_ACTIVITY: Record<string, MachineActivityLog[]> = {
  'WL-4821-AC': API_GATEWAY_LOGS,
  'mock-aws-1': API_GATEWAY_LOGS,
  'WL-3104-BD': defaultLogs('wb'),
  'mock-aws-2': defaultLogs('wb'),
  'WL-7740-CE': defaultLogs('rc'),
  'mock-aws-3': defaultLogs('rc'),
  'WL-5512-DF': defaultLogs('sql'),
  'mock-azure-1': defaultLogs('sql'),
  'WL-2298-EG': defaultLogs('app'),
  'mock-azure-2': defaultLogs('app'),
  'WL-6631-FH': defaultLogs('bas'),
  'mock-azure-3': defaultLogs('bas'),
  'WL-9045-GI': defaultLogs('etl'),
  'mock-gcp-1': defaultLogs('etl'),
  'WL-1187-HJ': defaultLogs('ml'),
  'mock-gcp-2': defaultLogs('ml'),
  'WL-4473-IK': defaultLogs('ps'),
  'mock-gcp-3': defaultLogs('ps'),
  'WL-8360-JL': defaultLogs('erp'),
  'mock-oci-1': defaultLogs('erp'),
  'WL-5029-KM': defaultLogs('vpn'),
  'mock-oci-2': defaultLogs('vpn'),
  'WL-1756-LN': defaultLogs('sbx'),
  'mock-oci-3': defaultLogs('sbx'),
};

export function getMockMachineActivity(machineKey: string): MachineActivityLog[] {
  return [...(MOCK_MACHINE_ACTIVITY[machineKey] ?? defaultLogs(machineKey))].sort(
    (a, b) => b.timestamp.getTime() - a.timestamp.getTime(),
  );
}
