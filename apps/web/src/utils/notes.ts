import type { Draft } from "./draft";
import type { RichDocument } from "@rodkisten/jardim-contracts";
export type Note={id:string;title:string;body:string;document:RichDocument|null};
export function newNote():Note{return {id:crypto.randomUUID(),title:"",body:"",document:null};}
export function moveNote(notes:Note[],id:string,delta:number){const index=notes.findIndex(n=>n.id===id),target=index+delta;if(index<0||target<0||target>=notes.length)return notes;const next=[...notes];const [note]=next.splice(index,1);next.splice(target,0,note);return next;}
export function combineNotes(draft:Draft,notes:Note[]):Draft{
 const content:NonNullable<RichDocument["content"]>=[];
 const bodies:string[]=[];
 for(const note of notes){if(!note.title.trim()&&!note.body.trim()&&!note.document?.content?.length)continue;if(content.length)content.push({type:"horizontalRule"});if(note.title.trim())content.push({type:"heading",attrs:{level:2},content:[{type:"text",text:note.title.trim()}]});content.push(...(note.document?.content??note.body.split("\n").map(text=>({type:"paragraph",content:text?[{type:"text",text}]:[]}))));bodies.push([note.title.trim(),note.body].filter(Boolean).join("\n"));}
 return {...draft,body:bodies.join("\n\n"),document:{type:"doc",content}};
}
