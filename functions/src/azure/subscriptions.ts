import {azureSubscriptionFilter} from "./config.js";
import {createAzureCredential} from "./credentials.js";

export interface AzureSubscriptionSummary {
  subscriptionId: string;
  displayName: string;
  state: string;
}

interface AzureSubscriptionsPage {
  value?: Array<{
    subscriptionId?: string;
    displayName?: string;
    state?: string;
  }>;
  nextLink?: string;
}

const SUBSCRIPTIONS_URL =
  "https://management.azure.com/subscriptions?api-version=2022-12-01";

/**
 * Lists Azure subscriptions visible to the configured service principal.
 * @return {Promise<AzureSubscriptionSummary[]>} Subscription summaries.
 */
export async function listAzureSubscriptions():
  Promise<AzureSubscriptionSummary[]> {
  const credential = createAzureCredential();
  const accessToken = await credential.getToken(
    "https://management.azure.com/.default",
  );

  if (!accessToken) {
    throw new Error("No se pudo obtener token de Azure.");
  }

  const allowed = new Set(
    azureSubscriptionFilter
      .value()
      .split(",")
      .map((id) => id.trim())
      .filter(Boolean),
  );

  const subscriptions: AzureSubscriptionSummary[] = [];
  let nextUrl: string | null = SUBSCRIPTIONS_URL;

  while (nextUrl) {
    const response = await fetch(nextUrl, {
      headers: {
        Authorization: `Bearer ${accessToken.token}`,
      },
    });

    if (!response.ok) {
      throw new Error(
        `Error al listar suscripciones Azure: HTTP ${response.status}`,
      );
    }

    const page = (await response.json()) as AzureSubscriptionsPage;

    for (const subscription of page.value ?? []) {
      if (!subscription.subscriptionId) {
        continue;
      }
      if (allowed.size > 0 && !allowed.has(subscription.subscriptionId)) {
        continue;
      }

      subscriptions.push({
        subscriptionId: subscription.subscriptionId,
        displayName:
          subscription.displayName ?? subscription.subscriptionId,
        state: subscription.state ?? "Unknown",
      });
    }

    nextUrl = page.nextLink ?? null;
  }

  return subscriptions;
}
