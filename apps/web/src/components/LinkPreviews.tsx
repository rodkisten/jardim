import { ExternalLink,Link2 } from "lucide-react";
import { extractLinks,describeLink } from "../utils/link-preview";
export function LinkPreviews({text}:{text:string}){
 const links=extractLinks(text);
 if(!links.length)return null;
 return <div className="space-y-2">{links.map(value=>{const link=describeLink(value);if(!link)return null;return <a key={value} href={link.href} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 rounded-xl border border-border bg-card p-3"><div className="rounded-lg bg-muted p-3"><Link2 className="size-5 text-primary"/></div><div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{link.title}</p><p className="truncate text-xs text-muted-foreground">{link.host}</p></div><ExternalLink className="size-4 shrink-0 text-muted-foreground"/></a>;})}</div>;
}
