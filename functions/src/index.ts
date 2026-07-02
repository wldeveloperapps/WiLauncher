import {getApps, initializeApp} from "firebase-admin/app";
import {FieldValue, getFirestore} from "firebase-admin/firestore";
import {setGlobalOptions} from "firebase-functions/v2";
import {
  HttpsError,
  onCall,
  type CallableRequest,
} from "firebase-functions/v2/https";

if (!getApps().length) {
  initializeApp();
}

const ROLES = ["viewer", "operator", "admin"] as const;
const PROVIDERS = ["aws", "azure", "gcp", "oci"] as const;
const MACHINES_COLLECTION = "machines";
const AUDIT_LOGS_COLLECTION = "audit_logs";

type UserRole = (typeof ROLES)[number];
type Provider = (typeof PROVIDERS)[number];

interface MachineActionInput {
  machineId: string;
  provider: Provider;
  environment: string;
}

interface RequestUserContext {
  uid: string;
  email: string | null;
  role: UserRole;
}

let dbInstance: ReturnType<typeof getFirestore> | null = null;

setGlobalOptions({
  maxInstances: 10,
  region: "europe-west1",
});

export const ping = onCall(async () => ({
  application: "WiLauncher",
  status: "running",
  message: "Backend funcionando correctamente",
  timestamp: new Date().toISOString(),
}));

export const getSessionContext = onCall(async (request) => {
  const user = requireAuthenticatedUser(request);

  return {
    application: "WiLauncher",
    uid: user.uid,
    email: user.email,
    role: user.role,
  };
});

export const listMachines = onCall(async (request) => {
  const user = requireAuthenticatedUser(request);
  await assertAllowedRole(user.role, ["viewer", "operator", "admin"]);

  const machineDocs = await getDb()
    .collection(MACHINES_COLLECTION)
    .orderBy("name")
    .limit(100)
    .get();

  const machines = machineDocs.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }));

  return {machines};
});

export const startMachine = onCall(async (request) => {
  const user = requireAuthenticatedUser(request);
  await assertAllowedRole(user.role, ["operator", "admin"]);

  const input = parseMachineActionInput(request.data);
  await upsertMachineTransition(input, "starting", user);

  return {
    machineId: input.machineId,
    status: "starting",
    message: "Solicitud de arranque registrada",
  };
});

export const stopMachine = onCall(async (request) => {
  const user = requireAuthenticatedUser(request);
  await assertAllowedRole(user.role, ["operator", "admin"]);

  const input = parseMachineActionInput(request.data);
  await upsertMachineTransition(input, "stopping", user);

  return {
    machineId: input.machineId,
    status: "stopping",
    message: "Solicitud de parada registrada",
  };
});

/**
 * Ensures request comes from authenticated Firebase user.
 * @param {CallableRequest<unknown>} request Incoming callable request.
 * @return {RequestUserContext} User context.
 */
function requireAuthenticatedUser(request: CallableRequest<unknown>) {
  if (!request.auth?.uid) {
    throw new HttpsError("unauthenticated", "Debes iniciar sesion.");
  }

  const role = resolveUserRole(request.auth.token.role);
  return {
    uid: request.auth.uid,
    email: request.auth.token.email ?? null,
    role,
  };
}

/**
 * Resolves the role from auth custom claims.
 * @param {unknown} rawRole Role value from custom claims.
 * @return {UserRole} Normalized role.
 */
function resolveUserRole(rawRole: unknown): UserRole {
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
 * Validates that a user role can run the operation.
 * @param {UserRole} role Request user role.
 * @param {Array<UserRole>} allowed Allowed role list.
 * @return {Promise<void>} Resolves when role is valid.
 */
async function assertAllowedRole(
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

/**
 * Parses and validates machine action payload.
 * @param {unknown} data Raw callable payload.
 * @return {MachineActionInput} Parsed and validated input.
 */
function parseMachineActionInput(data: unknown): MachineActionInput {
  if (!data || typeof data !== "object") {
    throw new HttpsError("invalid-argument", "Faltan datos de la maquina.");
  }

  const candidate = data as Partial<MachineActionInput>;
  const machineId = candidate.machineId?.trim();
  const provider = candidate.provider?.trim().toLowerCase();
  const environment = candidate.environment?.trim();

  if (!machineId || !provider || !environment) {
    throw new HttpsError(
      "invalid-argument",
      "machineId, provider y environment son obligatorios.",
    );
  }

  if (!PROVIDERS.includes(provider as Provider)) {
    throw new HttpsError(
      "invalid-argument",
      "provider debe ser aws, azure, gcp u oci.",
    );
  }

  return {
    machineId,
    provider: provider as Provider,
    environment,
  };
}

/**
 * Stores machine transition and audit trail.
 * @param {MachineActionInput} input Machine action input.
 * @param {"starting"|"stopping"} nextStatus Target transition status.
 * @param {RequestUserContext} user User context.
 * @return {Promise<void>} Resolves when state is stored.
 */
async function upsertMachineTransition(
  input: MachineActionInput,
  nextStatus: "starting" | "stopping",
  user: RequestUserContext,
): Promise<void> {
  const db = getDb();
  const machineRef = db.collection(MACHINES_COLLECTION).doc(input.machineId);

  await machineRef.set(
    {
      machineId: input.machineId,
      provider: input.provider,
      environment: input.environment,
      status: nextStatus,
      updatedBy: user.uid,
      updatedAt: FieldValue.serverTimestamp(),
    },
    {merge: true},
  );

  await db.collection(AUDIT_LOGS_COLLECTION).add({
    action: nextStatus === "starting" ? "start_machine" : "stop_machine",
    machineId: input.machineId,
    provider: input.provider,
    environment: input.environment,
    requestedBy: {
      uid: user.uid,
      email: user.email,
      role: user.role,
    },
    createdAt: FieldValue.serverTimestamp(),
  });
}

/**
 * Returns a memoized Firestore Admin instance.
 * @return {object} Firestore instance.
 */
function getDb(): ReturnType<typeof getFirestore> {
  if (!dbInstance) {
    dbInstance = getFirestore();
  }

  return dbInstance;
}
