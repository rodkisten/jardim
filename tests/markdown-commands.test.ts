import {expect,test} from "vitest";
import {formatSelection,markdownCommands} from "../apps/web/src/utils/markdown-commands";
test("wraps selection and retains its range",()=>expect(formatSelection("Jardim",markdownCommands[0])).toEqual({text:"**Jardim**",start:2,end:8}));
test("inserts editable placeholder",()=>expect(formatSelection("",markdownCommands[0]).text).toBe("**texto**"));
