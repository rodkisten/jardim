import { DndContext, closestCenter, PointerSensor, KeyboardSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, useSortable, arrayMove, sortableKeyboardCoordinates, rectSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';
import type { ReactNode } from 'react';
export function LayoutSortable<T extends string>({order,onChange,children}:{order:readonly T[];onChange:(next:T[])=>void;children:ReactNode}){
 const sensors=useSensors(useSensor(PointerSensor,{activationConstraint:{distance:8}}),useSensor(KeyboardSensor,{coordinateGetter:sortableKeyboardCoordinates}));
 return <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={({active,over})=>{if(!over||active.id===over.id)return;const from=order.findIndex(id=>id===active.id),to=order.findIndex(id=>id===over.id);if(from>=0&&to>=0)onChange(arrayMove([...order],from,to));}}><SortableContext items={[...order]} strategy={rectSortingStrategy}>{children}</SortableContext></DndContext>;
}
export function LayoutItem({id,label,children,className='',enabled=true}:{id:string;label:string;children:ReactNode;className?:string;enabled?:boolean}){
 const {attributes,listeners,setNodeRef,setActivatorNodeRef,transform,transition,isDragging}=useSortable({id,disabled:!enabled});
 return <div ref={setNodeRef} style={{transform:CSS.Transform.toString(transform),transition,zIndex:isDragging?20:undefined,position:'relative'}} className={className}>{enabled&&<button type="button" ref={setActivatorNodeRef} {...attributes} {...listeners} aria-label={'Arrastar '+label} className="mb-1 inline-flex touch-none cursor-grab items-center gap-1 rounded-md border border-border bg-background px-2 py-2 text-xs text-muted-foreground active:cursor-grabbing"><GripVertical className="size-4"/>{label}</button>}{children}</div>;
}
