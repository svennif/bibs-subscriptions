import {PrismaClient} from '@prisma/client';
import {env} from '../config';

// Tests use their own database (see test/setup-test-env.ts)
const testDatabaseUrl = process.env.TEST_DATABASE_URL;

const prisma =
  (global.prisma as PrismaClient) ||
  new PrismaClient(
    testDatabaseUrl ? {datasourceUrl: testDatabaseUrl} : undefined,
  );

if (env.isProduction && global.prisma === undefined) {
  global.prisma = new PrismaClient();
}

export default prisma;
