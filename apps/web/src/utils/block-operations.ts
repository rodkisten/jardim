import type {Editor} from '@tiptap/core';
import {NodeSelection,TextSelection} from '@tiptap/pm/state';
export function activeBlock(editor:Editor){const s=editor.state.selection;const pos=s instanceof NodeSelection?s.from:s.$from.depth?s.$from.before(1):s.from;let offset=0;for(let i=0;i<editor.state.doc.childCount;i++){const node=editor.state.doc.child(i);if(pos>=offset&&pos<offset+node.nodeSize)return {index:i,pos:offset,node};offset+=node.nodeSize;}return null;}
export function editBlock(editor:Editor,action:'up'|'down'|'duplicate'|'delete'){
 if(!editor.isEditable)return false;const block=activeBlock(editor);if(!block)return false;
 const {index,pos,node}=block,doc=editor.state.doc,tr=editor.state.tr;let target:number;
 if(action==='duplicate'){target=pos+node.nodeSize;tr.insert(target,node);}
 else if(action==='delete'){if(doc.childCount===1)tr.replaceWith(0,doc.content.size,editor.schema.nodes.paragraph.create());else tr.delete(pos,pos+node.nodeSize);target=Math.min(pos,tr.doc.content.size);}
 else if(action==='up'&&index>0){const prev=doc.child(index-1);target=pos-prev.nodeSize;tr.replaceWith(target,pos+node.nodeSize,[node,prev]);}
 else if(action==='down'&&index<doc.childCount-1){const next=doc.child(index+1);target=pos+next.nodeSize;tr.replaceWith(pos,pos+node.nodeSize+next.nodeSize,[next,node]);}
 else return false;
 tr.setSelection(TextSelection.near(tr.doc.resolve(Math.min(target+1,tr.doc.content.size))));editor.view.dispatch(tr.scrollIntoView());editor.view.focus();return true;
}

export function moveBlockTo(editor:Editor,from:number,to:number){
 if(!editor.isEditable)return false;
 const doc=editor.state.doc;
 if(!Number.isInteger(from)||!Number.isInteger(to)||from<0||to<0||from>=doc.childCount||to>=doc.childCount||from===to)return false;
 const blocks=Array.from({length:doc.childCount},(_,i)=>doc.child(i));
 const [node]=blocks.splice(from,1);blocks.splice(to,0,node);
 const tr=editor.state.tr.replaceWith(0,doc.content.size,blocks);
 const pos=blocks.slice(0,to).reduce((sum,n)=>sum+n.nodeSize,0);
 tr.setSelection(TextSelection.near(tr.doc.resolve(Math.min(pos+1,tr.doc.content.size))));
 editor.view.dispatch(tr.scrollIntoView());return true;
}
