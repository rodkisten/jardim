import "fake-indexeddb/auto";
import { expect,test } from "vitest";
import { MediaCache,cacheMetadata,pruneMetadata } from "../apps/web/src/utils/media-cache";
test("merges metadata and retains it after reopening",async()=>{const db=new MediaCache("media-test-"+crypto.randomUUID());await cacheMetadata("a",{peaks:[.2,1]},db);await cacheMetadata("a",{duration:10},db);db.close();await db.open();expect(await db.metadata.get("a")).toMatchObject({peaks:[.2,1],duration:10});await cacheMetadata("b",{duration:3},db);await pruneMetadata(db,1);expect(await db.metadata.count()).toBe(1);await db.delete();});
