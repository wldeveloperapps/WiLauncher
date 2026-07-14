import {resolveAwsCredentials} from "./credentials.js";

/**
 * Starts an AWS EC2 instance.
 * @param {string} region AWS region name.
 * @param {string} instanceId EC2 instance ID.
 * @return {Promise<void>} Resolves when the start operation is accepted.
 */
export async function startAwsInstance(
  region: string,
  instanceId: string,
): Promise<void> {
  const {EC2Client, StartInstancesCommand} =
    await import("@aws-sdk/client-ec2");
  const credentials = await resolveAwsCredentials();
  const client = new EC2Client({
    region,
    credentials,
  });

  await client.send(new StartInstancesCommand({
    InstanceIds: [instanceId],
  }));
}

/**
 * Stops an AWS EC2 instance.
 * @param {string} region AWS region name.
 * @param {string} instanceId EC2 instance ID.
 * @return {Promise<void>} Resolves when the stop operation is accepted.
 */
export async function stopAwsInstance(
  region: string,
  instanceId: string,
): Promise<void> {
  const {EC2Client, StopInstancesCommand} = await import("@aws-sdk/client-ec2");
  const credentials = await resolveAwsCredentials();
  const client = new EC2Client({
    region,
    credentials,
  });

  await client.send(new StopInstancesCommand({
    InstanceIds: [instanceId],
  }));
}
