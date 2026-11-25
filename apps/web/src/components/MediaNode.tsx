import {mediaMarker,mediaMarkerId} from "../utils/markdown-media";
import { createContext,useContext,useEffect,useState } from "react";
import { Node,mergeAttributes } from "@tiptap/core";
import { NodeViewWrapper,ReactNodeViewRenderer,type NodeViewProps } from "@tiptap/react";
import type { ComposerAttachment } from "../utils/composer-store";
export const MediaContext=createContext<ComposerAttachment[]>([]);
function MediaView({node,deleteNode}:NodeViewProps){
 const attachments=useContext(MediaContext),attachment=attachments.find(a=>a.id===node.attrs.id);
 const [url,setUrl]=useState("");
 useEffect(()=>{if(!attachment){setUrl("");return;}const next=URL.createObjectURL(attachment.blob);setUrl(next);return()=>URL.revokeObjectURL(next);},[attachment]);
 return <NodeViewWrapper className="my-2 rounded-lg border border-border p-2" contentEditable={false}><div className="flex items-center justify-between text-xs"><span>{attachment?.name??"Anexo indisponível"}</span><button type="button" onClick={deleteNode}>Remover bloco</button></div>{url&&attachment&&(attachment.blob.type.startsWith("image/")?<img src={url} alt={attachment.name} className="max-h-72 w-full object-contain"/>:attachment.blob.type.startsWith("video/")?<video src={url} controls playsInline className="w-full"/>:<audio src={url} controls className="w-full"/>)}</NodeViewWrapper>;
}
export const MediaNode=Node.create({name:"jardimMedia",group:"block",atom:true,draggable:true,addAttributes(){return {id:{default:null}};},parseHTML(){return [{tag:"div[data-jardim-media]"}];},renderHTML({HTMLAttributes}){return ["div",mergeAttributes(HTMLAttributes,{"data-jardim-media":""})];},markdownTokenizer:{name:"jardimMedia",level:"block",start(src){return src.indexOf("![Anexo](jardim-media:");},tokenize(src){const raw=src.split("\n")[0];const id=mediaMarkerId(raw);return id?{type:"jardimMedia",raw,id}:undefined;}},parseMarkdown(token,helpers){return helpers.createNode("jardimMedia",{id:token.id});},renderMarkdown(node){return mediaMarker(String(node.attrs?.id))+"\n\n";},addNodeView(){return ReactNodeViewRenderer(MediaView);}});
