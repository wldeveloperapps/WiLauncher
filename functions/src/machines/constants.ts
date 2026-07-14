export const PROVIDERS = ["aws", "azure"] as const;
export type Provider = (typeof PROVIDERS)[number];
