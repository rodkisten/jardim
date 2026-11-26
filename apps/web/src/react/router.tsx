import { SyncStatus } from '../components/SyncStatus';
import { Home } from '../pages/Home';
import {
  createRootRoute,
  createRoute,
  createRouter,
  Link,
  Outlet,
  createHashHistory,
  lazyRouteComponent,
} from '@tanstack/react-router';
import {
  House,
  CalendarDays,
  BookOpen,
  Layers,
  Search,
  LibraryBig,
  Flower2,
  Settings,
  Cross,
  Inbox as InboxIcon,
} from 'lucide-react';
const items = [
  { to: '/', label: 'Hoje', icon: House },
  { to: '/timeline', label: 'Timeline', icon: CalendarDays },
  { to: '/diary', label: 'Diário', icon: BookOpen },
  { to: '/capsules', label: 'Cápsulas', icon: Layers },
  { to: '/faith', label: 'Fé', icon: Cross },
  { to: '/acervo', label: 'Acervo', icon: LibraryBig },
] as const;
function Shell() {
  return (
    <div className="jardim-shell mx-auto min-h-dvh max-w-3xl">
      <header className="jardim-header flex items-center gap-2 px-4 pb-3">
        <Flower2 className="size-6 text-primary" />
        <span className="jardim-editorial text-2xl">jardim.</span>
        <Link to="/search" aria-label="Buscar" className="ml-auto p-2 text-muted-foreground"><Search className="size-5" /></Link>
        <Link to="/inbox" aria-label="Inbox" className="p-2 text-muted-foreground">
          <InboxIcon className="size-5" />
        </Link>
        <Link to="/settings" aria-label="Configurações" className="p-2 text-muted-foreground">
          <Settings className="size-5" />
        </Link>
      </header>
      <main className="px-4 py-4 pb-32 sm:px-8">
        <SyncStatus />
        <Outlet />
      </main>
      <nav
        aria-label="Navegação principal"
        className="jardim-nav fixed grid grid-cols-6 border border-border bg-card/95 backdrop-blur-xl"
      >
        {items.map(({ to, label, icon: Icon }) => (
          <Link
            key={to}
            to={to}
            activeOptions={{ exact: true }}
            activeProps={{ className: 'jardim-nav-active' }}
            inactiveProps={{ className: 'text-muted-foreground' }}
            className="flex min-h-14 flex-col items-center justify-center gap-1 rounded-2xl text-[10px]"
          >
            <Icon className="size-5" />
            {label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
const root = createRootRoute({ component: Shell });
const home = createRoute({ getParentRoute: () => root, path: '/', component: Home });
const timeline = createRoute({
  getParentRoute: () => root,
  path: '/timeline',
  component: lazyRouteComponent(() => import('../pages/Timeline'), 'Timeline'),
});
const diary = createRoute({
  getParentRoute: () => root,
  path: '/diary',
  component: lazyRouteComponent(() => import('../pages/Diary'), 'Diary'),
});
const capsules = createRoute({
  getParentRoute: () => root,
  path: '/capsules',
  component: lazyRouteComponent(() => import('../pages/Capsules'), 'Capsules'),
});
const search = createRoute({
  getParentRoute: () => root,
  path: '/search',
  component: lazyRouteComponent(() => import('../pages/Search'), 'SearchMemories'),
});
const LazyMemoryDetail = lazyRouteComponent(() => import('../pages/MemoryDetail'), 'MemoryDetail');
const detail = createRoute({
  getParentRoute: () => root,
  path: '/memories/$id',
  component: () => <LazyMemoryDetail id={detail.useParams().id} />,
});
const conflicts = createRoute({
  getParentRoute: () => root,
  path: '/conflicts',
  component: lazyRouteComponent(() => import('../pages/Conflicts'), 'Conflicts'),
});
const faith = createRoute({
  getParentRoute: () => root,
  path: '/faith',
  component: lazyRouteComponent(() => import('../pages/Faith'), 'Faith'),
});
const acervo = createRoute({
  getParentRoute: () => root,
  path: '/acervo',
  component: lazyRouteComponent(() => import('../pages/Acervo'), 'Acervo'),
});
const settings = createRoute({
  getParentRoute: () => root,
  path: '/settings',
  component: lazyRouteComponent(() => import('../pages/Settings'), 'SettingsPage'),
});
const integrations = createRoute({
  getParentRoute: () => root,
  path: '/integrations',
  component: lazyRouteComponent(() => import('../pages/Integrations'), 'IntegrationsPage'),
});
const inboxRoute = createRoute({
  getParentRoute: () => root,
  path: '/inbox',
  component: lazyRouteComponent(() => import('../pages/Inbox'), 'Inbox'),
});
const vault = createRoute({
  getParentRoute: () => root,
  path: '/vault',
  component: lazyRouteComponent(() => import('../pages/Vault'), 'Vault'),
});
export const router = createRouter({
  routeTree: root.addChildren([
    home,
    timeline,
    diary,
    capsules,
    search,
    detail,
    conflicts,
    settings,
    integrations,
    faith,
    acervo,
    inboxRoute,
    vault,
  ]),
  history: createHashHistory(),
  defaultPendingComponent: () => (
    <div role="status" className="py-8 text-center text-sm text-muted-foreground">
      Carregando…
    </div>
  ),
  defaultPreload: 'intent',
});
declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
