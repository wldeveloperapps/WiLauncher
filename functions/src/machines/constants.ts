export const PROVIDERS = ["aws", "azure", "gcp", "oci"] as const;
export type Provider = (typeof PROVIDERS)[number];

export const MACHINES_COLLECTION = "machines";
export const AUDIT_LOGS_COLLECTION = "audit_logs";
