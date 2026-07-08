import {createAzureCredential} from "./credentials.js";

/**
 * Starts an Azure virtual machine.
 * @param {string} subscriptionId Azure subscription ID.
 * @param {string} resourceGroup Resource group name.
 * @param {string} vmName Virtual machine name.
 * @return {Promise<void>} Resolves when the start operation is accepted.
 */
export async function startAzureVirtualMachine(
  subscriptionId: string,
  resourceGroup: string,
  vmName: string,
): Promise<void> {
  const {ComputeManagementClient} = await import("@azure/arm-compute");
  const client = new ComputeManagementClient(
    createAzureCredential(),
    subscriptionId,
  );

  await client.virtualMachines.beginStart(resourceGroup, vmName);
}

/**
 * Stops and deallocates an Azure virtual machine.
 * @param {string} subscriptionId Azure subscription ID.
 * @param {string} resourceGroup Resource group name.
 * @param {string} vmName Virtual machine name.
 * @return {Promise<void>} Resolves when the stop operation is accepted.
 */
export async function stopAzureVirtualMachine(
  subscriptionId: string,
  resourceGroup: string,
  vmName: string,
): Promise<void> {
  const {ComputeManagementClient} = await import("@azure/arm-compute");
  const client = new ComputeManagementClient(
    createAzureCredential(),
    subscriptionId,
  );

  await client.virtualMachines.beginDeallocate(resourceGroup, vmName);
}
