/**
 * Diagnóstico paso a paso del Activity Log de Azure.
 *
 * Uso (PowerShell, desde functions/):
 *   $env:AZURE_TENANT_ID = (firebase functions:secrets:access AZURE_TENANT_ID --project wilauncher-9e648)
 *   $env:AZURE_CLIENT_ID = (firebase functions:secrets:access AZURE_CLIENT_ID --project wilauncher-9e648)
 *   $env:AZURE_CLIENT_SECRET = (firebase functions:secrets:access AZURE_CLIENT_SECRET --project wilauncher-9e648)
 *   node scripts/diagnose-activity-log.mjs
 *
 * Opcional:
 *   $env:VM_NAME = "Wiloc-TR-Meran-PRE-00"
 */

import {ClientSecretCredential} from "@azure/identity";

const MANAGEMENT_SCOPE = "https://management.azure.com/.default";
const API_VERSION = "2015-04-01";
const LOOKBACK_DAYS = 30;

const tenantId = process.env.AZURE_TENANT_ID?.trim();
const clientId = process.env.AZURE_CLIENT_ID?.trim();
const clientSecret = process.env.AZURE_CLIENT_SECRET?.trim();
const targetVmName = process.env.VM_NAME?.trim() || "Wiloc-TR-Meran-PRE-00";

function section(title) {
  console.log(`\n${"=".repeat(72)}\n${title}\n${"=".repeat(72)}`);
}

function decodeJwtPayload(token) {
  const part = token.split(".")[1];
  if (!part) return null;
  const json = Buffer.from(part, "base64url").toString("utf8");
  return JSON.parse(json);
}

function buildTimeRangeFilter(since, until) {
  return [
    `eventTimestamp ge '${since.toISOString()}'`,
    `eventTimestamp le '${until.toISOString()}'`,
  ].join(" and ");
}

async function fetchJson(url, token, label) {
  const headers = {
    Authorization: `Bearer ${token}`,
    Accept: "application/json",
  };

  console.log(`\n--- ${label} ---`);
  console.log("METHOD: GET");
  console.log("URL:", url);
  console.log("HEADERS:", JSON.stringify({
    Authorization: "Bearer <redacted>",
    Accept: headers.Accept,
  }, null, 2));
  console.log("BODY: (ninguno — GET sin body)");

  let page = 0;
  let totalCount = 0;
  let allEvents = [];
  let nextUrl = url;

  while (nextUrl && page < 10) {
    page += 1;
    const response = await fetch(nextUrl, {headers});
    const text = await response.text();
    let json = null;
    try {
      json = text ? JSON.parse(text) : null;
    } catch {
      json = {raw: text.slice(0, 2000)};
    }

    const pageCount = Array.isArray(json?.value) ? json.value.length : 0;
    totalCount += pageCount;
    allEvents.push(...(json?.value ?? []));

    console.log(`PAGE ${page} STATUS:`, response.status, response.statusText);
    console.log(`PAGE ${page} value.length:`, pageCount);
    if (json?.nextLink) {
      console.log(`PAGE ${page} nextLink: presente`);
    }

    if (!json?.nextLink) {
      if (page === 1 && pageCount === 0) {
        console.log("RESPONSE body (truncado):", text.slice(0, 500));
      }
      break;
    }
    nextUrl = json.nextLink;
  }

  console.log("TOTAL paginado value.length:", totalCount);
  if (totalCount > 0) {
    const sample = allEvents[0];
    console.log("SAMPLE event:", JSON.stringify({
      eventTimestamp: sample.eventTimestamp,
      operationName: sample.operationName,
      resourceId: sample.resourceId,
      resourceGroupName: sample.resourceGroupName,
      caller: sample.caller,
      status: sample.status,
    }, null, 2));
  }

  return {valueCount: totalCount, json: {value: allEvents}};
}

async function listVms(credential, subscriptionId) {
  const {ComputeManagementClient} = await import("@azure/arm-compute");
  const client = new ComputeManagementClient(credential, subscriptionId);
  const vms = [];
  for await (const vm of client.virtualMachines.listAll()) {
    if (vm.name === targetVmName && vm.id) {
      const match = vm.id.match(/\/resourceGroups\/([^/]+)\//i);
      vms.push({
        name: vm.name,
        id: vm.id,
        resourceGroup: match?.[1] ?? "",
        subscriptionId,
      });
    }
  }
  return vms;
}

async function main() {
  section("1. ENDPOINT QUE USA WiLauncher HOY");
  console.log([
    "API: Azure Monitor Activity Logs (NO Log Analytics / NO KQL)",
    "Método: GET",
    "Base: https://management.azure.com/subscriptions/{subscriptionId}",
    "      /providers/Microsoft.Insights/eventtypes/management/values",
    `Query: api-version=${API_VERSION}&$filter=<OData>`,
    "Filtro OData (no hay body KQL).",
  ].join("\n"));

  section("2. PORTAL vs WiLauncher");
  console.log([
    "Portal → VM → 'Registro de actividad' / 'Activity log':",
    "  Usa el MISMO Activity Log API (OData $filter), NO KQL.",
    "Portal → Monitor → Logs (Log Analytics):",
    "  API DIFERENTE: POST .../query con KQL (Heartbeat, etc.).",
    "WiLauncher NO llama a Log Analytics en ningún sitio del código.",
  ].join("\n"));

  section("3. WORKSPACE vs RESOURCE ID");
  console.log([
    "WiLauncher consulta por subscriptionId + OData filter",
    "(resourceGroupName / resourceUri / resourceProvider).",
    "NO usa Log Analytics Workspace ID.",
    "NO envía consultas KQL.",
  ].join("\n"));

  if (!tenantId || !clientId || !clientSecret) {
    console.error(
      "Faltan AZURE_TENANT_ID / AZURE_CLIENT_ID / AZURE_CLIENT_SECRET en el entorno.",
    );
    process.exit(1);
  }

  const credential = new ClientSecretCredential(tenantId, clientId, clientSecret);
  const token = await credential.getToken(MANAGEMENT_SCOPE);
  if (!token?.token) {
    console.error("No se pudo obtener token para", MANAGEMENT_SCOPE);
    process.exit(1);
  }

  section("4. PERMISOS DEL TOKEN");
  const payload = decodeJwtPayload(token.token);
  console.log("aud:", payload?.aud);
  console.log("appid:", payload?.appid);
  console.log("roles (app):", payload?.roles ?? "(ninguno en token)");
  console.log("scp:", payload?.scp ?? "(ninguno)");
  console.log([
    "Scope solicitado: https://management.azure.com/.default",
    "Rol Azure recomendado para leer Activity Log: Monitoring Reader",
    "(o Reader a nivel suscripción/RG).",
    "Nota: los roles NO van en el JWT de client_credentials;",
    "se comprueban en runtime contra ARM.",
  ].join("\n"));

  const subResponse = await fetch(
    "https://management.azure.com/subscriptions?api-version=2022-12-01",
    {headers: {Authorization: `Bearer ${token.token}`}},
  );
  const subPage = await subResponse.json();
  const subscriptions = (subPage.value ?? [])
    .map((s) => s.subscriptionId)
    .filter(Boolean);
  console.log("Suscripciones visibles:", subscriptions.length);

  let vm = null;
  for (const subscriptionId of subscriptions) {
    const matches = await listVms(credential, subscriptionId);
    if (matches.length > 0) {
      vm = matches[0];
      break;
    }
  }

  if (!vm) {
    console.error(`No se encontró la VM ${targetVmName} en las suscripciones visibles.`);
    process.exit(1);
  }

  console.log("\nVM objetivo (desde Azure SDK, misma fuente que listMachines):");
  console.log(JSON.stringify(vm, null, 2));

  const until = new Date();
  const since = new Date(until);
  since.setDate(since.getDate() - LOOKBACK_DAYS);
  const timeFilter = buildTimeRangeFilter(since, until);

  section("5-6. PETICIONES HTTP REALES (mismas que WiLauncher)");

  const queries = [
    {
      label: "A) resourceGroupName (estrategia 1 WiLauncher)",
      filter: `${timeFilter} and resourceGroupName eq '${vm.resourceGroup}'`,
      machineId: vm.name,
    },
    {
      label: "B) resourceUri exacto desde vm.id (estrategia 2)",
      filter: `${timeFilter} and resourceUri eq '${vm.id}'`,
    },
    {
      label: "C) resourceUri lowercase",
      filter: `${timeFilter} and resourceUri eq '${vm.id.toLowerCase()}'`,
    },
    {
      label: "D) resourceProvider Microsoft.Compute (estrategia 3)",
      filter: `${timeFilter} and resourceProvider eq 'Microsoft.Compute'`,
      machineId: vm.name,
    },
  ];

  const results = [];
  for (const q of queries) {
    const url =
      `https://management.azure.com/subscriptions/${vm.subscriptionId}` +
      `/providers/Microsoft.Insights/eventtypes/management/values` +
      `?api-version=${API_VERSION}&$filter=${encodeURIComponent(q.filter)}`;
    const {valueCount, json} = await fetchJson(url, token.token, q.label);
    let vmStartStop = 0;
    if (valueCount > 0 && q.machineId) {
      const ops = json.value
        .filter((e) => {
          const ref = `${e.resourceId ?? ""}`.toLowerCase();
          return ref.includes(`/virtualmachines/${q.machineId.toLowerCase()}`);
        })
        .map((e) => e.operationName?.value ?? e.operationName)
        .filter(Boolean);
      vmStartStop = ops.filter((op) =>
        /virtualmachines\/(start|deallocate|poweroff|stop)\/action/i.test(op),
      ).length;
      console.log(`Eventos de la VM ${q.machineId} (cualquier op):`,
        ops.length > 0 ? ops.slice(0, 5) : 0);
      console.log(`Eventos start/stop/deallocate de la VM:`, vmStartStop);
    } else if (valueCount > 0) {
      const ops = json.value
        .map((e) => e.operationName?.value ?? e.operationName)
        .filter(Boolean);
      vmStartStop = ops.filter((op) =>
        /virtualmachines\/(start|deallocate|poweroff|stop)\/action/i.test(op),
      ).length;
      console.log("Operaciones start/stop en página:", vmStartStop);
      console.log("Muestra operaciones:", ops.slice(0, 5));
    }
    results.push({...q, valueCount, vmStartStop});
  }

  section("7. KQL (Heartbeat / search) — NO APLICA a WiLauncher");
  console.log([
    "WiLauncher NO ejecuta KQL. Esas consultas son de Log Analytics Workspace:",
    "  POST https://api.loganalytics.azure.com/v1/workspaces/{workspaceId}/query",
    "  Body: { \"query\": \"Heartbeat | take 10\" }",
    "El 'Registro de actividad' del portal de la VM NO usa esa API.",
    "Si quisieras métricas/diagnósticos de VM (Heartbeat), necesitarías",
    "un Workspace con Azure Monitor Agent y otra integración distinta.",
  ].join("\n"));

  section("8. TABLAS EN WORKSPACE");
  console.log([
    "No hay Workspace configurado en WiLauncher.",
    "Sin workspaceId + permiso Log Analytics Reader no se pueden listar tablas.",
    "Activity Log no usa tablas KQL; devuelve array JSON en .value",
  ].join("\n"));

  section("9. DOCUMENTACIÓN OFICIAL MICROSOFT");
  console.log([
    "Activity Log REST (lo que usa WiLauncher y el portal VM Activity log):",
    "https://learn.microsoft.com/en-us/rest/api/monitor/activity-logs/list",
    "",
    "Filtros OData permitidos (y SOLO estos):",
    "  - eventTimestamp ge/le + resourceGroupName",
    "  - eventTimestamp ge/le + resourceUri",
    "  - eventTimestamp ge/le + resourceProvider",
    "  - eventTimestamp ge/le + correlationId",
    "  - eventTimestamp ge/le (toda la suscripción)",
    "",
    "Log Analytics query API (KQL — NO es Activity Log):",
    "https://learn.microsoft.com/en-us/rest/api/loganalytics/dataaccess/query",
  ].join("\n"));

  section("10. RESUMEN DIAGNÓSTICO");
  for (const r of results) {
    console.log(
      `${r.label}: raw=${r.valueCount}, vmStartStop=${r.vmStartStop}`,
    );
  }

  const best = results.find((r) => r.vmStartStop > 0) ?? results.find((r) => r.valueCount > 0);
  if (!best) {
    console.log([
      "\nCONCLUSIÓN: Azure devuelve 200 pero value=[] en todas las estrategias.",
      "Causas probables verificables:",
      "  - Service principal sin Monitoring Reader en la suscripción/RG",
      "  - resourceGroupName/resourceUri no coincide con el índice de Activity Log",
      "  - Eventos fuera del rango temporal (poco probable con 30 días)",
      "  - Retraso de ingesta (submissionTimestamp vs eventTimestamp)",
    ].join("\n"));
  } else if (best.vmStartStop === 0 && best.valueCount > 0) {
    console.log([
      "\nCONCLUSIÓN: Azure SÍ devuelve eventos, pero el filtro cliente",
      "de WiLauncher (matchesMachine + mapOperation start/stop) los descarta.",
      `Estrategia con datos: ${best.label}`,
      "Revisar resourceId en eventos vs machineId enviado por el frontend.",
    ].join("\n"));
  } else {
    console.log([
      `\nCONCLUSIÓN: Hay ${best.vmStartStop} eventos start/stop recuperables.`,
      `Estrategia: ${best.label}`,
      "Si WiLauncher sigue vacío, el bug está en parámetros del callable",
      "(subscriptionId/resourceGroup/machineId/azureResourceId) o caché frontend.",
    ].join("\n"));
  }
}

main().catch((error) => {
  console.error("Diagnóstico falló:", error);
  process.exit(1);
});
