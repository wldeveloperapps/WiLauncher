import {HttpsError} from "firebase-functions/v2/https";
import {PROVIDERS, type Provider} from "./constants.js";

export interface MachineActivityInput {
  machineId: string;
  provider: Provider;
  subscriptionId: string;
  resourceGroup: string;
  region: string;
  azureResourceId?: string;
}

/**
 * Parses and validates machine activity query payload.
 * @param {unknown} data Raw callable payload.
 * @return {MachineActivityInput} Parsed and validated input.
 */
export function parseMachineActivityInput(data: unknown): MachineActivityInput {
  if (!data || typeof data !== "object") {
    throw new HttpsError("invalid-argument", "Faltan datos de la maquina.");
  }

  const candidate = data as Partial<MachineActivityInput>;
  const machineId = candidate.machineId?.trim();
  const provider = candidate.provider?.trim().toLowerCase();
  const subscriptionId = candidate.subscriptionId?.trim();
  const resourceGroup = candidate.resourceGroup?.trim();
  const region = candidate.region?.trim();
  const azureResourceId = candidate.azureResourceId?.trim();

  if (!machineId || !provider) {
    throw new HttpsError(
      "invalid-argument",
      "machineId y provider son obligatorios.",
    );
  }

  if (!PROVIDERS.includes(provider as Provider)) {
    throw new HttpsError(
      "invalid-argument",
      "provider debe ser aws, azure, gcp u oci.",
    );
  }

  if (provider === "azure" && (!subscriptionId || !resourceGroup)) {
    throw new HttpsError(
      "invalid-argument",
      "subscriptionId y resourceGroup son obligatorios para Azure.",
    );
  }

  if (provider === "aws" && !region) {
    throw new HttpsError(
      "invalid-argument",
      "region es obligatorio para AWS.",
    );
  }

  return {
    machineId,
    provider: provider as Provider,
    subscriptionId: subscriptionId ?? "",
    resourceGroup: resourceGroup ?? "",
    region: region ?? "",
    azureResourceId: azureResourceId || undefined,
  };
}
