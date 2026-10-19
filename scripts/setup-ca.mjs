import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const certPath = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../certs/russian-trusted.pem',
);

if (fs.existsSync(certPath)) {
  process.env.NODE_EXTRA_CA_CERTS = certPath;
}
