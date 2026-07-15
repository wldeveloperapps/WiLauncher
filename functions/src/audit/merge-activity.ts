import {
  ACTIVITY_MATCH_WINDOW_MS,
  type ActivityLogEntry,
  type AuditAction,
  type AuditLogEntry,
  MAX_ACTIVITY_EVENTS,
  WILAUNCHER_ACTOR_LABEL,
} from "./types.js";

/**
 * Formats the actor label for WiLauncher actions.
 * @param {string|null} email Operator email.
 * @return {string} Actor label for the UI.
 */
export function formatWiLauncherActor(email: string | null): string {
  if (email?.trim()) {
    return `${WILAUNCHER_ACTOR_LABEL} - ${email.trim()}`;
  }

  return WILAUNCHER_ACTOR_LABEL;
}

/**
 * Normalizes activity labels to start/stop when possible.
 * @param {string} action Raw action label.
 * @return {AuditAction|null} Normalized action or null.
 */
export function normalizeAction(action: string): AuditAction | null {
  const normalized = action.trim().toLowerCase();

  if (normalized === "start" || normalized.includes("start")) {
    return "start";
  }

  if (
    normalized === "stop" ||
    normalized.includes("stop") ||
    normalized.includes("deallocate") ||
    normalized.includes("poweroff")
  ) {
    return "stop";
  }

  return null;
}

/**
 * Checks whether a cloud log actor belongs to WiLauncher automation.
 * @param {string} actor Cloud actor label.
 * @return {boolean} True when the actor is WiLauncher.
 */
export function isWiLauncherCloudActor(actor: string): boolean {
  return actor.trim() === WILAUNCHER_ACTOR_LABEL;
}

/**
 * Merges cloud activity with WiLauncher audit logs without duplicates.
 * @param {ActivityLogEntry[]} cloudLogs Provider activity entries.
 * @param {AuditLogEntry[]} auditLogs WiLauncher audit entries.
 * @return {ActivityLogEntry[]} Combined activity newest first.
 */
export function mergeActivityLogs(
  cloudLogs: ActivityLogEntry[],
  auditLogs: AuditLogEntry[],
): ActivityLogEntry[] {
  const usedAuditIds = new Set<string>();

  const enrichedCloud = cloudLogs.map((cloudLog) => {
    if (!isWiLauncherCloudActor(cloudLog.actor)) {
      return cloudLog;
    }

    const cloudAction = normalizeAction(cloudLog.action);
    if (!cloudAction) {
      return cloudLog;
    }

    const cloudTime = Date.parse(cloudLog.timestamp);
    const match = auditLogs.find((auditLog) => {
      if (usedAuditIds.has(auditLog.id)) {
        return false;
      }

      if (auditLog.action !== cloudAction) {
        return false;
      }

      const auditTime = Date.parse(auditLog.timestamp);
      if (Number.isNaN(cloudTime) || Number.isNaN(auditTime)) {
        return false;
      }

      return Math.abs(cloudTime - auditTime) <= ACTIVITY_MATCH_WINDOW_MS;
    });

    if (!match) {
      return cloudLog;
    }

    usedAuditIds.add(match.id);
    return {
      ...cloudLog,
      actor: formatWiLauncherActor(match.actorEmail),
    };
  });

  const orphanAuditLogs = auditLogs
    .filter((auditLog) => !usedAuditIds.has(auditLog.id))
    .map((auditLog) => ({
      id: auditLog.id,
      action: auditLog.action,
      actor: formatWiLauncherActor(auditLog.actorEmail),
      timestamp: auditLog.timestamp,
      status: "Succeeded",
      operation: "wilauncher",
    }));

  return [...orphanAuditLogs, ...enrichedCloud]
    .sort((left, right) => right.timestamp.localeCompare(left.timestamp))
    .slice(0, MAX_ACTIVITY_EVENTS);
}
