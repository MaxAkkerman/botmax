import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const certPath = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../certs/russian-trusted.pem',
);

if (fs.existsSync(certPath) && !process.env.NODE_EXTRA_CA_CERTS) {
  console.warn(
    '[ca] NODE_EXTRA_CA_CERTS is not set. Restart via scripts/start.mjs so the Russian CA is trusted.',
  );
}
