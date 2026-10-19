import { Keyboard } from '@maxhub/max-bot-api';
import { CATEGORIES } from '../config/categories.js';

export type InlineKeyboard = ReturnType<typeof Keyboard.inlineKeyboard>;

export function categoryKeyboard(): InlineKeyboard {
  return Keyboard.inlineKeyboard(
    CATEGORIES.map((category) => [
      Keyboard.button.callback(category.label, `category:${category.id}`),
    ]),
  );
}

export function contactKeyboard(): InlineKeyboard {
  return Keyboard.inlineKeyboard([
    [Keyboard.button.requestContact('📱 Отправить телефон')],
    [Keyboard.button.callback('✏️ Ввести вручную', 'phone:manual')],
    [Keyboard.button.callback('❌ Отмена', 'action:cancel')],
  ]);
}

export function detailsKeyboard(): InlineKeyboard {
  return Keyboard.inlineKeyboard([
    [Keyboard.button.callback('⏭ Пропустить', 'action:skip_details')],
    [Keyboard.button.callback('❌ Отмена', 'action:cancel')],
  ]);
}

export function restartKeyboard(): InlineKeyboard {
  return Keyboard.inlineKeyboard([
    [Keyboard.button.callback('📝 Новая заявка', 'action:new')],
  ]);
}
