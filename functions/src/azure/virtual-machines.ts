import type {MachineStatus} from "../models/machine-status.js";
import {createAzureCredential} from "./credentials.js";
import {
  inferEnvironment,
  mapAzurePowerState,
  parseResourceGroup,
} from "./status-mapper.js";

export interface AzureVirtualMachineSummary {
  azureResourceId: string;
  machineId: string;
  name: string;
  provider: "azure";
  subscriptionId: string;
  resourceGroup: string;
  environment: string;
  status: MachineStatus;
  region?: string;
  instanceType?: string;
}

/**
 * Lists virtual machines for a single Azure subscription.
 * @param {string} subscriptionId Azure subscription ID.
 * @return {Promise<AzureVirtualMachineSummary[]>} VM summaries.
 */
export async function listAzureVirtualMachines(
  subscriptionId: string,
): Promise<AzureVirtualMachineSummary[]> {
  const {ComputeManagementClient} = await import("@azure/arm-compute");
  const client = new ComputeManagementClient(
    createAzureCredential(),
    subscriptionId,
  );

  const machines: AzureVirtualMachineSummary[] = [];

  for await (const vm of client.virtualMachines.listAll()) {
    if (!vm.id || !vm.name || !vm.location) {
      continue;
    }

    const resourceGroup = parseResourceGroup(vm.id);
    const instanceView = await client.virtualMachines.instanceView(
      resourceGroup,
      vm.name,
    );

    const powerCode = instanceView.statuses
      ?.find((status) => status.code?.startsWith("PowerState/"))
      ?.code;

    machines.push({
      azureResourceId: vm.id,
      machineId: vm.name,
      name: vm.name,
      provider: "azure",
      subscriptionId,
      resourceGroup,
      environment: inferEnvironment(vm.tags ?? undefined),
      status: mapAzurePowerState(powerCode),
      region: vm.location,
      instanceType: vm.hardwareProfile?.vmSize,
    });
  }

  return machines;
}
