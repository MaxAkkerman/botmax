import { Bot } from '@maxhub/max-bot-api';
import express from 'express';
import path from 'node:path';
import { config } from './config/env.js';
import {
  processUpdate,
  resolveApplicationsChatId,
  setupBotHandlers,
} from './bot/handlers.js';
import { SessionStore } from './fsm/storage.js';
import { deleteWebhookSubscriptions, registerWebhook } from './utils/webhook.js';
import { acquireSingleInstanceLock } from './utils/single-instance.js';

async function bootstrap(): Promise<void> {
  acquireSingleInstanceLock(path.join(path.dirname(config.dbPath), 'bot.pid'));
  const bot = new Bot(config.botToken);
  const sessions = new SessionStore(config.dbPath);

  bot.botInfo = await bot.api.getMyInfo();
  console.log(`[bot] Started as @${bot.botInfo.username}`);

  const applicationsChatId = await resolveApplicationsChatId(
    bot,
    config.applicationsGroupLink,
  );

  setupBotHandlers(bot, sessions, applicationsChatId);

  const shutdown = () => {
    sessions.close();
    process.exit(0);
  };

  process.once('SIGINT', shutdown);
  process.once('SIGTERM', shutdown);

  if (config.usePolling) {
    await deleteWebhookSubscriptions(config.botToken);
    console.log('[bot] Running in long polling mode');
    await bot.start({
      allowedUpdates: ['message_created', 'message_callback', 'bot_started'],
    });
    return;
  }

  if (!config.webhookUrl) {
    throw new Error('WEBHOOK_URL is required when USE_POLLING is not true');
  }

  const app = express();

  app.get('/health', (_req, res) => {
    res.status(200).send('ok');
  });

  app.post(
    '/webhook',
    express.json({ limit: '1mb' }),
    async (req, res) => {
      const secret = req.header('X-Max-Bot-Api-Secret');
      if (secret !== config.webhookSecret) {
        res.status(401).send('Unauthorized');
        return;
      }

      res.status(200).send('ok');

      try {
        await processUpdate(bot, req.body);
      } catch (error) {
        console.error('[webhook] Update processing error:', error);
      }
    },
  );

  app.listen(config.port, '0.0.0.0', async () => {
    console.log(`[server] Listening on 0.0.0.0:${config.port}`);
    await deleteWebhookSubscriptions(config.botToken);
    await registerWebhook(
      config.botToken,
      config.webhookUrl,
      config.webhookSecret,
    );
    console.log('[bot] Webhook mode active');
  });
}

bootstrap().catch((error) => {
  console.error('[fatal]', error);
  process.exit(1);
});
