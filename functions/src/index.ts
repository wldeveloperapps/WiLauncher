import {getApps, initializeApp} from "firebase-admin/app";
import {getAuth} from "firebase-admin/auth";
import {setGlobalOptions} from "firebase-functions/v2";
import {HttpsError, onCall} from "firebase-functions/v2/https";
import {onSchedule} from "firebase-functions/v2/scheduler";

import {
  assertAllowedRole,
  parseDevRole,
  requireAuthenticatedUser,
} from "./auth/request-user.js";
import {
  azureSecrets,
  azureSyncEnabled,
} from "./azure/config.js";
import {listAzureSubscriptions} from "./azure/subscriptions.js";
import {syncAzureInventoryToFirestore} from "./azure/sync-inventory.js";
import {MACHINES_COLLECTION} from "./machines/constants.js";
import {parseMachineActionInput} from "./machines/parse-action.js";
import {getDb, upsertMachineTransition} from "./machines/transitions.js";

if (!getApps().length) {
  initializeApp();
}

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

export const setDevRole = onCall(async (request) => {
  if (process.env.FUNCTIONS_EMULATOR !== "true") {
    throw new HttpsError(
      "permission-denied",
      "setDevRole solo esta disponible con emuladores locales.",
    );
  }

  const user = requireAuthenticatedUser(request);
  const role = parseDevRole(request.data);

  await getAuth().setCustomUserClaims(user.uid, {role});

  return {role};
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

export const listAzureSubscriptionsCallable = onCall(
  {secrets: azureSecrets},
  async (request) => {
    const user = requireAuthenticatedUser(request);
    await assertAllowedRole(user.role, ["admin"]);

    const subscriptions = await listAzureSubscriptions();
    return {subscriptions};
  },
);

export const syncAzureMachines = onCall(
  {secrets: azureSecrets},
  async (request) => {
    const user = requireAuthenticatedUser(request);
    await assertAllowedRole(user.role, ["operator", "admin"]);

    if (azureSyncEnabled.value() !== "true") {
      throw new HttpsError(
        "failed-precondition",
        "AZURE_SYNC_ENABLED no esta activo.",
      );
    }

    return syncAzureInventoryToFirestore();
  },
);

export const syncAzureMachinesScheduled = onSchedule(
  {
    schedule: "every 5 minutes",
    secrets: azureSecrets,
  },
  async () => {
    if (azureSyncEnabled.value() !== "true") {
      return;
    }

    await syncAzureInventoryToFirestore();
  },
);
