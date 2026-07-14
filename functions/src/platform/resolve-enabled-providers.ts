import {awsSyncEnabled} from "../aws/config.js";
import {azureSyncEnabled} from "../azure/config.js";

const PROVIDER_SYNC_FLAGS: ReadonlyArray<{
  provider: "aws" | "azure";
  enabled: () => string;
}> = [
  {provider: "azure", enabled: () => azureSyncEnabled.value()},
  {provider: "aws", enabled: () => awsSyncEnabled.value()},
];

/**
 * Resolves cloud providers enabled for this deployment.
 * Each integration is toggled via its own env/param flag.
 * @return {Array<"aws" | "azure">} Enabled providers.
 */
export function resolveEnabledProviders(): Array<"aws" | "azure"> {
  return PROVIDER_SYNC_FLAGS
    .filter((entry) => entry.enabled() === "true")
    .map((entry) => entry.provider);
}
