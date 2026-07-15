import {getFirestore, Timestamp} from "firebase-admin/firestore";
import {logger} from "firebase-functions";

import {
  AUDIT_LOOKBACK_DAYS,
  AUDIT_LOGS_COLLECTION,
  type AuditLogDocument,
  type AuditLogEntry,
  type ListAuditLogsInput,
} from "./types.js";

/**
 * Lists WiLauncher audit entries for one machine.
 * @param {ListAuditLogsInput} input Machine query.
 * @return {Promise<AuditLogEntry[]>} Audit entries newest first.
 */
export async function listAuditLogsForMachine(
  input: ListAuditLogsInput,
): Promise<AuditLogEntry[]> {
  try {
    return await queryAuditLogsForMachine(input);
  } catch (error) {
    logger.warn("Failed to list audit logs", {
      machineId: input.machineId,
      provider: input.provider,
      error,
    });
    return [];
  }
}

/**
 * Queries WiLauncher audit entries for one machine.
 * @param {ListAuditLogsInput} input Machine query.
 * @return {Promise<AuditLogEntry[]>} Audit entries newest first.
 */
async function queryAuditLogsForMachine(
  input: ListAuditLogsInput,
): Promise<AuditLogEntry[]> {
  const db = getFirestore();
  const since = new Date();
  since.setDate(since.getDate() - AUDIT_LOOKBACK_DAYS);

  const snapshot = await db.collection(AUDIT_LOGS_COLLECTION)
    .where("provider", "==", input.provider)
    .where("machineId", "==", input.machineId)
    .where("timestamp", ">=", Timestamp.fromDate(since))
    .orderBy("timestamp", "desc")
    .get();

  return snapshot.docs.map((doc) =>
    mapAuditLog(doc.id, doc.data() as AuditLogDocument),
  );
}

/**
 * Maps a Firestore audit document to the merge layer shape.
 * @param {string} id Document ID.
 * @param {AuditLogDocument} data Stored audit payload.
 * @return {AuditLogEntry} Normalized audit entry.
 */
function mapAuditLog(id: string, data: AuditLogDocument): AuditLogEntry {
  return {
    id,
    machineId: data.machineId,
    provider: data.provider,
    environment: data.environment,
    action: data.action,
    actorUid: data.actorUid,
    actorEmail: data.actorEmail,
    actorRole: data.actorRole,
    timestamp: data.timestamp.toDate().toISOString(),
  };
}
