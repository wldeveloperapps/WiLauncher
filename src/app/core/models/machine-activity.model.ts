import { Provider } from './machine.model';

export interface MachineActivityLog {
  id: string;
  action: string;
  actor: string;
  timestamp: Date;
  machineId?: string;
  provider?: Provider;
  environment?: string;
}
