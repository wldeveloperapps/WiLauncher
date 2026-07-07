import {ClientSecretCredential} from "@azure/identity";
import {azureClientId, azureClientSecret, azureTenantId} from "./config.js";

/**
 * Creates an Azure credential from configured secrets.
 * @return {ClientSecretCredential} Azure service principal credential.
 */
export function createAzureCredential(): ClientSecretCredential {
  return new ClientSecretCredential(
    azureTenantId.value(),
    azureClientId.value(),
    azureClientSecret.value(),
  );
}
