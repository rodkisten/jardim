import { PrismaD1 } from '@prisma/adapter-d1';
import { PrismaClient } from './generated/prisma/client';

type DatabaseBinding = ConstructorParameters<typeof PrismaD1>[0];

/** Keep bindings scoped to the request: a global client could retain another request's resources. */
export function createDatabase(binding: DatabaseBinding) {
  return new PrismaClient({ adapter: new PrismaD1(binding) });
}

export async function findReceipts(binding: DatabaseBinding, ids: string[]) {
  const prisma = createDatabase(binding);
  try {
    return await prisma.memory.findMany({
      where: { id: { in: ids } },
      select: { id: true, operationId: true },
    });
  } finally {
    await prisma.$disconnect();
  }
}

export async function findSession(binding: DatabaseBinding, tokenHash: string, now: number) {
  const prisma = createDatabase(binding);
  try {
    // Millisecond timestamps exceed Prisma's 32-bit Int range, so the existing INTEGER uses BigInt.
    return await prisma.session.findFirst({
      where: { tokenHash, expiresAt: { gt: BigInt(now) } },
      select: { tokenHash: true },
    });
  } finally {
    await prisma.$disconnect();
  }
}
