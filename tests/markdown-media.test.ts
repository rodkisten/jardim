import {expect,test} from "vitest";
import {mediaMarker,mediaMarkerId} from "../apps/web/src/utils/markdown-media";
test("stable multimedia marker round trip",()=>{const id="12345678-1234-1234-1234-123456789abc";expect(mediaMarkerId(mediaMarker(id))).toBe(id);expect(mediaMarkerId("![Anexo](jardim-media:invalid)")).toBeUndefined();});
