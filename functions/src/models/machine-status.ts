export const MACHINE_STATUSES = [
  "running",
  "stopped",
  "starting",
  "stopping",
  "error",
] as const;

export type MachineStatus = (typeof MACHINE_STATUSES)[number];
