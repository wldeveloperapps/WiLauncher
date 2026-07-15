import type {Timestamp} from "firebase-admin/firestore";

import type {UserRole} from "../auth/request-user.js";
import type {Provider} from "../machines/constants.js";

export const AUDIT_LOGS_COLLECTION = "auditLogs";
export const WILAUNCHER_ACTOR_LABEL = "WiLauncher";
export const AUDIT_LOOKBACK_DAYS = 30;
export const ACTIVITY_MATCH_WINDOW_MS = 5 * 60 * 1000;
export const MAX_ACTIVITY_EVENTS = 50;

export type AuditAction = "start" | "stop";

export interface AuditLogDocument {
  machineId: string;
  provider: Provider;
  environment: string;
  action: AuditAction;
  actorUid: string;
  actorEmail: string | null;
  actorRole: UserRole;
  subscriptionId?: string;
  resourceGroup?: string;
  region?: string;
  timestamp: Timestamp;
}

export interface AuditLogEntry {
  id: string;
  machineId: string;
  provider: Provider;
  environment: string;
  action: AuditAction;
  actorUid: string;
  actorEmail: string | null;
  actorRole: UserRole;
  timestamp: string;
}

export interface ActivityLogEntry {
  id: string;
  action: string;
  actor: string;
  timestamp: string;
  status: string;
  operation: string;
}

export interface WriteAuditLogInput {
  machineId: string;
  provider: Provider;
  environment: string;
  action: AuditAction;
  actorUid: string;
  actorEmail: string | null;
  actorRole: UserRole;
  subscriptionId?: string;
  resourceGroup?: string;
  region?: string;
}

export interface ListAuditLogsInput {
  machineId: string;
  provider: Provider;
}
