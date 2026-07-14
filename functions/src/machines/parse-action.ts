import {HttpsError} from "firebase-functions/v2/https";
import {PROVIDERS, type Provider} from "./constants.js";

export interface MachineActionInput {
  machineId: string;
  provider: Provider;
  environment: string;
  subscriptionId: string;
  resourceGroup: string;
  region: string;
}

/**
 * Parses and validates machine action payload.
 * @param {unknown} data Raw callable payload.
 * @return {MachineActionInput} Parsed and validated input.
 */
export function parseMachineActionInput(data: unknown): MachineActionInput {
  if (!data || typeof data !== "object") {
    throw new HttpsError("invalid-argument", "Faltan datos de la maquina.");
  }

  const candidate = data as Partial<MachineActionInput>;
  const machineId = candidate.machineId?.trim();
  const provider = candidate.provider?.trim().toLowerCase();
  const environment = candidate.environment?.trim();
  const subscriptionId = candidate.subscriptionId?.trim();
  const resourceGroup = candidate.resourceGroup?.trim();
  const region = candidate.region?.trim();

  if (!machineId || !provider || !environment) {
    throw new HttpsError(
      "invalid-argument",
      "machineId, provider y environment son obligatorios.",
    );
  }

  if (!PROVIDERS.includes(provider as Provider)) {
    throw new HttpsError(
      "invalid-argument",
      "provider debe ser aws o azure.",
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
    environment,
    subscriptionId: subscriptionId ?? "",
    resourceGroup: resourceGroup ?? "",
    region: region ?? "",
  };
}
