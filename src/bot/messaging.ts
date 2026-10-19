import type { Context } from '@maxhub/max-bot-api';
import type { InlineKeyboard } from './keyboards.js';

type ReplyExtra = NonNullable<Parameters<Context['reply']>[1]>;
export async function replyUser(
  ctx: Context,
  text: string,
  extra?: ReplyExtra,
): Promise<void> {
  const userId = ctx.user?.user_id;
  const chatId = ctx.chatId;

  if (userId != null) {
    await ctx.api.sendMessageToUser(userId, text, extra);
    return;
  }

  if (chatId != null) {
    await ctx.api.sendMessageToChat(chatId, text, extra);
    return;
  }

  throw new Error('Cannot resolve message recipient');
}

export async function answerCallbackMessage(
  ctx: Context,
  text: string,
  attachments?: InlineKeyboard[],
): Promise<void> {
  if (!ctx.callback?.callback_id) return;

  await ctx.answerOnCallback({
    message: {
      text,
      attachments: attachments ?? null,
    },
  });
}

export async function acknowledgeCallback(
  ctx: Context,
  notification?: string,
): Promise<void> {
  if (!ctx.callback?.callback_id) return;

  await ctx.answerOnCallback({
    notification: notification ?? null,
  });
}
