import { DndContext, closestCenter, PointerSensor, KeyboardSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, useSortable, arrayMove, sortableKeyboardCoordinates, rectSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';
import './layout-sortable.css';
export function LayoutSortable<T extends string>({order,onChange,children}:{order:readonly T[];onChange:(next:T[])=>void;children:ReactNode}){
 const [dragging,setDragging]=useState(false);
 useEffect(()=>{if(!dragging)return;document.documentElement.classList.add('jardim-layout-dragging');return ()=>document.documentElement.classList.remove('jardim-layout-dragging');},[dragging]);
 const sensors=useSensors(useSensor(PointerSensor,{activationConstraint:{distance:8}}),useSensor(KeyboardSensor,{coordinateGetter:sortableKeyboardCoordinates}));
 return <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={()=>{window.getSelection()?.removeAllRanges();setDragging(true);}} onDragCancel={()=>setDragging(false)} onDragEnd={({active,over})=>{setDragging(false);if(!over||active.id===over.id)return;const from=order.findIndex(id=>id===active.id),to=order.findIndex(id=>id===over.id);if(from>=0&&to>=0)onChange(arrayMove([...order],from,to));}}><SortableContext items={[...order]} strategy={rectSortingStrategy}>{children}</SortableContext></DndContext>;
}
export function LayoutItem({id,label,children,className='',enabled=true,compact=false}:{id:string;label:string;children:ReactNode;className?:string;enabled?:boolean;compact?:boolean}){
 const {attributes,listeners,setNodeRef,setActivatorNodeRef,transform,transition,isDragging}=useSortable({id,disabled:!enabled});
 return <div ref={setNodeRef} style={{transform:CSS.Translate.toString(transform),transition,zIndex:isDragging?20:undefined,position:'relative'}} className={`${className} ${enabled?'jardim-layout-editable':''}`}>{enabled&&<button type="button" ref={setActivatorNodeRef} {...attributes} {...listeners} aria-label={'Arrastar '+label} className={`jardim-layout-handle mb-1 inline-flex max-w-full touch-none select-none cursor-grab items-center justify-center gap-1 rounded-md border border-border bg-background text-xs text-muted-foreground active:cursor-grabbing ${compact?'w-full px-0 py-1':'px-2 py-2'}`}><GripVertical className="size-4 shrink-0"/>{!compact&&<span className="truncate">{label}</span>}</button>}{children}</div>;
}
