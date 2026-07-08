import {getAuth} from "firebase-admin/auth";
import {logger} from "firebase-functions";

import {type UserRole} from "./request-user.js";

/**
 * Attempts to persist a role in Firebase Auth custom claims.
 * @param {string} uid Firebase Auth UID.
 * @param {UserRole} role Role to persist.
 * @return {Promise<void>} Resolves when the attempt completes.
 */
export async function persistUserRole(
  uid: string,
  role: UserRole,
): Promise<void> {
  try {
    await getAuth().setCustomUserClaims(uid, {role});
  } catch (error) {
    logger.warn("Custom claims unavailable in this environment", {
      uid,
      role,
      error,
    });
  }
}
