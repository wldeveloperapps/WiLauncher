interface AwsLikeError {
  Code?: string;
  name?: string;
  message?: string;
}

/**
 * Formats AWS SDK errors for API responses.
 * @param {unknown} error AWS SDK error.
 * @param {string} action Human-readable action label.
 * @return {string} User-facing error message.
 */
export function formatAwsError(error: unknown, action: string): string {
  const candidate = error as AwsLikeError;
  const code = candidate.Code ?? candidate.name ?? "";
  const message = candidate.message ?? "";

  if (code === "UnauthorizedOperation" || message.includes("not authorized")) {
    return "Las credenciales AWS son validas, pero faltan permisos para " +
      `${action}. Si usais AssumeRole, revisa WilocEC2OperatorRole.`;
  }

  if (code === "AccessDenied" && message.includes("AssumeRole")) {
    return "El usuario IAM no puede asumir WilocEC2OperatorRole. Revisa " +
      "WilocFirebaseAssumeEC2RolesPolicy y la trust policy del rol.";
  }

  if (code === "InvalidClientTokenId" || code === "SignatureDoesNotMatch") {
    return "Las credenciales AWS no son validas. Revisa AWS_ACCESS_KEY_ID y " +
      "AWS_SECRET_ACCESS_KEY.";
  }

  return "No se pudo consultar el inventario AWS: " +
    `${message || code || action}.`;
}
