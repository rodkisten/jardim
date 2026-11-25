import { expect,test } from "vitest";
import { inlineMediaIds } from "../apps/web/src/utils/inline-media";
test("collects nested attachment references without duplicates",()=>{expect([...inlineMediaIds({type:"doc",content:[{type:"jardimMedia",attrs:{id:"a"}},{type:"blockquote",content:[{type:"jardimMedia",attrs:{id:"b"}},{type:"jardimMedia",attrs:{id:"a"}}]}]})]).toEqual(["a","b"]);});
test("ignores invalid references",()=>{expect(inlineMediaIds({type:"jardimMedia",attrs:{id:42}}).size).toBe(0);});
