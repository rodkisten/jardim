import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import { Bold, Italic, List, ListOrdered, Undo, Redo } from "lucide-react";
import { Button } from "@rodkisten/girassol/react";
import { RichDocument } from "@rodkisten/jardim-contracts";
import type { Draft } from "../utils/draft";
export function DiaryEditor({draft,onChange}:{draft:Draft;onChange:(body:string,document:RichDocument)=>void}) {
  const editor=useEditor({
    extensions:[StarterKit.configure({link:{autolink:true,linkOnPaste:true,openOnClick:false}}),Placeholder.configure({placeholder:"O que você quer lembrar de hoje?"})],
    content: draft.document ? {type:"doc",content:draft.document.content as import("@tiptap/core").JSONContent[] | undefined} : {type:"doc",content:draft.body.split("\n").map(line=>({type:"paragraph",content:line?[{type:"text",text:line}]:[]}))},
    editorProps:{attributes:{class:"min-h-48 p-3 text-base outline-none break-words", "aria-label":"Conteúdo da memória"}},
    onUpdate:({editor})=>{const parsed=RichDocument.safeParse(editor.getJSON());if(parsed.success)onChange(editor.getText(),parsed.data);}
  });
  if(!editor)return null;
  const tools=[{label:"Negrito",Icon:Bold,run:()=>editor.chain().focus().toggleBold().run()},{label:"Itálico",Icon:Italic,run:()=>editor.chain().focus().toggleItalic().run()},{label:"Lista",Icon:List,run:()=>editor.chain().focus().toggleBulletList().run()},{label:"Lista numerada",Icon:ListOrdered,run:()=>editor.chain().focus().toggleOrderedList().run()},{label:"Desfazer",Icon:Undo,run:()=>editor.chain().focus().undo().run()},{label:"Refazer",Icon:Redo,run:()=>editor.chain().focus().redo().run()}];
  return <div className="rounded-xl border border-border bg-card"><div className="flex flex-wrap gap-1 border-b border-border p-1">{tools.map(({label,Icon,run})=><Button key={label} type="button" variant="ghost" size="icon" aria-label={label} onClick={run}><Icon className="size-4"/></Button>)}</div><EditorContent editor={editor}/></div>;
}
