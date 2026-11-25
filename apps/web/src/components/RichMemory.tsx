import {TechnicalContent} from "./TechnicalContent";
import { Attachment } from "./Attachment";
import { Snippet } from "./Snippet";
import { LinkPreviews } from "./LinkPreviews";
import type { ReactNode } from "react";
import type { Memory } from "@rodkisten/jardim-contracts";
type Node = {type?:unknown;text?:unknown;attrs?:unknown;marks?:unknown;content?:unknown};
const nodes=(value:unknown):Node[]=>Array.isArray(value)?value.filter((item):item is Node=>!!item&&typeof item==="object"&&!Array.isArray(item)).slice(0,500):[];
const attrs=(node:Node):Record<string,unknown>=>node.attrs&&typeof node.attrs==="object"&&!Array.isArray(node.attrs)?node.attrs as Record<string,unknown>:{};
function safeLink(value:unknown){if(typeof value!=="string")return;try{const url=new URL(value);if(["https:","http:","mailto:"].includes(url.protocol))return url.href;}catch { /* Optional operation failed; retain the existing local state. */ }}
function RichNode({node,depth=0}:{node:Node;depth?:number}):ReactNode {
  const children=depth>=12?null:nodes(node.content).map((child,i)=><RichNode key={i} node={child} depth={depth+1}/>);
  switch(node.type){
    case "text": {let value:ReactNode=typeof node.text==="string"?node.text.slice(0,20000):"";for(const mark of nodes(node.marks)){switch(mark.type){case "bold":value=<strong>{value}</strong>;break;case "italic":value=<em>{value}</em>;break;case "underline":value=<u>{value}</u>;break;case "strike":value=<s>{value}</s>;break;case "code":value=<code>{value}</code>;break;case "highlight":value=<mark>{value}</mark>;break;case "link":{const href=safeLink(attrs(mark).href);if(href)value=<a className="text-primary underline" href={href} rel="nofollow noopener noreferrer" target="_blank">{value}</a>;break;}}}return value;}
    case "jardimMedia":{const id=attrs(node).id;return typeof id==="string"&&/^[a-f0-9-]{36}$/i.test(id)?<Attachment id={id}/>:null;}
    case "paragraph":return <p>{children}</p>;
    case "heading":return <h3 className="text-lg font-semibold">{children}</h3>;
    case "blockquote":return <blockquote className="border-l-2 border-primary pl-3">{children}</blockquote>;
    case "bulletList":return <ul className="list-disc pl-5">{children}</ul>;
    case "orderedList":return <ol className="list-decimal pl-5">{children}</ol>;
    case "taskList":return <ul>{children}</ul>;
    case "taskItem":return <li><input type="checkbox" checked={attrs(node).checked===true} disabled/> {children}</li>;
    case "listItem":return <li>{children}</li>;
    case "table":return <div className="overflow-x-auto"><table className="w-full border-collapse"><tbody>{children}</tbody></table></div>;
    case "tableRow":return <tr>{children}</tr>;
    case "tableHeader":return <th className="border border-border bg-muted p-2 text-left">{children}</th>;
    case "tableCell":return <td className="border border-border p-2">{children}</td>;
    case "codeBlock":if(["mermaid","math","latex"].includes(String(attrs(node).language)))return <TechnicalContent language={String(attrs(node).language)} source={nodes(node.content).map(n=>typeof n.text==="string"?n.text:"").join("")}/>;return <Snippet code={nodes(node.content).map(n=>typeof n.text==="string"?n.text:"").join("")} language={typeof attrs(node).language==="string"?String(attrs(node).language):"plaintext"}/>;
    case "hardBreak":return <br/>;
    case "horizontalRule":return <hr className="border-border"/>;
    default:return <>{children}</>;
  }
}
export function RichMemory({memory}:{memory:Memory}){
  return <div className="space-y-3 whitespace-pre-wrap break-words">{memory.richDocument?nodes(memory.richDocument.content).map((node,i)=><RichNode key={i} node={node}/>):<p>{memory.body.replace(/\[anexo:[a-f0-9-]{36}\]/gi,"").trim()}</p>}<LinkPreviews text={memory.body}/></div>;
}
