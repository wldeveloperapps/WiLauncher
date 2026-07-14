import {logger} from "firebase-functions";

import {formatAwsError} from "../aws/errors.js";
import {formatAzureError} from "../azure/errors.js";
import {
  listAwsInventory,
  type ApiMachine as AwsApiMachine,
} from "../aws/list-inventory.js";
import {
  listAzureInventory,
  type ApiMachine as AzureApiMachine,
} from "../azure/list-inventory.js";
import {resolveEnabledProviders} from "./resolve-enabled-providers.js";

export type CloudApiMachine = AzureApiMachine | AwsApiMachine;

export interface ProviderInventoryError {
  provider: "aws" | "azure";
  message: string;
}

export interface CloudInventoryResult {
  machines: CloudApiMachine[];
  subscriptions: number;
  syncedAt: string;
  providerErrors: ProviderInventoryError[];
}

/**
 * Fetches inventory from all enabled cloud providers.
 * Provider failures are isolated and returned in providerErrors.
 * @return {Promise<CloudInventoryResult>} Combined live inventory snapshot.
 */
export async function listCloudInventory(): Promise<CloudInventoryResult> {
  const enabledProviders = resolveEnabledProviders();
  const syncedAt = new Date().toISOString();
  const machines: CloudApiMachine[] = [];
  const providerErrors: ProviderInventoryError[] = [];
  let subscriptions = 0;

  if (enabledProviders.includes("azure")) {
    try {
      const azureInventory = await listAzureInventory();
      machines.push(...azureInventory.machines);
      subscriptions = azureInventory.subscriptions;
    } catch (error) {
      const message = formatAzureError(error);
      logger.warn("Azure inventory sync failed", {message});
      providerErrors.push({provider: "azure", message});
    }
  }

  if (enabledProviders.includes("aws")) {
    try {
      const awsInventory = await listAwsInventory();
      machines.push(...awsInventory.machines);
    } catch (error) {
      const message = formatAwsError(error, "listar instancias EC2");
      logger.warn("AWS inventory sync failed", {message});
      providerErrors.push({provider: "aws", message});
    }
  }

  return {
    machines,
    subscriptions,
    syncedAt,
    providerErrors,
  };
}
