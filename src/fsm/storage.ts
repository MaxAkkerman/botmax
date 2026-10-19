import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import type { DialogState, SessionData, UserSession } from './types.js';
import { INITIAL_SESSION } from './types.js';

interface SessionRow {
  user_id: number;
  chat_id: number;
  state: DialogState;
  data_json: string;
  updated_at: number;
}

export class SessionStore {
  private readonly cache = new Map<number, UserSession>();
  private readonly db: DatabaseSync;

  constructor(dbPath: string) {
    const dir = path.dirname(dbPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    this.db = new DatabaseSync(dbPath);
    this.db.exec('PRAGMA journal_mode = WAL');
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS sessions (
        user_id INTEGER PRIMARY KEY,
        chat_id INTEGER NOT NULL,
        state TEXT NOT NULL,
        data_json TEXT NOT NULL DEFAULT '{}',
        updated_at INTEGER NOT NULL
      )
    `);

    this.loadFromDb();
  }

  private loadFromDb(): void {
    const rows = this.db
      .prepare('SELECT user_id, chat_id, state, data_json, updated_at FROM sessions')
      .all() as unknown as SessionRow[];

    for (const row of rows) {
      this.cache.set(row.user_id, {
        userId: row.user_id,
        chatId: row.chat_id,
        state: row.state,
        data: JSON.parse(row.data_json) as SessionData,
        updatedAt: row.updated_at,
      });
    }
  }

  get(userId: number, chatId: number): UserSession {
    const cached = this.cache.get(userId);
    if (cached) {
      if (cached.chatId !== chatId) {
        cached.chatId = chatId;
        cached.updatedAt = Date.now();
        this.persist(cached);
      }
      return cached;
    }

    const session = INITIAL_SESSION(userId, chatId);
    this.cache.set(userId, session);
    this.persist(session);
    return session;
  }

  save(session: UserSession): void {
    session.updatedAt = Date.now();
    this.cache.set(session.userId, session);
    this.persist(session);
  }

  reset(userId: number, chatId: number): UserSession {
    const session = INITIAL_SESSION(userId, chatId);
    this.cache.set(userId, session);
    this.persist(session);
    return session;
  }

  private persist(session: UserSession): void {
    this.db
      .prepare(
        `INSERT INTO sessions (user_id, chat_id, state, data_json, updated_at)
         VALUES (@userId, @chatId, @state, @dataJson, @updatedAt)
         ON CONFLICT(user_id) DO UPDATE SET
           chat_id = excluded.chat_id,
           state = excluded.state,
           data_json = excluded.data_json,
           updated_at = excluded.updated_at`,
      )
      .run({
        userId: session.userId,
        chatId: session.chatId,
        state: session.state,
        dataJson: JSON.stringify(session.data),
        updatedAt: session.updatedAt,
      });
  }

  close(): void {
    this.db.close();
  }
}
