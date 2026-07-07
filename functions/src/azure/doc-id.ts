/**
 * Encodes an Azure resource ID as a Firestore-safe document ID.
 * @param {string} azureResourceId Full Azure resource path.
 * @return {string} Base64url-encoded document ID.
 */
export function toFirestoreDocId(azureResourceId: string): string {
  return Buffer.from(azureResourceId.toLowerCase()).toString("base64url");
}
