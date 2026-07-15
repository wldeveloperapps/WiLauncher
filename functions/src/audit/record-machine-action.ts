import type {RequestUserContext} from "../auth/request-user.js";
import type {MachineActionInput} from "../machines/parse-action.js";
import type {AuditAction} from "./types.js";
import {writeAuditLogSafe} from "./write-audit-log.js";

/**
 * Records a machine action performed through WiLauncher.
 * @param {RequestUserContext} user Authenticated user.
 * @param {MachineActionInput} input Machine action payload.
 * @param {AuditAction} action Action type.
 * @return {Promise<void>} Resolves when the audit write attempt finishes.
 */
export async function recordMachineActionAudit(
  user: RequestUserContext,
  input: MachineActionInput,
  action: AuditAction,
): Promise<void> {
  await writeAuditLogSafe({
    machineId: input.machineId,
    provider: input.provider,
    environment: input.environment,
    action,
    actorUid: user.uid,
    actorEmail: user.email,
    actorRole: user.role,
    subscriptionId: input.subscriptionId,
    resourceGroup: input.resourceGroup,
    region: input.region,
  });
}
