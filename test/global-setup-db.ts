import {execSync} from 'node:child_process';
import {cpSync, mkdirSync, readFileSync, rmSync, writeFileSync} from 'node:fs';
import {join} from 'node:path';

import {TEST_DB_DIR, TEST_DB_TEMPLATE} from './test-db';

/**
 * Builds a migrated SQLite database for the test run, so tests never touch
 * the development database in prisma/data.db. Each test worker copies this
 * template (see setup-test-env.ts).
 */
export default function setup() {
  rmSync(TEST_DB_DIR, {recursive: true, force: true});
  mkdirSync(TEST_DB_DIR, {recursive: true});

  const schema = readFileSync('prisma/schema.prisma', 'utf8').replace(
    /url\s*=\s*"[^"]*"/,
    `url = "file:${TEST_DB_TEMPLATE}"`,
  );
  const schemaPath = join(TEST_DB_DIR, 'schema.prisma');

  writeFileSync(schemaPath, schema);
  cpSync('prisma/migrations', join(TEST_DB_DIR, 'migrations'), {
    recursive: true,
  });

  execSync(`pnpm exec prisma migrate deploy --schema "${schemaPath}"`, {
    stdio: 'pipe',
  });
}
