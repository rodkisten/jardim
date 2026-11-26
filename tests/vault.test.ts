import {describe,it,expect} from 'vitest';
import {sealBackup,openBackup} from '../apps/web/src/utils/vault';
import {inventory} from '../apps/web/src/utils/vault-inventory';
const password='test-only-long-password';
const backup={schemaVersion:1,exportedAt:'2026-01-01T00:00:00.000Z',memories:[]};
describe('vault integrity',()=>{it('roundtrips an authenticated backup',async()=>{const file=await sealBackup(backup,password);expect(await openBackup(file,password)).toEqual(backup);});it('rejects wrong passwords and tampering',async()=>{const file=await sealBackup(backup,password);await expect(openBackup(file,'incorrect-password')).rejects.toThrow();const bytes=new Uint8Array(await file.arrayBuffer());bytes[bytes.length-1]^=1;await expect(openBackup(new Blob([bytes]),password)).rejects.toThrow();});it('reports inventory without media',()=>{expect(inventory([],[])).toEqual({memories:0,attachments:0,bytes:0,missing:[],unreferenced:0});});});
