import { Provider } from './machine.model';
import { UserRole } from './role.model';

export type AuditAction = 'start_machine' | 'stop_machine';

export interface AuditLogEntry {
  id: string;
  action: AuditAction;
  machineId: string;
  provider: Provider;
  environment: string;
  requestedBy: {
    uid: string;
    email: string | null;
    role: UserRole;
  };
  createdAt: Date | null;
}

export function auditActionLabel(action: AuditAction): string {
  return action === 'start_machine' ? 'Arranque' : 'Apagado';
}
