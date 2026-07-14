import type {AwsCredentialIdentity} from "@aws-sdk/types";

import {
  awsAccessKeyId,
  awsAssumeRoleArn,
  awsSecretAccessKey,
} from "./config.js";

export const WILAUNCHER_AWS_SESSION_NAME = "wilauncher-functions";
const CREDENTIAL_REFRESH_BUFFER_MS = 60_000;

let cachedCredentials: AwsCredentialIdentity | null = null;
let credentialsExpireAt = 0;

/**
 * Creates base AWS credentials from configured secrets.
 * @return {AwsCredentialIdentity} AWS access key credentials.
 */
function createBaseAwsCredentials(): AwsCredentialIdentity {
  return {
    accessKeyId: awsAccessKeyId.value(),
    secretAccessKey: awsSecretAccessKey.value(),
  };
}

/**
 * Resolves AWS credentials, assuming the configured operator role when set.
 * @return {Promise<AwsCredentialIdentity>} Credentials for EC2 API calls.
 */
export async function resolveAwsCredentials(): Promise<AwsCredentialIdentity> {
  const roleArn = awsAssumeRoleArn.value().trim();
  if (!roleArn) {
    return createBaseAwsCredentials();
  }

  if (cachedCredentials && Date.now() < credentialsExpireAt) {
    return cachedCredentials;
  }

  const {AssumeRoleCommand, STSClient} = await import("@aws-sdk/client-sts");
  const sts = new STSClient({
    region: "eu-west-1",
    credentials: createBaseAwsCredentials(),
  });

  const response = await sts.send(new AssumeRoleCommand({
    RoleArn: roleArn,
    RoleSessionName: WILAUNCHER_AWS_SESSION_NAME,
    DurationSeconds: 3600,
  }));

  const credentials = response.Credentials;
  if (
    !credentials?.AccessKeyId ||
    !credentials.SecretAccessKey ||
    !credentials.SessionToken
  ) {
    throw new Error("AssumeRole no devolvio credenciales temporales.");
  }

  cachedCredentials = {
    accessKeyId: credentials.AccessKeyId,
    secretAccessKey: credentials.SecretAccessKey,
    sessionToken: credentials.SessionToken,
  };
  credentialsExpireAt =
    (credentials.Expiration?.getTime() ?? Date.now() + 3_600_000) -
    CREDENTIAL_REFRESH_BUFFER_MS;

  return cachedCredentials;
}
