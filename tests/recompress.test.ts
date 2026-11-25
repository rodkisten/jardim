import {expect,test} from "vitest";
import {replaceAttachment} from "../apps/web/src/utils/composer-store";
test("recompression retains original and stable inline identity",()=>{const original=new Blob(["original"],{type:"image/png"});const next=replaceAttachment([{id:"a",blob:original,name:"a.png",lastModified:1}],"a",new File(["x"],"a.webp",{type:"image/webp"}),["image/webp"]);expect(next[0]).toMatchObject({id:"a",original,originalName:"a.png",name:"a.webp"});expect(next[0].blob.size).toBe(1);});
