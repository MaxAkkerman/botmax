# MAX Applications Bot

Production-ready бот для мессенджера MAX, который принимает заявки с сайта через deep link и отправляет их в группу.

## Возможности

- Приветствие клиентов по deep link `?start=from_site`
- Выбор категории через inline-клавиатуру
- FSM-диалог с сохранением состояния в SQLite + in-memory Map
- Сбор: ФИО/компания, телефон (кнопка `request_contact`), текст обращения, доп. детали
- Структурированная отправка заявок в группу с префиксом категории

## Категории

| Категория | Контакты в заявке |
|-----------|-------------------|
| Покупка / Продажа молока | +7 918 225-44-05, +7 989 140-00-18 |
| Логистика и транспорт | +7 988 474-04-89 |
| Бухгалтерия / Документы | +7 988 477-77-37 |
| Жалобы и предложения | +7 988 477-77-37, +7 918 225-44-05 |
| Другое / Общий вопрос | +7 918 225-44-05 |

## Быстрый старт

```bash
cp .env.example .env
# Заполните BOT_TOKEN и APPLICATIONS_GROUP_LINK

npm install
npm run dev          # long polling (локально)
npm run build
npm start            # webhook (production)
```

## Переменные окружения

| Переменная | Описание |
|------------|----------|
| `BOT_TOKEN` | Токен бота из MAX |
| `APPLICATIONS_GROUP_LINK` | Ссылка-приглашение в группу заявок |
| `WEBHOOK_URL` | HTTPS URL webhook (обязателен для production) |
| `WEBHOOK_SECRET` | Секрет для заголовка `X-Max-Bot-Api-Secret` |
| `PORT` | Порт Express-сервера (по умолчанию 3000) |
| `USE_POLLING` | `true` — long polling, `false` — webhook |
| `DB_PATH` | Путь к SQLite-базе сессий |

## Production (webhook)

1. Разверните сервер с HTTPS на порту 443 (nginx + Let's Encrypt)
2. Установите `USE_POLLING=false` и `WEBHOOK_URL=https://your-domain.com/webhook`
3. Убедитесь, что бот добавлен в группу заявок
4. Запустите `npm run build && npm start`

## Deep link

```
https://max.ru/id2311356638_bot?start=from_site
```

## Формат заявки в группе

```
[ПОКУПКА / ПРОДАЖА МОЛОКА]

📋 Новая заявка

👤 ФИО / Компания: ...
📞 Телефон: ...
💬 Обращение: ...
📝 Дополнительно: ...

🔗 Источник: from_site
🆔 ID клиента: ...
📅 Дата: ...

📞 Контакты по направлению:
  • +7 918 225-44-05
  • +7 989 140-00-18
```

## Стек

- Node.js 20+
- TypeScript
- `@maxhub/max-bot-api`
- Express (webhook)
- better-sqlite3 (FSM persistence)
