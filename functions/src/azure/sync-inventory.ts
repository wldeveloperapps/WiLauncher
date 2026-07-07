import {FieldValue, type WriteBatch} from "firebase-admin/firestore";
import {MACHINES_COLLECTION} from "../machines/constants.js";
import {getDb} from "../machines/transitions.js";
import {toFirestoreDocId} from "./doc-id.js";
import {listAzureSubscriptions} from "./subscriptions.js";
import {
  listAzureVirtualMachines,
  type AzureVirtualMachineSummary,
} from "./virtual-machines.js";

const FIRESTORE_BATCH_LIMIT = 400;

export interface AzureSyncResult {
  subscriptions: number;
  machines: number;
  syncedAt: string;
}

interface SubscriptionMetadata {
  displayName: string;
  subscriptionId: string;
}

/**
 * Synchronizes Azure VM inventory into Firestore machines collection.
 * @return {Promise<AzureSyncResult>} Sync summary.
 */
export async function syncAzureInventoryToFirestore():
  Promise<AzureSyncResult> {
  const subscriptions = await listAzureSubscriptions();
  const syncRunId = new Date().toISOString();
  const machinesToSync: AzureVirtualMachineSummary[] = [];

  for (const subscription of subscriptions) {
    if (subscription.state !== "Enabled") {
      continue;
    }

    const vms = await listAzureVirtualMachines(subscription.subscriptionId);
    machinesToSync.push(...vms);
  }

  await commitMachineBatches(machinesToSync, syncRunId, subscriptions);

  return {
    subscriptions: subscriptions.length,
    machines: machinesToSync.length,
    syncedAt: syncRunId,
  };
}

/**
 * Writes machine documents in Firestore batches.
 * @param {AzureVirtualMachineSummary[]} machines Machines to upsert.
 * @param {string} syncRunId Sync run identifier.
 * @param {SubscriptionMetadata[]} subscriptions Subscription metadata.
 * @return {Promise<void>} Resolves when batches are committed.
 */
async function commitMachineBatches(
  machines: AzureVirtualMachineSummary[],
  syncRunId: string,
  subscriptions: SubscriptionMetadata[],
): Promise<void> {
  const db = getDb();
  const subscriptionNames = new Map(
    subscriptions.map((subscription) => [
      subscription.subscriptionId,
      subscription.displayName,
    ]),
  );

  let batch: WriteBatch = db.batch();
  let operationCount = 0;

  for (const machine of machines) {
    const docId = toFirestoreDocId(machine.azureResourceId);
    const ref = db.collection(MACHINES_COLLECTION).doc(docId);
    const subscriptionName =
      subscriptionNames.get(machine.subscriptionId) ?? machine.subscriptionId;

    batch.set(
      ref,
      {
        machineId: machine.machineId,
        name: machine.name,
        provider: machine.provider,
        subscriptionId: machine.subscriptionId,
        subscriptionName,
        resourceGroup: machine.resourceGroup,
        azureResourceId: machine.azureResourceId,
        environment: machine.environment,
        status: machine.status,
        region: machine.region ?? null,
        instanceType: machine.instanceType ?? null,
        syncRunId,
        syncedAt: FieldValue.serverTimestamp(),
      },
      {merge: true},
    );

    operationCount++;
    if (operationCount >= FIRESTORE_BATCH_LIMIT) {
      await batch.commit();
      batch = db.batch();
      operationCount = 0;
    }
  }

  if (operationCount > 0) {
    await batch.commit();
  }
}
