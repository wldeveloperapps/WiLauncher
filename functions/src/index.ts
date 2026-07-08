import {getApps, initializeApp} from "firebase-admin/app";
import {getAuth} from "firebase-admin/auth";
import {logger} from "firebase-functions";
import {setGlobalOptions} from "firebase-functions/v2";
import {HttpsError, onCall} from "firebase-functions/v2/https";

import {
  assertAllowedRole,
  parseDevRole,
  requireAuthenticatedUser,
} from "./auth/request-user.js";
import {azureSecrets} from "./azure/config.js";
import {parseMachineActionInput} from "./machines/parse-action.js";

if (!getApps().length) {
  initializeApp();
}

const callableOptions = {
  invoker: "public",
} as const;

setGlobalOptions({
  maxInstances: 10,
  region: "europe-west1",
});

export const ping = onCall(callableOptions, async () => ({
  application: "WiLauncher",
  status: "running",
  message: "Backend funcionando correctamente",
  timestamp: new Date().toISOString(),
}));

export const getSessionContext = onCall(callableOptions, async (request) => {
  const user = requireAuthenticatedUser(request);

  return {
    application: "WiLauncher",
    uid: user.uid,
    email: user.email,
    role: user.role,
  };
});

export const setDevRole = onCall(callableOptions, async (request) => {
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

export const listMachines = onCall(
  {...callableOptions, secrets: azureSecrets},
  async (request) => {
    const user = requireAuthenticatedUser(request);
    await assertAllowedRole(user.role, ["viewer", "operator", "admin"]);

    const {listAzureInventory} = await import("./azure/list-inventory.js");
    return listAzureInventory();
  },
);

export const startMachine = onCall(
  {...callableOptions, secrets: azureSecrets},
  async (request) => {
    const user = requireAuthenticatedUser(request);
    await assertAllowedRole(user.role, ["operator", "admin"]);

    const input = parseMachineActionInput(request.data);

    if (input.provider !== "azure") {
      throw new HttpsError(
        "unimplemented",
        `Arranque para ${input.provider} aun no esta disponible.`,
      );
    }

    const {startAzureVirtualMachine} = await import("./azure/vm-actions.js");
    await startAzureVirtualMachine(
      input.subscriptionId,
      input.resourceGroup,
      input.machineId,
    );

    logger.info("Azure VM start requested", {
      machineId: input.machineId,
      uid: user.uid,
      email: user.email,
    });

    return {
      machineId: input.machineId,
      status: "starting",
      message: "Solicitud de arranque enviada a Azure",
    };
  },
);

export const stopMachine = onCall(
  {...callableOptions, secrets: azureSecrets},
  async (request) => {
    const user = requireAuthenticatedUser(request);
    await assertAllowedRole(user.role, ["operator", "admin"]);

    const input = parseMachineActionInput(request.data);

    if (input.provider !== "azure") {
      throw new HttpsError(
        "unimplemented",
        `Apagado para ${input.provider} aun no esta disponible.`,
      );
    }

    const {stopAzureVirtualMachine} = await import("./azure/vm-actions.js");
    await stopAzureVirtualMachine(
      input.subscriptionId,
      input.resourceGroup,
      input.machineId,
    );

    logger.info("Azure VM stop requested", {
      machineId: input.machineId,
      uid: user.uid,
      email: user.email,
    });

    return {
      machineId: input.machineId,
      status: "stopping",
      message: "Solicitud de apagado enviada a Azure",
    };
  },
);

export const listAzureSubscriptionsCallable = onCall(
  {...callableOptions, secrets: azureSecrets},
  async (request) => {
    const user = requireAuthenticatedUser(request);
    await assertAllowedRole(user.role, ["admin"]);

    const {listAzureSubscriptions} = await import("./azure/subscriptions.js");
    const subscriptions = await listAzureSubscriptions();
    return {subscriptions};
  },
);
