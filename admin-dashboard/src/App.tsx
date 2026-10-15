import { Suspense, lazy } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import Layout from './components/Layout';
import { AppShellSkeleton } from './components/ui';
import { useAuth } from './auth/AuthContext';
import { PUBLIC_ALIASES, PUBLIC_PATHS } from './lib/legal';
import Login from './pages/Login';

/*
 * Pages load on demand: someone opening the privacy policy from Google Play downloads the small
 * public site, not the charts and editors of the admin console (and an admin's first visit to a
 * page fetches only that page).
 */
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Analytics = lazy(() => import('./pages/Analytics'));
const Courses = lazy(() => import('./pages/Courses'));
const Categories = lazy(() => import('./pages/Categories'));
const Users = lazy(() => import('./pages/Users'));
const Orders = lazy(() => import('./pages/Orders'));
const Reviews = lazy(() => import('./pages/Reviews'));
const Coupons = lazy(() => import('./pages/Coupons'));
const Banners = lazy(() => import('./pages/Banners'));
const Content = lazy(() => import('./pages/Content'));
const Notifications = lazy(() => import('./pages/Notifications'));
const PlayStore = lazy(() => import('./pages/PlayStore'));
const DeletionRequests = lazy(() => import('./pages/DeletionRequests'));
const Settings = lazy(() => import('./pages/Settings'));

// Public website — no sign-in (privacy policy, terms, account deletion …).
const PublicLayout = lazy(() => import('./public/PublicLayout'));
const PolicyPage = lazy(() => import('./public/PolicyPage'));
const DeleteAccountPage = lazy(() => import('./public/DeleteAccountPage'));
const ContactPage = lazy(() => import('./public/ContactPage'));
const LegalHub = lazy(() => import('./public/LegalHub'));
const PricingPage = lazy(() => import('./public/PricingPage'));

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, ready } = useAuth();
  const location = useLocation();
  if (!ready) return <AppShellSkeleton />;
  if (!user) return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  return <>{children}</>;
}

/** While the public site's code arrives: a plain white page, not the admin shell. */
function PublicFallback() {
  return <div className="min-h-full bg-surface" aria-busy="true" />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      {/* ---------- public website: open to everyone ---------- */}
      <Route
        element={
          <Suspense fallback={<PublicFallback />}>
            <PublicLayout />
          </Suspense>
        }
      >
        <Route path={PUBLIC_PATHS.hub} element={<LegalHub />} />
        <Route path={PUBLIC_PATHS.privacy} element={<PolicyPage key="privacy" docKey="privacy" />} />
        <Route path={PUBLIC_PATHS.terms} element={<PolicyPage key="terms" docKey="terms" />} />
        <Route path={PUBLIC_PATHS.refund} element={<PolicyPage key="refund" docKey="refund" />} />
        <Route path={PUBLIC_PATHS.delivery} element={<PolicyPage key="delivery" docKey="delivery" />} />
        <Route path={PUBLIC_PATHS.about} element={<PolicyPage key="about" docKey="about" />} />
        <Route path={PUBLIC_PATHS.deletion} element={<DeleteAccountPage />} />
        <Route path={PUBLIC_PATHS.contact} element={<ContactPage />} />
        <Route path={PUBLIC_PATHS.pricing} element={<PricingPage />} />
      </Route>
      {Object.entries(PUBLIC_ALIASES).map(([from, to]) => (
        <Route key={from} path={from} element={<Navigate to={to} replace />} />
      ))}

      {/* ---------- admin console: signed-in admins only ---------- */}
      <Route
        element={
          <RequireAuth>
            <Layout />
          </RequireAuth>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="/analytics" element={<Analytics />} />
        <Route path="/courses" element={<Courses />} />
        <Route path="/categories" element={<Categories />} />
        <Route path="/users" element={<Users />} />
        <Route path="/orders" element={<Orders />} />
        <Route path="/reviews" element={<Reviews />} />
        <Route path="/coupons" element={<Coupons />} />
        <Route path="/banners" element={<Banners />} />
        <Route path="/content" element={<Content />} />
        <Route path="/notifications" element={<Notifications />} />
        <Route path="/play-store" element={<PlayStore />} />
        <Route path="/deletion-requests" element={<DeletionRequests />} />
        <Route path="/settings" element={<Settings />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
