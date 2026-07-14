/**
 * Encodes a cloud resource identifier as a stable API id.
 * @param {string} resourceId Full cloud resource identifier.
 * @return {string} Base64url-encoded id.
 */
export function toResourceId(resourceId: string): string {
  return Buffer.from(resourceId.toLowerCase()).toString("base64url");
}
