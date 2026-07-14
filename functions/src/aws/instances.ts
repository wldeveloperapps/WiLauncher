import type {MachineStatus} from "../models/machine-status.js";
import {resolveAwsCredentials} from "./credentials.js";
import {
  inferEnvironment,
  mapEc2State,
  resolveInstanceName,
  tagsToRecord,
} from "./status-mapper.js";

export interface AwsInstanceSummary {
  awsResourceId: string;
  machineId: string;
  name: string;
  provider: "aws";
  region: string;
  accountId: string;
  environment: string;
  status: MachineStatus;
  instanceType?: string;
  ipAddress?: string;
}

const TERMINAL_STATES = new Set(["terminated", "shutting-down"]);

/**
 * Lists EC2 instances for a single AWS region.
 * @param {string} region AWS region name.
 * @return {Promise<AwsInstanceSummary[]>} Instance summaries.
 */
export async function listAwsInstances(
  region: string,
): Promise<AwsInstanceSummary[]> {
  const {DescribeInstancesCommand, EC2Client} =
    await import("@aws-sdk/client-ec2");
  const client = new EC2Client({
    region,
    credentials: await resolveAwsCredentials(),
  });

  const machines: AwsInstanceSummary[] = [];
  let nextToken: string | undefined;

  do {
    const response = await client.send(new DescribeInstancesCommand({
      NextToken: nextToken,
    }));

    for (const reservation of response.Reservations ?? []) {
      const accountId = reservation.OwnerId ?? "";

      for (const instance of reservation.Instances ?? []) {
        const state = instance.State?.Name;
        if (!state || TERMINAL_STATES.has(state)) {
          continue;
        }

        const instanceId = instance.InstanceId;
        if (!instanceId) {
          continue;
        }

        const tags = tagsToRecord(instance.Tags);
        const awsResourceId = accountId ?
          `arn:aws:ec2:${region}:${accountId}:instance/${instanceId}` :
          `aws:ec2:${region}:instance/${instanceId}`;

        machines.push({
          awsResourceId,
          machineId: instanceId,
          name: resolveInstanceName(tags, instanceId),
          provider: "aws",
          region,
          accountId,
          environment: inferEnvironment(tags),
          status: mapEc2State(state),
          instanceType: instance.InstanceType,
          ipAddress: instance.PublicIpAddress,
        });
      }
    }

    nextToken = response.NextToken;
  } while (nextToken);

  return machines;
}
