import {resolve} from 'node:path';

export const TEST_DB_DIR = resolve('node_modules/.cache/test-db');
export const TEST_DB_TEMPLATE = resolve(TEST_DB_DIR, 'template.db');
