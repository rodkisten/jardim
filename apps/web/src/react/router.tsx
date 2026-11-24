import { IntegrationsPage } from "../pages/Integrations";
import { SettingsPage } from "../pages/Settings";
import { SyncStatus } from "../components/SyncStatus";
import { Conflicts } from "../pages/Conflicts";
import { Capsules } from "../pages/Capsules";
import { MemoryDetail } from "../pages/MemoryDetail";
import { Diary } from "../pages/Diary";
import { Home } from "../pages/Home";
import { Timeline } from "../pages/Timeline";
import { SearchMemories } from "../pages/Search";
import { createRootRoute, createRoute, createRouter, Link, Outlet, createHashHistory } from "@tanstack/react-router";
import { House, CalendarDays, BookOpen, Layers, Search, Flower2, Settings } from "lucide-react";
const items = [
  { to: "/", label: "Hoje", icon: House },
  { to: "/timeline", label: "Timeline", icon: CalendarDays },
  { to: "/diary", label: "Diário", icon: BookOpen },
  { to: "/capsules", label: "Cápsulas", icon: Layers },
  { to: "/search", label: "Buscar", icon: Search },
] as const;
function Shell() {
  return <div className="mx-auto min-h-dvh max-w-2xl">
    <header className="jardim-header flex items-center gap-2 border-b border-border px-4 pb-3"><Flower2 className="size-6 text-primary" /><span className="text-lg font-semibold">jardim.</span><Link to="/settings" aria-label="Configurações" className="ml-auto p-2 text-muted-foreground"><Settings className="size-5"/></Link></header>
    <main className="px-4 py-5 pb-28"><SyncStatus/><Outlet /></main>
    <nav aria-label="Navegação principal" className="jardim-nav fixed inset-x-0 bottom-0 mx-auto grid max-w-2xl grid-cols-5 border-t border-border bg-background/95 backdrop-blur">
      {items.map(({to,label,icon:Icon}) => <Link key={to} to={to} activeOptions={{exact:true}} activeProps={{className:"text-primary"}} inactiveProps={{className:"text-muted-foreground"}} className="flex min-h-14 flex-col items-center justify-center gap-1 text-xs"><Icon className="size-5" />{label}</Link>)}
    </nav>
  </div>;
}
const root = createRootRoute({component:Shell});
const home = createRoute({getParentRoute:()=>root,path:"/",component:Home});
const timeline = createRoute({getParentRoute:()=>root,path:"/timeline",component:Timeline});
const diary = createRoute({getParentRoute:()=>root,path:"/diary",component:Diary});
const capsules = createRoute({getParentRoute:()=>root,path:"/capsules",component:Capsules});
const search = createRoute({getParentRoute:()=>root,path:"/search",component:SearchMemories});
const detail = createRoute({getParentRoute:()=>root,path:"/memories/$id",component:()=> <MemoryDetail id={detail.useParams().id}/>});
const conflicts = createRoute({getParentRoute:()=>root,path:"/conflicts",component:Conflicts});
const settings = createRoute({getParentRoute:()=>root,path:"/settings",component:SettingsPage});
const integrations = createRoute({getParentRoute:()=>root,path:"/integrations",component:IntegrationsPage});
export const router = createRouter({routeTree:root.addChildren([home,timeline,diary,capsules,search,detail,conflicts,settings,integrations]),history:createHashHistory()});
declare module "@tanstack/react-router" { interface Register { router: typeof router } }
