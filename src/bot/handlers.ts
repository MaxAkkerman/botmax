import { Bot, Context, type Context as BotContextType } from '@maxhub/max-bot-api';
import { getCategoryById, isCategoryId } from '../config/categories.js';
import type { SessionStore } from '../fsm/storage.js';
import type { UserSession } from '../fsm/types.js';
import { formatApplication } from '../utils/format.js';
import {
  categoryKeyboard,
  contactKeyboard,
  detailsKeyboard,
  restartKeyboard,
} from './keyboards.js';
import {
  acknowledgeCallback,
  answerCallbackMessage,
  replyUser,
} from './messaging.js';

export async function processUpdate(bot: Bot, update: unknown): Promise<void> {
  const ctx = new Context(update as never, bot.api, bot.botInfo);
  await bot.middleware()(ctx, () => Promise.resolve(undefined));
}

interface BotContext {
  bot: Bot;
  sessions: SessionStore;
  applicationsChatId: number;
}

const GREETING =
  'Здравствуйте! 👋\n\n' +
  'Вы обратились через сайт. Пожалуйста, выберите категорию обращения — ' +
  'мы соберём данные и передадим заявку ответственному специалисту.';

function getUserId(ctx: BotContextType): number | undefined {
  if (ctx.user?.user_id) {
    return ctx.user.user_id;
  }

  const update = ctx.update as Record<string, unknown>;

  if (update.update_type === 'message_created') {
    const message = update.message as { sender?: { user_id?: number } } | undefined;
    return message?.sender?.user_id;
  }

  if (update.update_type === 'message_callback') {
    const callback = update.callback as { user?: { user_id?: number } } | undefined;
    return callback?.user?.user_id;
  }

  if ('user' in update) {
    const user = update.user as { user_id?: number };
    return user.user_id;
  }

  return undefined;
}

function getChatId(ctx: BotContextType): number | undefined {
  return ctx.chatId;
}

function getMessageRecipient(
  ctx: BotContextType,
): { chat_id?: number; chat_type?: string } | undefined {
  const update = ctx.update as {
    message?: { recipient?: { chat_id?: number; chat_type?: string } };
  };
  return update.message?.recipient;
}

function isApplicationsGroupUpdate(
  ctx: BotContextType,
  applicationsChatId: number,
): boolean {
  const recipient = getMessageRecipient(ctx);
  if (!recipient) return false;
  return (
    recipient.chat_id === applicationsChatId || recipient.chat_type === 'chat'
  );
}

function resolveChatId(ctx: BotContextType, userId: number): number {
  return getChatId(ctx) ?? userId;
}

function getDisplayName(ctx: BotContextType): string | undefined {
  const user = ctx.user;
  if (!user) return undefined;
  return user.name || user.username || undefined;
}

async function answerCallback(ctx: BotContextType, message?: string): Promise<void> {
  await acknowledgeCallback(ctx, message);
}

async function sendGreeting(ctx: BotContextType): Promise<void> {
  await replyUser(ctx, GREETING, {
    attachments: [categoryKeyboard()],
  });
}

async function startDialog(
  ctx: BotContextType,
  store: SessionStore,
  source?: string | null,
): Promise<void> {
  const userId = getUserId(ctx);
  if (!userId) return;

  const chatId = resolveChatId(ctx, userId);
  const session = store.reset(userId, chatId);
  if (source) {
    session.data.source = source;
    store.save(session);
  }

  await sendGreeting(ctx);
}

async function askForName(ctx: BotContextType, categoryLabel: string): Promise<void> {
  const text =
    `Вы выбрали: ${categoryLabel}\n\n` +
    'Укажите ваше ФИО или название компании:';

  if (ctx.updateType === 'message_callback') {
    await answerCallbackMessage(ctx, text);
    return;
  }

  await replyUser(ctx, text);
}

async function askForPhone(ctx: BotContextType): Promise<void> {
  await replyUser(
    ctx,
    'Укажите контактный телефон.\n' +
      'Нажмите кнопку ниже, чтобы отправить номер из профиля, ' +
      'или выберите ручной ввод.',
    { attachments: [contactKeyboard()] },
  );
}

async function askForMessage(ctx: BotContextType): Promise<void> {
  await replyUser(ctx, 'Опишите суть обращения одним сообщением:');
}

async function askForDetails(ctx: BotContextType, session: UserSession): Promise<void> {
  const category = session.data.categoryId
    ? getCategoryById(session.data.categoryId as never)
    : null;

  const hint = category?.detailsHint ?? 'Добавьте дополнительные детали при необходимости.';

  await replyUser(ctx, `${hint}\n\nИли нажмите «Пропустить».`, {
    attachments: [detailsKeyboard()],
  });
}

function normalizePhone(input: string): string | null {
  const digits = input.replace(/\D/g, '');
  if (digits.length < 10) return null;

  if (digits.length === 10) {
    return `+7${digits}`;
  }

  if (digits.length === 11 && (digits.startsWith('7') || digits.startsWith('8'))) {
    return `+7${digits.slice(1)}`;
  }

  if (digits.length >= 11) {
    return `+${digits}`;
  }

  return null;
}

async function finalizeApplication(
  ctx: BotContextType,
  { bot, sessions, applicationsChatId }: BotContext,
  session: UserSession,
): Promise<void> {
  if (!session.data.categoryId || !isCategoryId(session.data.categoryId)) {
    await replyUser(ctx, 'Ошибка: категория не выбрана. Начните заново.', {
      attachments: [restartKeyboard()],
    });
    return;
  }

  const category = getCategoryById(session.data.categoryId);
  const text = formatApplication({
    category,
    session,
    userName: getDisplayName(ctx),
  });

  await bot.api.sendMessageToChat(applicationsChatId, text);

  sessions.reset(session.userId, session.chatId);

  await replyUser(
    ctx,
    '✅ Ваша информация принята к работе и будет обработана в максимально возможные сроки.\n\n' +
      '🕐 График работы:\n' +
      '• Бухгалтерия и административный персонал — по будням с 08:30 до 17:30 (МСК)\n' +
      '• Логистика, лаборатория и диспетчерская — круглосуточно\n\n' +
      'Если нужно — оформите новую заявку.',
    { attachments: [restartKeyboard()] },
  );
}

export function setupBotHandlers(
  bot: Bot,
  sessions: SessionStore,
  applicationsChatId: number,
): void {
  const context: BotContext = { bot, sessions, applicationsChatId };

  bot.use(async (ctx, next) => {
    const userId = getUserId(ctx);
    if (isApplicationsGroupUpdate(ctx, applicationsChatId)) {
      console.log(
        `[update] ${ctx.updateType} skipped group chat user=${userId ?? 'unknown'}`,
      );
      return;
    }

    console.log(`[update] ${ctx.updateType} user=${userId ?? 'unknown'}`);
    await next();
  });

  bot.catch((error, ctx) => {
    console.error('[bot] Unhandled error:', error);
    console.error('[bot] Update:', ctx.update);
  });

  bot.on('bot_started', async (ctx) => {
    await startDialog(ctx, sessions, ctx.startPayload);
  });

  bot.command(/^start(?:\s+(.+))?$/, async (ctx) => {
    const payload = ctx.match?.[1]?.trim();
    await startDialog(ctx, sessions, payload);
  });

  bot.action(/^category:(.+)$/, async (ctx) => {
    const userId = getUserId(ctx);
    const categoryId = ctx.match?.[1];

    if (!userId || !categoryId || !isCategoryId(categoryId)) {
      await answerCallback(ctx, 'Неизвестная категория');
      return;
    }

    const chatId = resolveChatId(ctx, userId);
    const category = getCategoryById(categoryId);
    const session = sessions.get(userId, chatId);
    session.state = 'awaiting_name';
    session.data.categoryId = category.id;
    session.data.categoryLabel = category.label;
    sessions.save(session);

    await askForName(ctx, category.label);
  });

  bot.action('phone:manual', async (ctx) => {
    const userId = getUserId(ctx);
    if (!userId) return;

    const chatId = resolveChatId(ctx, userId);
    const session = sessions.get(userId, chatId);
    if (session.state !== 'awaiting_phone') {
      await answerCallback(ctx);
      return;
    }

    await answerCallbackMessage(ctx, 'Введите номер телефона в формате +7 XXX XXX-XX-XX:');
  });

  bot.action('action:skip_details', async (ctx) => {
    const userId = getUserId(ctx);
    if (!userId) return;

    const chatId = resolveChatId(ctx, userId);
    const session = sessions.get(userId, chatId);
    if (session.state !== 'awaiting_details') {
      await answerCallback(ctx);
      return;
    }

    session.data.details = '';
    sessions.save(session);

    await acknowledgeCallback(ctx);
    await finalizeApplication(ctx, context, session);
  });

  bot.action('action:cancel', async (ctx) => {
    const userId = getUserId(ctx);
    if (!userId) return;

    const chatId = resolveChatId(ctx, userId);
    sessions.reset(userId, chatId);
    await answerCallbackMessage(
      ctx,
      'Заявка отменена. Чтобы начать заново, выберите категорию:',
      [categoryKeyboard()],
    );
  });

  bot.action('action:new', async (ctx) => {
    const userId = getUserId(ctx);
    if (!userId) return;

    const chatId = resolveChatId(ctx, userId);
    const session = sessions.get(userId, chatId);
    const source = session.data.source;
    sessions.reset(userId, chatId);
    if (source) {
      const fresh = sessions.get(userId, chatId);
      fresh.data.source = source;
      sessions.save(fresh);
    }

    await answerCallbackMessage(ctx, GREETING, [categoryKeyboard()]);
  });

  bot.on('message_created', async (ctx) => {
    const userId = getUserId(ctx);
    if (!userId) return;

    const chatId = resolveChatId(ctx, userId);

    const session = sessions.get(userId, chatId);
    const text = ctx.message?.body.text?.trim();

    if (session.state === 'idle') {
      if (text?.startsWith('/')) return;
      await replyUser(ctx, 'Выберите категорию обращения:', {
        attachments: [categoryKeyboard()],
      });
      return;
    }

    if (session.state === 'awaiting_phone' && ctx.contactInfo?.tel) {
      session.data.phone = ctx.contactInfo.tel;
      session.state = 'awaiting_message';
      sessions.save(session);
      await askForMessage(ctx);
      return;
    }

    if (!text) {
      if (session.state === 'awaiting_phone') {
        await replyUser(ctx, 'Отправьте телефон кнопкой или введите номер текстом.', {
          attachments: [contactKeyboard()],
        });
      }
      return;
    }

    switch (session.state) {
      case 'awaiting_name': {
        if (text.length < 2) {
          await replyUser(ctx, 'Пожалуйста, укажите корректное ФИО или название компании (минимум 2 символа).');
          return;
        }
        session.data.nameOrCompany = text;
        session.state = 'awaiting_phone';
        sessions.save(session);
        await askForPhone(ctx);
        break;
      }

      case 'awaiting_phone': {
        const phone = normalizePhone(text);
        if (!phone) {
          await replyUser(
            ctx,
            'Не удалось распознать номер. Пример: +7 918 225-44-05',
            { attachments: [contactKeyboard()] },
          );
          return;
        }
        session.data.phone = phone;
        session.state = 'awaiting_message';
        sessions.save(session);
        await askForMessage(ctx);
        break;
      }

      case 'awaiting_message': {
        if (text.length < 5) {
          await replyUser(ctx, 'Опишите обращение чуть подробнее (минимум 5 символов).');
          return;
        }
        session.data.message = text;
        session.state = 'awaiting_details';
        sessions.save(session);
        await askForDetails(ctx, session);
        break;
      }

      case 'awaiting_details': {
        session.data.details = text;
        sessions.save(session);
        await finalizeApplication(ctx, context, session);
        break;
      }

      default:
        break;
    }
  });
}

export async function resolveApplicationsChatId(
  bot: Bot,
  groupLink: string,
): Promise<number> {
  const chatIdFromEnv = process.env.APPLICATIONS_CHAT_ID?.trim();
  if (chatIdFromEnv) {
    const chatId = Number(chatIdFromEnv);
    if (!Number.isFinite(chatId)) {
      throw new Error('APPLICATIONS_CHAT_ID must be a number');
    }
    console.log(`[bot] Applications group id from env: ${chatId}`);
    return chatId;
  }

  const normalizedLink = groupLink.trim().replace(/\/$/, '');

  try {
    const { chats } = await bot.api.getAllChats();
    const chat = chats.find(
      (item) => item.link?.replace(/\/$/, '') === normalizedLink,
    );

    if (chat) {
      console.log(
        `[bot] Applications group resolved: ${chat.title} (id: ${chat.chat_id})`,
      );
      return chat.chat_id;
    }
  } catch (error) {
    console.error(
      '[bot] GET /chats is unavailable. Set APPLICATIONS_CHAT_ID.',
      error,
    );
  }

  throw new Error(
    `Group not found by link: ${groupLink}. Set APPLICATIONS_CHAT_ID or add the bot to the group first.`,
  );
}
