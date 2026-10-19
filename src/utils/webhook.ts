const API_BASE = 'https://platform-api2.max.ru';

export async function registerWebhook(
  token: string,
  url: string,
  secret: string,
): Promise<void> {
  const response = await fetch(`${API_BASE}/subscriptions`, {
    method: 'POST',
    headers: {
      Authorization: token,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      url,
      update_types: ['message_created', 'message_callback', 'bot_started'],
      secret,
    }),
  });

  const body = await response.text();
  if (!response.ok) {
    throw new Error(`Webhook registration failed (${response.status}): ${body}`);
  }

  console.log('[webhook] Registered:', body);
}

export async function deleteWebhookSubscriptions(token: string): Promise<void> {
  const listResponse = await fetch(`${API_BASE}/subscriptions`, {
    headers: { Authorization: token },
  });

  if (!listResponse.ok) {
    return;
  }

  const data = (await listResponse.json()) as {
    subscriptions?: Array<{ url?: string }>;
  };

  for (const subscription of data.subscriptions ?? []) {
    if (!subscription.url) continue;

    const response = await fetch(
      `${API_BASE}/subscriptions?url=${encodeURIComponent(subscription.url)}`,
      {
        method: 'DELETE',
        headers: { Authorization: token },
      },
    );

    if (!response.ok) {
      const body = await response.text();
      console.warn(`[webhook] Failed to delete ${subscription.url}: ${body}`);
    } else {
      console.log(`[webhook] Deleted subscription: ${subscription.url}`);
    }
  }
}
