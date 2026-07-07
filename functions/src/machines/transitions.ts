import {FieldValue, getFirestore} from "firebase-admin/firestore";
import type {RequestUserContext} from "../auth/request-user.js";
import {AUDIT_LOGS_COLLECTION, MACHINES_COLLECTION} from "./constants.js";
import type {MachineActionInput} from "./parse-action.js";

let dbInstance: ReturnType<typeof getFirestore> | null = null;

/**
 * Stores machine transition and audit trail.
 * @param {MachineActionInput} input Machine action input.
 * @param {"starting"|"stopping"} nextStatus Target transition status.
 * @param {RequestUserContext} user User context.
 * @return {Promise<void>} Resolves when state is stored.
 */
export async function upsertMachineTransition(
  input: MachineActionInput,
  nextStatus: "starting" | "stopping",
  user: RequestUserContext,
): Promise<void> {
  const db = getDb();
  const machineRef = db.collection(MACHINES_COLLECTION).doc(input.machineId);

  await machineRef.set(
    {
      machineId: input.machineId,
      provider: input.provider,
      environment: input.environment,
      status: nextStatus,
      updatedBy: user.uid,
      updatedAt: FieldValue.serverTimestamp(),
    },
    {merge: true},
  );

  await db.collection(AUDIT_LOGS_COLLECTION).add({
    action: nextStatus === "starting" ? "start_machine" : "stop_machine",
    machineId: input.machineId,
    provider: input.provider,
    environment: input.environment,
    requestedBy: {
      uid: user.uid,
      email: user.email,
      role: user.role,
    },
    createdAt: FieldValue.serverTimestamp(),
  });
}

/**
 * Returns a memoized Firestore Admin instance.
 * @return {object} Firestore instance.
 */
export function getDb(): ReturnType<typeof getFirestore> {
  if (!dbInstance) {
    dbInstance = getFirestore();
  }

  return dbInstance;
}
