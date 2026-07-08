import {HttpsError, type CallableRequest} from "firebase-functions/v2/https";

export const ROLES = ["viewer", "operator", "admin"] as const;
export type UserRole = (typeof ROLES)[number];

const DEV_FIREBASE_PROJECT_IDS = new Set(["wilauncher-9e648"]);

/**
 * Whether the deployment allows dev-only role management.
 * @return {boolean} True for emulators or the dev Firebase project.
 */
export function isDevDeployment(): boolean {
  if (process.env.FUNCTIONS_EMULATOR === "true") {
    return true;
  }

  const projectId = process.env.GCLOUD_PROJECT ?? process.env.GCP_PROJECT ?? "";
  return DEV_FIREBASE_PROJECT_IDS.has(projectId);
}

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

  const role = await resolveRequestRole(
    request.auth.uid,
    request.auth.token.role,
  );

  return {
    uid: request.auth.uid,
    email: request.auth.token.email ?? null,
    role,
  };
}

/**
 * Resolves the effective role for a request.
 * @param {string} uid Firebase Auth UID (unused until Firestore roles exist).
 * @param {unknown} rawClaimRole Role from custom claims.
 * @return {Promise<UserRole>} Effective role.
 */
export async function resolveRequestRole(
  uid: string,
  rawClaimRole: unknown,
): Promise<UserRole> {
  void uid;
  const claimRole = resolveUserRole(rawClaimRole);
  if (claimRole !== "viewer") {
    return claimRole;
  }

  if (isDevDeployment()) {
    return "operator";
  }

  return "viewer";
}

/**
 * Resolves the role from auth custom claims.
 * @param {unknown} rawRole Role value from custom claims.
 * @return {UserRole} Normalized role.
 */
export function resolveUserRole(rawRole: unknown): UserRole {
  if (typeof rawRole !== "string") {
    return "viewer";
  }

  const normalizedRole = rawRole.toLowerCase() as UserRole;
  if (ROLES.includes(normalizedRole)) {
    return normalizedRole;
  }

  return "viewer";
}

/**
 * Parses dev role payload for emulator-only callable.
 * @param {unknown} data Raw callable payload.
 * @return {UserRole} Parsed role.
 */
export function parseDevRole(data: unknown): UserRole {
  if (!data || typeof data !== "object") {
    throw new HttpsError("invalid-argument", "Debes indicar un rol.");
  }

  const role = (data as {role?: string}).role?.trim().toLowerCase() as UserRole;
  if (!role || !ROLES.includes(role)) {
    throw new HttpsError(
      "invalid-argument",
      "role debe ser viewer, operator o admin.",
    );
  }

  return role;
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
