import {toFirestoreDocId} from "./doc-id.js";
import {listAzureSubscriptions} from "./subscriptions.js";
import {
  listAzureVirtualMachines,
  type AzureVirtualMachineSummary,
} from "./virtual-machines.js";

export interface ApiMachine {
  id: string;
  machineId: string;
  name: string;
  provider: "azure";
  subscriptionId: string;
  resourceGroup: string;
  azureResourceId: string;
  environment: string;
  status: AzureVirtualMachineSummary["status"];
  region?: string;
  instanceType?: string;
}

export interface AzureInventoryResult {
  machines: ApiMachine[];
  subscriptions: number;
  syncedAt: string;
}

/**
 * Fetches Azure VM inventory without persisting to Firestore.
 * @return {Promise<AzureInventoryResult>} Live inventory snapshot.
 */
export async function listAzureInventory(): Promise<AzureInventoryResult> {
  const subscriptions = await listAzureSubscriptions();
  const syncedAt = new Date().toISOString();
  const machines: AzureVirtualMachineSummary[] = [];

  for (const subscription of subscriptions) {
    if (subscription.state !== "Enabled") {
      continue;
    }

    const vms = await listAzureVirtualMachines(subscription.subscriptionId);
    machines.push(...vms);
  }

  return {
    machines: machines.map(toApiMachine),
    subscriptions: subscriptions.length,
    syncedAt,
  };
}

/**
 * Maps an Azure VM summary to the API payload consumed by the frontend.
 * @param {AzureVirtualMachineSummary} machine Azure VM summary.
 * @return {ApiMachine} API machine document.
 */
function toApiMachine(machine: AzureVirtualMachineSummary): ApiMachine {
  return {
    id: toFirestoreDocId(machine.azureResourceId),
    machineId: machine.machineId,
    name: machine.name,
    provider: machine.provider,
    subscriptionId: machine.subscriptionId,
    resourceGroup: machine.resourceGroup,
    azureResourceId: machine.azureResourceId,
    environment: machine.environment,
    status: machine.status,
    region: machine.region,
    instanceType: machine.instanceType,
  };
}
