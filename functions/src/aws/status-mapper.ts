import type {InstanceStateName} from "@aws-sdk/client-ec2";

import type {MachineStatus} from "../models/machine-status.js";

/**
 * Maps EC2 instance state to WiLauncher machine status.
 * @param {InstanceStateName|undefined} state EC2 instance state.
 * @return {MachineStatus} Normalized machine status.
 */
export function mapEc2State(state?: InstanceStateName): MachineStatus {
  switch (state) {
  case "running":
    return "running";
  case "pending":
    return "starting";
  case "stopping":
    return "stopping";
  case "stopped":
    return "stopped";
  case "shutting-down":
  case "terminated":
    return "stopped";
  default:
    return "error";
  }
}

/**
 * Converts EC2 tag list to a key/value map.
 * @param {Array|undefined} tags EC2 tags.
 * @return {Record<string, string>} Tag map.
 */
export function tagsToRecord(
  tags?: Array<{Key?: string; Value?: string}>,
): Record<string, string> {
  const result: Record<string, string> = {};

  for (const tag of tags ?? []) {
    if (!tag.Key) {
      continue;
    }
    result[tag.Key] = tag.Value ?? "";
  }

  return result;
}

/**
 * Infers WiLauncher environment from EC2 resource tags.
 * @param {Record<string, string>|undefined} tags EC2 resource tags.
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
  if (normalized === "PRO" || normalized === "PRE" || normalized === "DEV") {
    return normalized;
  }

  return "DEV";
}

/**
 * Resolves a display name from EC2 tags or instance ID.
 * @param {Record<string, string>|undefined} tags EC2 resource tags.
 * @param {string} instanceId EC2 instance ID.
 * @return {string} Display name.
 */
export function resolveInstanceName(
  tags: Record<string, string> | undefined,
  instanceId: string,
): string {
  return tags?.Name?.trim() || instanceId;
}
