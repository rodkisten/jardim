import { createRootRoute, createRoute, createRouter, Link, Outlet, createHashHistory } from "@tanstack/react-router";
import { House, CalendarDays, BookOpen, Layers, Search, Flower2 } from "lucide-react";
const items = [
  { to: "/", label: "Hoje", icon: House },
  { to: "/timeline", label: "Timeline", icon: CalendarDays },
  { to: "/diary", label: "Diário", icon: BookOpen },
  { to: "/capsules", label: "Cápsulas", icon: Layers },
  { to: "/search", label: "Buscar", icon: Search },
] as const;
function Shell() {
  return <div className="mx-auto min-h-dvh max-w-2xl">
    <header className="jardim-header flex items-center gap-2 border-b border-border px-4 pb-3"><Flower2 className="size-6 text-primary" /><span className="text-lg font-semibold">jardim.</span></header>
    <main className="px-4 py-5 pb-28"><Outlet /></main>
    <nav aria-label="Navegação principal" className="jardim-nav fixed inset-x-0 bottom-0 mx-auto grid max-w-2xl grid-cols-5 border-t border-border bg-background/95 backdrop-blur">
      {items.map(({to,label,icon:Icon}) => <Link key={to} to={to} activeOptions={{exact:true}} activeProps={{className:"text-primary"}} inactiveProps={{className:"text-muted-foreground"}} className="flex min-h-14 flex-col items-center justify-center gap-1 text-xs"><Icon className="size-5" />{label}</Link>)}
    </nav>
  </div>;
}
const root = createRootRoute({component:Shell});
function Pending({title}:{title:string}) {return <section><h1 className="text-2xl font-semibold">{title}</h1><p className="mt-2 text-sm text-muted-foreground">Interface em migração. Seus dados continuam no Jardim original.</p></section>}
const home = createRoute({getParentRoute:()=>root,path:"/",component:()=> <Pending title="Seu jardim, hoje" />});
const timeline = createRoute({getParentRoute:()=>root,path:"/timeline",component:()=> <Pending title="Timeline" />});
const diary = createRoute({getParentRoute:()=>root,path:"/diary",component:()=> <Pending title="Diário" />});
const capsules = createRoute({getParentRoute:()=>root,path:"/capsules",component:()=> <Pending title="Cápsulas" />});
const search = createRoute({getParentRoute:()=>root,path:"/search",component:()=> <Pending title="Buscar" />});
export const router = createRouter({routeTree:root.addChildren([home,timeline,diary,capsules,search]),history:createHashHistory()});
declare module "@tanstack/react-router" { interface Register { router: typeof router } }
