import {HttpsError, type CallableRequest} from "firebase-functions/v2/https";

export const ROLES = ["viewer", "operator", "admin"] as const;
export type UserRole = (typeof ROLES)[number];

export interface RequestUserContext {
  uid: string;
  email: string | null;
  role: UserRole;
}

/**
 * Ensures request comes from authenticated Firebase user.
 * @param {CallableRequest<unknown>} request Incoming callable request.
 * @return {Promise<RequestUserContext>} User context.
 */
export async function requireAuthenticatedUser(
  request: CallableRequest<unknown>,
): Promise<RequestUserContext> {
  if (!request.auth?.uid) {
    throw new HttpsError("unauthenticated", "Debes iniciar sesion.");
  }

  return {
    uid: request.auth.uid,
    email: request.auth.token.email ?? null,
    role: resolveUserRole(request.auth.token.role),
  };
}

/**
 * Resolves the role from auth custom claims.
 * @param {unknown} rawRole Role value from custom claims.
 * @return {UserRole} Normalized role.
 */
export function resolveUserRole(rawRole: unknown): UserRole {
  if (typeof rawRole !== "string") {
    // Interim default for authenticated ops users until custom claims
    // are assigned per account in Firebase Auth.
    return "operator";
  }

  const normalizedRole = rawRole.toLowerCase() as UserRole;
  if (ROLES.includes(normalizedRole)) {
    return normalizedRole;
  }

  return "operator";
}

/**
 * Validates that a user role can run the operation.
 * @param {UserRole} role Request user role.
 * @param {Array<UserRole>} allowed Allowed role list.
 * @return {Promise<void>} Resolves when role is valid.
 */
export async function assertAllowedRole(
  role: UserRole,
  allowed: readonly UserRole[],
): Promise<void> {
  if (!allowed.includes(role)) {
    throw new HttpsError(
      "permission-denied",
      "No tienes permisos para realizar esta accion.",
    );
  }
}
