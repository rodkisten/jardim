import {expect,test} from "vitest";
import {isAnimatedPng} from "../apps/web/src/utils/image-options";
function png(type:string){const bytes=new Uint8Array(20);bytes.set([137,80,78,71,13,10,26,10]);bytes.set([...type].map(c=>c.charCodeAt(0)),12);return bytes;}
test("static PNG is eligible for compression",()=>expect(isAnimatedPng(png("IDAT"))).toBe(false));
test("animated PNG and malformed input are preserved",()=>{expect(isAnimatedPng(png("acTL"))).toBe(true);expect(isAnimatedPng(new Uint8Array(2))).toBe(true);});
