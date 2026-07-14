interface AzureLikeError {
  code?: string;
  name?: string;
  message?: string;
  statusCode?: number;
}

/**
 * Formats Azure SDK errors for API responses.
 * @param {unknown} error Azure SDK error.
 * @return {string} User-facing error message.
 */
export function formatAzureError(error: unknown): string {
  const candidate = error as AzureLikeError;
  const code = candidate.code ?? candidate.name ?? "";
  const message = candidate.message ?? "";

  if (code === "AuthenticationFailed" || message.includes("authentication")) {
    return "Las credenciales Azure no son validas. Revisa AZURE_TENANT_ID, " +
      "AZURE_CLIENT_ID y AZURE_CLIENT_SECRET.";
  }

  if (
    message.includes("local-placeholder") ||
    message.includes("AADSTS900023")
  ) {
    return "Las credenciales Azure del emulador local no estan configuradas. " +
      "Crea functions/.secret.local con AZURE_TENANT_ID, AZURE_CLIENT_ID y " +
      "AZURE_CLIENT_SECRET.";
  }

  if (candidate.statusCode === 403 || code === "AuthorizationFailed") {
    return "Las credenciales Azure son validas, pero no tienen permiso para " +
      "listar maquinas virtuales.";
  }

  return `No se pudo consultar el inventario Azure: ${message || code}.`;
}
