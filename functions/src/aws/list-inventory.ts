import {toResourceId} from "../machines/resource-id.js";
import {listAwsInstances, type AwsInstanceSummary} from "./instances.js";
import {resolveAwsRegions} from "./regions.js";

export interface ApiMachine {
  id: string;
  machineId: string;
  name: string;
  provider: "aws";
  region: string;
  accountId: string;
  awsResourceId: string;
  environment: string;
  status: AwsInstanceSummary["status"];
  instanceType?: string;
  ipAddress?: string;
}

export interface AwsInventoryResult {
  machines: ApiMachine[];
  regions: number;
  syncedAt: string;
}

/**
 * Fetches AWS EC2 inventory from configured regions.
 * @return {Promise<AwsInventoryResult>} Live inventory snapshot.
 */
export async function listAwsInventory(): Promise<AwsInventoryResult> {
  const regions = resolveAwsRegions();
  const syncedAt = new Date().toISOString();
  const machines: AwsInstanceSummary[] = [];

  for (const region of regions) {
    const instances = await listAwsInstances(region);
    machines.push(...instances);
  }

  return {
    machines: machines.map(toApiMachine),
    regions: regions.length,
    syncedAt,
  };
}

/**
 * Maps an AWS instance summary to the API payload consumed by the frontend.
 * @param {AwsInstanceSummary} machine AWS instance summary.
 * @return {ApiMachine} API machine document.
 */
function toApiMachine(machine: AwsInstanceSummary): ApiMachine {
  return {
    id: toResourceId(machine.awsResourceId),
    machineId: machine.machineId,
    name: machine.name,
    provider: machine.provider,
    region: machine.region,
    accountId: machine.accountId,
    awsResourceId: machine.awsResourceId,
    environment: machine.environment,
    status: machine.status,
    instanceType: machine.instanceType,
    ipAddress: machine.ipAddress,
  };
}
