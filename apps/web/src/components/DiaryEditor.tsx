import { languages,Snippet } from "./Snippet";
import { useState } from "react";
import { Markdown } from "@tiptap/markdown";
import Highlight from "@tiptap/extension-highlight";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import TextAlign from "@tiptap/extension-text-align";
import Typography from "@tiptap/extension-typography";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import { Bold, Italic, List, ListOrdered, Undo, Redo, Heading2, Quote, Code2, Highlighter, ListChecks, Underline, Strikethrough, AlignCenter, Minus } from "lucide-react";
import { Button } from "@rodkisten/girassol/react";
import { RichDocument } from "@rodkisten/jardim-contracts";
import type { Draft } from "../utils/draft";
export function DiaryEditor({draft,onChange}:{draft:Draft;onChange:(body:string,document:RichDocument)=>void}) {
  const [markdown,setMarkdown]=useState<string|null>(null);
  const [language,setLanguage]=useState("typescript");
  const editor=useEditor({
    extensions:[Markdown,Highlight,TaskList,TaskItem.configure({nested:true}),TextAlign.configure({types:["heading","paragraph"]}),Typography,StarterKit.configure({link:{autolink:true,linkOnPaste:true,openOnClick:false}}),Placeholder.configure({placeholder:"O que você quer lembrar de hoje?"})],
    content: draft.document ? {type:"doc",content:draft.document.content as import("@tiptap/core").JSONContent[] | undefined} : {type:"doc",content:draft.body.split("\n").map(line=>({type:"paragraph",content:line?[{type:"text",text:line}]:[]}))},
    editorProps:{attributes:{class:"min-h-48 p-3 text-base outline-none break-words", "aria-label":"Conteúdo da memória"}},
    onUpdate:({editor})=>{const parsed=RichDocument.safeParse(editor.getJSON());if(parsed.success)onChange(editor.getText(),parsed.data);}
  });
  if(!editor)return null;
  const tools=[{label:"Título",Icon:Heading2,run:()=>editor.chain().focus().toggleHeading({level:2}).run()},{label:"Citação",Icon:Quote,run:()=>editor.chain().focus().toggleBlockquote().run()},{label:"Snippet",Icon:Code2,run:()=>editor.chain().focus().toggleCodeBlock({language}).run()},{label:"Realce",Icon:Highlighter,run:()=>editor.chain().focus().toggleHighlight().run()},{label:"Checklist",Icon:ListChecks,run:()=>editor.chain().focus().toggleTaskList().run()},{label:"Sublinhado",Icon:Underline,run:()=>editor.chain().focus().toggleUnderline().run()},{label:"Riscado",Icon:Strikethrough,run:()=>editor.chain().focus().toggleStrike().run()},{label:"Centralizar",Icon:AlignCenter,run:()=>editor.chain().focus().setTextAlign("center").run()},{label:"Nova nota / separador",Icon:Minus,run:()=>editor.chain().focus().setHorizontalRule().run()},{label:"Negrito",Icon:Bold,run:()=>editor.chain().focus().toggleBold().run()},{label:"Itálico",Icon:Italic,run:()=>editor.chain().focus().toggleItalic().run()},{label:"Lista",Icon:List,run:()=>editor.chain().focus().toggleBulletList().run()},{label:"Lista numerada",Icon:ListOrdered,run:()=>editor.chain().focus().toggleOrderedList().run()},{label:"Desfazer",Icon:Undo,run:()=>editor.chain().focus().undo().run()},{label:"Refazer",Icon:Redo,run:()=>editor.chain().focus().redo().run()}];
  return <div className="rounded-xl border border-border bg-card"><div className="flex flex-wrap gap-1 border-b border-border p-1">{tools.map(({label,Icon,run})=><Button key={label} type="button" variant="ghost" size="icon" aria-label={label} onClick={run}><Icon className="size-4"/></Button>)}</div><div className="flex gap-2 border-b border-border p-2"><Button type="button" size="sm" variant="outline" onClick={()=>setMarkdown(editor.getMarkdown())}>Markdown</Button>{markdown!==null&&<Button type="button" size="sm" onClick={()=>{editor.commands.setContent(markdown,{contentType:"markdown"});setMarkdown(null);}}>Aplicar Markdown</Button>}{markdown!==null&&<Button type="button" size="sm" variant="ghost" onClick={()=>setMarkdown(null)}>Cancelar</Button>}</div>{markdown!==null?<textarea className="min-h-64 w-full bg-card p-3 font-mono text-sm" value={markdown} onChange={e=>setMarkdown(e.target.value)}/>:<EditorContent editor={editor}/>}<div className="flex items-center gap-2 border-t border-border p-2 text-xs"><label>Linguagem do snippet <select className="rounded border border-border bg-card p-1" value={language} onChange={e=>{setLanguage(e.target.value);if(editor.isActive("codeBlock"))editor.chain().focus().updateAttributes("codeBlock",{language:e.target.value}).run();}}>{languages.map(l=><option key={l}>{l}</option>)}</select></label></div>{editor.isActive("codeBlock")&&<Snippet code={editor.state.selection.$from.parent.textContent} language={String(editor.getAttributes("codeBlock").language??language)}/>}</div>;
}
