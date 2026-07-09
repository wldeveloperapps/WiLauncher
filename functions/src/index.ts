import {getApps, initializeApp} from "firebase-admin/app";
import {logger} from "firebase-functions";
import {setGlobalOptions} from "firebase-functions/v2";
import {HttpsError, onCall} from "firebase-functions/v2/https";

import {
  assertAllowedRole,
  isDevDeployment,
  parseDevRole,
  requireAuthenticatedUser,
  resolveUserRole,
} from "./auth/request-user.js";
import {azureSecrets} from "./azure/config.js";
import {parseMachineActionInput} from "./machines/parse-action.js";
import {parseMachineActivityInput} from "./machines/parse-activity.js";
import {persistUserRole} from "./auth/user-roles.js";

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
  const user = await requireAuthenticatedUser(request);

  return {
    application: "WiLauncher",
    uid: user.uid,
    email: user.email,
    role: user.role,
    tokenRefreshRequired: false,
  };
});

export const setDevRole = onCall(callableOptions, async (request) => {
  if (!isDevDeployment()) {
    throw new HttpsError(
      "permission-denied",
      "setDevRole solo esta disponible en entornos de desarrollo.",
    );
  }

  const user = await requireAuthenticatedUser(request);
  const role = parseDevRole(request.data);

  await persistUserRole(user.uid, role);

  return {role: resolveUserRole(role)};
});

export const listMachines = onCall(
  {...callableOptions, secrets: azureSecrets},
  async (request) => {
    const user = await requireAuthenticatedUser(request);
    await assertAllowedRole(user.role, ["viewer", "operator", "admin"]);

    const {listAzureInventory} = await import("./azure/list-inventory.js");
    return listAzureInventory();
  },
);

export const startMachine = onCall(
  {...callableOptions, secrets: azureSecrets},
  async (request) => {
    const user = await requireAuthenticatedUser(request);
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
    const user = await requireAuthenticatedUser(request);
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
    const user = await requireAuthenticatedUser(request);
    await assertAllowedRole(user.role, ["admin"]);

    const {listAzureSubscriptions} = await import("./azure/subscriptions.js");
    const subscriptions = await listAzureSubscriptions();
    return {subscriptions};
  },
);

export const listMachineActivity = onCall(
  {...callableOptions, secrets: azureSecrets},
  async (request) => {
    const user = await requireAuthenticatedUser(request);
    await assertAllowedRole(user.role, ["viewer", "operator", "admin"]);

    const input = parseMachineActivityInput(request.data);

    if (input.provider !== "azure") {
      throw new HttpsError(
        "unimplemented",
        `Actividad para ${input.provider} aun no esta disponible.`,
      );
    }

    const {listAzureVmActivityLogs} = await import("./azure/activity-log.js");
    const logs = await listAzureVmActivityLogs({
      subscriptionId: input.subscriptionId,
      resourceGroup: input.resourceGroup,
      machineId: input.machineId,
      azureResourceId: input.azureResourceId,
    });

    logger.info("Azure VM activity listed", {
      machineId: input.machineId,
      uid: user.uid,
      count: logs.length,
    });

    return {logs};
  },
);
