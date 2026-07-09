import {defineSecret, defineString} from "firebase-functions/params";

export const azureTenantId = defineSecret("AZURE_TENANT_ID");
export const azureClientId = defineSecret("AZURE_CLIENT_ID");
export const azureClientSecret = defineSecret("AZURE_CLIENT_SECRET");

/** Object ID del service principal (caller en Activity Log). */
export const azureClientObjectId = defineString("AZURE_CLIENT_OBJECT_ID", {
  default: "",
});

/** CSV opcional: "sub-a,sub-b". Vacio = todas las visibles. */
export const azureSubscriptionFilter = defineString("AZURE_SUBSCRIPTION_IDS", {
  default: "",
});

export const azureSyncEnabled = defineString("AZURE_SYNC_ENABLED", {
  default: "false",
});

export const azureSecrets = [
  azureTenantId,
  azureClientId,
  azureClientSecret,
];
