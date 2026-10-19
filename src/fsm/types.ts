export type DialogState =
  | 'idle'
  | 'awaiting_name'
  | 'awaiting_phone'
  | 'awaiting_message'
  | 'awaiting_details';

export interface SessionData {
  categoryId?: string;
  categoryLabel?: string;
  nameOrCompany?: string;
  phone?: string;
  message?: string;
  details?: string;
  source?: string;
}

export interface UserSession {
  userId: number;
  chatId: number;
  state: DialogState;
  data: SessionData;
  updatedAt: number;
}

export const INITIAL_SESSION = (userId: number, chatId: number): UserSession => ({
  userId,
  chatId,
  state: 'idle',
  data: {},
  updatedAt: Date.now(),
});
