import {getApps, initializeApp} from "firebase-admin/app";
import {logger} from "firebase-functions";
import {setGlobalOptions} from "firebase-functions/v2";
import {HttpsError, onCall} from "firebase-functions/v2/https";

import {
  assertAllowedRole,
  requireAuthenticatedUser,
} from "./auth/request-user.js";
import {awsSecrets} from "./aws/config.js";
import {azureSecrets} from "./azure/config.js";
import {parseMachineActionInput} from "./machines/parse-action.js";
import {parseMachineActivityInput} from "./machines/parse-activity.js";

const cloudSecrets = [...azureSecrets, ...awsSecrets];

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

export const getSessionContext = onCall(callableOptions, async (request) => {
  const user = await requireAuthenticatedUser(request);

  return {
    application: "WiLauncher",
    uid: user.uid,
    email: user.email,
    role: user.role,
  };
});

export const listMachines = onCall(
  {...callableOptions, secrets: cloudSecrets},
  async (request) => {
    const user = await requireAuthenticatedUser(request);
    await assertAllowedRole(user.role, ["viewer", "operator", "admin"]);

    const {listCloudInventory} = await import("./platform/list-inventory.js");
    return listCloudInventory();
  },
);

export const startMachine = onCall(
  {...callableOptions, secrets: cloudSecrets},
  async (request) => {
    const user = await requireAuthenticatedUser(request);
    await assertAllowedRole(user.role, ["operator", "admin"]);

    const input = parseMachineActionInput(request.data);

    if (input.provider === "azure") {
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
    }

    if (input.provider === "aws") {
      const {startAwsInstance} = await import("./aws/vm-actions.js");
      await startAwsInstance(input.region, input.machineId);

      logger.info("AWS instance start requested", {
        machineId: input.machineId,
        region: input.region,
        uid: user.uid,
        email: user.email,
      });

      return {
        machineId: input.machineId,
        status: "starting",
        message: "Solicitud de arranque enviada a AWS",
      };
    }

    throw new HttpsError(
      "unimplemented",
      `Arranque para ${input.provider} aun no esta disponible.`,
    );
  },
);

export const stopMachine = onCall(
  {...callableOptions, secrets: cloudSecrets},
  async (request) => {
    const user = await requireAuthenticatedUser(request);
    await assertAllowedRole(user.role, ["operator", "admin"]);

    const input = parseMachineActionInput(request.data);

    if (input.provider === "azure") {
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
    }

    if (input.provider === "aws") {
      const {stopAwsInstance} = await import("./aws/vm-actions.js");
      await stopAwsInstance(input.region, input.machineId);

      logger.info("AWS instance stop requested", {
        machineId: input.machineId,
        region: input.region,
        uid: user.uid,
        email: user.email,
      });

      return {
        machineId: input.machineId,
        status: "stopping",
        message: "Solicitud de apagado enviada a AWS",
      };
    }

    throw new HttpsError(
      "unimplemented",
      `Apagado para ${input.provider} aun no esta disponible.`,
    );
  },
);

export const listMachineActivity = onCall(
  {...callableOptions, secrets: cloudSecrets},
  async (request) => {
    const user = await requireAuthenticatedUser(request);
    await assertAllowedRole(user.role, ["viewer", "operator", "admin"]);

    const input = parseMachineActivityInput(request.data);

    if (input.provider === "azure") {
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
    }

    if (input.provider === "aws") {
      const {listAwsInstanceActivityLogs} =
        await import("./aws/activity-log.js");
      const logs = await listAwsInstanceActivityLogs({
        machineId: input.machineId,
        region: input.region,
      });

      logger.info("AWS instance activity listed", {
        machineId: input.machineId,
        region: input.region,
        uid: user.uid,
        count: logs.length,
      });

      return {logs};
    }

    throw new HttpsError(
      "unimplemented",
      `Actividad para ${input.provider} aun no esta disponible.`,
    );
  },
);
