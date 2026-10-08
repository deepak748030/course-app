import {
  BookOpen,
  LayoutDashboard,
  LogOut,
  RefreshCw,
  Settings,
  Shapes,
  ShoppingBag,
  Star,
  TicketPercent,
  Users,
  Wrench,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { isDemoMode, onDemoModeChange } from '../api/client';
import { resetDemoDb } from '../api/demo';
import { useAuth } from '../auth/AuthContext';
import { initials } from './ui';

const NAV = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/courses', label: 'Courses', icon: BookOpen },
  { to: '/categories', label: 'Categories', icon: Shapes },
  { to: '/users', label: 'Learners', icon: Users },
  { to: '/orders', label: 'Orders', icon: ShoppingBag },
  { to: '/reviews', label: 'Reviews', icon: Star },
  { to: '/coupons', label: 'Coupons', icon: TicketPercent },
  { to: '/settings', label: 'Settings', icon: Settings },
];

const TITLES: Record<string, { title: string; subtitle: string }> = {
  '/': { title: 'Dashboard', subtitle: 'How the academy is doing, at a glance' },
  '/courses': { title: 'Courses', subtitle: 'Create, price, publish and arrange the catalog' },
  '/categories': { title: 'Categories', subtitle: 'The tracks learners browse and filter by' },
  '/users': { title: 'Learners', subtitle: 'Accounts, access and spend' },
  '/orders': { title: 'Orders', subtitle: 'Every purchase, payment and refund' },
  '/reviews': { title: 'Reviews', subtitle: 'What learners say about each course' },
  '/coupons': { title: 'Coupons', subtitle: 'Discount codes for checkout' },
  '/settings': { title: 'Settings', subtitle: 'App-wide controls the whole platform follows' },
};

function BrandMark() {
  return (
    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
        <path d="M8 4h8l-1.4 3.2h-1.7V20h-1.8V7.2H9.4L8 4z" fill="#17150F" />
      </svg>
    </div>
  );
}

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [demo, setDemo] = useState(isDemoMode());

  useEffect(() => {
    const off = onDemoModeChange(setDemo);
    return () => {
      off();
    };
  }, []);

  const current = TITLES[window.location.pathname] || TITLES['/'];

  return (
    <div className="flex h-screen overflow-hidden">
      {/* ---------- sidebar ---------- */}
      <aside className="flex w-60 shrink-0 flex-col border-r border-line bg-surface">
        <div className="flex items-center gap-2.5 px-5 pb-5 pt-6">
          <BrandMark />
          <div>
            <p className="text-[15px] font-bold leading-tight">YDU Academy</p>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-brand-ink">Admin</p>
          </div>
        </div>

        <nav className="flex-1 space-y-0.5 overflow-y-auto px-3">
          {NAV.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `group flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-brand-soft font-semibold text-brand-ink'
                    : 'text-muted hover:bg-ink/4 hover:text-ink'
                }`
              }
            >
              <Icon size={17} className="shrink-0" />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-line-soft p-3">
          <div className="flex items-center gap-2.5 rounded-lg px-2 py-2">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand text-[13px] font-bold text-ink">
              {initials(user?.name || 'Admin')}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-semibold">{user?.name}</p>
              <p className="truncate text-xs text-subtle">{user?.email}</p>
            </div>
            <button
              title="Sign out"
              onClick={() => {
                logout();
                navigate('/login');
              }}
              className="rounded-md p-1.5 text-subtle transition-colors hover:bg-error-soft hover:text-error"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>

      {/* ---------- main ---------- */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-16 shrink-0 items-center justify-between border-b border-line bg-surface px-6">
          <div>
            <h1 className="text-lg font-bold leading-tight">{current.title}</h1>
            <p className="text-[13px] text-muted">{current.subtitle}</p>
          </div>
          <div className="flex items-center gap-2">
            {demo && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-gold-soft px-3 py-1 text-xs font-semibold text-brand-ink">
                <Wrench size={12} /> Demo data
              </span>
            )}
          </div>
        </header>

        {demo && (
          <div className="flex items-center justify-between gap-3 border-b border-line bg-brand-soft px-6 py-2">
            <p className="text-[13px] font-medium text-brand-ink">
              The server or its database is unreachable — showing the built-in demo dataset. Start the API with
              MongoDB to control live data. Changes here persist in this browser only.
            </p>
            <button
              onClick={() => {
                resetDemoDb();
                window.location.reload();
              }}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-md px-2 py-1 text-xs font-semibold text-brand-ink hover:bg-brand/30"
            >
              <RefreshCw size={12} /> Reset demo data
            </button>
          </div>
        )}

        <main className="min-h-0 flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
