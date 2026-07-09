import {logger} from "firebase-functions";

import {createAzureCredential} from "./credentials.js";

const LOOKBACK_DAYS = 30;
const MAX_EVENTS = 50;
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
  operationName?: {value?: string; localizedValue?: string} | string;
  status?: {value?: string} | string;
  caller?: string;
  claims?: Record<string, string>;
  resourceId?: string;
  resourceUri?: string;
  authorization?: {
    evidence?: {
      principalId?: string;
      principalType?: string;
    };
  };
}

interface ActivityLogResponse {
  value?: ActivityLogEvent[];
  nextLink?: string;
}

const DEBUG_ACTIVITY_LOG = process.env.ACTIVITY_LOG_DEBUG === "true";

/**
 * Builds the canonical Azure resource ID for a virtual machine.
 * @param {string} subscriptionId Azure subscription ID.
 * @param {string} resourceGroup Resource group name.
 * @param {string} machineId Virtual machine name.
 * @return {string} Azure resource ID.
 */
export function buildVmResourceId(
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

  const builtResourceId = buildVmResourceId(
    subscriptionId,
    resourceGroup,
    machineId,
  );
  const resourceUris = expandResourceUriCandidates(
    azureResourceId,
    builtResourceId,
  );

  const events = await queryActivityLogs(
    subscriptionId,
    `${timeFilter} and resourceGroupName eq '${resourceGroup}'`,
    machineId,
  );
  const diagnostics = [{
    strategy: "resourceGroupName",
    raw: events.rawCount,
    mapped: events.items.length,
  }];
  if (events.items.length > 0) {
    return finalize(events.items);
  }

  for (const resourceUri of resourceUris) {
    const attempt = await queryActivityLogs(
      subscriptionId,
      `${timeFilter} and resourceUri eq '${resourceUri}'`,
    );
    diagnostics.push({
      strategy: `resourceUri:${resourceUri}`,
      raw: attempt.rawCount,
      mapped: attempt.items.length,
    });
    if (attempt.items.length > 0) {
      return finalize(attempt.items);
    }
  }

  const providerAttempt = await queryActivityLogs(
    subscriptionId,
    `${timeFilter} and resourceProvider eq 'Microsoft.Compute'`,
    machineId,
  );
  diagnostics.push({
    strategy: "resourceProvider:Microsoft.Compute",
    raw: providerAttempt.rawCount,
    mapped: providerAttempt.items.length,
  });
  if (providerAttempt.items.length > 0) {
    return finalize(providerAttempt.items);
  }

  const subscriptionAttempt = await queryActivityLogs(
    subscriptionId,
    timeFilter,
    machineId,
  );
  diagnostics.push({
    strategy: "subscriptionTimeOnly",
    raw: subscriptionAttempt.rawCount,
    mapped: subscriptionAttempt.items.length,
  });

  if (subscriptionAttempt.items.length === 0) {
    const totalRaw = diagnostics.reduce((sum, entry) => sum + entry.raw, 0);
    logger.warn("Azure activity log empty for all strategies", {
      machineId,
      subscriptionId,
      resourceGroup,
      azureResourceId,
      totalRaw,
      diagnostics,
      hint: totalRaw === 0 ?
        "El service principal probablemente no tiene Monitoring Reader. " +
        "Azure devuelve 200 con value=[] sin permiso de lectura." :
        "Azure devolvio eventos pero ninguno paso el filtro " +
        "start/stop de la VM.",
    });
  }

  return finalize(subscriptionAttempt.items);
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
 * @return {Promise<object>} Mapped items and raw event count.
 */
async function queryActivityLogs(
  subscriptionId: string,
  filter: string,
  machineId?: string,
): Promise<{items: AzureVmActivityLog[]; rawCount: number}> {
  const url =
    "https://management.azure.com/subscriptions/" +
    `${subscriptionId}/providers/Microsoft.Insights/` +
    "eventtypes/management/values" +
    `?api-version=${API_VERSION}` +
    `&$filter=${encodeURIComponent(filter)}`;

  return fetchAndMapEvents(url, filter, machineId);
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

  while (url && page < 20 && events.length < MAX_EVENTS * 4) {
    page += 1;

    if (DEBUG_ACTIVITY_LOG) {
      logger.info("Azure activity log HTTP request", {
        page,
        method: "GET",
        url,
        headers: {
          Authorization: "Bearer <redacted>",
          Accept: "application/json",
        },
        body: null,
        filter,
      });
    }

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
    });

    const text = await response.text();
    if (!response.ok) {
      logger.warn("Azure activity log query failed", {
        status: response.status,
        filter,
        page,
        details: text,
      });
      break;
    }

    const payload = JSON.parse(text) as ActivityLogResponse;
    const pageCount = payload.value?.length ?? 0;
    events.push(...(payload.value ?? []));

    if (DEBUG_ACTIVITY_LOG) {
      logger.info("Azure activity log HTTP response", {
        page,
        status: response.status,
        pageCount,
        accumulated: events.length,
        hasNextLink: Boolean(payload.nextLink),
        sample: payload.value?.[0] ? {
          eventTimestamp: payload.value[0].eventTimestamp,
          operationName: payload.value[0].operationName,
          resourceId: payload.value[0].resourceId,
        } : null,
      });
    }

    url = payload.nextLink ?? null;
  }

  return events;
}

/**
 * Fetches Azure Activity Log events and maps them to WiLauncher entries.
 * @param {string} url Activity Log REST URL.
 * @param {string} filter OData filter for logging.
 * @param {string|undefined} machineId VM name for client-side filtering.
 * @return {Promise<object>} Mapped items and raw event count.
 */
async function fetchAndMapEvents(
  url: string,
  filter: string,
  machineId?: string,
): Promise<{items: AzureVmActivityLog[]; rawCount: number}> {
  try {
    const credential = createAzureCredential();
    const accessToken = await credential.getToken(MANAGEMENT_SCOPE);
    if (!accessToken?.token) {
      logger.warn("Azure activity log token unavailable");
      return {items: [], rawCount: 0};
    }

    const rawEvents = await fetchAllActivityPages(
      url,
      accessToken.token,
      filter,
    );
    const rawCount = rawEvents.length;
    const events: AzureVmActivityLog[] = [];
    const skippedOperations: string[] = [];

    for (const event of rawEvents) {
      if (machineId && !matchesMachine(event, machineId)) {
        continue;
      }

      const operation = readOperationName(event.operationName);
      const action = mapOperation(operation);
      if (!action) {
        if (skippedOperations.length < 5 && operation) {
          skippedOperations.push(operation);
        }
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

    if (rawCount > 0 && events.length === 0) {
      logger.info("Azure activity log events filtered out", {
        filter,
        rawCount,
        machineId,
        skippedOperations,
        sampleResourceId: rawEvents[0]?.resourceId,
      });
    }

    return {items: events, rawCount};
  } catch (error) {
    logger.warn("Azure activity log query error", {filter, error});
    return {items: [], rawCount: 0};
  }
}

/**
 * Sorts and limits activity events.
 * @param {AzureVmActivityLog[]} events Raw events.
 * @return {AzureVmActivityLog[]} Sorted events.
 */
function finalize(events: AzureVmActivityLog[]): AzureVmActivityLog[] {
  return events
    .sort((left, right) => right.timestamp.localeCompare(left.timestamp))
    .slice(0, MAX_EVENTS);
}

/**
 * Expands resource URI candidates with original and lowercase variants.
 * @param {Array<string|undefined>} values Candidate resource URIs.
 * @return {string[]} URI candidates for OData filters.
 */
function expandResourceUriCandidates(
  ...values: Array<string | undefined>
): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const value of values) {
    const trimmed = value?.trim();
    if (!trimmed) {
      continue;
    }

    for (const candidate of [trimmed, trimmed.toLowerCase()]) {
      if (seen.has(candidate)) {
        continue;
      }
      seen.add(candidate);
      result.push(candidate);
    }
  }

  return result;
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
 * Resolves the actor that triggered an Azure activity log event.
 * @param {ActivityLogEvent} event Azure activity log event.
 * @return {string} Actor label.
 */
function resolveActor(event: ActivityLogEvent): string {
  const claims = event.claims ?? {};
  const candidates = [
    event.caller,
    claims["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress"],
    claims["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/upn"],
    claims["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name"],
    claims.email,
    claims.upn,
    claims.name,
    claims.appidacr,
    event.authorization?.evidence?.principalId,
  ];

  for (const candidate of candidates) {
    if (typeof candidate === "string" && candidate.trim()) {
      return candidate.trim();
    }
  }

  return "Azure";
}
