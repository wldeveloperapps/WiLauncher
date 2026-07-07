import type {MachineStatus} from "../models/machine-status.js";

/**
 * Maps Azure power state codes to WiLauncher machine status.
 * @param {string|undefined} code Azure PowerState code.
 * @return {MachineStatus} Normalized machine status.
 */
export function mapAzurePowerState(code?: string): MachineStatus {
  const state = (code ?? "").toLowerCase();

  if (state.includes("running")) {
    return "running";
  }
  if (state.includes("starting")) {
    return "starting";
  }
  if (state.includes("stopping") || state.includes("deallocating")) {
    return "stopping";
  }
  if (state.includes("deallocated") || state.includes("stopped")) {
    return "stopped";
  }
  if (state.includes("failed")) {
    return "error";
  }

  return "stopped";
}

/**
 * Extracts the resource group name from an Azure resource ID.
 * @param {string} resourceId Azure resource ID.
 * @return {string} Resource group name.
 */
export function parseResourceGroup(resourceId: string): string {
  const match = resourceId.match(/\/resourceGroups\/([^/]+)\//i);
  if (!match?.[1]) {
    throw new Error(`No se pudo extraer resourceGroup de ${resourceId}`);
  }
  return match[1];
}

/**
 * Infers WiLauncher environment from Azure resource tags.
 * @param {Record<string, string>|undefined} tags Azure resource tags.
 * @return {string} Environment label.
 */
export function inferEnvironment(tags?: Record<string, string>): string {
  const raw =
    tags?.environment ??
    tags?.Environment ??
    tags?.env ??
    tags?.Env ??
    "DEV";

  const normalized = raw.toUpperCase();
  if (normalized === "PROD" || normalized === "STG" || normalized === "DEV") {
    return normalized;
  }

  return "DEV";
}
