import {HttpsError} from "firebase-functions/v2/https";
import {PROVIDERS, type Provider} from "./constants.js";

export interface MachineActionInput {
  machineId: string;
  provider: Provider;
  environment: string;
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

  if (!machineId || !provider || !environment) {
    throw new HttpsError(
      "invalid-argument",
      "machineId, provider y environment son obligatorios.",
    );
  }

  if (!PROVIDERS.includes(provider as Provider)) {
    throw new HttpsError(
      "invalid-argument",
      "provider debe ser aws, azure, gcp u oci.",
    );
  }

  return {
    machineId,
    provider: provider as Provider,
    environment,
  };
}
