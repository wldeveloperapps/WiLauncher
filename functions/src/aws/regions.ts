import {awsRegions} from "./config.js";

/**
 * Resolves configured AWS regions for inventory sync.
 * @return {string[]} AWS region names.
 */
export function resolveAwsRegions(): string[] {
  const configured = awsRegions.value()
    .split(",")
    .map((region) => region.trim())
    .filter(Boolean);

  return configured.length > 0 ? configured : ["eu-west-1"];
}
