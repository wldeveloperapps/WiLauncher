import {defineSecret, defineString} from "firebase-functions/params";

export const awsAccessKeyId = defineSecret("AWS_ACCESS_KEY_ID");
export const awsSecretAccessKey = defineSecret("AWS_SECRET_ACCESS_KEY");

/** Rol EC2 operator asumido por el usuario IAM de Firebase Functions. */
export const awsAssumeRoleArn = defineString("AWS_ASSUME_ROLE_ARN", {
  default: "arn:aws:iam::726899533521:role/WilocEC2OperatorRole",
});

/** CSV opcional: "eu-west-1,eu-central-1". Vacio = eu-west-1. */
export const awsRegions = defineString("AWS_REGIONS", {
  default: "eu-west-1",
});

export const awsSyncEnabled = defineString("AWS_SYNC_ENABLED", {
  default: "false",
});

export const awsSecrets = [
  awsAccessKeyId,
  awsSecretAccessKey,
];
