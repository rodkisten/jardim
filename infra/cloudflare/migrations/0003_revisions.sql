-- Preserve the deployed table and rowids. New clients use a separate, non-reusable change sequence.
ALTER TABLE memories ADD COLUMN revision INTEGER NOT NULL DEFAULT 1;
ALTER TABLE memories ADD COLUMN deleted_at TEXT;
ALTER TABLE memories ADD COLUMN revision_operation TEXT;
CREATE TABLE memory_changes(sequence INTEGER PRIMARY KEY AUTOINCREMENT, memory_id TEXT NOT NULL);
CREATE TABLE memory_revisions(memory_id TEXT NOT NULL, revision INTEGER NOT NULL, snapshot TEXT NOT NULL, PRIMARY KEY(memory_id,revision));
CREATE TABLE mutation_receipts(operation_id TEXT PRIMARY KEY,payload_hash TEXT NOT NULL,snapshot TEXT NOT NULL);
INSERT INTO memory_changes(memory_id) SELECT id FROM memories ORDER BY rowid;
INSERT INTO memory_revisions(memory_id,revision,snapshot)
SELECT id,revision,json_object('memory',json_object('id',id,'title',title,'body',body,'tags',json(tags),'createdAt',created_at),'revision',revision,'deletedAt',deleted_at) FROM memories;
CREATE TRIGGER memory_created AFTER INSERT ON memories BEGIN
 INSERT INTO memory_changes(memory_id) VALUES(NEW.id);
 INSERT INTO memory_revisions(memory_id,revision,snapshot) VALUES(NEW.id,NEW.revision,json_object('memory',json_object('id',NEW.id,'title',NEW.title,'body',NEW.body,'tags',json(NEW.tags),'createdAt',NEW.created_at),'revision',NEW.revision,'deletedAt',NEW.deleted_at));
END;
CREATE TRIGGER memory_changed AFTER UPDATE OF revision ON memories WHEN NEW.revision<>OLD.revision BEGIN
 INSERT INTO memory_changes(memory_id) VALUES(NEW.id);
 INSERT INTO memory_revisions(memory_id,revision,snapshot) VALUES(NEW.id,NEW.revision,json_object('memory',json_object('id',NEW.id,'title',NEW.title,'body',NEW.body,'tags',json(NEW.tags),'createdAt',NEW.created_at),'revision',NEW.revision,'deletedAt',NEW.deleted_at));
END;
