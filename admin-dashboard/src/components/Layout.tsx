import {
  Bell,
  BookOpen,
  ChartColumn,
  LayoutDashboard,
  LogOut,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  ScrollText,
  Images,
  X,
  Settings,
  Shapes,
  ShoppingBag,
  Star,
  Store,
  TicketPercent,
  UserPlus,
  UserX,
  Users,
  type LucideIcon,
} from 'lucide-react';
import { Suspense, useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { isRealtimeConnected, onRealtimeEvent, onRealtimeStatus, usePresence } from '../api/realtime';
import { useAuth } from '../auth/AuthContext';
import { FormSkeleton, initials } from './ui';

const NAV = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/analytics', label: 'Analytics', icon: ChartColumn },
  { to: '/courses', label: 'Courses', icon: BookOpen },
  { to: '/categories', label: 'Categories', icon: Shapes },
  { to: '/users', label: 'Learners', icon: Users },
  { to: '/orders', label: 'Orders', icon: ShoppingBag },
  { to: '/reviews', label: 'Reviews', icon: Star },
  { to: '/coupons', label: 'Coupons', icon: TicketPercent },
  { to: '/banners', label: 'Banners', icon: Images },
  { to: '/content', label: 'Content', icon: ScrollText },
  { to: '/notifications', label: 'Notifications', icon: Bell },
  { to: '/play-store', label: 'Play Store', icon: Store },
  { to: '/deletion-requests', label: 'Deletion requests', icon: UserX },
  { to: '/settings', label: 'Settings', icon: Settings },
];

const SIDEBAR_KEY = 'ydu.admin.sidebarCollapsed';

const TITLES: Record<string, { title: string; subtitle: string }> = {
  '/': { title: 'Dashboard', subtitle: 'How the academy is doing, at a glance' },
  '/analytics': { title: 'Analytics', subtitle: 'Traffic, learners, funnel and what they search for' },
  '/courses': { title: 'Courses', subtitle: 'Create, price, publish and arrange the catalog' },
  '/categories': { title: 'Categories', subtitle: 'The tracks learners browse and filter by' },
  '/users': { title: 'Learners', subtitle: 'Accounts, access and spend' },
  '/orders': { title: 'Orders', subtitle: 'Every purchase, payment and refund' },
  '/reviews': { title: 'Reviews', subtitle: 'What learners say about each course' },
  '/coupons': { title: 'Coupons', subtitle: 'Discount codes for checkout' },
  '/banners': { title: 'Banners', subtitle: 'The posters at the top of the app’s home screen' },
  '/content': { title: 'Content', subtitle: 'Help, policies and checkout copy — in the app and on the public website' },
  '/play-store': { title: 'Play Store', subtitle: 'Public policy pages, links and answers for Google Play Console' },
  '/deletion-requests': { title: 'Deletion requests', subtitle: 'Account deletion requests from the public website and the app' },
  '/notifications': { title: 'Notifications', subtitle: 'Message all learners or one learner, in the app and as a push' },
  '/settings': { title: 'Settings', subtitle: 'App-wide controls the whole platform follows' },
};

function BrandMark() {
  return (
    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
        <path d="M8 4h8l-1.4 3.2h-1.7V20h-1.8V7.2H9.4L8 4z" fill="#FFFFFF" />
      </svg>
    </div>
  );
}

interface Toast {
  id: number;
  icon: LucideIcon;
  title: string;
  detail: string;
}

let toastSeq = 0;

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [live, setLive] = useState(isRealtimeConnected());
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [pendingDeletions, setPendingDeletions] = useState(0);

  // Open deletion requests: a count on the sidebar, refreshed whenever one arrives or is closed.
  useEffect(() => {
    let alive = true;
    const refresh = () =>
      api
        .listDeletionRequests('pending')
        .then((res) => alive && setPendingDeletions(res.counts.pending))
        .catch(() => {});
    refresh();
    const offs = [onRealtimeEvent('deletion.requested', refresh), onRealtimeEvent('deletion.updated', refresh)];
    return () => {
      alive = false;
      offs.forEach((off) => off());
    };
  }, []);

  // Live status dot follows the realtime connection.
  useEffect(() => {
    const off = onRealtimeStatus(setLive);
    return () => {
      off();
    };
  }, []);

  // Activity pushed from the server becomes a toast; pages refresh on the same events.
  useEffect(() => {
    const push = (icon: LucideIcon, title: string, detail: string) => {
      const id = ++toastSeq;
      setToasts((current) => [...current.slice(-3), { id, icon, title, detail }]);
      window.setTimeout(() => setToasts((current) => current.filter((toast) => toast.id !== id)), 6000);
    };
    const offs = [
      onRealtimeEvent('order.created', (p) =>
        push(ShoppingBag, 'New order', `${p.courseTitle ?? 'Course'} — paid`)
      ),
      onRealtimeEvent('user.registered', (p) =>
        push(UserPlus, 'New learner', String(p.name || p.email || 'A learner just signed up'))
      ),
      onRealtimeEvent('review.created', (p) =>
        push(Star, 'New review', `${p.courseTitle ?? 'Course'} — ${p.rating ?? ''}★`)
      ),
      onRealtimeEvent('catalog.changed', (p) =>
        push(BookOpen, 'Catalog updated', String(p.courseTitle || p.reason || 'The catalog changed'))
      ),
      onRealtimeEvent('settings.updated', () => push(Settings, 'App settings updated', 'Learners see the change immediately')),
      onRealtimeEvent('deletion.requested', (p) =>
        push(UserX, 'Account deletion request', `${p.reference ?? 'A new request'} — from the website`)
      ),
    ];
    return () => {
      offs.forEach((off) => off());
    };
  }, []);

  const location = useLocation();
  const current = TITLES[location.pathname] || TITLES['/'];
  const presence = usePresence();
  const [menuOpen, setMenuOpen] = useState(false);
  // Desktop only: collapsed shows icons alone. The choice is remembered on this computer.
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem(SIDEBAR_KEY) === '1');
  useEffect(() => {
    localStorage.setItem(SIDEBAR_KEY, collapsed ? '1' : '0');
  }, [collapsed]);

  // Close the mobile drawer whenever the route changes.
  useEffect(() => setMenuOpen(false), [location.pathname]);

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Mobile drawer backdrop */}
      {menuOpen && (
        <button
          aria-label="Close menu"
          onClick={() => setMenuOpen(false)}
          className="fixed inset-0 z-30 bg-ink/30 md:hidden"
        />
      )}

      {/* ---------- sidebar (drawer on mobile, column on md+) ---------- */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-60 flex-col border-r border-line bg-surface transition-[transform,width] duration-200 md:static md:z-auto md:translate-x-0 ${
          collapsed ? 'md:w-[76px]' : 'md:w-60'
        } ${menuOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <div
          className={`flex items-center gap-2.5 px-5 pb-5 pt-6 ${
            collapsed ? 'md:flex-col md:gap-4 md:px-0' : ''
          }`}
        >
          <BrandMark />
          <div className={`min-w-0 flex-1 ${collapsed ? 'md:hidden' : ''}`}>
            <p className="text-[15px] font-bold leading-tight">YDU Academy</p>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-brand-ink">Admin</p>
          </div>
          <button
            type="button"
            onClick={() => setCollapsed((value) => !value)}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className="hidden h-8 w-8 shrink-0 items-center justify-center rounded-md text-subtle transition-colors hover:bg-ink/5 hover:text-ink md:flex"
          >
            {collapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
          </button>
        </div>

        <nav className="flex-1 space-y-0.5 overflow-y-auto px-3">
          {NAV.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              title={collapsed ? label : undefined}
              aria-label={label}
              className={({ isActive }) =>
                `group flex min-h-11 items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors md:min-h-0 ${
                  collapsed ? 'md:justify-center md:px-0' : ''
                } ${
                  isActive
                    ? 'bg-brand-soft font-semibold text-brand-ink'
                    : 'text-muted hover:bg-ink/4 hover:text-ink'
                }`
              }
            >
              <span className="relative shrink-0">
                <Icon size={17} />
                {to === '/deletion-requests' && pendingDeletions > 0 && collapsed && (
                  <span className="absolute -right-1 -top-1 hidden h-2 w-2 rounded-full bg-error md:block" />
                )}
              </span>
              <span className={`min-w-0 flex-1 truncate ${collapsed ? 'md:hidden' : ''}`}>{label}</span>
              {to === '/deletion-requests' && pendingDeletions > 0 && (
                <span
                  className={`rounded-full bg-error px-1.5 text-[11px] font-bold leading-[18px] text-white ${collapsed ? 'md:hidden' : ''}`}
                  aria-label={`${pendingDeletions} waiting`}
                >
                  {pendingDeletions}
                </span>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-line-soft p-3">
          <div
            className={`flex items-center gap-2.5 rounded-lg px-2 py-2 ${
              collapsed ? 'md:flex-col md:gap-2 md:px-0' : ''
            }`}
          >
            <div
              title={user?.name || 'Admin'}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand text-[13px] font-bold text-on-brand"
            >
              {initials(user?.name || 'Admin')}
            </div>
            <div className={`min-w-0 flex-1 ${collapsed ? 'md:hidden' : ''}`}>
              <p className="truncate text-[13px] font-semibold">{user?.name}</p>
              <p className="truncate text-xs text-subtle">{user?.email}</p>
            </div>
            <button
              aria-label="Sign out"
              title="Sign out"
              onClick={() => {
                logout();
                navigate('/login');
              }}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md text-subtle transition-colors hover:bg-error-soft hover:text-error md:h-9 md:w-9"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>

      {/* ---------- main ---------- */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex min-h-16 shrink-0 items-center justify-between gap-3 border-b border-line bg-surface px-4 py-3 md:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <button
              aria-label="Open menu"
              onClick={() => setMenuOpen(true)}
              className="-ml-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-md text-muted hover:bg-ink/5 hover:text-ink md:hidden"
            >
              {menuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
            <div className="min-w-0">
              <h1 className="truncate text-lg font-bold leading-tight">{current.title}</h1>
              <p className="hidden truncate text-[13px] text-muted sm:block">{current.subtitle}</p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {presence && (
              <span
                className="hidden items-center gap-1.5 rounded-full bg-brand-soft px-3 py-1 text-xs font-semibold text-brand-ink sm:inline-flex"
                title="Signed-in accounts online right now"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-success" />
                {presence.signedIn} online
              </span>
            )}
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${
                live ? 'bg-success-soft text-success' : 'bg-ink/5 text-subtle'
              }`}
              title={live ? 'Realtime channel connected' : 'Realtime channel connecting…'}
            >
              <span
                className={`h-1.5 w-1.5 rounded-full ${live ? 'animate-pulse bg-success' : 'bg-subtle'}`}
              />
              <span className="hidden sm:inline">{live ? 'Live' : 'Connecting…'}</span>
            </span>
          </div>
        </header>

        <main className="min-h-0 flex-1 overflow-y-auto p-4 md:p-6">
          {/* Pages load on demand (App.tsx); the skeleton holds the space while one arrives. */}
          <Suspense fallback={<FormSkeleton sections={2} fieldsPerSection={3} className="max-w-3xl" />}>
            <Outlet />
          </Suspense>
        </main>
      </div>

      {/* Live activity toasts */}
      <div className="pointer-events-none fixed inset-x-4 bottom-4 z-50 flex flex-col gap-2 sm:left-auto sm:inset-x-auto sm:bottom-5 sm:right-5 sm:w-80">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className="pointer-events-auto flex items-start gap-2.5 rounded-xl border border-line bg-surface p-3 shadow-lg"
          >
            <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-soft text-brand-ink">
              <toast.icon size={14} />
            </span>
            <div className="min-w-0">
              <p className="text-[13px] font-semibold leading-tight text-ink">{toast.title}</p>
              <p className="truncate text-xs text-muted">{toast.detail}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
