import fs from 'node:fs';
import path from 'node:path';

export function acquireSingleInstanceLock(pidFile: string): void {
  const dir = path.dirname(pidFile);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  if (fs.existsSync(pidFile)) {
    const previousPid = Number(fs.readFileSync(pidFile, 'utf8').trim());
    if (previousPid > 0) {
      try {
        process.kill(previousPid, 0);
        throw new Error(
          `Bot is already running (pid ${previousPid}). Stop the other instance first.`,
        );
      } catch (error) {
        if (error instanceof Error && error.message.includes('already running')) {
          throw error;
        }
      }
    }
  }

  fs.writeFileSync(pidFile, String(process.pid));

  const release = () => {
    try {
      if (fs.existsSync(pidFile)) {
        fs.unlinkSync(pidFile);
      }
    } catch {
      // ignore cleanup errors
    }
  };

  process.once('exit', release);
  process.once('SIGINT', release);
  process.once('SIGTERM', release);
}
