import { z } from 'zod';
export const Memory = z
  .object({
    id: z.uuid(),
    title: z.string().trim().min(1).max(160),
    body: z.string().trim().min(1).max(20000),
    createdAt: z.iso.datetime(),
    tags: z.array(z.string().trim().min(1).max(40)).max(12),
  })
  .strict();
export type Memory = z.infer<typeof Memory>;
export const Push = z
  .object({
    operations: z
      .array(z.object({ operationId: z.uuid(), memory: Memory }).strict())
      .min(1)
      .max(50),
  })
  .strict();
export type Operation = z.infer<typeof Push>['operations'][number];

// Validate server responses too: an HTTP 200 alone cannot authorize dropping local work.
export const PushReceipt = z.object({ acknowledged: z.array(z.uuid()).max(50) }).strict();
export const PullPage = z
  .object({
    memories: z.array(Memory).max(100),
    cursor: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER),
    hasMore: z.boolean(),
  })
  .strict();
