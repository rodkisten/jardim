export { z } from 'zod';
import { z } from 'zod';
// Restrict rich text to JSON-compatible values. HTML is never accepted on the wire.
const RichValue: z.ZodType<unknown> = z.lazy(() =>
  z.union([
    z.string(),
    z.number(),
    z.boolean(),
    z.null(),
    z.array(RichValue),
    z.record(z.string(), RichValue),
  ]),
);
export const RichDocument = z
  .object({ type: z.literal('doc'), content: z.array(RichValue).optional() })
  .strict()
  .refine((value) => JSON.stringify(value).length <= 80000, 'Documento muito grande');
export type RichDocument = z.infer<typeof RichDocument>;
export const Memory = z
  .object({
    id: z.uuid(),
    title: z.string().trim().min(1).max(160),
    body: z.string().trim().min(1).max(20000),
    richDocument: RichDocument.optional(),
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

export const DeviceList = z.object({
  devices: z.array(
    z.object({
      id: z.uuid(),
      name: z.string(),
      createdAt: z.iso.datetime(),
      revokedAt: z.iso.datetime().nullable(),
    }),
  ),
});
export const DeviceToken = z.object({ id: z.uuid(), token: z.string().regex(/^[a-f0-9]{64}$/) });

export const Snapshot = z
  .object({
    memory: Memory,
    revision: z.number().int().positive().max(Number.MAX_SAFE_INTEGER),
    deletedAt: z.iso.datetime().nullable(),
  })
  .strict();
export type Snapshot = z.infer<typeof Snapshot>;
export const Mutation = z
  .object({
    operationId: z.uuid(),
    memoryId: z.uuid(),
    baseRevision: z.number().int().nonnegative(),
    kind: z.enum(['create', 'edit', 'delete']),
    memory: Memory,
  })
  .strict()
  .refine(
    (value) =>
      value.memoryId === value.memory.id &&
      (value.kind === 'create' ? value.baseRevision === 0 : value.baseRevision > 0),
    'Identidade ou revisão inválida',
  );
export type Mutation = z.infer<typeof Mutation>;
export const MutationReceipt = z
  .object({ operationId: z.uuid(), status: z.enum(['accepted', 'conflict']), snapshot: Snapshot })
  .strict();
export const RevisionPage = z
  .object({
    snapshots: z.array(Snapshot).max(100),
    cursor: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER),
    hasMore: z.boolean(),
  })
  .strict();
export const Backup = z
  .object({
    schemaVersion: z.literal(1),
    exportedAt: z.iso.datetime(),
    memories: z.array(Memory).max(10000),
  })
  .strict()
  .refine(
    (value) => new Set(value.memories.map((memory) => memory.id)).size === value.memories.length,
    'IDs repetidos no backup',
  );

export const Capsule = z
  .object({
    id: z.uuid(),
    month: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/),
    title: z.string().trim().min(1).max(160),
    introduction: z.string().trim().max(4000),
    memories: z.array(Memory).max(500),
  })
  .strict();
export type Capsule = z.infer<typeof Capsule>;

export const mediaTypes = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/heic',
  'image/heif',
  'audio/webm',
  'audio/mp4',
  'audio/mpeg',
  'audio/ogg',
  'audio/wav',
  'audio/x-m4a',
  'video/webm',
  'video/mp4',
  'video/quicktime',
  'video/x-m4v',
] as const;
