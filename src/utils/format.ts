import type { Category } from '../config/categories.js';
import type { UserSession } from '../fsm/types.js';

export interface ApplicationPayload {
  category: Category;
  session: UserSession;
  userName?: string;
}

export function formatApplication({
  category,
  session,
  userName,
}: ApplicationPayload): string {
  const { data } = session;
  const lines = [
    `[${category.label.toUpperCase()}]`,
    '',
    '📋 Новая заявка',
    '',
    `👤 ФИО / Компания: ${data.nameOrCompany ?? '—'}`,
    `📞 Телефон: ${data.phone ?? '—'}`,
    `💬 Обращение: ${data.message ?? '—'}`,
    `📝 Дополнительно: ${data.details?.trim() ? data.details : '—'}`,
    '',
    `🔗 Источник: ${data.source ?? 'direct'}`,
    `🆔 ID клиента: ${session.userId}`,
  ];

  if (userName) {
    lines.push(`👤 Имя в MAX: ${userName}`);
  }

  lines.push(
    `📅 Дата: ${new Date(session.updatedAt).toLocaleString('ru-RU', { timeZone: 'Europe/Moscow' })}`,
  );

  return lines.join('\n');
}
