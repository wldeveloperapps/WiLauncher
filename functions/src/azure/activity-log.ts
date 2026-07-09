import {logger} from "firebase-functions";

import {azureClientId, azureClientObjectId} from "./config.js";
import {createAzureCredential} from "./credentials.js";

const WILAUNCHER_ACTOR_LABEL = "WiLauncher";
const AUTOMATED_ACTOR_LABEL = "Automatizado";
const GUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const LOOKBACK_DAYS = 30;
const MAX_EVENTS = 50;
const MAX_PAGES = 20;
const MANAGEMENT_SCOPE = "https://management.azure.com/.default";
const API_VERSION = "2015-04-01";

export interface AzureVmActivityLog {
  id: string;
  action: string;
  actor: string;
  timestamp: string;
  status: string;
  operation: string;
}

export interface ListAzureVmActivityOptions {
  subscriptionId: string;
  resourceGroup: string;
  machineId: string;
  azureResourceId?: string;
}

interface ActivityLogEvent {
  eventDataId?: string;
  eventTimestamp?: string;
  operationName?: {value?: string} | string;
  status?: {value?: string} | string;
  caller?: string;
  claims?: Record<string, string>;
  resourceId?: string;
  resourceUri?: string;
}

interface ActivityLogResponse {
  value?: ActivityLogEvent[];
  nextLink?: string;
}

/**
 * Lists start/stop activity log entries for an Azure virtual machine.
 * @param {ListAzureVmActivityOptions} options Query options.
 * @return {Promise<AzureVmActivityLog[]>} Activity entries newest first.
 */
export async function listAzureVmActivityLogs(
  options: ListAzureVmActivityOptions,
): Promise<AzureVmActivityLog[]> {
  const {subscriptionId, resourceGroup, machineId, azureResourceId} = options;
  const until = new Date();
  const since = new Date(until);
  since.setDate(since.getDate() - LOOKBACK_DAYS);
  const timeFilter = buildTimeRangeFilter(since, until);

  const resourceUri = azureResourceId?.trim() || buildVmResourceId(
    subscriptionId,
    resourceGroup,
    machineId,
  );

  let events = await queryActivityLogs(
    subscriptionId,
    `${timeFilter} and resourceUri eq '${resourceUri}'`,
  );
  if (events.length > 0) {
    return finalize(events);
  }

  events = await queryActivityLogs(
    subscriptionId,
    `${timeFilter} and resourceGroupName eq '${resourceGroup}'`,
    machineId,
  );

  return finalize(events);
}

/**
 * Builds the canonical Azure resource ID for a virtual machine.
 * @param {string} subscriptionId Azure subscription ID.
 * @param {string} resourceGroup Resource group name.
 * @param {string} machineId Virtual machine name.
 * @return {string} Azure resource ID.
 */
function buildVmResourceId(
  subscriptionId: string,
  resourceGroup: string,
  machineId: string,
): string {
  return [
    `/subscriptions/${subscriptionId}`,
    `/resourceGroups/${resourceGroup}`,
    "/providers/Microsoft.Compute/virtualMachines",
    `/${machineId}`,
  ].join("");
}

/**
 * Builds the OData time range filter required by Azure Activity Log.
 * @param {Date} since Start of the lookback window.
 * @param {Date} until End of the lookback window.
 * @return {string} OData filter clause.
 */
function buildTimeRangeFilter(since: Date, until: Date): string {
  return [
    `eventTimestamp ge '${since.toISOString()}'`,
    `eventTimestamp le '${until.toISOString()}'`,
  ].join(" and ");
}

/**
 * Queries Azure Activity Log at subscription scope.
 * @param {string} subscriptionId Azure subscription ID.
 * @param {string} filter OData filter.
 * @param {string|undefined} machineId VM name for client-side filtering.
 * @return {Promise<AzureVmActivityLog[]>} Mapped activity entries.
 */
async function queryActivityLogs(
  subscriptionId: string,
  filter: string,
  machineId?: string,
): Promise<AzureVmActivityLog[]> {
  try {
    const credential = createAzureCredential();
    const accessToken = await credential.getToken(MANAGEMENT_SCOPE);
    if (!accessToken?.token) {
      logger.warn("Azure activity log token unavailable");
      return [];
    }

    const url =
      "https://management.azure.com/subscriptions/" +
      `${subscriptionId}/providers/Microsoft.Insights/` +
      "eventtypes/management/values" +
      `?api-version=${API_VERSION}` +
      `&$filter=${encodeURIComponent(filter)}`;

    const rawEvents = await fetchAllActivityPages(
      url,
      accessToken.token,
      filter,
    );
    const events: AzureVmActivityLog[] = [];

    for (const event of rawEvents) {
      if (machineId && !matchesMachine(event, machineId)) {
        continue;
      }

      const operation = readOperationName(event.operationName);
      const action = mapOperation(operation);
      if (!action) {
        continue;
      }

      events.push({
        id: event.eventDataId ?? `${operation}-${event.eventTimestamp}`,
        action,
        actor: resolveActor(event),
        timestamp: event.eventTimestamp ?? new Date().toISOString(),
        status: readStatus(event.status),
        operation,
      });
    }

    return events;
  } catch (error) {
    logger.warn("Azure activity log query error", {filter, error});
    return [];
  }
}

/**
 * Fetches all pages from an Azure Activity Log query.
 * @param {string} initialUrl First page URL.
 * @param {string} token Azure access token.
 * @param {string} filter OData filter for logging.
 * @return {Promise<ActivityLogEvent[]>} Combined raw events.
 */
async function fetchAllActivityPages(
  initialUrl: string,
  token: string,
  filter: string,
): Promise<ActivityLogEvent[]> {
  const events: ActivityLogEvent[] = [];
  let url: string | null = initialUrl;
  let page = 0;

  while (url && page < MAX_PAGES && events.length < MAX_EVENTS * 4) {
    page += 1;

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      const details = await response.text();
      logger.warn("Azure activity log query failed", {
        status: response.status,
        filter,
        page,
        details,
      });
      break;
    }

    const payload = await response.json() as ActivityLogResponse;
    events.push(...(payload.value ?? []));
    url = payload.nextLink ?? null;
  }

  return events;
}

/**
 * Sorts, deduplicates and limits activity events.
 * @param {AzureVmActivityLog[]} events Raw events.
 * @return {AzureVmActivityLog[]} Sorted events.
 */
function finalize(events: AzureVmActivityLog[]): AzureVmActivityLog[] {
  return deduplicateActivityEvents(events)
    .sort((left, right) => right.timestamp.localeCompare(left.timestamp))
    .slice(0, MAX_EVENTS);
}

const DEDUP_WINDOW_MS = 2 * 60 * 1000;

/**
 * Ranks Azure activity statuses so one operation can be collapsed.
 * @param {string} status Azure status label.
 * @return {number} Higher means more useful for display.
 */
function statusRank(status: string): number {
  switch (status.toLowerCase()) {
  case "succeeded":
    return 100;
  case "failed":
    return 90;
  case "accepted":
    return 50;
  case "started":
    return 40;
  default:
    return 0;
  }
}

/**
 * Picks the most representative event from one operation group.
 * @param {AzureVmActivityLog[]} group Events belonging to the same operation.
 * @return {AzureVmActivityLog} Best event for the UI.
 */
function pickBestEvent(group: AzureVmActivityLog[]): AzureVmActivityLog {
  return group.reduce((best, current) => {
    const bestRank = statusRank(best.status);
    const currentRank = statusRank(current.status);
    if (currentRank > bestRank) {
      return current;
    }
    if (currentRank === bestRank && current.timestamp > best.timestamp) {
      return current;
    }
    return best;
  });
}

/**
 * Collapses Azure lifecycle duplicates (Started/Accepted/Succeeded).
 * @param {AzureVmActivityLog[]} events Raw mapped events.
 * @return {AzureVmActivityLog[]} One row per real user action.
 */
function deduplicateActivityEvents(
  events: AzureVmActivityLog[],
): AzureVmActivityLog[] {
  const sorted = [...events].sort((left, right) =>
    left.timestamp.localeCompare(right.timestamp),
  );
  const groups: AzureVmActivityLog[][] = [];

  for (const event of sorted) {
    const eventMs = Date.parse(event.timestamp);
    const matchingGroup = groups.find((group) => {
      if (group[0].action !== event.action || group[0].actor !== event.actor) {
        return false;
      }

      return group.some((member) => {
        const memberMs = Date.parse(member.timestamp);
        return Math.abs(eventMs - memberMs) <= DEDUP_WINDOW_MS;
      });
    });

    if (matchingGroup) {
      matchingGroup.push(event);
      continue;
    }

    groups.push([event]);
  }

  return groups.map(pickBestEvent);
}

/**
 * Reads an operation name from Azure event payloads.
 * @param {string|object|undefined} operationName Raw operation field.
 * @return {string} Operation name.
 */
function readOperationName(
  operationName: ActivityLogEvent["operationName"],
): string {
  if (typeof operationName === "string") {
    return operationName;
  }

  return operationName?.value ?? "";
}

/**
 * Reads a status value from Azure event payloads.
 * @param {string|object|undefined} status Raw status field.
 * @return {string} Status label.
 */
function readStatus(status: ActivityLogEvent["status"]): string {
  if (typeof status === "string") {
    return status;
  }

  return status?.value ?? "Unknown";
}

/**
 * Checks whether an activity event belongs to the target virtual machine.
 * @param {ActivityLogEvent} event Azure activity log event.
 * @param {string} machineId Virtual machine name.
 * @return {boolean} True when the event targets the VM.
 */
function matchesMachine(event: ActivityLogEvent, machineId: string): boolean {
  const resourceRef = `${event.resourceId ?? ""} ${event.resourceUri ?? ""}`
    .toLowerCase();
  const suffix = `/virtualmachines/${machineId.toLowerCase()}`;
  return resourceRef.includes(suffix);
}

/**
 * Maps Azure operation names to WiLauncher activity labels.
 * @param {string} operation Azure operation name.
 * @return {string|null} Activity label or null when ignored.
 */
function mapOperation(operation: string): string | null {
  const normalized = operation.toLowerCase();

  if (normalized.endsWith("/virtualmachines/start/action")) {
    return "start";
  }
  if (
    normalized.endsWith("/virtualmachines/deallocate/action") ||
    normalized.endsWith("/virtualmachines/poweroff/action") ||
    normalized.endsWith("/virtualmachines/stop/action")
  ) {
    return "stop";
  }

  return null;
}

/**
 * Normalizes a GUID-like identifier for comparison.
 * @param {string|undefined} value Raw identifier.
 * @return {string} Lowercase trimmed value.
 */
function normalizeGuid(value: string | undefined): string {
  return value?.trim().toLowerCase() ?? "";
}

/**
 * Checks whether an activity event was triggered by the WiLauncher SP.
 * @param {ActivityLogEvent} event Azure activity log event.
 * @return {boolean} True when the event belongs to WiLauncher.
 */
function isWiLauncherActor(event: ActivityLogEvent): boolean {
  const clientId = normalizeGuid(azureClientId.value());
  const objectId = normalizeGuid(azureClientObjectId.value());
  if (!clientId && !objectId) {
    return false;
  }

  const claims = event.claims ?? {};
  const appId = normalizeGuid(claims.appid);
  const caller = normalizeGuid(event.caller);

  if (clientId && (appId === clientId || caller === clientId)) {
    return true;
  }

  return Boolean(objectId && caller === objectId);
}

/**
 * Resolves the actor that triggered an Azure activity log event.
 * @param {ActivityLogEvent} event Azure activity log event.
 * @return {string} Actor label.
 */
function resolveActor(event: ActivityLogEvent): string {
  const claims = event.claims ?? {};
  const humanCandidates = [
    claims["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress"],
    claims["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/upn"],
    claims["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name"],
    claims.email,
    claims.upn,
    claims.name,
  ];

  for (const candidate of humanCandidates) {
    if (typeof candidate === "string" && candidate.trim()) {
      return candidate.trim();
    }
  }

  if (isWiLauncherActor(event)) {
    return WILAUNCHER_ACTOR_LABEL;
  }

  if (typeof event.caller === "string" && event.caller.trim()) {
    const caller = event.caller.trim();
    if (GUID_PATTERN.test(caller)) {
      return AUTOMATED_ACTOR_LABEL;
    }
    return caller;
  }

  return "Azure";
}
