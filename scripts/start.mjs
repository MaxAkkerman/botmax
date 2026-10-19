import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const certPath = path.join(root, 'certs', 'russian-trusted.pem');
const configured = process.env.NODE_EXTRA_CA_CERTS
  ? path.resolve(process.env.NODE_EXTRA_CA_CERTS)
  : '';

if (configured === certPath && fs.existsSync(certPath)) {
  await import(pathToFileURL(path.join(root, 'dist', 'index.js')).href);
} else {
  const child = spawn(process.execPath, [path.join(root, 'dist', 'index.js')], {
    stdio: 'inherit',
    cwd: root,
    env: { ...process.env, NODE_EXTRA_CA_CERTS: certPath },
  });

  const forward = (signal) => {
    child.kill(signal);
  };
  process.on('SIGINT', forward);
  process.on('SIGTERM', forward);

  child.on('exit', (code, signal) => {
    if (signal) {
      process.kill(process.pid, signal);
      return;
    }
    process.exit(code ?? 1);
  });
}
