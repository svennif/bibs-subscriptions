import '@testing-library/jest-dom/vitest';
import '@testing-library/react';
import '@shopify/react-testing/matchers';

import {copyFileSync, existsSync} from 'node:fs';
import {resolve} from 'node:path';
import {beforeAll, vi} from 'vitest';
import {API_KEY, API_SECRET_KEY, APP_URL, SCOPE} from './constants';
import {TEST_DB_DIR, TEST_DB_TEMPLATE} from './test-db';

// Give each test worker its own copy of the test database, so test files
// running in parallel don't interfere with each other or with prisma/data.db
const workerDatabase = resolve(
  TEST_DB_DIR,
  `worker-${process.env.VITEST_POOL_ID ?? '0'}.db`,
);
if (!existsSync(workerDatabase) && existsSync(TEST_DB_TEMPLATE)) {
  copyFileSync(TEST_DB_TEMPLATE, workerDatabase);
}
process.env.TEST_DATABASE_URL = `file:${workerDatabase}`;

process.env.SCOPES = SCOPE;
process.env.SHOPIFY_APP_URL = APP_URL;
process.env.SHOPIFY_API_KEY = API_KEY;
process.env.SHOPIFY_API_SECRET = API_SECRET_KEY;

globalThis.__REACT_DEVTOOLS_GLOBAL_HOOK__ = {isDisabled: true};

beforeAll(() => {
  global.IS_REACT_ACT_ENVIRONMENT = false;
});

// For extension tests:
// Since are running our tests outside of a remote-ui environment
// we are getting a few warnings that we don't care about.
// This code silences these warnings but keeps others.
const originalError = console.error;
console.error = vi.fn((message) => {
  if (
    typeof message !== 'string' ||
    (!message.includes(
      'Warning: The tag <%s> is unrecognized in this browser.',
    ) &&
      !message.includes('inside a test was not wrapped in act(...)') &&
      !message.includes(
        'Warning: Received `%s` for a non-boolean attribute `%s`',
      ) &&
      !message.includes(
        'Warning: React does not recognize the `%s` prop on a DOM element',
      ) &&
      !message.includes(
        'is using incorrect casing. Use PascalCase for React components, or lowercase for HTML elements',
      ))
  ) {
    originalError(message);
  }
});
