import {FieldValue, getFirestore} from "firebase-admin/firestore";
import {logger} from "firebase-functions";

import {
  AUDIT_LOGS_COLLECTION,
  type WriteAuditLogInput,
} from "./types.js";

/**
 * Persists a WiLauncher machine action for activity enrichment.
 * @param {WriteAuditLogInput} input Audit payload.
 * @return {Promise<void>} Resolves when the document is stored.
 */
export async function writeAuditLog(input: WriteAuditLogInput): Promise<void> {
  const db = getFirestore();

  await db.collection(AUDIT_LOGS_COLLECTION).add({
    machineId: input.machineId,
    provider: input.provider,
    environment: input.environment,
    action: input.action,
    actorUid: input.actorUid,
    actorEmail: input.actorEmail,
    actorRole: input.actorRole,
    subscriptionId: input.subscriptionId ?? null,
    resourceGroup: input.resourceGroup ?? null,
    region: input.region ?? null,
    timestamp: FieldValue.serverTimestamp(),
  });
}

/**
 * Writes an audit log without failing the caller operation.
 * @param {WriteAuditLogInput} input Audit payload.
 * @return {Promise<void>} Resolves when the write attempt finishes.
 */
export async function writeAuditLogSafe(
  input: WriteAuditLogInput,
): Promise<void> {
  try {
    await writeAuditLog(input);
  } catch (error) {
    logger.warn("Failed to write audit log", {
      machineId: input.machineId,
      provider: input.provider,
      action: input.action,
      error,
    });
  }
}
