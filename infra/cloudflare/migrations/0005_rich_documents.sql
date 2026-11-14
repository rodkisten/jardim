-- Keep existing memories and revisions; extend future snapshots with optional Tiptap JSON.
ALTER TABLE memories ADD COLUMN rich_document TEXT;
DROP TRIGGER IF EXISTS memory_created;
DROP TRIGGER IF EXISTS memory_changed;
CREATE TRIGGER memory_created AFTER INSERT ON memories BEGIN
 INSERT INTO memory_changes(memory_id) VALUES(NEW.id);
 INSERT INTO memory_revisions(memory_id,revision,snapshot) VALUES(NEW.id,NEW.revision,json_object('memory',json_patch(json_object('id',NEW.id,'title',NEW.title,'body',NEW.body,'tags',json(NEW.tags),'createdAt',NEW.created_at),CASE WHEN NEW.rich_document IS NULL THEN '{}' ELSE json_object('richDocument',json(NEW.rich_document)) END),'revision',NEW.revision,'deletedAt',NEW.deleted_at));
END;
CREATE TRIGGER memory_changed AFTER UPDATE OF revision ON memories WHEN NEW.revision<>OLD.revision BEGIN
 INSERT INTO memory_changes(memory_id) VALUES(NEW.id);
 INSERT INTO memory_revisions(memory_id,revision,snapshot) VALUES(NEW.id,NEW.revision,json_object('memory',json_patch(json_object('id',NEW.id,'title',NEW.title,'body',NEW.body,'tags',json(NEW.tags),'createdAt',NEW.created_at),CASE WHEN NEW.rich_document IS NULL THEN '{}' ELSE json_object('richDocument',json(NEW.rich_document)) END),'revision',NEW.revision,'deletedAt',NEW.deleted_at));
END;
