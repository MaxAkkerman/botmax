import 'dotenv/config';

function requireEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function optionalEnv(name: string, fallback: string): string {
  return process.env[name]?.trim() || fallback;
}

export const config = {
  botToken: requireEnv('BOT_TOKEN'),
  applicationsGroupLink: requireEnv('APPLICATIONS_GROUP_LINK'),
  webhookUrl: process.env.WEBHOOK_URL?.trim() || '',
  webhookSecret: optionalEnv('WEBHOOK_SECRET', 'max_bot_webhook_secret'),
  port: Number(process.env.PORT || 3000),
  usePolling: process.env.USE_POLLING === 'true',
  dbPath: optionalEnv('DB_PATH', './data/sessions.db'),
};
