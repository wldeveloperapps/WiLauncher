import {awsAssumeRoleArn} from "./config.js";
import {
  resolveAwsCredentials,
  WILAUNCHER_AWS_SESSION_NAME,
} from "./credentials.js";

const WILAUNCHER_ACTOR_LABEL = "WiLauncher";

const LOOKBACK_DAYS = 30;
const MAX_EVENTS = 50;
const TRACKED_EVENT_NAMES = new Set([
  "StartInstances",
  "StopInstances",
]);

export interface AwsInstanceActivityLog {
  id: string;
  action: string;
  actor: string;
  timestamp: string;
  status: string;
  operation: string;
}

export interface ListAwsInstanceActivityOptions {
  machineId: string;
  region: string;
}

/**
 * Lists start/stop CloudTrail events for an EC2 instance.
 * @param {ListAwsInstanceActivityOptions} options Query options.
 * @return {Promise<AwsInstanceActivityLog[]>} Activity entries newest first.
 */
export async function listAwsInstanceActivityLogs(
  options: ListAwsInstanceActivityOptions,
): Promise<AwsInstanceActivityLog[]> {
  const {machineId, region} = options;
  const until = new Date();
  const since = new Date(until);
  since.setDate(since.getDate() - LOOKBACK_DAYS);

  const {CloudTrailClient, LookupEventsCommand} =
    await import("@aws-sdk/client-cloudtrail");
  const client = new CloudTrailClient({
    region,
    credentials: await resolveAwsCredentials(),
  });

  const events = [];
  let nextToken: string | undefined;

  do {
    const response = await client.send(new LookupEventsCommand({
      LookupAttributes: [
        {
          AttributeKey: "ResourceName",
          AttributeValue: machineId,
        },
      ],
      StartTime: since,
      EndTime: until,
      MaxResults: 50,
      NextToken: nextToken,
    }));

    for (const event of response.Events ?? []) {
      if (!event.EventName || !TRACKED_EVENT_NAMES.has(event.EventName)) {
        continue;
      }

      if (!event.EventId || !event.EventTime) {
        continue;
      }

      events.push({
        id: event.EventId,
        action: mapEventAction(event.EventName),
        actor: resolveActor(event),
        timestamp: event.EventTime.toISOString(),
        status: "Succeeded",
        operation: event.EventName,
      });
    }

    nextToken = response.NextToken;
  } while (nextToken && events.length < MAX_EVENTS);

  return events
    .sort((left, right) => right.timestamp.localeCompare(left.timestamp))
    .slice(0, MAX_EVENTS);
}

/**
 * Maps CloudTrail event names to UI action labels.
 * @param {string} eventName CloudTrail event name.
 * @return {string} Action label.
 */
function mapEventAction(eventName: string): string {
  if (eventName === "StartInstances") {
    return "Start";
  }
  if (eventName === "StopInstances") {
    return "Stop";
  }
  return eventName;
}

interface CloudTrailUserIdentity {
  type?: string;
  userName?: string;
  arn?: string;
}

/**
 * Parses userIdentity from a CloudTrail event payload.
 * @param {string|undefined} cloudTrailEvent Serialized CloudTrail event.
 * @return {CloudTrailUserIdentity|undefined} Parsed user identity.
 */
function parseUserIdentity(
  cloudTrailEvent: string | undefined,
): CloudTrailUserIdentity | undefined {
  if (!cloudTrailEvent) {
    return undefined;
  }

  try {
    const parsed = JSON.parse(cloudTrailEvent) as {
      userIdentity?: CloudTrailUserIdentity;
    };
    return parsed.userIdentity;
  } catch {
    return undefined;
  }
}

/**
 * Extracts the role name from an AWS IAM role ARN.
 * @param {string} roleArn IAM role ARN.
 * @return {string} Role name or empty string.
 */
function parseRoleName(roleArn: string): string {
  const match = roleArn.match(/\/role\/([^/]+)$/i);
  return match?.[1] ?? "";
}

/**
 * Checks whether a CloudTrail event was triggered by WiLauncher.
 * @param {string} rawActor Raw actor label from CloudTrail.
 * @param {CloudTrailUserIdentity|undefined} userIdentity Parsed user identity.
 * @return {boolean} True when the event belongs to WiLauncher.
 */
function isWiLauncherActor(
  rawActor: string,
  userIdentity: CloudTrailUserIdentity | undefined,
): boolean {
  if (rawActor === WILAUNCHER_AWS_SESSION_NAME) {
    return true;
  }

  const configuredRoleArn = awsAssumeRoleArn.value().trim();
  const configuredRoleName = parseRoleName(configuredRoleArn);
  const identityArn = userIdentity?.arn ?? "";

  if (
    configuredRoleName &&
    identityArn.includes(`/assumed-role/${configuredRoleName}/`) &&
    identityArn.endsWith(`/${WILAUNCHER_AWS_SESSION_NAME}`)
  ) {
    return true;
  }

  return userIdentity?.userName === WILAUNCHER_AWS_SESSION_NAME;
}

/**
 * Resolves the actor label from a CloudTrail event.
 * @param {object} event CloudTrail event.
 * @return {string} Actor label.
 */
function resolveActor(event: {
  Username?: string;
  CloudTrailEvent?: string;
}): string {
  const userIdentity = parseUserIdentity(event.CloudTrailEvent);
  const rawActor = event.Username?.trim() ??
    userIdentity?.userName ??
    userIdentity?.arn?.split("/").pop() ??
    "AWS";

  if (isWiLauncherActor(rawActor, userIdentity)) {
    return WILAUNCHER_ACTOR_LABEL;
  }

  return rawActor;
}
